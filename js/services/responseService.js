import { APP_CONFIG, resolveDataSource } from "../config/appConfig.js";
import { fetchGoogleFormResponses } from "../api/googleFormsApi.js";
import { toStringSafe } from "../utils/helpers.js";

let memoryCache = null;

function normalizeResponse(item, index) {
  const id = toStringSafe(item?.id).trim() || `response-${index + 1}`;
  return Object.freeze({
    id,
    submittedAt: toStringSafe(item?.submittedAt),
    name: toStringSafe(item?.name),
    content: toStringSafe(item?.content)
  });
}

function normalizePayload(payload) {
  if (!payload || payload.ok === false) {
    const message = payload?.error?.message || "回答データを取得できませんでした。";
    const error = new Error(message);
    error.code = payload?.error?.code || "API_ERROR";
    throw error;
  }
  const responses = Array.isArray(payload.responses) ? payload.responses.map(normalizeResponse) : [];
  return Object.freeze({
    ok: true,
    generatedAt: toStringSafe(payload.generatedAt),
    count: responses.length,
    responses: Object.freeze(responses)
  });
}

async function fetchSample(options = {}) {
  const response = await fetch(APP_CONFIG.sampleDataUrl, { cache: "no-store", signal: options.signal });
  if (!response.ok) throw new Error(`Sample data HTTP ${response.status}`);
  return response.json();
}

export async function loadResponses(options = {}) {
  if (memoryCache && !options.force) return memoryCache;
  const source = resolveDataSource();
  const payload = source === "gas"
    ? await fetchGoogleFormResponses(options)
    : await fetchSample(options);
  memoryCache = normalizePayload(payload);
  return memoryCache;
}

export function clearResponseCache() {
  memoryCache = null;
}

export function getDataSourceLabel() {
  return resolveDataSource() === "gas" ? "GAS" : "Sample";
}
