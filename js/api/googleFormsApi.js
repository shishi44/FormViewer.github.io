import { APP_CONFIG } from "../config/appConfig.js";
import { isValidCallbackName } from "../utils/helpers.js";

function validateEndpoint(url) {
  if (!url) throw new Error("GAS Web App URLを入力してください。");
  const parsed = new URL(url, window.location.href);
  if (parsed.protocol !== "https:" || !parsed.pathname.endsWith("/exec")) {
    throw new Error("GASのURLは https:// で始まり /exec で終わるWebアプリURLを指定してください。");
  }
  return parsed.toString();
}

function fetchJsonp(url, options = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = `__gfv_gas_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    if (!isValidCallbackName(callbackName)) return reject(new Error("JSONP callback validation failed."));
    const parsed = new URL(url);
    parsed.searchParams.set("callback", callbackName);
    parsed.searchParams.set("_", String(Date.now()));
    const script = document.createElement("script");
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { delete window[callbackName]; } catch { window[callbackName] = undefined; }
      script.remove();
      fn(value);
    };
    window[callbackName] = (payload) => finish(resolve, payload);
    script.src = parsed.toString();
    script.async = true;
    script.referrerPolicy = "no-referrer";
    script.onerror = () => finish(reject, new Error("GAS Web Appを読み込めませんでした。公開権限とデプロイを確認してください。"));
    const timer = setTimeout(() => finish(reject, new Error("GAS Web Appの応答がタイムアウトしました。")), APP_CONFIG.requestTimeoutMs);
    if (options.signal) options.signal.addEventListener("abort", () => finish(reject, options.signal.reason ?? new DOMException("Aborted", "AbortError")), { once: true });
    document.head.appendChild(script);
  });
}

export function fetchGoogleFormResponses(gasWebAppUrl, options = {}) {
  return fetchJsonp(validateEndpoint(gasWebAppUrl), options);
}
