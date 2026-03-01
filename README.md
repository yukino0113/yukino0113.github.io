# Wedding Form (Minecraft Style)

婚宴賓客表單網站，採用純 `HTML/CSS/JS`，可部署於 GitHub Pages，資料透過 Google Apps Script 寫入 Google Sheets。

## 需求對應（目前版本）

- 使用密碼進入（由後端驗證，不在前端儲存密碼）
- `config.js` 由 `.env`（本地）或 GitHub Environments（部署）動態產生
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
- `scripts/generate-config.mjs`: 產生 `config.js`
- `apps-script/Code.gs`: Apps Script API（僅 `create_rsvp`）
- `.github/workflows/deploy-pages.yml`: 由 GitHub Actions + Environment 部署

## 1) 設定 Google Apps Script

1. 建立 Google Sheet
2. 開啟 `Extensions > Apps Script`
3. 貼上 `apps-script/Code.gs`
4. 在 `Project Settings > Script properties` 設定：
- `ACCESS_PASSWORD = <你的表單密碼>`
5. Deploy Web App：
- Execute as: `Me`
- Who has access: `Anyone`

首次呼叫會自動建立 `rsvps` 與 `config` 工作表。

## 2) 使用 GitHub Environments 管理前端設定（推薦）

到 GitHub Repo：`Settings > Environments` 建立 `production`，在該 Environment 的 Variables 設定：

- `APPS_SCRIPT_URL`
- `VERSION`（可選，例：`v1.2.0`）
- `EVENT_COUPLE`
- `EVENT_DATE`
- `EVENT_VENUE`
- `EVENT_DEADLINE`

推送到 `main` 後，`Deploy Pages` workflow 會自動：
1. 讀取 Environment Variables
2. 產生 `config.js`
3. 部署到 GitHub Pages

> 注意：`ACCESS_PASSWORD` 不會放進 `config.js`，只存在 Apps Script 的 Script Properties。

## 3) GitHub Pages 設定

1. 在 Repo `Settings > Pages`
2. Source 改為 **GitHub Actions**
3. 確認 workflow `Deploy Pages` 成功
4. 網址：`https://yukino0113.github.io/`

## 4) 本地開發（可選）

如需本地測試，可使用 `.env`：

```bash
cp .env.example .env
npm run build:config
```

`.env.example` 欄位：
- `APPS_SCRIPT_URL`
- `VERSION`
- `EVENT_COUPLE`
- `EVENT_DATE`
- `EVENT_VENUE`
- `EVENT_DEADLINE`

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
