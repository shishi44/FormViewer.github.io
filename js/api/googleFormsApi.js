import { APP_CONFIG } from "../config/appConfig.js";
import { isValidCallbackName } from "../utils/helpers.js";

function withTimeout(signal, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("Request timeout", "TimeoutError")), timeoutMs);
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }
  return { signal: controller.signal, cancel: () => clearTimeout(timer) };
}

function validateEndpoint(url) {
  if (!url) throw new Error("GAS Web App URL が未設定です。js/config/appConfig.js を確認してください。");
  const parsed = new URL(url, window.location.href);
  if (parsed.protocol !== "https:") throw new Error("GAS Web App URL は https:// を使用してください。");
  if (!parsed.pathname.endsWith("/exec")) throw new Error("GAS Web App URL は /exec で終わるデプロイURLを指定してください。");
  return parsed.toString();
}

async function fetchJson(url, options = {}) {
  const timeout = withTimeout(options.signal, APP_CONFIG.requestTimeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      redirect: "follow",
      signal: timeout.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    timeout.cancel();
  }
}

function fetchJsonp(url, options = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = `__gfv_jsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    if (!isValidCallbackName(callbackName)) {
      reject(new Error("JSONP callback name validation failed."));
      return;
    }

    const script = document.createElement("script");
    const parsed = new URL(url, window.location.href);
    parsed.searchParams.set("callback", callbackName);
    parsed.searchParams.set("_", String(Date.now()));

    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      delete window[callbackName];
      script.remove();
      fn(value);
    };

    window[callbackName] = (payload) => finish(resolve, payload);
    script.src = parsed.toString();
    script.async = true;
    script.referrerPolicy = "no-referrer";
    script.onerror = () => finish(reject, new Error("GAS Web App のJSONPを読み込めませんでした。公開権限またはデプロイ版を確認してください。"));

    const timer = setTimeout(
      () => finish(reject, new Error("GAS Web App の応答がタイムアウトしました。")),
      APP_CONFIG.requestTimeoutMs
    );

    if (options.signal) {
      options.signal.addEventListener(
        "abort",
        () => finish(reject, options.signal.reason ?? new DOMException("Aborted", "AbortError")),
        { once: true }
      );
    }

    document.head.appendChild(script);
  });
}

export async function fetchGoogleFormResponses(options = {}) {
  const endpoint = validateEndpoint(APP_CONFIG.gasWebAppUrl);

  // Apps Script ContentService は別オリジンへリダイレクトされるため、
  // GitHub Pages からは JSONP を第一経路として使用する。
  if (APP_CONFIG.allowJsonpFallback && !options.disableJsonpFallback) {
    try {
      return await fetchJsonp(endpoint, options);
    } catch (jsonpError) {
      try {
        return await fetchJson(endpoint, options);
      } catch (fetchError) {
        console.error("GAS JSONP failed", jsonpError);
        console.error("GAS fetch failed", fetchError);
        throw new Error(
          "GAS APIに接続できません。Apps Scriptのデプロイを『実行するユーザー: 自分』『アクセスできるユーザー: 全員』にし、最新バージョンを再デプロイしてください。"
        );
      }
    }
  }

  return fetchJson(endpoint, options);
}
