export const APP_CONFIG = Object.freeze({
  requestTimeoutMs: 15000,
  sheetRefreshMs: 60000,
  defaultTemplateId: "clean",
  sampleDataUrl: "./data/sampleResponses.json",

  // Browser-local settings. No spreadsheet URL is hard-coded.
  storageKey: "google-form-viewer.settings.v1",
  selectedResponseKey: "google-form-viewer.selected-response.v1",
  connectionKey: "google-form-viewer.connection.v2",
  csvDatabaseName: "google-form-viewer",
  csvDatabaseStore: "datasets",
  csvDatabaseKey: "active-csv-table",
  reviewStateKey: "powaraji-format.review-state.v1"
});
