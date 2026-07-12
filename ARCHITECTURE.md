# 血球分類軟體 — 系統架構優化報告

> 作者：系統架構審查  
> 日期：2026-06-09  
> 對象：林口長庚醫院 檢驗醫學部開發團隊  

---

## 一、現有版本問題診斷

以下問題若進入正式上線環境，可能導致**資安事件、資料遺失、HIPAA/個資法違規**。

---

### 🔴 高風險問題

#### 1. 帳號密碼硬寫在前端 JavaScript

**原始碼位置：** `assets/js/login.js` 第 35 行

```js
// 原版
if ((account === 'admin' && password === 'admin') || (account === 'user' && password === 'user')) {
```

**問題：** 任何人開啟瀏覽器 DevTools → Sources，即可看到所有有效帳密。  
**風險等級：** 🔴 嚴重（等同公開帳密）  
**修正方案：** 帳密驗證移至後端；前端只傳帳密給 `/auth/login` API，後端回傳 JWT Token。

---

#### 2. 所有病患資料在登入前即載入至前端

**原始碼位置：** 各 HTML 頁面的 `<script src="assets/data/database.js">`

```html
<!-- 登入頁（index.html）也載入了 database.js！ -->
<script src="assets/data/database.js?v=..."></script>
```

**問題：** 包含 17 筆病患完整 PHI（姓名、生日、病歷號、所有血液檢驗值）的 `database.js` 在登入頁就載入，任何未登入者直接在 DevTools 即可讀取所有病患資料。  
**風險等級：** 🔴 嚴重（PHI 資料洩漏 / 個資法違規）  
**修正方案：** 登入頁不載入任何病患資料；資料透過登入後的 API 請求取得，並在後端做存取控制。

---

#### 3. 工作流程狀態只存 localStorage，無後端持久化

**原始碼位置：** `assets/js/common.js` — `persistSpecimenStatusOverride()`

```js
// 原版：狀態只存在本機瀏覽器
localStorage.setItem(APP_SPECIMEN_STATUS_STORAGE_KEY, JSON.stringify(map));
```

**問題：**
- 使用者更換電腦或清除瀏覽器資料 → 所有工作進度消失
- 多人操作同一檢體 → 各自看到不同狀態，無法協同
- localStorage 可被同源的其他 JS（含 XSS 注入）讀取

**風險等級：** 🔴 嚴重（資料一致性與合規稽核）  
**修正方案：** 每次狀態變更透過 `PATCH /specimens/{id}/workflow` 送至後端資料庫。

---

### 🟠 中風險問題

#### 4. 沒有 API 抽象層

原版所有「資料存取」直接讀寫全域變數 `APP_DATABASE`（JavaScript 物件）。若未來要串接真實儀器資料或 EMR，需要修改所有頁面的所有相關程式碼。

**修正方案：** 建立 `ApiService`（已實作），所有資料存取透過此層，切換真實後端只需改 `AppConfig.ENV = 'production'`。

---

#### 5. 業務邏輯分散三處，互相耦合

| 原版位置 | 包含邏輯 |
|---|---|
| `common.js` | 留單門檻、工作流程計算、localStorage 讀寫、DOM navigation |
| `image-review.js` | 細胞顯示 + 工作流程判斷 + 狀態寫入 |
| `report-issue.js` | 報告顯示 + 工作流程判斷 + 狀態寫入 |

同一個「留單門檻判斷」邏輯在三個檔案中各有一份，修改時需同步三處，容易遺漏。

**修正方案：** 建立 `SpecimenService`（已實作），集中所有業務規則。

---

#### 6. 全域命名空間汙染

原版所有函式（`getSpecimenById`, `isDigitalReviewDone`, `parseMetricNum`...）直接掛在 `window` 全域物件。17 個全域函式 + 6 個全域變數，一旦引入第三方套件極易命名衝突。

**修正方案：** 使用 IIFE + 模組模式，只暴露必要介面（`AuthService`, `ApiService` 等）。

---

#### 7. 無閒置自動登出

原版登入後 session 永遠存活（sessionStorage 只在分頁關閉時清除，但若分頁不關閉則永遠登入）。

**修正方案：** `AuthService` 已實作 30 分鐘閒置計時器，到時自動呼叫 `logout()`。

---

### 🟡 低風險（可用性問題）

#### 8. 留單門檻只存 localStorage，系統設定頁修改只影響當前電腦

管理員在一台電腦調整留單門檻 → 只有那台電腦的 localStorage 被修改 → 其他電腦看到的仍是預設值。

**修正方案：** 門檻設定存後端資料庫，透過 `GET /settings/thresholds` 讓所有用戶端取得一致設定。

---

#### 9. 細胞分類常數重複定義

`ABNORMAL_ORDER` 在 `image-review.js` 定義；`COMMON_ROWS`/`ABNORMAL_ROWS` 在 `report-issue.js` 重複定義。

**修正方案：** 統一至 `src/constants/cell-types.js`，各頁面引用。

---

## 二、優化版架構說明

### 資料夾結構

```
血球分類軟體介面設計專案/
├── index.html                    # 登入頁（不含病患資料）
├── 檢體管理.html                  # 登入後才載入，受 requireAuth() 保護
├── 影像檢視與細胞編輯.html
├── 報告核發.html
│
├── src/
│   ├── config/
│   │   └── config.js             # 所有可調整設定的唯一來源
│   │
│   ├── constants/
│   │   └── cell-types.js         # 細胞類型、順序、標籤常數（單一來源）
│   │
│   ├── services/
│   │   ├── api.service.js        # HTTP 抽象層（Mock ↔ 真實 API 切換）
│   │   ├── auth.service.js       # 登入/登出/Token/閒置登出
│   │   └── specimen.service.js   # 檢體業務邏輯（留單判定/工作流程）
│   │
│   ├── store/
│   │   └── app.store.js          # 集中式狀態 + Pub/Sub 通知
│   │
│   └── utils/
│       └── validators.js         # 輸入驗證（前端）
│
└── assets/
    ├── css/
    ├── data/                     # Mock 資料（開發用，上線時移除）
    └── images/
```

### 依賴關係（載入順序）

```
config.js
    └── constants/cell-types.js
            └── services/api.service.js
                    └── services/auth.service.js
                    └── services/specimen.service.js
                            └── store/app.store.js
                                    └── utils/validators.js
                                            └── [頁面腳本]
```

---

## 三、AI API 整合路徑

現版本的「AI Alert」是靜態硬編資料。以下是導入真實 AI 的建議路徑：

### 架構原則：前端永遠不直接呼叫 AI 廠商 API

```
瀏覽器 → 後端 AI Proxy → AI 廠商 API（OpenAI / Claude / 自建模型）
                ↑
         在這裡做：
         - API Key 保護（不暴露給前端）
         - 請求速率限制
         - 結果快取
         - 稽核日誌
```

### 前端整合方式（已在 ApiService 預留）

```js
// 前端只呼叫自己後端的 proxy endpoint
const result = await ApiService.post('/ai/classify', {
  cells: cellsToClassify,   // 送出細胞圖片 URL 或 base64
  specimenId: currentId,
});

// 後端回傳標準格式
// {
//   results: [
//     { cellId, prediction, confidence, alternatives: [{category, confidence}] }
//   ]
// }
```

### 低信心值警告（已在 config.js 設定）

```js
AppConfig.AI.CONFIDENCE_THRESHOLD = 0.80
// 信心值 < 80% 時，UI 顯示「低信心警告」，要求人工確認
```

---

## 四、上線前必做清單

### 後端（需配合開發）
- [ ] 實作 `POST /auth/login`（BCRYPT 加密驗證）
- [ ] 實作 JWT 發行 + 驗證 Middleware
- [ ] 實作 `GET/PATCH /specimens/*` API（含 RBAC 權限控制）
- [ ] 實作 `GET/PUT /settings/thresholds`
- [ ] 所有 API 啟用 HTTPS（TLS 1.2+）
- [ ] 資料庫加密（病患 PHI 欄位）
- [ ] 完整稽核日誌（誰、何時、看了/改了什麼）

### 前端（本專案）
- [ ] 將 `AppConfig.ENV` 改為 `'production'`
- [ ] 將 `AppConfig.API_BASE_URL` 改為真實後端 URL
- [ ] 移除 `assets/data/database.js`（Mock 資料）
- [ ] 移除登入頁的 Demo 模式提示
- [ ] 移除 `api.service.js` 中的所有 `_mockRoutes`
- [ ] 設定 Content Security Policy (CSP) Header
- [ ] 替換 `cdn.tailwindcss.com` 為本地打包版本（避免 CDN 停服）

### 流程
- [ ] 滲透測試（Auth Bypass、XSS、CSRF）
- [ ] HIPAA 合規審查
- [ ] 與 LIS（Laboratory Information System）的 HL7/ASTM 介面測試

---

## 五、各問題修正對照表

| # | 原版問題 | 修正檔案 | 修正說明 |
|---|---|---|---|
| 1 | 帳密硬寫前端 | `auth.service.js` | 驗證移至後端 API |
| 2 | PHI 登入前暴露 | `index.html` | 登入頁不載入 database.js |
| 3 | 狀態只存 localStorage | `api.service.js` + 後端 | PATCH API 持久化至資料庫 |
| 4 | 無 API 抽象層 | `api.service.js` | 統一 HTTP 出入口 |
| 5 | 業務邏輯三處分散 | `specimen.service.js` | 集中單一服務層 |
| 6 | 全域命名空間汙染 | 所有 `src/` 檔案 | IIFE 模組化 |
| 7 | 無閒置自動登出 | `auth.service.js` | 30 分鐘閒置計時器 |
| 8 | 門檻設定只存本機 | `specimen.service.js` | 從後端 API 載入 |
| 9 | 細胞常數重複定義 | `cell-types.js` | 單一來源常數檔 |
