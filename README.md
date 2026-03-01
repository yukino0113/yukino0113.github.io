# Wedding Form (Minecraft Style)

婚宴賓客表單網站（純 `HTML/CSS/JS`），部署於 GitHub Pages，資料寫入 Google Sheets（Apps Script）。

## Current Scope

- 首頁輸入入場密碼，需與 env 設定一致才可前往/填寫表單
- 設定由 `config.js` 載入
- `config.js` 支援雙模式：
- local：讀取 `.env`
- production：讀取 GitHub Environments

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
- `WEDDING_ACCESS_PASSWORD=<你的密碼>`
4. Deploy Web App：
- Execute as: `Me`
- Who has access: `Anyone`

## 2) GitHub Environment Setup

Repo `Settings > Environments > production > Variables` 設定：

- `APPS_SCRIPT_URL`
- `WEDDING_ACCESS_PASSWORD`
- `EVENT_COUPLE`
- `EVENT_DATE`
- `EVENT_VENUE`
- `EVENT_DEADLINE`
- `VERSION`（可選）

> `WEDDING_ACCESS_PASSWORD` 在前端 config 會可見，請僅用於低風險活動頁面。

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

可用 `APP_ENV` 明確指定模式：

```bash
# 本地（讀 .env）
APP_ENV=local npm run build:config

# 正式（讀 process env / GitHub Environment）
APP_ENV=production npm run build:config
```

本地 `.env` 欄位：
- `APPS_SCRIPT_URL`
- `WEDDING_ACCESS_PASSWORD`
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
