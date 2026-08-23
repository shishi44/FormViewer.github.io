import { TEMPLATES, FONT_LIMITS, getTemplateById } from "./config/templates.js";
import { fetchGoogleSheetTable, parseGoogleSheetUrl } from "./api/googleSheetsApi.js";
import { loadResponses, getDataSourceLabel, clearResponseCache } from "./services/responseService.js";
import { loadConnection, saveConnection, clearConnection, createSheetConnection } from "./services/connectionService.js";
import { saveCsvTable, clearCsvTable } from "./services/csvStorage.js";
import {
  loadSettings, getTemplateSettings, updateTemplateSettings, resetTemplateSettings,
  saveSelectedResponseId, loadSelectedResponseId
} from "./services/settingsService.js";
import { qs, setText, setHidden } from "./utils/dom.js";
import { formatDateTime } from "./utils/helpers.js";
import { parseCsv, suggestColumnMapping } from "./utils/tabular.js";
import { buildLiveObsUrl, downloadStandaloneObsHtml } from "./utils/obsExport.js";
import { renderResponse, applyTemplateStylesheet } from "./ui/responseRenderer.js";
import { renderResponseList, updateSelectedResponse } from "./ui/responseList.js";
import { renderTemplateSelector, updateSelectedTemplate } from "./ui/templateSelector.js";
import { createFontSizeControl } from "./ui/fontSizeControl.js";

const elements = {
  stylesheet: qs("#template-stylesheet"), reloadButton: qs("#reload-button"), connectionButton: qs("#connection-button"), obsButton: qs("#obs-button"),
  responseCount: qs("#response-count"), listCount: qs("#list-count"), lastUpdated: qs("#last-updated"), responsesState: qs("#responses-state"),
  responseList: qs("#response-list"), previewState: qs("#preview-state"), preview: qs("#editor-preview"), prevButton: qs("#prev-response"),
  nextButton: qs("#next-response"), responsePosition: qs("#response-position"), templateSelector: qs("#template-selector"), templateName: qs("#template-name"),
  nameControl: qs("#name-font-control"), contentControl: qs("#content-font-control"), nameSizeLabel: qs("#name-size-label"), contentSizeLabel: qs("#content-size-label"),
  resetTemplate: qs("#reset-template"), connectionDialog: qs("#connection-dialog"), obsDialog: qs("#obs-dialog"),
  sheetUrl: qs("#sheet-url-input"), sheetRead: qs("#sheet-read-button"), sheetState: qs("#sheet-connect-state"), sheetMapping: qs("#sheet-mapping"),
  sheetName: qs("#sheet-name-column"), sheetContent: qs("#sheet-content-column"), sheetTimestamp: qs("#sheet-timestamp-column"), sheetSave: qs("#sheet-save-button"),
  csvFile: qs("#csv-file-input"), csvState: qs("#csv-connect-state"), csvMapping: qs("#csv-mapping"), csvName: qs("#csv-name-column"),
  csvContent: qs("#csv-content-column"), csvTimestamp: qs("#csv-timestamp-column"), csvSave: qs("#csv-save-button"),
  gasUrl: qs("#gas-url-input"), gasState: qs("#gas-connect-state"), gasSave: qs("#gas-save-button"), disconnect: qs("#disconnect-button"),
  obsLiveUrl: qs("#obs-live-url"), obsLiveNote: qs("#obs-live-note"), copyObsUrl: qs("#copy-obs-url"), downloadObsHtml: qs("#download-obs-html")
};

const state = {
  responses: [], selectedId: "", settings: loadSettings(), connection: loadConnection(), loading: false, error: null,
  pendingSheet: null, pendingCsv: null, pendingCsvFileName: ""
};
let nameControlApi;
let contentControlApi;

function selectedIndex() { return state.responses.findIndex((response) => response.id === state.selectedId); }
function selectedResponse() { const index = selectedIndex(); return index >= 0 ? state.responses[index] : null; }
function setStatus(type, message) { elements.responsesState.dataset.state = type || ""; setText(elements.responsesState, message || ""); }
function setPreviewStatus(message) { setText(elements.previewState, message || ""); setHidden(elements.previewState, !message); setHidden(elements.preview, Boolean(message)); }
function updateConnectionBadge() { elements.connectionButton.textContent = getDataSourceLabel(state.connection); elements.connectionButton.dataset.connected = state.connection.type !== "none" ? "true" : "false"; }

function updateControlsFromSettings() {
  const template = getTemplateById(state.settings.templateId);
  const values = getTemplateSettings(state.settings, template.id);
  elements.templateName.textContent = template.name;
  elements.nameSizeLabel.textContent = `${values.nameFontSize}px`;
  elements.contentSizeLabel.textContent = `${values.contentFontSize}px`;
  nameControlApi?.setValue(values.nameFontSize); contentControlApi?.setValue(values.contentFontSize);
  updateSelectedTemplate(elements.templateSelector, template.id);
}

function renderCurrentResponse() {
  const response = selectedResponse();
  const template = getTemplateById(state.settings.templateId);
  const values = getTemplateSettings(state.settings, template.id);
  applyTemplateStylesheet(elements.stylesheet, template.id);
  if (!response) {
    setPreviewStatus(state.loading ? "回答を読み込んでいます…" : state.error ? "回答を表示できません。" : "表示する回答がありません。");
    elements.responsePosition.textContent = "— / —"; elements.prevButton.disabled = true; elements.nextButton.disabled = true; return;
  }
  setPreviewStatus("");
  renderResponse(elements.preview, response, { templateId: template.id, nameFontSize: values.nameFontSize, contentFontSize: values.contentFontSize });
  const index = selectedIndex();
  elements.responsePosition.textContent = `${index + 1} / ${state.responses.length}`;
  elements.prevButton.disabled = index <= 0; elements.nextButton.disabled = index < 0 || index >= state.responses.length - 1;
  updateSelectedResponse(elements.responseList, response.id);
}

function selectResponse(id, { focusList = false } = {}) {
  if (!state.responses.some((response) => response.id === id)) return;
  state.selectedId = id; saveSelectedResponseId(id); renderCurrentResponse();
  if (focusList) elements.responseList.querySelector(`[data-response-id="${CSS.escape(id)}"]`)?.focus();
}

function renderList() {
  renderResponseList(elements.responseList, state.responses, state.selectedId, (id) => selectResponse(id));
  elements.listCount.textContent = String(state.responses.length); elements.responseCount.textContent = `${state.responses.length}件`;
}

async function refreshResponses({ force = false } = {}) {
  if (state.loading) return;
  if (state.connection.type === "none") {
    state.responses = []; state.selectedId = ""; state.error = null; renderList();
    setStatus("empty", "回答データを接続してください。"); setPreviewStatus("回答データを接続してください。"); elements.lastUpdated.textContent = "未接続"; updateConnectionBadge(); return;
  }
  state.loading = true; state.error = null; elements.reloadButton.disabled = true; setStatus("loading", "回答を読み込んでいます…"); setPreviewStatus("回答を読み込んでいます…");
  try {
    if (force) clearResponseCache();
    const payload = await loadResponses({ force, connection: state.connection });
    state.responses = [...payload.responses];
    const preferredId = state.selectedId || loadSelectedResponseId();
    state.selectedId = state.responses.some((item) => item.id === preferredId) ? preferredId : state.responses[0]?.id || "";
    if (state.selectedId) saveSelectedResponseId(state.selectedId);
    renderList(); setStatus(state.responses.length ? "" : "empty", state.responses.length ? "" : "まだ回答がありません。");
    elements.lastUpdated.textContent = payload.generatedAt ? `更新 ${formatDateTime(payload.generatedAt)}` : "取得済み";
  } catch (error) {
    console.error(error); state.responses = []; state.selectedId = ""; state.error = error; renderList();
    setStatus("error", `取得エラー: ${error.message || "回答データを取得できませんでした。"}`); elements.lastUpdated.textContent = "取得失敗";
  } finally {
    state.loading = false; elements.reloadButton.disabled = false; renderCurrentResponse(); updateConnectionBadge();
  }
}

function populateColumnSelects(table, selects, suggested = suggestColumnMapping(table.headers)) {
  for (const select of selects) {
    select.replaceChildren();
    if (select.dataset.optional === "true") select.append(new Option("使用しない", "-1"));
    table.headers.forEach((header, index) => select.append(new Option(`${index + 1}. ${header}`, String(index))));
  }
  selects[0].value = String(suggested.nameColumn); selects[1].value = String(suggested.contentColumn);
  selects[2].value = String(suggested.timestampColumn >= 0 ? suggested.timestampColumn : -1);
}

function readMapping(nameSelect, contentSelect, timestampSelect) {
  return { nameColumn: Number(nameSelect.value), contentColumn: Number(contentSelect.value), timestampColumn: Number(timestampSelect.value) };
}

function switchConnectionTab(tabName) {
  document.querySelectorAll("[data-connection-tab]").forEach((button) => button.classList.toggle("is-active", button.dataset.connectionTab === tabName));
  document.querySelectorAll("[data-connection-pane]").forEach((pane) => pane.classList.toggle("is-active", pane.dataset.connectionPane === tabName));
}

function openConnectionDialog() {
  const connection = state.connection;
  if (connection.type === "sheet") { elements.sheetUrl.value = connection.sourceUrl || `https://docs.google.com/spreadsheets/d/${connection.spreadsheetId}/edit#gid=${connection.gid}`; switchConnectionTab("sheet"); }
  else if (connection.type === "gas") { elements.gasUrl.value = connection.gasWebAppUrl || ""; switchConnectionTab("gas"); }
  else switchConnectionTab("sheet");
  elements.connectionDialog.showModal();
}

async function testSheet() {
  setText(elements.sheetState, "読み込んでいます…"); elements.sheetState.dataset.state = "loading"; setHidden(elements.sheetMapping, true);
  try {
    const parsed = parseGoogleSheetUrl(elements.sheetUrl.value);
    const table = await fetchGoogleSheetTable(parsed);
    if (!table.headers.length) throw new Error("列を取得できませんでした。");
    state.pendingSheet = table;
    populateColumnSelects(table, [elements.sheetName, elements.sheetContent, elements.sheetTimestamp]);
    setText(elements.sheetState, `接続できました。${table.rows.length}件のデータを確認しました。`); elements.sheetState.dataset.state = "success"; setHidden(elements.sheetMapping, false);
  } catch (error) {
    state.pendingSheet = null; setText(elements.sheetState, error.message); elements.sheetState.dataset.state = "error";
  }
}

async function saveSheetConnection() {
  if (!state.pendingSheet) return testSheet();
  try {
    state.connection = saveConnection(createSheetConnection(elements.sheetUrl.value, readMapping(elements.sheetName, elements.sheetContent, elements.sheetTimestamp)));
    clearResponseCache(); elements.connectionDialog.close(); updateConnectionBadge(); await refreshResponses({ force: true });
  } catch (error) { setText(elements.sheetState, error.message); elements.sheetState.dataset.state = "error"; }
}

async function loadCsvFile(file) {
  if (!file) return;
  setText(elements.csvState, "CSVを読み込んでいます…"); elements.csvState.dataset.state = "loading"; setHidden(elements.csvMapping, true);
  try {
    const text = await file.text(); const table = parseCsv(text);
    if (table.headers.length < 2) throw new Error("CSVの列を確認できませんでした。1行目に見出しが必要です。");
    state.pendingCsv = table; state.pendingCsvFileName = file.name;
    populateColumnSelects(table, [elements.csvName, elements.csvContent, elements.csvTimestamp]);
    setText(elements.csvState, `${file.name} / ${table.rows.length}件を確認しました。`); elements.csvState.dataset.state = "success"; setHidden(elements.csvMapping, false);
  } catch (error) { state.pendingCsv = null; setText(elements.csvState, error.message); elements.csvState.dataset.state = "error"; }
}

async function saveCsvConnection() {
  if (!state.pendingCsv) { setText(elements.csvState, "先にCSVファイルを選択してください。"); elements.csvState.dataset.state = "error"; return; }
  try {
    await saveCsvTable(state.pendingCsv);
    state.connection = saveConnection({ type: "csv", fileName: state.pendingCsvFileName, ...readMapping(elements.csvName, elements.csvContent, elements.csvTimestamp) });
    clearResponseCache(); elements.connectionDialog.close(); updateConnectionBadge(); await refreshResponses({ force: true });
  } catch (error) { setText(elements.csvState, error.message); elements.csvState.dataset.state = "error"; }
}

async function saveGasConnection() {
  const value = elements.gasUrl.value.trim();
  try {
    const url = new URL(value); if (url.protocol !== "https:" || !url.pathname.endsWith("/exec")) throw new Error("/execで終わるGAS Web App URLを入力してください。");
    state.connection = saveConnection({ type: "gas", gasWebAppUrl: url.toString() }); clearResponseCache(); elements.connectionDialog.close(); updateConnectionBadge(); await refreshResponses({ force: true });
  } catch (error) { setText(elements.gasState, error.message); elements.gasState.dataset.state = "error"; }
}

async function disconnect() {
  clearConnection(); await clearCsvTable(); clearResponseCache(); state.connection = { type: "none" }; state.responses = []; state.selectedId = ""; updateConnectionBadge();
  setText(elements.sheetState, ""); setText(elements.csvState, ""); setText(elements.gasState, ""); elements.connectionDialog.close(); await refreshResponses(); setTimeout(openConnectionDialog, 50);
}

function selectTemplate(templateId) { state.settings = updateTemplateSettings(state.settings, templateId, {}); applyTemplateStylesheet(elements.stylesheet, templateId); updateControlsFromSettings(); renderCurrentResponse(); }
function changeFont(kind, value) { const patch = kind === "name" ? { nameFontSize: value } : { contentFontSize: value }; state.settings = updateTemplateSettings(state.settings, state.settings.templateId, patch); updateControlsFromSettings(); renderCurrentResponse(); }

function initControls() {
  const initial = getTemplateSettings(state.settings, state.settings.templateId);
  nameControlApi = createFontSizeControl(elements.nameControl, { label: "お名前のフォントサイズ", ...FONT_LIMITS.name, value: initial.nameFontSize, onChange: (value) => changeFont("name", value) });
  contentControlApi = createFontSizeControl(elements.contentControl, { label: "内容のフォントサイズ", ...FONT_LIMITS.content, value: initial.contentFontSize, onChange: (value) => changeFont("content", value) });
}

function updateObsDialog() {
  const template = getTemplateById(state.settings.templateId); const values = getTemplateSettings(state.settings, template.id);
  const liveUrl = buildLiveObsUrl({ connection: state.connection, templateId: template.id, ...values, selectedId: state.selectedId });
  elements.obsLiveUrl.value = liveUrl;
  elements.copyObsUrl.disabled = !liveUrl;
  elements.obsLiveNote.textContent = liveUrl ? "このURLはGoogleスプレッドシートから約60秒ごとに再取得します。" : "自動更新URLはGoogleスプレッドシート接続時のみ利用できます。CSVはOBS用HTMLを使用してください。";
  elements.downloadObsHtml.disabled = state.responses.length === 0;
}

async function copyObsUrl() {
  const value = elements.obsLiveUrl.value; if (!value) return;
  try { await navigator.clipboard.writeText(value); elements.copyObsUrl.textContent = "コピー済み"; setTimeout(() => { elements.copyObsUrl.textContent = "コピー"; }, 1400); }
  catch { elements.obsLiveUrl.select(); document.execCommand("copy"); }
}

async function downloadObsHtml() {
  try {
    const template = getTemplateById(state.settings.templateId); const values = getTemplateSettings(state.settings, template.id);
    await downloadStandaloneObsHtml({ responses: state.responses, selectedId: state.selectedId, template, values });
  } catch (error) { alert(error.message || "OBS用HTMLを書き出せませんでした。"); }
}

function isTypingTarget(target) { return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable; }

function initEvents() {
  elements.reloadButton.addEventListener("click", () => refreshResponses({ force: true })); elements.connectionButton.addEventListener("click", openConnectionDialog);
  elements.obsButton.addEventListener("click", () => { updateObsDialog(); elements.obsDialog.showModal(); });
  elements.prevButton.addEventListener("click", () => { const index = selectedIndex(); if (index > 0) selectResponse(state.responses[index - 1].id); });
  elements.nextButton.addEventListener("click", () => { const index = selectedIndex(); if (index >= 0 && index < state.responses.length - 1) selectResponse(state.responses[index + 1].id); });
  elements.resetTemplate.addEventListener("click", () => { state.settings = resetTemplateSettings(state.settings, state.settings.templateId); updateControlsFromSettings(); renderCurrentResponse(); });
  document.querySelectorAll("[data-connection-tab]").forEach((button) => button.addEventListener("click", () => switchConnectionTab(button.dataset.connectionTab)));
  elements.sheetRead.addEventListener("click", testSheet); elements.sheetSave.addEventListener("click", saveSheetConnection);
  elements.csvFile.addEventListener("change", () => loadCsvFile(elements.csvFile.files?.[0])); elements.csvSave.addEventListener("click", saveCsvConnection);
  elements.gasSave.addEventListener("click", saveGasConnection); elements.disconnect.addEventListener("click", disconnect);
  elements.copyObsUrl.addEventListener("click", copyObsUrl); elements.downloadObsHtml.addEventListener("click", downloadObsHtml);
  elements.sheetTimestamp.dataset.optional = "true"; elements.csvTimestamp.dataset.optional = "true";

  document.addEventListener("keydown", (event) => {
    if (elements.connectionDialog.open || elements.obsDialog.open || isTypingTarget(event.target)) return;
    if (event.key === "ArrowLeft") { event.preventDefault(); elements.prevButton.click(); }
    if (event.key === "ArrowRight") { event.preventDefault(); elements.nextButton.click(); }
  });
}

function init() {
  updateConnectionBadge(); renderTemplateSelector(elements.templateSelector, TEMPLATES, state.settings.templateId, selectTemplate); initControls(); updateControlsFromSettings(); initEvents();
  refreshResponses(); if (state.connection.type === "none") setTimeout(openConnectionDialog, 120);
}

init();
