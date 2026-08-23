import { toStringSafe } from "./helpers.js";

const NAME_HINTS = [
  "お名前(ラジオネーム)", "お名前（ラジオネーム）", "ラジオネーム", "お名前", "名前",
  "ニックネーム", "投稿者名", "ハンドルネーム", "name", "nickname"
];
const CONTENT_HINTS = [
  "内容", "お便り", "おたより", "メッセージ", "本文", "投稿内容", "message", "content"
];
const TIMESTAMP_HINTS = [
  "タイムスタンプ", "日時", "送信日時", "回答日時", "timestamp", "submitted at", "submittedat"
];

function normalizeHeader(value) {
  return toStringSafe(value)
    .trim()
    .toLowerCase()
    .replace(/[\s　_-]/g, "")
    .replace(/[（）]/g, (char) => char === "（" ? "(" : ")");
}

function findHintIndex(headers, hints) {
  const normalized = headers.map(normalizeHeader);
  const normalizedHints = hints.map(normalizeHeader);
  for (const hint of normalizedHints) {
    const exact = normalized.indexOf(hint);
    if (exact >= 0) return exact;
  }
  for (let i = 0; i < normalized.length; i += 1) {
    if (normalizedHints.some((hint) => normalized[i].includes(hint) || hint.includes(normalized[i]))) return i;
  }
  return -1;
}

export function suggestColumnMapping(headers) {
  const timestamp = findHintIndex(headers, TIMESTAMP_HINTS);
  let name = findHintIndex(headers, NAME_HINTS);
  let content = findHintIndex(headers, CONTENT_HINTS);

  const usable = headers.map((_, index) => index).filter((index) => index !== timestamp);
  if (name < 0) name = usable[0] ?? 0;
  if (content < 0) content = usable.find((index) => index !== name) ?? usable[1] ?? name;

  return { nameColumn: name, contentColumn: content, timestampColumn: timestamp };
}

export function tableToResponsePayload(table, mapping = {}, { reverse = true, idPrefix = "response" } = {}) {
  const headers = Array.isArray(table?.headers) ? table.headers : [];
  const rows = Array.isArray(table?.rows) ? table.rows : [];
  const suggested = suggestColumnMapping(headers);
  const nameColumn = Number.isInteger(mapping.nameColumn) ? mapping.nameColumn : suggested.nameColumn;
  const contentColumn = Number.isInteger(mapping.contentColumn) ? mapping.contentColumn : suggested.contentColumn;
  const timestampColumn = Number.isInteger(mapping.timestampColumn) ? mapping.timestampColumn : suggested.timestampColumn;

  const responses = rows
    .map((row, rowIndex) => ({
      id: `${idPrefix}-${rowIndex + 2}`,
      submittedAt: timestampColumn >= 0 ? toStringSafe(row?.[timestampColumn]) : "",
      name: toStringSafe(row?.[nameColumn]),
      content: toStringSafe(row?.[contentColumn])
    }))
    .filter((item) => item.name.trim() || item.content.trim());

  if (reverse) responses.reverse();
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    count: responses.length,
    responses
  };
}

export function parseCsv(text) {
  const source = toStringSafe(text).replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field.replace(/\r$/, ""));
  rows.push(row);

  const nonEmpty = rows.filter((cells) => cells.some((cell) => toStringSafe(cell).trim() !== ""));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };
  const headers = nonEmpty[0].map((value, index) => toStringSafe(value).trim() || `列${index + 1}`);
  const dataRows = nonEmpty.slice(1).map((cells) => headers.map((_, index) => toStringSafe(cells[index])));
  return { headers, rows: dataRows };
}

export function serializeConnectionForUrl(connection) {
  const params = new URLSearchParams();
  if (!connection || connection.type !== "sheet") return params;
  params.set("source", "sheet");
  params.set("sheet", connection.spreadsheetId);
  params.set("gid", String(connection.gid ?? "0"));
  params.set("name", String(connection.nameColumn));
  params.set("content", String(connection.contentColumn));
  params.set("timestamp", String(connection.timestampColumn ?? -1));
  return params;
}
