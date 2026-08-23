import { APP_CONFIG } from "../config/appConfig.js";

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("このブラウザではCSVの保存機能を利用できません。"));
      return;
    }
    const request = indexedDB.open(APP_CONFIG.csvDatabaseName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(APP_CONFIG.csvDatabaseStore)) db.createObjectStore(APP_CONFIG.csvDatabaseStore);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("CSV保存領域を開けませんでした。"));
  });
}

export async function saveCsvTable(table) {
  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(APP_CONFIG.csvDatabaseStore, "readwrite");
    tx.objectStore(APP_CONFIG.csvDatabaseStore).put(table, APP_CONFIG.csvDatabaseKey);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error("CSVを保存できませんでした。"));
  });
  db.close();
}

export async function loadCsvTable() {
  const db = await openDatabase();
  const value = await new Promise((resolve, reject) => {
    const tx = db.transaction(APP_CONFIG.csvDatabaseStore, "readonly");
    const request = tx.objectStore(APP_CONFIG.csvDatabaseStore).get(APP_CONFIG.csvDatabaseKey);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error || new Error("CSVを読み込めませんでした。"));
  });
  db.close();
  return value;
}

export async function clearCsvTable() {
  try {
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(APP_CONFIG.csvDatabaseStore, "readwrite");
      tx.objectStore(APP_CONFIG.csvDatabaseStore).delete(APP_CONFIG.csvDatabaseKey);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch { /* no-op */ }
}
