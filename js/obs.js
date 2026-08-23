import { APP_CONFIG } from "./config/appConfig.js";
import { getTemplateById } from "./config/templates.js";
import { loadResponses, clearResponseCache } from "./services/responseService.js";
import { connectionFromQuery, loadConnection } from "./services/connectionService.js";
import { loadSettings, getTemplateSettings } from "./services/settingsService.js";
import { qs, setText, setHidden } from "./utils/dom.js";
import { renderResponse, applyTemplateStylesheet } from "./ui/responseRenderer.js";

const elements = { stylesheet: qs("#template-stylesheet"), preview: qs("#obs-preview"), debug: qs("#obs-debug") };
const params = new URLSearchParams(location.search);
const connection = connectionFromQuery(params) || loadConnection();
const settings = loadSettings();
const template = getTemplateById(params.get("template") || settings.templateId);
const storedValues = getTemplateSettings(settings, template.id);
const values = {
  nameFontSize: Number(params.get("nameSize")) || storedValues.nameFontSize,
  contentFontSize: Number(params.get("contentSize")) || storedValues.contentFontSize
};
const debugEnabled = params.get("debug") === "1";
const refreshSeconds = Math.max(15, Number(params.get("refresh")) || APP_CONFIG.sheetRefreshMs / 1000);
const state = { responses: [], index: 0, selectedId: params.get("id") || "", timer: null };

function debug(message) {
  if (!debugEnabled) return;
  setText(elements.debug, message);
  setHidden(elements.debug, !message);
}

function renderCurrent() {
  const response = state.responses[state.index];
  if (!response) { setHidden(elements.preview, true); return; }
  state.selectedId = response.id;
  applyTemplateStylesheet(elements.stylesheet, template.id);
  renderResponse(elements.preview, response, { templateId: template.id, ...values });
  setHidden(elements.preview, false);
  debug("");
}

function move(delta) {
  if (!state.responses.length) return;
  state.index = Math.max(0, Math.min(state.responses.length - 1, state.index + delta));
  renderCurrent();
}

async function refresh({ force = false } = {}) {
  try {
    if (force) clearResponseCache();
    const payload = await loadResponses({ connection, force });
    state.responses = [...payload.responses];
    const index = state.responses.findIndex((item) => item.id === state.selectedId);
    state.index = index >= 0 ? index : Math.min(state.index, Math.max(0, state.responses.length - 1));
    renderCurrent();
  } catch (error) {
    console.error(error);
    setHidden(elements.preview, true);
    debug(error.message || "回答を取得できませんでした。");
  }
}

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
  if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
});
window.addEventListener("message", (event) => {
  if (event.data?.type === "formviewer:navigate") move(Number(event.data.delta) || 0);
});

refresh({ force: true });
if (connection.type === "sheet") state.timer = setInterval(() => refresh({ force: true }), refreshSeconds * 1000);
