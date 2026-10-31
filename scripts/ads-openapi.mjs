import { readFileSync } from "node:fs";

// Public planning schemas exported from the reviewed customer API catalog.
// Route-specific adaptations below remove MCP scope arguments and describe HTTP
// status/envelope differences. The source revision stays in the input file only.
const contracts = JSON.parse(readFileSync(new URL("./ads-public-contracts.json", import.meta.url), "utf8"));
const ref = name => ({ $ref: `#/components/schemas/${name}` });
const object = (properties, required = []) => ({ type: "object", properties, ...(required.length ? { required } : {}) });
const text = { type: "string" };
const number = { type: "integer", minimum: 0 };
const arbitrary = { type: "object", additionalProperties: true };
const componentName = id => `Ads${id.split("-").map(word => word[0].toUpperCase() + word.slice(1)).join("")}Input`;
const pathSelectors = new Set(["storeUrl", "resourceUrl", "draftId", "jobId", "generationId", "uploadId"]);

function annotateLiteralTypes(value) {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(annotateLiteralTypes);
  const result = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, annotateLiteralTypes(child)]));
  // Explicit types do not change a primitive enum/const's accepted values. They
  // keep reference renderers from omitting required untyped-enum body fields.
  const literals = Object.hasOwn(result, "const") ? [result.const] : result.enum;
  if (!result.type && Array.isArray(literals) && literals.length) {
    const types = [...new Set(literals.map(item => item === null ? "null" : typeof item === "number" ? Number.isInteger(item) ? "integer" : "number" : typeof item))];
    if (types.every(type => ["string", "number", "integer", "boolean", "null"].includes(type))) result.type = types.length === 1 ? types[0] : types;
  }
  return result;
}

function httpInput(input) {
  const schema = structuredClone(input ?? object({}));
  for (const key of pathSelectors) delete schema.properties?.[key];
  if (schema.required) schema.required = schema.required.filter(key => !pathSelectors.has(key));
  return schema;
}

function installSchema(components, name, input) {
  const schema = structuredClone(input);
  const definitions = schema.$defs ?? {};
  delete schema.$defs;
  const rewrite = value => {
    if (!value || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map(rewrite);
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [
      key,
      key === "$ref" && typeof child === "string" && child.startsWith("#/$defs/")
        ? `#/components/schemas/${name}_${child.slice(8)}`
        : rewrite(child),
    ]));
  };
  components.schemas[name] = rewrite(schema);
  for (const [key, value] of Object.entries(definitions)) components.schemas[`${name}_${key}`] = rewrite(value);
  return ref(name);
}

const queryInputs = {
  "creative-intelligence-search": object({ q: text, limit: { type: "integer", default: 30 }, offset: number }),
  "creative-intelligence-detail": object({ platform: text, accountId: text, creativeId: text }, ["platform", "accountId", "creativeId"]),
  "list-generated-creatives": object({ limit: { type: "integer", default: 24 }, offset: number, sourceIntelligenceId: text }),
  "platform-assets": object({
    platform: text, assetType: { enum: ["campaign", "adset", "ad"] }, assetId: text,
    adAccountId: text, adAccountIds: text, parentAssetId: text, query: text, status: text,
    limit: { type: "integer", minimum: 1, maximum: 500, description: "Native inventory accepts 1–500 rows. Follow the returned availability information instead of treating a bounded read as a complete account inventory." },
    inventory: { enum: ["1"], description: "Request current native inventory. Requires one platform, advertiser and supported asset type; incompatible with aggregate availability/status filters." },
    nativeAssetType: { enum: ["asset_group"] }, includeGoogleAssetGroups: { enum: ["0", "1"] },
    dataSourceAdAccountId: text, dataSourceConnectorId: text,
  }),
};

const draftIds = new Set(["save-ad-draft", "prepare-ad-draft-batch", "read-ad-draft", "prepare-ad-retry-draft"]);
const jobIds = new Set(["publish-ad-draft", "read-ad-action-job", "cancel-ad-action-job"]);
const noBody = new Set(["publish-ad-draft", "cancel-ad-action-job", "prepare-ad-retry-draft", "dismiss-ad-draft"]);

function responses(statuses, schema, description) {
  return {
    ...Object.fromEntries(statuses.map(status => [String(status), {
      description,
      headers: { "x-request-id": { schema: text, description: "Keep this identifier for diagnostics." } },
      content: { "application/json": { schema } },
    }])),
    ...Object.fromEntries([
      [400, "BadRequest"], [401, "Unauthorized"], [403, "Forbidden"], [404, "NotFound"],
      [409, "Conflict"], [429, "TooManyRequests"], [500, "ServerError"], [502, "BadGateway"], [503, "ServiceUnavailable"],
    ].map(([status, name]) => [String(status), { $ref: `#/components/responses/${name}` }])),
  };
}

function parameters(path, input) {
  return [
    ...[...path.matchAll(/\{([^}]+)\}/g)].map(([, name]) => ({
      name, in: "path", required: true,
      description: name === "resourceUrl" || name === "storeUrl" ? "Exact workspace URL returned by GET /context." : "Identifier returned by the matching Bily read or creation operation.",
      schema: name === "index" ? { type: "integer", minimum: 0, maximum: 99 } : text,
    })),
    { $ref: "#/components/parameters/OrganizationId" },
    ...Object.entries(input?.properties ?? {}).map(([name, schema]) => ({
      name, in: "query", required: input.required?.includes(name) ?? false, schema,
    })),
  ];
}

function addOperation(paths, { path, method, id, title, description, input, result = arbitrary, statuses = [200], tag, bodyRequired = true }) {
  const get = method === "get" || method === "head";
  const hasBody = !get && input && Object.keys(input.properties ?? {}).length + (input.oneOf?.length ?? 0) > 0;
  paths[path] ??= {};
  paths[path][method] = {
    tags: [tag], summary: title, description, operationId: id,
    parameters: parameters(path, get ? input : undefined),
    ...(hasBody ? { requestBody: { required: bodyRequired, content: { "application/json": { schema: input } } } } : {}),
    responses: responses(statuses, result, statuses.includes(202) ? "Read the returned identifier until processing reaches a terminal state. Acceptance alone does not confirm completion." : "Request completed. Inspect the returned state and any verification fields."),
  };
}

export function addAdsContracts({ paths, components }) {
  const previousSchemaNames = new Set(Object.keys(components.schemas));
  // Normalize the existing platform keys before merging. Keeping both spellings
  // until serialization would overwrite a whole path item and miscount routes.
  for (const path of Object.keys(paths)) {
    if (!path.startsWith("/platform/") || !path.includes("{storeUrl}")) continue;
    const canonical = path.replaceAll("{storeUrl}", "{resourceUrl}");
    paths[canonical] = { ...paths[path], ...paths[canonical] };
    delete paths[path];
  }
  const action = object({ capabilityId: text, label: { type: ["string", "null"] }, body: arbitrary }, ["capabilityId", "body"]);
  components.schemas.AdActionInput = action;
  components.schemas.NativeBudgetGuard = {
    ...contracts.budgetGuard,
    description: "Use the live quote unchanged. amountUnits must fit a positive signed 64-bit integer (at most 9223372036854775807). Selection, owner, currency, cadence and source must match the exact request. Google affectedCampaignIds is the complete unique lexically sorted scope, includes the selected campaign, and matches referenceCount. A JSON-shaped guard without a current matching fingerprint is not executable authority.",
  };
  components.schemas.NativeBudgetSnapshot = {
    ...object({
      version: { const: 1 }, resourceUrl: text, platform: { enum: ["FACEBOOK", "GOOGLE_ADS"] },
      adAccountId: text, sourceAuthority: contracts.budgetRead.properties.sourceAuthority,
      selection: contracts.budgetGuard.oneOf[0].properties.selection, currency: { type: "string", pattern: "^[A-Z]{3}$" }, canEdit: { type: "boolean" },
      reason: { enum: ["inherited_budget_select_campaign", "native_budget_unavailable", "ambiguous_budget_owner", "unsupported_budget_period", "unsupported_budget_type", "incomplete_shared_scope"] },
      owner: { oneOf: contracts.budgetGuard.oneOf.map(branch => branch.properties.owner) }, cadence: { enum: ["daily", "lifetime"] }, amountUnits: { type: "string", pattern: "^[1-9]\\d{0,18}$" },
      unitsPerCurrency: { enum: [1, 100, 1000, 1000000] }, budgetGuard: ref("NativeBudgetGuard"),
    }, ["version", "resourceUrl", "platform", "adAccountId", "sourceAuthority", "selection", "currency", "canEdit", "unitsPerCurrency"]),
    additionalProperties: false,
    description: "When canEdit is true, budgetGuard is present and every selection, owner, amount, cadence, currency and source field matches it. Otherwise reason is present and there is no budgetGuard. Do not invent a guard or reuse one for a different owner.",
    allOf: [{ if: { properties: { canEdit: { const: true } }, required: ["canEdit"] }, then: { required: ["budgetGuard"], not: { required: ["reason"] } }, else: { required: ["reason"], not: { required: ["budgetGuard"] } } }],
  };
  components.schemas.AdActionJob = object({
    id: text, status: { enum: ["staging", "queued", "running", "completed", "completed_with_errors", "failed", "cancelled"] },
    actionCount: number, completedCount: number, succeededCount: number, failedCount: number,
    actions: { type: "array", items: object({ index: number, capabilityId: text, label: text, status: { enum: ["staged", "queued", "running", "succeeded", "failed", "cancelled"] }, data: {}, error: text, httpStatus: { type: "integer" }, retryable: { type: "boolean" }, details: {} }, ["index", "capabilityId", "label", "status"]) },
    canRetry: { type: "boolean" }, canCancel: { type: "boolean" }, cancelRequestedAt: { type: ["string", "null"] },
  }, ["id", "status", "actionCount", "completedCount", "succeededCount", "failedCount", "actions", "canRetry", "canCancel"]);
  components.schemas.AdActionDraft = object({
    id: text, title: text, createdAt: { type: "string", format: "date-time" }, expiresAt: { type: "string", format: "date-time" },
    reviewRows: { type: "array", items: object({ label: text, value: text }, ["label", "value"]) },
    warnings: { type: "array", items: text },
    status: { enum: ["staging", "queued", "running", "completed", "completed_with_errors", "failed", "cancelled"] }, actionCount: number, actions: { type: "array", items: action },
  }, ["id", "title", "createdAt", "expiresAt"]);
  const draftResult = object({ draft: ref("AdActionDraft") }, ["draft"]);
  const jobResult = object({ ok: { const: true }, job: ref("AdActionJob") }, ["ok", "job"]);
  components.schemas.GeneratedAdCreative = object({
    id: text, status: { enum: ["processing", "ready", "error"] }, mediaUrl: { type: ["string", "null"] },
    expiresAt: { type: "integer", description: "Retention deadline as Unix seconds; a non-null pinnedAt retains the creative beyond this deadline." },
    pinnedAt: { type: ["integer", "null"] }, lastError: { type: ["string", "null"] },
  }, ["id", "status", "mediaUrl", "expiresAt", "pinnedAt"]);
  components.schemas.GeneratedAdCreative.example = { id: "generation-example", status: "processing", mediaUrl: null, expiresAt: 1800000000, pinnedAt: null };
  components.schemas.UploadedAdCreative = object({
    id: text, status: { enum: ["pending", "ready", "error"] }, fileName: text, contentType: text, sizeBytes: number,
    mediaUrl: { type: ["string", "null"] }, expiresAt: { type: "integer" },
    pinnedAt: { type: ["integer", "null"] }, lastError: { type: ["string", "null"] }, analysisStatus: { type: ["string", "null"] },
  }, ["id", "status", "fileName", "contentType", "sizeBytes", "mediaUrl", "expiresAt", "pinnedAt"]);
  components.schemas.UploadedAdCreative.example = { id: "00000000-0000-4000-8000-000000000001", status: "pending", fileName: "product.png", contentType: "image/png", sizeBytes: 1024, mediaUrl: null, expiresAt: 1800000000, pinnedAt: null };

  for (const contract of contracts.operations) {
    const { id, title, method } = contract;
    const path = contract.path.replaceAll("{draftId}", "{jobId}");
    const creative = path.startsWith("/creative-intelligence/");
    const durable = path.includes("/action-jobs") || path.includes("/action-drafts");
    let input = httpInput(contract.inputSchema);
    if (queryInputs[id]) input = structuredClone(queryInputs[id]);
    if (id === "list-live-meta-campaigns") input = object({
      adAccountId: text,
      payload: object({ campaignIds: { type: "array", items: text }, names: { type: "array", items: text }, namePrefix: text, limit: { type: "integer", minimum: 1, maximum: 250, default: 100 } }),
    }, ["adAccountId"]);
    if (id === "analyze-creative") {
      // The HTTP route defaults absent metrics to an empty performance snapshot.
      input.required = input.required.filter(key => key !== "metrics");
      Object.assign(input.properties, { adId: text, creativeName: { type: "string", maxLength: 500 }, headline: { type: "string", maxLength: 500 }, body: { type: "string", maxLength: 2000 }, cta: { type: "string", maxLength: 120 } });
    }
    if (id === "update-asset") {
      input.properties.budgetGuard = ref("NativeBudgetGuard");
      input.description = "For Meta/Google budget changes, first read the native budget and keep the returned guard unchanged. Send only budget and budgetType inside updates. Meta omits top-level sourceAuthority; its source is inside budgetGuard. Google supplies the exact top-level sourceAuthority pair. The path supplies resourceUrl; do not repeat it in the body.";
      // Route validation also sends a cadence-only request through guarded review.
      input.allOf[1].if.properties.updates = { anyOf: [{ required: ["budget"] }, { required: ["budgetType"] }] };
      input.allOf.push({ if: { properties: { platform: { const: "GOOGLE_ADS" } }, required: ["platform", "budgetGuard"] }, then: { required: ["sourceAuthority"], properties: { assetType: { const: "campaign" } } } });
    }
    if (id === "read-asset-budget") {
      input = httpInput(contracts.budgetRead);
      input.example = {
        platform: "FACEBOOK", adAccountId: "act_123456789012345",
        sourceAuthority: { dataSourceAdAccountId: "source-account-example", dataSourceConnectorId: "connector-example" },
        payload: { version: 1, assetType: "campaign", assetId: "234567890123456" },
      };
    }
    if (noBody.has(id)) input = undefined;
    const schemaName = id === "update-asset" ? "UpdateAssetRequest" : componentName(id);
    if (input && method !== "GET") {
      installSchema(components, schemaName, input);
      // Keep the object shape for deciding whether an HTTP body exists.
      input = { ...input, ...ref(schemaName) };
      delete input.$defs;
    }
    let result = draftIds.has(id) ? draftResult : jobIds.has(id) ? jobResult : arbitrary;
    if (["generate-static-creative", "read-generated-creative"].includes(id)) result = object({ generation: ref("GeneratedAdCreative") }, ["generation"]);
    if (id === "list-generated-creatives") result = object({ generations: { type: "array", items: ref("GeneratedAdCreative") } }, ["generations"]);
    if (id === "list-creative-uploads") result = object({ uploads: { type: "array", items: ref("UploadedAdCreative") } }, ["uploads"]);
    if (["read-creative-upload", "create-creative-upload", "finalize-creative-upload", "analyze-uploaded-creative"].includes(id)) result = object({ upload: ref("UploadedAdCreative"), ...(id === "create-creative-upload" ? { uploadUrl: text, reused: { type: "boolean" } } : {}) }, ["upload"]);
    if (id === "list-ad-drafts") result = object({ drafts: { type: "array", items: ref("AdActionDraft") }, cursor: { type: ["string", "null"], description: "Opaque scope-bound continuation. Follow until null; deduplicate drafts by id." } }, ["drafts", "cursor"]);
    if (id === "dismiss-ad-draft") result = object({ ok: { const: true } }, ["ok"]);
    if (id === "read-asset-budget") result = object({ ok: { const: true }, result: ref("NativeBudgetSnapshot") }, ["ok", "result"]);
    if (id === "list-ad-action-capabilities") result = object({ capabilities: { type: "array", items: arbitrary } }, ["capabilities"]);
    const statuses = ["save-ad-draft", "prepare-ad-draft-batch", "prepare-ad-retry-draft"].includes(id) ? [201]
      : ["publish-ad-draft", "analyze-uploaded-creative"].includes(id) ? [202]
      : id === "create-creative-upload" ? [200, 201]
      : ["generate-static-creative", "analyze-creative", "prepare-creative-placements", "finalize-creative-upload"].includes(id) ? [200, 202] : [200];
    const stageAdvice = !creative && !durable && contract.write
      ? " This is an execution endpoint. For a reviewed user change, save its supported capability/body as an immutable action draft, review it, and explicitly publish that draft. Check action-jobs/capabilities before staging; a catalog entry alone does not make it stageable."
      : "";
    addOperation(paths, { path, method: method.toLowerCase(), id: `ads-${id}`, title,
      description: contract.description + stageAdvice,
      input, result, statuses, tag: creative ? "Creative library" : durable ? "Ad drafts and jobs" : "Campaign actions",
    });
    // References are enough in request bodies; keep all definitions canonical.
    const request = paths[path][method.toLowerCase()].requestBody;
    if (request) request.content["application/json"].schema = ref(schemaName);
    if (request && id === "read-asset-budget") request.content["application/json"].example = input.example;
    if (id === "read-asset-budget") paths[path].post.responses["200"].content["application/json"].example = {
      ok: true,
      result: { version: 1, resourceUrl: "store.example.com", platform: input.example.platform,
        adAccountId: input.example.adAccountId, sourceAuthority: input.example.sourceAuthority,
        selection: { assetType: "campaign", assetId: input.example.payload.assetId }, currency: "USD",
        canEdit: false, reason: "native_budget_unavailable", unitsPerCurrency: 100 },
    };
  }

  const prefix = "/platform/{resourceUrl}/action-jobs";
  addOperation(paths, {
    path: prefix, method: "post", id: "ads-create-action-job", title: "Stage a low-level ad action job",
    description: "Prefer saving an action draft. This low-level endpoint can start immediately: inline actions auto-start unless autoStart is false. Set autoStart:false to stage, review all actions, then call start explicitly. Empty jobs use actionCount and PUT each action index before start. Idempotency does not make an uncertain platform mutation safe to replay.",
    input: object({ actionCount: { type: "integer", minimum: 1, maximum: 100 }, actions: { type: "array", minItems: 1, maxItems: 100, items: ref("AdActionInput") }, autoStart: { type: "boolean", description: "Use false for explicit review. Inline actions otherwise start automatically." }, idempotencyKey: text, stopOnFailure: { type: "boolean" } }),
    result: jobResult, statuses: [201, 202], tag: "Ad drafts and jobs",
  });
  addOperation(paths, {
    path: `${prefix}/{jobId}/actions/{index}`, method: "put", id: "ads-stage-action-job-action", title: "Stage one action in a job",
    description: "Write one supported action into a staging job. Indexes start at zero. The body is immutable once staged; this does not publish the job.", input: action,
    result: object({ ok: { const: true }, jobId: text, action: arbitrary }, ["ok", "jobId", "action"]), tag: "Ad drafts and jobs",
  });
  addOperation(paths, {
    path: `${prefix}/{jobId}/retry`, method: "post", id: "ads-retry-action-job", title: "Start eligible failed actions again",
    description: "This low-level retry starts a new job immediately and accepts only failures the server considers safe. Prefer retry-draft for review before publishing. Never replay an action with an uncertain or possibly completed platform mutation.",
    input: object({ indexes: { type: "array", uniqueItems: true, maxItems: 100, items: { type: "integer", minimum: 0, maximum: 99 } } }), bodyRequired: false,
    result: jobResult, statuses: [202], tag: "Ad drafts and jobs",
  });
  addOperation(paths, {
    path: "/creative-intelligence/{storeUrl}/offers/refresh", method: "post", id: "ads-refresh-current-offers", title: "Refresh the current offer registry",
    description: "Reconcile the selected workspace's current offers before generating a creative. This does not publish an ad.", tag: "Creative library",
  });

  const mimeTypes = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime", "video/webm"];
  const uploadMedia = "/creative-intelligence/{storeUrl}/uploads/{uploadId}/media";
  addOperation(paths, {
    path: uploadMedia, method: "put", id: "ads-transfer-creative-upload", title: "Transfer reserved creative bytes",
    description: "PUT the exact reserved bytes with the reserved Content-Type and Content-Length using an authenticated Bily customer API key with write permission (or the same creator's Bily session). An OAuth MCP grant alone does not authenticate this byte transfer. Use only the returned customer uploadUrl; do not construct or log private transport capabilities. JPEG/PNG/WebP images are at most 15 MiB; MP4/MOV/WebM videos are at most 95 MiB. Bily verifies measured media before marking ready. A ready upload is a library asset, not a published ad.",
    statuses: [200, 202], tag: "Creative library",
  });
  paths[uploadMedia].put.requestBody = { required: true, content: Object.fromEntries(mimeTypes.map(mime => [mime, { schema: { type: "string", format: "binary" } }])) };
  paths[uploadMedia].put.parameters.push({ name: "Content-Length", in: "header", required: true, schema: { type: "integer", minimum: 1, maximum: 99614720 } });
  for (const [path, generated] of [[uploadMedia, false], ["/creative-intelligence/{storeUrl}/generations/{generationId}/media", true]]) {
    for (const method of ["get", "head"]) {
      addOperation(paths, { path, method, id: `ads-${method}-${generated ? "generated" : "uploaded"}-creative-media`, title: `${method === "head" ? "Inspect" : "Read"} ${generated ? "generated" : "uploaded"} creative media`,
        description: "Read retained media in the authenticated workspace scope. The record must be ready and unexpired. Use the media URL returned by Bily; do not infer a storage location.",
        input: object({ variant: { enum: ["image", "thumbnail"] }, dpr: { enum: ["2"], description: "Only valid with variant=thumbnail. Omit for the original media." } }), tag: "Creative library" });
      paths[path][method].responses["200"] = { description: method === "head" ? "Media response headers without a body." : "Authenticated media bytes.", ...(method === "get" ? { content: { "application/octet-stream": { schema: { type: "string", format: "binary" } } } } : {}) };
    }
  }
  for (const [name, schema] of Object.entries(components.schemas)) {
    if (!previousSchemaNames.has(name) || name === "UpdateAssetRequest") components.schemas[name] = annotateLiteralTypes(schema);
  }
}
