# Wedding RSVP (Minecraft Style)

雙頁式婚宴 RSVP 網站，使用純 `HTML/CSS/JS`，可部署在 GitHub User Pages，後端用 Google Apps Script 寫入 Google Sheets。

## 專案結構

- `index.html`: 首頁（婚宴資訊與導引）
- `rsvp.html`: RSVP 表單、查詢與更新
- `assets/css/styles.css`: Minecraft 風格樣式
- `assets/js/home.js`: 首頁資料顯示
- `assets/js/rsvp.js`: 表單驗證、Google 登入、API 呼叫
- `assets/js/api.js`: API client
- `assets/js/app-config.js`: 前端 config 合併與檢查
- `config.example.js`: 前端設定範例（請複製為 `config.js`）
- `apps-script/Code.gs`: Apps Script API（create/get/update）
- `apps-script/appsscript.json`: Apps Script runtime 設定

## 1) 前端設定

1. 複製 `config.example.js` 成 `config.js`：

```bash
cp config.example.js config.js
```

2. 編輯 `config.js`：
- `APPS_SCRIPT_URL`: Apps Script Web App URL
- `GOOGLE_CLIENT_ID`: Google OAuth Client ID
- `EVENT`: 新人、日期、地點、截止日

## 2) Google Identity Services 設定

1. 到 Google Cloud Console 建立專案。
2. 在 `APIs & Services > Credentials` 建立 **OAuth 2.0 Client ID**（Web application）。
3. Authorized JavaScript origins 新增：
- `https://<github-username>.github.io`
4. 取得 Client ID，填到 `config.js` 的 `GOOGLE_CLIENT_ID`。

## 3) Google Apps Script 設定

1. 建立一個 Google Sheet（作為資料庫）。
2. 在該 Sheet 開啟 `Extensions > Apps Script`。
3. 將 `apps-script/Code.gs` 貼上取代預設程式。
4. 將 `apps-script/appsscript.json` 內容套用到專案 manifest（若需要）。
5. 在 Apps Script `Project Settings > Script properties` 新增：
- `GOOGLE_CLIENT_ID = <你的 client id>`
6. `Deploy > New deployment > Web app`：
- Execute as: `Me`
- Who has access: `Anyone`
7. 複製部署 URL，填到 `config.js` 的 `APPS_SCRIPT_URL`。

### Sheet 會自動建立
首次呼叫 API 會自動建立：
- `rsvps` 工作表（含所有欄位）
- `config` 工作表（含 `deadline_at`, `event_name`, `event_date`, `max_guest_per_household`, `sheet_version`）

你可直接在 `config` sheet 修改截止時間，例如：
- `deadline_at = 2026-11-20T23:59:00+08:00`

## 4) GitHub User Pages 部署

1. Repository 名稱需為：`<github-username>.github.io`
2. 將本專案推到 `main` 分支根目錄。
3. 在 Repo 設定 `Pages`：
- Source: `Deploy from branch`
- Branch: `main / (root)`
4. 幾分鐘後可於 `https://<github-username>.github.io/` 開啟。

## 5) API 規格

單一 `POST` endpoint，request body:

```json
{
  "action": "create_rsvp | get_rsvp | update_rsvp",
  "idToken": "Google ID token",
  "payload": {}
}
```

Response:

```json
{
  "ok": true,
  "code": "OK",
  "message": "...",
  "data": {}
}
```

錯誤碼：
- `UNAUTHORIZED`
- `INVALID_INPUT`
- `NOT_FOUND`
- `DEADLINE_PASSED`
- `INTERNAL_ERROR`

## 6) 手動驗收清單

1. `index.html` 顯示婚宴資訊與版本號。
2. `rsvp.html` 未登入時送出會被阻擋。
3. Google 登入後可成功送出並收到 `submissionId`。
4. Sheet `rsvps` 新增資料列。
5. 以 `submissionId + 電話末4碼` 載入資料成功。
6. 修改後按「更新目前表單」可覆寫同一筆。
7. `config.deadline_at` 設成過去時間後，更新會回 `DEADLINE_PASSED`。

## 補充

- `config.js` 已在 `.gitignore`，避免把正式環境參數誤提交。
- 本版登入策略為「送出/更新前驗證 Google」，非進站即登入。
