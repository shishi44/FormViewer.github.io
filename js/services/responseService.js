import { APP_CONFIG } from "../config/appConfig.js?v=30";
import { fetchGoogleSheetTable } from "../api/googleSheetsApi.js?v=30";
import { loadConnection, connectionLabel } from "./connectionService.js?v=30";
import { loadCsvTable } from "./csvStorage.js?v=30";
import { tableToResponsePayload } from "../utils/tabular.js?v=30";
import { toStringSafe } from "../utils/helpers.js?v=30";

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
  const ordered = responses
    .map((item, index) => ({ item, index, time: Date.parse(item.submittedAt) }))
    .sort((a, b) => {
      const aValid = Number.isFinite(a.time);
      const bValid = Number.isFinite(b.time);
      if (aValid && bValid && a.time !== b.time) return a.time - b.time;
      if (aValid !== bValid) return aValid ? -1 : 1;
      return a.index - b.index;
    })
    .map(({ item }) => item);
  return Object.freeze({
    ok: true,
    generatedAt: toStringSafe(payload.generatedAt) || new Date().toISOString(),
    count: ordered.length,
    responses: Object.freeze(ordered)
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
