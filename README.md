# 血球型態分類軟體介面（前端 Demo · 優化架構版）

本專案為**林口長庚醫院檢驗醫學科血液組**血球型態閱片流程之**前端示範（Demo）**，模擬醫檢師從：

**登入 → 檢體管理 → 影像檢視與細胞編輯 → 報告核發**

的完整操作路徑。資料來自內建 **`assets/data/database.js`**（Mock）；檢體狀態、閱片編輯快照、留單門檻等會寫入瀏覽器 **localStorage**，以便連續操作。

> 本版為**優化架構版**：登入頁不載入病患資料；業務頁面受 `AuthService.requireAuth()` 保護；設定與服務層集中於 `src/`。詳見 **`ARCHITECTURE.md`**。

---

## 快速開始

### 本機

1. 以瀏覽器開啟 **`index.html`**（建議 Chrome / Edge）。
2. 帳密：`admin / admin` 或 `user / user`。
3. 登入後進入檢體管理，依流程操作即可。

### GitHub Pages

若已啟用 Pages（來源為 `master` 根目錄），Demo 網址為：

```
https://lindedeEden.github.io/blood-cell-classification-ui/
```

---

## 專案結構

```text
血球分類軟體介面設計專案/
├── index.html                    # 登入（不載入 database.js）
├── 檢體管理.html                 # 檢體清單／篩選／情境模擬
├── 影像檢視與細胞編輯.html       # 閱片編輯
├── 報告核發.html                 # 報告簽核（iframe）
│
├── src/                          # 架構層
│   ├── config/config.js          # 全域設定（ENV、API、閒置逾時等）
│   ├── constants/cell-types.js   # 細胞類型常數
│   ├── services/                 # api、auth、specimen
│   ├── store/app.store.js        # 集中式狀態
│   └── utils/validators.js       # 輸入驗證（登入頁）
│
├── assets/
│   ├── data/                     # Mock 資料、情境劇本
│   │   ├── database.js
│   │   ├── scenario-specimens.js
│   │   ├── scenario-specimen-cells.js
│   │   └── cell-sample-images.js
│   ├── js/                       # common、閱片、報告、教學、調查
│   ├── css/                      # common.css、tutorial.css
│   └── images/cells/             # 細胞圖（執行用，18 類）
│
├── 血球範例圖片/                  # 原始細胞圖素材
│
├── README.md                     # 本檔
├── ARCHITECTURE.md               # 架構審查與分層說明
├── 主持人觀察紀錄表.docx         # 成效調查主持人表
└── 附件一  林口長庚醫院留單標準.txt
```

### 腳本載入順序

**登入頁（`index.html`）：**

```
config.js → cell-types.js → api.service.js → auth.service.js
  → validators.js → 內嵌登入腳本（AuthService.login）
```

**業務頁（檢體管理／閱片／報告）：**

```
config.js → cell-types.js → api.service.js → auth.service.js
  → specimen.service.js → app.store.js → requireAuth()
  → database.js → scenario-*.js → common.js → 頁面腳本
```

---

## 使用流程

### 1. 登入（`index.html`）

- 帳密：`admin / admin` 或 `user / user`（由 `AuthService.login()` 驗證；開發模式走 Mock API）。
- 表單先經 `Validators.loginForm()` 格式檢查，再呼叫 `AuthService`；登入邏輯內嵌於 `index.html`。
- 登入成功寫入 **sessionStorage**（`blood-morphology-user-account`、`bhm_session_token` 等），導向 `檢體管理.html`。
- **重新登入**會清除 `blood-morphology-specimen-status` 與成效調查情境鍵，還原 `database.js` 初始狀態。
- 業務頁面載入 `AuthService.requireAuth()`；未登入會導回登入頁。閒置逾時（預設 30 分鐘）亦會自動登出。

### 2. 檢體管理（`檢體管理.html`）

#### 雙模式分流

再點同一模式 tab 可還原為較寬鬆篩選（狀態全勾）。

| 模式 | 預設狀態篩選 | 清單邏輯 |
|------|-------------|---------|
| **數位閱片** | Digital Review、AI Alert | `shouldExcludeFromDigitalSpecimenList()`：列出仍有數位待辦者；排除 AI + Follow-up 雙旗標、以及數位已完成僅剩實體待辦者 |
| **實體作業** | Follow-up、PLT Check | 依勾選狀態篩選 |

**清單歸屬重點（`common.js`）：**

- **僅 AI Alert** → 數位閱片清單。
- **AI + Follow-up** → **僅**實體作業清單；拉片完成時一併確認 AI。
- **AI + PLT Check** → 數位與實體清單皆可能出現；PLT 完成**不會**自動確認 AI。
- **整體已完成** → 勾選 Verified 篩選時仍可見。

#### 狀態膠囊

| 膠囊（內部 key） | 顯示名稱 | 所屬流程 | 列表點擊切換完成 |
|-----------------|---------|---------|----------------|
| Digital Review | 數位閱片 | 數位 | 否 |
| AI Alert | AI分類警示 | 數位 | 否 |
| PLT Check | 血小板確認 | 實體 | **是**（實體模式） |
| Follow-up | 需拉片確認 | 實體 | **是**（實體模式） |
| Locked | 鎖定中 | — | 否 |
| Verified | 已完成 | — | 不渲染膠囊，僅作篩選 |

舊版 **Manual Alert** 讀取時由 `migrateLegacyManualAlertStatus()` 併入 **Follow-up**。膠囊與雙流程規則詳見 **`ARCHITECTURE.md`** 與 **`common.js`** 註解。

#### 進入閱片

- **雙擊列**或按「**進入閱片**」。
- **唯讀**：數位閱片已完成（`isDigitalReviewReadOnly()`）或 **Locked** 時不可編輯。
- **右鍵選單**：數位閱片已完成之列可「**退回 Digital Review**」。

#### 情境模擬測試（成效調查）

檢體管理頂部「**情境模擬測試**」可切換成效調查情境（`scenario-specimens.js` 內 **4 組模組**，涵蓋**五項痛點**；情境四標題為「情境四～五」），僅顯示該情境檢體並呈現任務卡。主持人對照答案見 **`主持人觀察紀錄表.docx`**。

---

### 3. 整體完成判定

由 `isSpecimenWorkflowCompleted()` 判定：**數位流程完成** 且 **實體流程完成**。

- **數位**：Digital Review、AI Alert 若有則須 `workflowDone` 對應為 true。
- **實體**：PLT Check、Follow-up 若有則須各膠囊完成（`ENTITY_REVIEW_STATUS_SET`）。

---

### 4. 影像檢視與細胞編輯

- 左側：檢體資訊、狀態膠囊、Add Flag、搜尋／上一筆／下一筆、分析表。
- 右側：細胞依類別分群；達留單門檻者強調；異常群組置頂。
- **儲存並核發報告**：須全部細胞已檢視且無 Unidentified；開啟 iframe `報告核發.html?specimen=ID`。
- 唯讀時不可改分類或簽核。

---

### 5. 報告核發（iframe）

- **風險橫幅**（依 `LEAVE_THRESHOLDS`）：紅＝新發留單、黃＝延續異常、綠＝未達標準。
- **改為人工鏡檢**：交接至 Follow-up，數位閱片進入唯讀。
- **簽核**：`postMessage({ type: 'reportVerified', ... })`；紅色新發留單預設不自動跳下一筆。
- 未實際呼叫 LIS；正式上線請在 API 成功後再 `postMessage`。

---

### 6. 使用教學

由檢體管理「**使用教學**」開啟；跨頁延續（`bloodCellTutorialPhase` 等 localStorage 鍵）。

---

## 本機資料與儲存鍵

| 鍵 | 用途 |
|----|------|
| `blood-morphology-specimen-status` | 檢體 status、workflowDone、editor 覆寫 |
| `editedCells:<檢體ID>` | 閱片細胞分類快照 |
| `editedMetrics:<檢體ID>` | 人員編輯比例（報告優先顯示） |
| `blood-morphology-leave-thresholds` | 留單門檻（系統設定） |
| `blood-morphology-specimen-list-ui-state` | 列表篩選、排序等 UI |
| `blood-morphology-specimen-list-mode` | 數位／實體模式 tab |
| `blood-morphology-usability-scenario` | 成效調查目前情境 ID |
| `blood-morphology-font-level` | 字型大小層級 |
| `blood-morphology-cell-image-zoom` | 細胞圖縮放比例 |
| `blood-morphology-user-account`（sessionStorage） | 登入帳號（舊版相容 key） |
| `bhm_session_token` / `bhm_session_user`（sessionStorage） | AuthService 登入 session |
| `blood-morphology-specimen-ui-reset`（sessionStorage） | 重新登入後還原列表 UI 預設 |
| `bloodCellTutorial*` | 教學進度 |

---

## 技術與實作重點

- **樣式**：Tailwind CSS（CDN）、Material Symbols、`common.css`／`tutorial.css`。
- **架構層**：`src/services/*` 集中認證與 API 抽象；切換真實後端時將 `AppConfig.ENV` 改為 `'production'`（見 `config.js`）。
- **`common.js`**：導頁、留單門檻、workflow 判定、清單 exclude 規則、localStorage 持久化。
- **`report-issue.js`**：風險橫幅、`postMessage` 契約（`reportVerified`、`reportManualAlert`、`reportFollowUpDone`、`specimenDataUpdated`）。
- **iframe 通訊**：Demo 使用 `targetOrigin: '*'`；正式環境應限定 origin。

---

## 開發與維護

| 任務 | 說明 |
|------|------|
| 修改 workflow／留單規則 | 優先改 `common.js`、`specimen.service.js`，避免列表／閱片／報告三處分叉 |
| 接後端 | 替換 `api.service.js` 實作、登入改呼叫 `/auth/login`、簽核改呼叫 LIS API |
| 更新情境劇本 | 編輯 `assets/data/scenario-specimens.js`，同步更新 `主持人觀察紀錄表.docx` |
| 避免快取舊腳本 | 更新 HTML 內 `?v=` 查詢參數 |

功能變更時請同步更新 **README.md**、**`tutorial.js`** 教學文案，以及主持人觀察紀錄表（若適用）。

---

## 相關文件

| 檔案 | 內容 |
|------|------|
| `ARCHITECTURE.md` | 原版問題診斷、分層架構、狀態膠囊與上線建議 |
| `主持人觀察紀錄表.docx` | 改善後成效調查流程與評分表 |
| `附件一  林口長庚醫院留單標準.txt` | 留單數值標準 |

---

## 版權聲明

本專案「血球型態分類軟體介面」之所有程式碼、介面設計、版面配置、圖示配置與互動流程，
由林晏德創作與設計，享有著作權及相關智慧財產權。
除法律明文許可或事先取得林晏德之授權外，
任何人不得對本專案內容進行下列行為：

- 複製、重製、散布、公開傳輸、公開展示或改作；
- 將本專案全部或一部，以任何形式整合至其他軟體或服務中；
- 以營利或非營利目的，對第三人提供下載、出租、出借或再授權。
