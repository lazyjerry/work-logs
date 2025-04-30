# 工作日誌系統

這是一個使用 [Hono](https://hono.dev/) 框架與 Cloudflare D1 資料庫實作的工作日誌後端 API，並搭配靜態前端頁面提供完整的 CRUD 功能（新增、讀取、刪除），以及簡易的 Basic Auth 保護。

# DEMO

Demo 網址：https://work-logs.crazyjerry.workers.dev
需要 Base Auth admin:123456

## 特性

- 使用 Hono 建立輕量級 API
- 持久化資料儲存在 Cloudflare D1
- 前端使用原生 JavaScript + TailwindCSS + Select2 + Flatpickr
- 支援分頁與無限滾動
- Basic HTTP 認證，密碼以 Cloudflare Secret 管理
- 環境變數：本地 `.dev.vars`、生產環境 Secret

## 目錄結構

```
work-logs/
│
├── public/             # 靜態前端檔案
│   ├── index.html
│   ├── style.css
│   ├── func.js
│   └── script.js
├── src/                # 後端 Hono Worker 程式碼
│   └── index.ts
├── wrangler.jsonc      # Wrangler 設定檔
└── README.md           # 專案說明
```

## 前置需求

- Node.js >= 16
- npm 或 yarn
- Wrangler v3 CLI (`npm install -g wrangler`)
- 已建立 Cloudflare D1 資料庫

## 安裝與設定

1. 克隆專案並安裝相依套件：
   ```bash
   git clone https://github.com/your/repo.git
   cd repo
   npm install
   ```
2. 建立本地環境變數範例檔 `.dev.vars.sample`，並複製為 `.dev.vars`：
   ```bash
   cp .dev.vars.sample .dev.vars
   ```
   - 編輯 `.dev.vars`，填入你的本地密碼：
     ```text
     BASIC_AUTH_PASSWORD=your_local_password
     ```
   - 確保 `.dev.vars` 已加入 `.gitignore`，不提交到 Git。
3. 編輯 `wrangler.jsonc` 確認 D1 綁定資訊：
   ```jsonc
   "d1_databases": [
     {
       "binding": "WORKLOG_DB",
       "database_id": "<YOUR_DATABASE_ID>",
       "database_name": "worklog"
     }
   ]
   ```
4. **建立 D1 資料庫與表格**
   - 建立 D1 資料庫（如果尚未建立）：
     ```bash
     wrangler d1 create worklog
     ```
   - 使用 `init.sql` 初始化本地資料庫：
     ```bash
     npx wrangler d1 execute worklog --local --file=./init.sql
     ```
   - 使用 `init.sql` 初始化遠端 D1：
     ```bash
     npx wrangler d1 execute worklog --remote --file=./init.sql
     ```

## 本地開發

```bash
# 啟動本地伺服器（會自動讀取 .dev.vars）
wrangler dev
```

- 本地請求不需額外帶密碼，因為 `.dev.vars` 已注入 `BASIC_AUTH_PASSWORD`。
- API 路徑：
  - `GET /logs?limit=3&offset=0` 分頁讀取
  - `POST /logs` 新增日誌
  - `DELETE /logs/:id` 刪除日誌

## 設定生產環境 Secret

使用 Wrangler CLI 把密碼安全地存入 Cloudflare Worker：

```bash
npx wrangler secret put BASIC_AUTH_PASSWORD
# 依提示輸入你的生產環境密碼
```

> Secret 僅存在於 Cloudflare 運行環境，不會出現在程式碼或版本控制中。

## 部署到生產

```bash
wrangler publish --env production
```

- 發布後，API 會依 `wrangler.jsonc` 中 `env.production.route` 與 `zone_id` 綁定到你的正式域名。
- 生產環境請求需帶 Basic Auth 標頭：
  ```bash
  curl https://your-domain.com/logs \
    -H "Authorization: Basic $(echo -n 'admin:your_production_password' | base64)"
  ```

## 使用指南

1. 前端打開 `/` 進入工作日誌系統介面。
2. 輸入工作名稱、內容，多筆工作項目可動態新增。
3. 按「儲存」呼叫 `POST /logs`，新增完成後列表會重新載入。
4. 向下滾動可自動載入更多舊日誌。
5. 點擊「查看詳情」，可檢視並刪除該筆日誌。
6. 刪除時需在確認對話框輸入完全相符的工作名稱。

## License

MIT © Jerry Lin. (https://github.com/lazyjerry）
