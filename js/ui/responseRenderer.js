import { getTemplateById } from "../config/templates.js?v=30";
import { setText } from "../utils/dom.js?v=30";

export function applyTemplateStylesheet(linkElement, templateId) {
  const template = getTemplateById(templateId);
  const stylesheetHref = `${template.stylesheet}?v=30`;
  if (linkElement.getAttribute("href") !== stylesheetHref) {
    linkElement.setAttribute("href", stylesheetHref);
  }
  return template;
}

export function renderResponse(host, response, options = {}) {
  const root = host.querySelector(".template-root");
  const name = host.querySelector(".response-name");
  const content = host.querySelector(".response-content");
  const label = host.querySelector(".template-label");
  if (!root || !name || !content) throw new Error("Template DOM is incomplete.");

  const template = getTemplateById(options.templateId);
  root.dataset.template = template.id;
  root.style.setProperty("--name-font-size", `${options.nameFontSize ?? template.defaults.nameFontSize}px`);
  root.style.setProperty("--content-font-size", `${options.contentFontSize ?? template.defaults.contentFontSize}px`);
  root.style.setProperty("--content-height", `${template.defaults.contentHeight}px`);
  root.style.setProperty("--content-line-height", String(template.defaults.contentLineHeight));
  root.dataset.boldText = options.boldText ? "true" : "false";

  if (label) setText(label, template.label ?? "MESSAGE FROM");

  // XSS対策: user content is text only.
  setText(name, response?.name || "お名前未入力");
  setText(content, response?.content || "内容未入力");
  content.scrollTop = 0;
}
