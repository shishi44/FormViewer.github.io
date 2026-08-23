# Architecture

## 標準経路

Google Form → Google Sheets（リンク共有）→ Google Visualization `/gviz/tq` → FormViewer

Google SheetsはURLからSpreadsheet IDとgidを抽出し、script injection方式でブラウザから直接読み取る。サーバーやGASは標準経路に含めない。

## CSV経路

CSV → browser parser → IndexedDB → Response Service → Renderer

CSVは外部送信しない。

## OBS

### Live URL

`obs.html` にSheet ID / gid / 列マッピング / テンプレート設定をquery parameterとして渡す。OBS Browser Source自身がGoogle Sheetsを読み込み、一定間隔で更新する。

### Standalone HTML

管理画面が現在のresponsesとテンプレートCSSをHTMLへ埋め込み、1ファイルとして書き出す。外部データ接続を必要としないスナップショット。

### Hotkeys

OBS Lua scriptがBrowser SourceへArrowLeft / ArrowRightのkey eventを送る。
