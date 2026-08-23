/**
 * Googleフォーム回答テンプレートビューアー用 読み取り専用API
 *
 * 推奨: Googleフォーム回答先スプレッドシートに紐づく Apps Script として使用。
 * スタンドアロンの場合は SPREADSHEET_ID を設定してください。
 */
const CONFIG = Object.freeze({
  SPREADSHEET_ID: '',
  SHEET_NAME: 'フォームの回答 1',
  HEADER_TIMESTAMP: 'タイムスタンプ',
  HEADER_NAME: 'お名前(ラジオネーム)',
  HEADER_CONTENT: '内容'
});

function doGet(e) {
  try {
    const payload = buildPayload_();
    return outputPayload_(payload, e);
  } catch (error) {
    console.error(error);
    const payload = {
      ok: false,
      error: {
        code: error && error.code ? String(error.code) : 'SHEET_READ_FAILED',
        message: error && error.publicMessage
          ? String(error.publicMessage)
          : '回答データを取得できませんでした。'
      }
    };
    return outputPayload_(payload, e);
  }
}

function buildPayload_() {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    throw publicError_('SHEET_NOT_FOUND', '回答シートが見つかりませんでした。');
  }

  const values = sheet.getDataRange().getValues();
  if (values.length === 0) {
    return successPayload_([]);
  }

  const headers = values[0].map(function (value) { return String(value).trim(); });
  const indexes = {
    timestamp: headers.indexOf(CONFIG.HEADER_TIMESTAMP),
    name: headers.indexOf(CONFIG.HEADER_NAME),
    content: headers.indexOf(CONFIG.HEADER_CONTENT)
  };

  if (indexes.name < 0 || indexes.content < 0) {
    throw publicError_('REQUIRED_HEADER_MISSING', '必須の回答項目が見つかりませんでした。');
  }

  const responses = [];
  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];
    const hasAnyValue = row.some(function (value) { return String(value == null ? '' : value).trim() !== ''; });
    if (!hasAnyValue) continue;

    responses.push({
      id: 'response-' + String(rowIndex + 1),
      submittedAt: indexes.timestamp >= 0 ? normalizeTimestamp_(row[indexes.timestamp]) : '',
      name: normalizeString_(row[indexes.name]),
      content: normalizeString_(row[indexes.content])
    });
  }

  responses.reverse();
  return successPayload_(responses);
}

function getSpreadsheet_() {
  if (CONFIG.SPREADSHEET_ID) {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  }
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw publicError_('SPREADSHEET_NOT_CONFIGURED', 'スプレッドシートが設定されていません。');
  }
  return active;
}

function normalizeString_(value) {
  return value == null ? '' : String(value);
}

function normalizeTimestamp_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString();
  }
  return normalizeString_(value);
}

function successPayload_(responses) {
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    count: responses.length,
    responses: responses
  };
}

function outputPayload_(payload, e) {
  const json = JSON.stringify(payload);
  const callback = e && e.parameter ? String(e.parameter.callback || '') : '';

  if (callback) {
    if (!isValidCallback_(callback)) {
      return ContentService
        .createTextOutput(JSON.stringify({
          ok: false,
          error: { code: 'INVALID_CALLBACK', message: 'callbackパラメータが不正です。' }
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService
      .createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function isValidCallback_(callback) {
  return /^[A-Za-z_$][0-9A-Za-z_$\.]{0,127}$/.test(callback);
}

function publicError_(code, publicMessage) {
  const error = new Error(publicMessage);
  error.code = code;
  error.publicMessage = publicMessage;
  return error;
}
