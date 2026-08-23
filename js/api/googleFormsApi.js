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
    script.onerror = () => finish(reject, new Error("JSONP request failed."));

    const timer = setTimeout(() => finish(reject, new Error("JSONP request timed out.")), APP_CONFIG.requestTimeoutMs);
    if (options.signal) {
      options.signal.addEventListener("abort", () => finish(reject, options.signal.reason ?? new DOMException("Aborted", "AbortError")), { once: true });
    }
    document.head.appendChild(script);
  });
}

export async function fetchGoogleFormResponses(options = {}) {
  const endpoint = validateEndpoint(APP_CONFIG.gasWebAppUrl);
  try {
    return await fetchJson(endpoint, options);
  } catch (error) {
    if (!APP_CONFIG.allowJsonpFallback || options.disableJsonpFallback) throw error;
    console.warn("GAS fetch failed. Trying JSONP fallback for public read-only data.", error);
    return fetchJsonp(endpoint, options);
  }
}
