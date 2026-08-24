const settingsPanel=document.querySelector(".settings-panel");
const boldToggle=document.querySelector("#bold-text-toggle");
const captureButton=document.querySelector("#open-capture-window");
const previewContent=document.querySelector("#editor-preview .response-content");
const captureChannel=typeof BroadcastChannel!=="undefined"?new BroadcastChannel("powaraji-format.capture.v1"):null;
const SELECTED_KEY="google-form-viewer.selected-response.v1";
const SETTINGS_KEY="google-form-viewer.settings.v1";
const SYNC_KEY="powaraji-format.capture-sync.v1";
let savedSettingsScroll=0;let scrollFrame=0;
function publish(message){const payload={...message,at:Date.now()};if(captureChannel)captureChannel.postMessage(payload);else{try{localStorage.setItem(SYNC_KEY,JSON.stringify(payload))}catch{}}}
function currentSelectedId(){try{return localStorage.getItem(SELECTED_KEY)||""}catch{return""}}
function rememberSettingsScroll(){savedSettingsScroll=settingsPanel?.scrollTop||0}
boldToggle?.addEventListener("pointerdown",rememberSettingsScroll,{passive:true});
boldToggle?.addEventListener("keydown",event=>{if(event.key===" "||event.key==="Enter")rememberSettingsScroll()});
boldToggle?.addEventListener("change",()=>{requestAnimationFrame(()=>{if(settingsPanel)settingsPanel.scrollTop=savedSettingsScroll;publish({type:"settings"})})});
document.addEventListener("click",event=>{if(event.target.closest(".template-option")||event.target.closest("#prev-response")||event.target.closest("#next-response")||event.target.closest(".response-item__select")){setTimeout(()=>publish({type:"selection",id:currentSelectedId()}),0)}});
document.addEventListener("input",event=>{if(event.target.closest("#name-font-control")||event.target.closest("#content-font-control"))publish({type:"settings"})});
document.addEventListener("keydown",event=>{if(event.key==="ArrowLeft"||event.key==="ArrowRight")setTimeout(()=>publish({type:"selection",id:currentSelectedId()}),0)});
previewContent?.addEventListener("scroll",()=>{if(scrollFrame)cancelAnimationFrame(scrollFrame);scrollFrame=requestAnimationFrame(()=>publish({type:"scroll",id:currentSelectedId(),top:previewContent.scrollTop}))},{passive:true});
captureButton?.addEventListener("click",()=>{const url=new URL("./capture.html?v=32",location.href);window.open(url.toString(),"powaraji-format-capture","popup=yes,width=1040,height=720,resizable=yes,scrollbars=no")});
window.addEventListener("storage",event=>{if(event.key===SETTINGS_KEY)publish({type:"settings"})});
