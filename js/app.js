import { getTemplateById } from "./config/templates.js";
import { loadResponses } from "./services/responseService.js";
import { loadSettings, getTemplateSettings, loadSelectedResponseId } from "./services/settingsService.js";
import { qs, setText, setHidden } from "./utils/dom.js";
import { renderResponse, applyTemplateStylesheet } from "./ui/responseRenderer.js";

const elements = {
  stylesheet: qs("#template-stylesheet"),
  status: qs("#viewer-status"),
  preview: qs("#viewer-preview")
};

function showStatus(message) {
  setText(elements.status, message);
  setHidden(elements.status, !message);
  setHidden(elements.preview, Boolean(message));
}

async function init() {
  showStatus("回答を読み込んでいます…");
  try {
    const payload = await loadResponses();
    const params = new URLSearchParams(location.search);
    const requestedId = params.get("id") || loadSelectedResponseId();
    const response = payload.responses.find((item) => item.id === requestedId) || payload.responses[0];
    if (!response) {
      showStatus("表示できる回答がありません。");
      return;
    }

    const settings = loadSettings();
    const requestedTemplateId = params.get("template");
    const template = getTemplateById(requestedTemplateId || settings.templateId);
    const values = getTemplateSettings(settings, template.id);
    applyTemplateStylesheet(elements.stylesheet, template.id);
    renderResponse(elements.preview, response, {
      templateId: template.id,
      nameFontSize: values.nameFontSize,
      contentFontSize: values.contentFontSize
    });
    showStatus("");
  } catch (error) {
    console.error(error);
    showStatus(`回答を表示できませんでした: ${error.message || "取得エラー"}`);
  }
}

init();
