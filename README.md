# Wedding Form (Minecraft Style)

婚宴賓客表單網站，採用純 `HTML/CSS/JS`，可部署於 GitHub Pages，資料透過 Google Apps Script 寫入 Google Sheets。

## 需求對應（目前版本）

- 使用密碼進入（取代 Google 登入）
- 以 `.env` 管理設定，並由腳本產生 `config.js`
- 已移除「不吃牛」欄位
- 已移除賓客端查詢/修改流程（僅送出）

## 專案結構

- `index.html`: 首頁
- `rsvp.html`: 表單頁（僅送出）
- `assets/css/styles.css`: Minecraft 風格樣式
- `assets/js/home.js`: 首頁渲染
- `assets/js/rsvp.js`: 表單驗證與送出
- `assets/js/api.js`: API 呼叫
- `assets/js/app-config.js`: config 驗證
- `scripts/generate-config.mjs`: `.env -> config.js`
- `apps-script/Code.gs`: Apps Script API（僅 `create_rsvp`）

## 1) 設定 `.env`

先複製範本：

```bash
cp .env.example .env
```

填入內容：

- `APPS_SCRIPT_URL`: Apps Script Web App URL
- `ACCESS_PASSWORD`: 表單密碼
- `VERSION`: 版本字串
- `EVENT_*`: 首頁顯示資訊

## 2) 由 `.env` 產生 `config.js`

```bash
npm run build:config
```

會在根目錄產生 `config.js`（已被 `.gitignore` 忽略，不會被提交）。

## 3) Google Apps Script 設定

1. 建立 Google Sheet
2. 開啟 `Extensions > Apps Script`
3. 貼上 `apps-script/Code.gs`
4. 在 `Project Settings > Script properties` 設定：
- `ACCESS_PASSWORD = <與 .env 一致的密碼>`
5. Deploy Web App：
- Execute as: `Me`
- Who has access: `Anyone`

首次呼叫會自動建立 `rsvps` 與 `config` 工作表。

## 4) GitHub Pages 部署

使用 repo `yukino0113.github.io`：

1. 確認 `main` 分支含網站檔案
2. Pages 設定：`Deploy from branch` + `main/(root)`
3. 網址：`https://yukino0113.github.io/`

## API 格式

`POST` body:

```json
{
  "action": "create_rsvp",
  "accessPassword": "string",
  "payload": {}
}
```

錯誤碼：`UNAUTHORIZED`, `INVALID_INPUT`, `DEADLINE_PASSED`, `INTERNAL_ERROR`
