# Architecture

## データフロー

```text
Google Forms
  ↓
Google Sheets
  ↓ SpreadsheetApp
Google Apps Script Web App
  ↓ JSON / JSONP fallback
js/api/googleFormsApi.js
  ↓
js/services/responseService.js
  ↓
editor.js / app.js
  ↓
responseRenderer.js
  ↓
テンプレートCSS
```

## 責務境界

- `js/api/`: 外部I/O。将来Vercel APIへ差し替える境界。
- `js/services/`: 正規化、設定保存、キャッシュ。
- `js/ui/`: DOM生成と表示のみ。
- `templates/`: 表示デザインのみ。APIやlocalStorageへ依存しない。
- `gas/`: 読み取り専用のGoogle側実装。

## 公開範囲

v1は回答が公開されても問題ない運用を前提とする。非公開回答や認証が必要になった場合はGitHub Pages + 公開GAS方式を継続せず、サーバーサイドAPIへ移行する。
