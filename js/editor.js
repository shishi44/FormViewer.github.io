import { TEMPLATES, FONT_LIMITS, getTemplateById } from "./config/templates.js";
import { loadResponses, getDataSourceLabel } from "./services/responseService.js";
import {
  loadSettings,
  getTemplateSettings,
  updateTemplateSettings,
  resetTemplateSettings,
  saveSelectedResponseId,
  loadSelectedResponseId
} from "./services/settingsService.js";
import { qs, setText, setHidden } from "./utils/dom.js";
import { formatDateTime } from "./utils/helpers.js";
import { renderResponse, applyTemplateStylesheet } from "./ui/responseRenderer.js";
import { renderResponseList, updateSelectedResponse } from "./ui/responseList.js";
import { renderTemplateSelector, updateSelectedTemplate } from "./ui/templateSelector.js";
import { createFontSizeControl } from "./ui/fontSizeControl.js";

const elements = {
  stylesheet: qs("#template-stylesheet"),
  reloadButton: qs("#reload-button"),
  sourceBadge: qs("#data-source-badge"),
  responseCount: qs("#response-count"),
  listCount: qs("#list-count"),
  lastUpdated: qs("#last-updated"),
  responsesState: qs("#responses-state"),
  responseList: qs("#response-list"),
  previewState: qs("#preview-state"),
  preview: qs("#editor-preview"),
  prevButton: qs("#prev-response"),
  nextButton: qs("#next-response"),
  responsePosition: qs("#response-position"),
  templateSelector: qs("#template-selector"),
  templateName: qs("#template-name"),
  nameControl: qs("#name-font-control"),
  contentControl: qs("#content-font-control"),
  nameSizeLabel: qs("#name-size-label"),
  contentSizeLabel: qs("#content-size-label"),
  resetTemplate: qs("#reset-template")
};

const state = {
  responses: [],
  selectedId: "",
  settings: loadSettings(),
  loading: false,
  error: null
};

let nameControlApi;
let contentControlApi;

function selectedIndex() {
  return state.responses.findIndex((response) => response.id === state.selectedId);
}

function selectedResponse() {
  const index = selectedIndex();
  return index >= 0 ? state.responses[index] : null;
}

function setStatus(type, message) {
  elements.responsesState.dataset.state = type || "";
  setText(elements.responsesState, message || "");
}

function setPreviewStatus(message) {
  setText(elements.previewState, message || "");
  setHidden(elements.previewState, !message);
  setHidden(elements.preview, Boolean(message));
}

function updateControlsFromSettings() {
  const template = getTemplateById(state.settings.templateId);
  const values = getTemplateSettings(state.settings, template.id);
  elements.templateName.textContent = template.name;
  elements.nameSizeLabel.textContent = `${values.nameFontSize}px`;
  elements.contentSizeLabel.textContent = `${values.contentFontSize}px`;
  nameControlApi?.setValue(values.nameFontSize);
  contentControlApi?.setValue(values.contentFontSize);
  updateSelectedTemplate(elements.templateSelector, template.id);
}

function renderCurrentResponse() {
  const response = selectedResponse();
  const template = getTemplateById(state.settings.templateId);
  const values = getTemplateSettings(state.settings, template.id);
  applyTemplateStylesheet(elements.stylesheet, template.id);

  if (!response) {
    setPreviewStatus(state.loading ? "回答を読み込んでいます…" : state.error ? "回答を表示できません。" : "表示する回答がありません。");
    elements.responsePosition.textContent = "— / —";
    elements.prevButton.disabled = true;
    elements.nextButton.disabled = true;
    return;
  }

  setPreviewStatus("");
  renderResponse(elements.preview, response, {
    templateId: template.id,
    nameFontSize: values.nameFontSize,
    contentFontSize: values.contentFontSize
  });

  const index = selectedIndex();
  elements.responsePosition.textContent = `${index + 1} / ${state.responses.length}`;
  elements.prevButton.disabled = index <= 0;
  elements.nextButton.disabled = index < 0 || index >= state.responses.length - 1;
  updateSelectedResponse(elements.responseList, response.id);
}

function selectResponse(id, { focusList = false } = {}) {
  if (!state.responses.some((response) => response.id === id)) return;
  state.selectedId = id;
  saveSelectedResponseId(id);
  renderCurrentResponse();
  if (focusList) {
    elements.responseList.querySelector(`[data-response-id="${CSS.escape(id)}"]`)?.focus();
  }
}

function renderList() {
  renderResponseList(elements.responseList, state.responses, state.selectedId, (id) => selectResponse(id));
  elements.listCount.textContent = String(state.responses.length);
  elements.responseCount.textContent = `${state.responses.length}件`;
}

async function refreshResponses({ force = false } = {}) {
  if (state.loading) return;
  state.loading = true;
  state.error = null;
  elements.reloadButton.disabled = true;
  setStatus("loading", "回答を読み込んでいます…");
  setPreviewStatus("回答を読み込んでいます…");

  try {
    const payload = await loadResponses({ force });
    state.responses = [...payload.responses];
    const preferredId = state.selectedId || loadSelectedResponseId();
    state.selectedId = state.responses.some((item) => item.id === preferredId)
      ? preferredId
      : state.responses[0]?.id || "";

    if (state.selectedId) saveSelectedResponseId(state.selectedId);
    renderList();
    if (state.responses.length === 0) {
      setStatus("empty", "まだ回答がありません。");
    } else {
      setStatus("", "");
    }
    elements.lastUpdated.textContent = payload.generatedAt ? `更新 ${formatDateTime(payload.generatedAt)}` : "取得済み";
  } catch (error) {
    console.error(error);
    state.responses = [];
    state.selectedId = "";
    state.error = error;
    renderList();
    setStatus("error", `取得エラー: ${error.message || "回答データを取得できませんでした。"}`);
    elements.lastUpdated.textContent = "取得失敗";
  } finally {
    state.loading = false;
    elements.reloadButton.disabled = false;
    renderCurrentResponse();
  }
}

function selectTemplate(templateId) {
  state.settings = updateTemplateSettings(state.settings, templateId, {});
  applyTemplateStylesheet(elements.stylesheet, templateId);
  updateControlsFromSettings();
  renderCurrentResponse();
}

function changeFont(kind, value) {
  const patch = kind === "name" ? { nameFontSize: value } : { contentFontSize: value };
  state.settings = updateTemplateSettings(state.settings, state.settings.templateId, patch);
  updateControlsFromSettings();
  renderCurrentResponse();
}

function initControls() {
  const initial = getTemplateSettings(state.settings, state.settings.templateId);
  nameControlApi = createFontSizeControl(elements.nameControl, {
    label: "お名前のフォントサイズ",
    ...FONT_LIMITS.name,
    value: initial.nameFontSize,
    onChange: (value) => changeFont("name", value)
  });
  contentControlApi = createFontSizeControl(elements.contentControl, {
    label: "内容のフォントサイズ",
    ...FONT_LIMITS.content,
    value: initial.contentFontSize,
    onChange: (value) => changeFont("content", value)
  });
}

function initEvents() {
  elements.reloadButton.addEventListener("click", () => refreshResponses({ force: true }));
  elements.prevButton.addEventListener("click", () => {
    const index = selectedIndex();
    if (index > 0) selectResponse(state.responses[index - 1].id, { focusList: false });
  });
  elements.nextButton.addEventListener("click", () => {
    const index = selectedIndex();
    if (index >= 0 && index < state.responses.length - 1) selectResponse(state.responses[index + 1].id, { focusList: false });
  });
  elements.resetTemplate.addEventListener("click", () => {
    state.settings = resetTemplateSettings(state.settings, state.settings.templateId);
    updateControlsFromSettings();
    renderCurrentResponse();
  });

  document.addEventListener("keydown", (event) => {
    if (event.altKey && event.key === "ArrowUp") {
      event.preventDefault();
      elements.prevButton.click();
    }
    if (event.altKey && event.key === "ArrowDown") {
      event.preventDefault();
      elements.nextButton.click();
    }
  });
}

function init() {
  elements.sourceBadge.textContent = getDataSourceLabel();
  renderTemplateSelector(elements.templateSelector, TEMPLATES, state.settings.templateId, selectTemplate);
  initControls();
  updateControlsFromSettings();
  initEvents();
  refreshResponses();
}

init();
