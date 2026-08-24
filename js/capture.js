import { getTemplateById } from "./config/templates.js?v=30";
import { loadResponses,clearResponseCache } from "./services/responseService.js?v=30";
import { loadSettings,getTemplateSettings,loadSelectedResponseId } from "./services/settingsService.js?v=30";
import { loadConnection } from "./services/connectionService.js?v=30";
import { qs,setText,setHidden } from "./utils/dom.js?v=30";
import { renderResponse,applyTemplateStylesheet } from "./ui/responseRenderer.js?v=30";
const elements={stylesheet:qs("#template-stylesheet"),status:qs("#capture-status"),preview:qs("#capture-preview")};
const state={responses:[],selectedId:"",settings:loadSettings(),connection:loadConnection()};
const channel=typeof BroadcastChannel!=="undefined"?new BroadcastChannel("powaraji-format.capture.v1"):null;
const SELECTED_KEY="google-form-viewer.selected-response.v1",SETTINGS_KEY="google-form-viewer.settings.v1",CONNECTION_KEY="google-form-viewer.connection.v2",SYNC_KEY="powaraji-format.capture-sync.v1";
function hexToRgb(hex){const m=String(hex||"").match(/^#([0-9a-f]{6})$/i);if(!m)return null;const n=parseInt(m[1],16);return[(n>>16)&255,(n>>8)&255,n&255]}
function distance(a,b){return Math.sqrt((a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2)}
function chooseBackground(template){const candidates=["#00ff00","#0066ff","#ff00ff"];const colors=(template.previewColors||[]).map(hexToRgb).filter(Boolean);let best=candidates[0],score=-1;for(const candidate of candidates){const rgb=hexToRgb(candidate);const s=colors.length?Math.min(...colors.map(c=>distance(rgb,c))):0;if(s>score){score=s;best=candidate}}return best}
function showStatus(message){setText(elements.status,message||"");setHidden(elements.status,!message);setHidden(elements.preview,Boolean(message))}
function current(){return state.responses.find(item=>item.id===state.selectedId)||state.responses[0]||null}
function render({preserveScroll=false,scrollTop=0}={}){const response=current();if(!response)return showStatus("表示できるお便りがありません。");state.selectedId=response.id;state.settings=loadSettings();const template=getTemplateById(state.settings.templateId),values=getTemplateSettings(state.settings,template.id);document.body.style.setProperty("--capture-bg",chooseBackground(template));applyTemplateStylesheet(elements.stylesheet,template.id);renderResponse(elements.preview,response,{templateId:template.id,nameFontSize:values.nameFontSize,contentFontSize:values.contentFontSize,boldText:values.boldText});if(preserveScroll)elements.preview.querySelector(".response-content")?.scrollTo({top:scrollTop});showStatus("")}
async function load({force=false}={}){try{if(force)clearResponseCache();state.connection=loadConnection();const payload=await loadResponses({connection:state.connection,force});state.responses=[...payload.responses];state.selectedId=loadSelectedResponseId()||state.selectedId;render()}catch(error){console.error(error);showStatus(error.message||"お便りを読み込めませんでした。")}}
function syncSelection(id){if(!id)return;state.selectedId=String(id);render()}
function syncScroll(top,id){if(id&&current()?.id!==id)syncSelection(id);elements.preview.querySelector(".response-content")?.scrollTo({top:Number(top)||0})}
channel?.addEventListener("message",event=>{const data=event.data||{};if(data.type==="selection")syncSelection(data.id);if(data.type==="scroll")syncScroll(data.top,data.id);if(data.type==="settings")render({preserveScroll:true,scrollTop:elements.preview.querySelector(".response-content")?.scrollTop||0})});
window.addEventListener("storage",event=>{if(event.key===SELECTED_KEY)syncSelection(loadSelectedResponseId());else if(event.key===SETTINGS_KEY)render({preserveScroll:true,scrollTop:elements.preview.querySelector(".response-content")?.scrollTop||0});else if(event.key===CONNECTION_KEY)load({force:true});else if(event.key===SYNC_KEY){try{const data=JSON.parse(event.newValue||"{}");if(data.type==="scroll")syncScroll(data.top,data.id)}catch{}}});
load({force:true});
