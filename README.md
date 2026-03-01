# Wedding Form (Minecraft Style)

婚宴賓客表單網站（純 `HTML/CSS/JS`），部署於 GitHub Pages，資料寫入 Google Sheets（Apps Script）。

## Current Scope

- 賓客以密碼送出表單（僅送出，不支援修改）
- 設定由 `config.js` 載入
- `config.js` 可由 `.env`（本地）或 GitHub Environments（CI）產生

## Structure

- `index.html`: 首頁
- `rsvp.html`: 表單頁
- `assets/css/styles.css`: Minecraft 風格樣式
- `assets/js/*.js`: 前端邏輯
- `apps-script/Code.gs`: Apps Script API
- `scripts/generate-config.mjs`: 產生 `config.js`
- `scripts/prepare-pages.mjs`: 打包 `public/` 部署目錄
- `.github/workflows/deploy-pages.yml`: GitHub Pages 部署流程

## 1) Apps Script Setup

1. 在 Google Sheet 開啟 `Extensions > Apps Script`
2. 貼上 `apps-script/Code.gs`
3. 在 `Project Settings > Script properties` 設定：
- `ACCESS_PASSWORD=<你的密碼>`
4. Deploy Web App：
- Execute as: `Me`
- Who has access: `Anyone`

## 2) GitHub Environment Setup (Recommended)

Repo `Settings > Environments > production > Variables` 設定：

- `APPS_SCRIPT_URL`
- `EVENT_COUPLE`
- `EVENT_DATE`
- `EVENT_VENUE`
- `EVENT_DEADLINE`
- `VERSION`（可選）

> `ACCESS_PASSWORD` 不應放到前端設定，只存 Apps Script Script Properties。

## 3) Deploy (GitHub Actions)

1. Repo `Settings > Pages`，Source 選 **GitHub Actions**
2. push 到 `main` 後會自動執行 `Deploy Pages`
3. 工作流程會：
- 產生 `config.js`
- 打包 `public/`
- 部署到 Pages

## 4) Local Dev (Optional)

```bash
cp .env.example .env
npm run build:config
npm run build:pages
```

本地 `.env` 欄位：
- `APPS_SCRIPT_URL`
- `EVENT_COUPLE`
- `EVENT_DATE`
- `EVENT_VENUE`
- `EVENT_DEADLINE`
- `VERSION`（可選）

## API Request

`POST` body:

```json
{
  "action": "create_rsvp",
  "accessPassword": "string",
  "payload": {}
}
```

Error codes: `UNAUTHORIZED`, `INVALID_INPUT`, `DEADLINE_PASSED`, `INTERNAL_ERROR`
