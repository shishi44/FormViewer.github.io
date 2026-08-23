import { serializeConnectionForUrl } from "./tabular.js";

function escapeScriptJson(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function downloadBlob(content, fileName, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function buildLiveObsUrl({ connection, templateId, nameFontSize, contentFontSize, selectedId, refreshSeconds = 60 }) {
  if (!connection || connection.type !== "sheet") return "";
  const url = new URL("./obs.html", location.href);
  const sourceParams = serializeConnectionForUrl(connection);
  for (const [key, value] of sourceParams) url.searchParams.set(key, value);
  url.searchParams.set("template", templateId);
  url.searchParams.set("nameSize", String(nameFontSize));
  url.searchParams.set("contentSize", String(contentFontSize));
  if (selectedId) url.searchParams.set("id", selectedId);
  url.searchParams.set("refresh", String(refreshSeconds));
  return url.toString();
}

export async function downloadStandaloneObsHtml({ responses, selectedId, template, values }) {
  if (!Array.isArray(responses) || responses.length === 0) throw new Error("書き出せる回答がありません。");
  const stylesheetResponse = await fetch(template.stylesheet, { cache: "no-store" });
  if (!stylesheetResponse.ok) throw new Error("テンプレートCSSを読み込めませんでした。");
  const templateCss = await stylesheetResponse.text();
  const safeResponses = responses.map((item) => ({ id: String(item.id), name: String(item.name ?? ""), content: String(item.content ?? "") }));
  const initialIndex = Math.max(0, safeResponses.findIndex((item) => item.id === selectedId));
  const dataJson = escapeScriptJson(safeResponses);
  const labelJson = escapeScriptJson(template.label || "MESSAGE FROM");
  const templateIdJson = escapeScriptJson(template.id);

  const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FormViewer OBS</title>
<style>
*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;background:transparent!important;overflow:hidden}body{display:grid;place-items:center;padding:12px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans JP",sans-serif}.template-host{width:min(calc(100vw - 24px),820px)}.template-root{--name-font-size:${values.nameFontSize}px;--content-font-size:${values.contentFontSize}px;--content-height:${template.defaults.contentHeight}px;--content-line-height:${template.defaults.contentLineHeight}}.response-content{overflow-y:auto;overflow-x:hidden;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word}.response-name{overflow-wrap:anywhere}
${templateCss}
</style></head><body>
<div class="template-host"><article class="template-root" data-template=${templateIdJson}><header class="template-name-wrap"><p class="template-label" aria-hidden="true"></p><h1 class="response-name"></h1></header><div class="template-divider" aria-hidden="true"></div><div class="response-content"></div></article></div>
<script>
const responses=${dataJson};let index=${initialIndex};const label=${labelJson};
const nameEl=document.querySelector('.response-name');const contentEl=document.querySelector('.response-content');const labelEl=document.querySelector('.template-label');labelEl.textContent=label;
function render(){const item=responses[index];nameEl.textContent=item?.name||'お名前未入力';contentEl.textContent=item?.content||'内容未入力';contentEl.scrollTop=0}
function move(delta){index=Math.max(0,Math.min(responses.length-1,index+delta));render()}
document.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();move(-1)}else if(e.key==='ArrowRight'){e.preventDefault();move(1)}});
window.addEventListener('message',e=>{if(e.data?.type==='formviewer:navigate')move(Number(e.data.delta)||0)});render();
</script></body></html>`;

  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  downloadBlob(html, `FormViewer_OBS_${date}.html`, "text/html;charset=utf-8");
}
