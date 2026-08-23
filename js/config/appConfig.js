export const APP_CONFIG = Object.freeze({
  // "sample" | "gas" | "auto"
  // 初回は sample のままUI確認できます。GAS公開後は gas へ変更してください。
  dataSource: "gas",

  // 例: https://script.google.com/macros/s/XXXXXXXXXXXX/exec
  gasWebAppUrl: "https://script.google.com/macros/s/AKfycbyI92IcnJ9cpqFmwPwdE-0ONzCW64LgOId9z0WS1kqZWFgA66kqRcP0r1fXrcj4RMA2/exec",

  // fetch がCORS等で失敗した場合に、公開可能な読み取りデータだけJSONPで再試行します。
  allowJsonpFallback: true,
  requestTimeoutMs: 12000,

  sampleDataUrl: "./data/sampleResponses.json",
  defaultTemplateId: "clean",
  storageKey: "google-form-viewer.settings.v1",
  selectedResponseKey: "google-form-viewer.selected-response.v1"
});

export function resolveDataSource() {
  if (APP_CONFIG.dataSource === "auto") {
    return APP_CONFIG.gasWebAppUrl ? "gas" : "sample";
  }
  return APP_CONFIG.dataSource;
}
