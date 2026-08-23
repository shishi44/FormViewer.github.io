import { APP_CONFIG } from "../config/appConfig.js";
import { fetchGoogleSheetTable } from "../api/googleSheetsApi.js";
import { fetchGoogleFormResponses } from "../api/googleFormsApi.js";
import { loadConnection, connectionLabel } from "./connectionService.js";
import { loadCsvTable } from "./csvStorage.js";
import { tableToResponsePayload } from "../utils/tabular.js";
import { toStringSafe } from "../utils/helpers.js";

let memoryCache = null;
let cacheKey = "";

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
    generatedAt: toStringSafe(payload.generatedAt) || new Date().toISOString(),
    count: responses.length,
    responses: Object.freeze(responses)
  });
}

async function fetchSample(options = {}) {
  const response = await fetch(APP_CONFIG.sampleDataUrl, { cache: "no-store", signal: options.signal });
  if (!response.ok) throw new Error(`Sample data HTTP ${response.status}`);
  return response.json();
}

function keyForConnection(connection) {
  return JSON.stringify(connection ?? { type: "none" });
}

export async function loadResponses(options = {}) {
  const connection = options.connection ?? loadConnection();
  const nextKey = keyForConnection(connection);
  if (memoryCache && cacheKey === nextKey && !options.force) return memoryCache;

  let payload;
  if (connection.type === "sheet") {
    const table = await fetchGoogleSheetTable(connection, options);
    payload = tableToResponsePayload(table, connection, { idPrefix: `sheet-${connection.gid || 0}` });
  } else if (connection.type === "csv") {
    const table = await loadCsvTable();
    if (!table) throw new Error("保存済みのCSVが見つかりません。CSVをもう一度読み込んでください。");
    payload = tableToResponsePayload(table, connection, { idPrefix: "csv" });
  } else if (connection.type === "gas") {
    payload = await fetchGoogleFormResponses(connection.gasWebAppUrl, options);
  } else if (connection.type === "sample") {
    payload = await fetchSample(options);
  } else {
    const error = new Error("最初にGoogleスプレッドシートまたはCSVを接続してください。");
    error.code = "CONNECTION_REQUIRED";
    throw error;
  }

  memoryCache = normalizePayload(payload);
  cacheKey = nextKey;
  return memoryCache;
}

export function clearResponseCache() {
  memoryCache = null;
  cacheKey = "";
}

export function getDataSourceLabel(connection = loadConnection()) {
  return connectionLabel(connection);
}
