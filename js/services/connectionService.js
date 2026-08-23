import { APP_CONFIG } from "../config/appConfig.js";
import { parseGoogleSheetUrl } from "../api/googleSheetsApi.js";

const memoryFallback = new Map();

function getStored(key) {
  try { return localStorage.getItem(key); }
  catch { return memoryFallback.get(key) ?? null; }
}
function setStored(key, value) {
  memoryFallback.set(key, value);
  try { localStorage.setItem(key, value); } catch { /* memory fallback */ }
}
function removeStored(key) {
  memoryFallback.delete(key);
  try { localStorage.removeItem(key); } catch { /* no-op */ }
}

function sanitizeColumn(value, fallback = -1) {
  const number = Number(value);
  return Number.isInteger(number) && number >= -1 ? number : fallback;
}

export function loadConnection() {
  const raw = getStored(APP_CONFIG.connectionKey);
  if (!raw) return { type: "none" };
  try {
    const value = JSON.parse(raw);
    if (value?.type === "sheet" && value.spreadsheetId) {
      return {
        type: "sheet",
        spreadsheetId: String(value.spreadsheetId),
        gid: String(value.gid ?? "0"),
        sourceUrl: String(value.sourceUrl ?? ""),
        nameColumn: sanitizeColumn(value.nameColumn, 1),
        contentColumn: sanitizeColumn(value.contentColumn, 2),
        timestampColumn: sanitizeColumn(value.timestampColumn, 0)
      };
    }
    if (value?.type === "csv") {
      return {
        type: "csv",
        fileName: String(value.fileName ?? "CSV"),
        nameColumn: sanitizeColumn(value.nameColumn, 1),
        contentColumn: sanitizeColumn(value.contentColumn, 2),
        timestampColumn: sanitizeColumn(value.timestampColumn, 0)
      };
    }
    if (value?.type === "gas" && value.gasWebAppUrl) {
      return {
        type: "gas",
        gasWebAppUrl: String(value.gasWebAppUrl),
        nameColumn: sanitizeColumn(value.nameColumn, 1),
        contentColumn: sanitizeColumn(value.contentColumn, 2),
        timestampColumn: sanitizeColumn(value.timestampColumn, 0)
      };
    }
  } catch { /* fall through */ }
  return { type: "none" };
}

export function saveConnection(connection) {
  setStored(APP_CONFIG.connectionKey, JSON.stringify(connection));
  return connection;
}

export function clearConnection() {
  removeStored(APP_CONFIG.connectionKey);
}

export function createSheetConnection(sheetUrl, mapping) {
  const parsed = parseGoogleSheetUrl(sheetUrl);
  return {
    type: "sheet",
    ...parsed,
    nameColumn: sanitizeColumn(mapping?.nameColumn, 1),
    contentColumn: sanitizeColumn(mapping?.contentColumn, 2),
    timestampColumn: sanitizeColumn(mapping?.timestampColumn, 0)
  };
}

export function connectionFromQuery(params = new URLSearchParams(location.search)) {
  if (params.get("source") !== "sheet") return null;
  const spreadsheetId = params.get("sheet") || "";
  if (!spreadsheetId) return null;
  return {
    type: "sheet",
    spreadsheetId,
    gid: params.get("gid") || "0",
    sourceUrl: "",
    nameColumn: sanitizeColumn(params.get("name"), 1),
    contentColumn: sanitizeColumn(params.get("content"), 2),
    timestampColumn: sanitizeColumn(params.get("timestamp"), 0)
  };
}

export function connectionLabel(connection = loadConnection()) {
  if (connection.type === "sheet") return "Google Sheets";
  if (connection.type === "csv") return "CSV";
  if (connection.type === "gas") return "GAS";
  return "未接続";
}
