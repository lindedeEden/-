/**
 * 應用程式全域設定
 *
 * 說明：
 * - 此檔案集中管理所有可調整的設定值，避免「魔法數字」散落各處。
 * - 上線前請將 ENV 切換為 'production'，API_BASE_URL 指向真實後端。
 * - 真正的機密（API Key、JWT Secret）絕不可放在前端，需由後端環境變數管理。
 */

const AppConfig = Object.freeze({

  /**
   * 執行環境：'development' | 'production'
   * development → 使用 Mock API（本地資料），不需要後端
   * production  → 使用真實 REST API
   */
  ENV: 'development',

  /**
   * 後端 API 根路徑
   * 上線時改為實際的後端網址，例如 'https://hematology.cgmh.org.tw/api/v1'
   */
  API_BASE_URL: 'https://api.example-hematology.com/v1',

  /**
   * API 請求逾時（毫秒）
   */
  API_TIMEOUT_MS: 15000,

  /**
   * 認證設定
   * - TOKEN_STORAGE_KEY：JWT Token 存放的 sessionStorage key（不用 localStorage，避免 XSS 竊取）
   * - SESSION_TIMEOUT_MS：閒置自動登出時間（30分鐘）
   */
  AUTH: Object.freeze({
    TOKEN_STORAGE_KEY: 'bhm_session_token',
    USER_KEY: 'bhm_session_user',
    // 原版 common.js 讀取的 key，需保持相容
    LEGACY_USER_KEY: 'blood-morphology-user-account',
    SESSION_TIMEOUT_MS: 30 * 60 * 1000,
    IDLE_CHECK_INTERVAL_MS: 60 * 1000,
  }),

  /**
   * 留單門檻預設值（林口長庚標準）
   * 這些值可由後端 /settings/thresholds API 覆寫，
   * 亦可由管理員在系統設定頁調整後存入後端（而非 localStorage）。
   */
  DEFAULT_LEAVE_THRESHOLDS: Object.freeze({
    wbc: 30,
    lymphocyte: 60,
    monocyte: 20,
    eosinophil: 20,
    basophil: 5,
    atypicalLymphocyte: 10,
    blast: 'present',
    promyelocyte: 'present',
    myelocyte: 5,
    metamyelocyte: 10,
    hypersegmented: 10,
    promonocyte: 'present',
    plasmaCell: 'present',
    abnormalLymphocyte: 'present',
  }),

  /**
   * AI 分析 API 設定（未來整合用）
   * endpoint：後端 AI Proxy 路徑（前端不應直接呼叫 AI 廠商 API，避免洩漏 API Key）
   * confidenceThreshold：信心分數低於此值時，顯示「低信心」警告
   */
  AI: Object.freeze({
    ENDPOINT: '/ai/classify',
    CONFIDENCE_THRESHOLD: 0.80,
    MAX_CELLS_PER_REQUEST: 50,
  }),

  /**
   * 前端路由設定（多頁應用各頁面 filename）
   */
  ROUTES: Object.freeze({
    LOGIN: 'index.html',
    SPECIMEN_LIST: '檢體管理.html',
    IMAGE_REVIEW: '影像檢視與細胞編輯.html',
    REPORT_ISSUE: '報告核發.html',
  }),

  /**
   * 本地儲存 key 集中管理（避免各處硬編字串、難以追蹤）
   * 原則：只存 UI 偏好（字型大小、縮放）於 localStorage；
   *       業務狀態（工作流程進度）應送後端，不應存 localStorage。
   * 此處保留 WORKFLOW_OVERRIDES 僅供 Demo/開發模式使用。
   */
  STORAGE_KEYS: Object.freeze({
    // 與原版 common.js 使用相同 key，確保 Demo 中 UI 偏好正常讀取
    FONT_LEVEL: 'blood-morphology-font-level',
    CELL_ZOOM: 'blood-morphology-cell-image-zoom',
    // ⚠️ 以下僅限 Demo 模式，上線後應移除（改存後端）
    WORKFLOW_OVERRIDES: 'blood-morphology-specimen-status',
    USABILITY_SCENARIO: 'blood-morphology-usability-scenario',
    /** 情境模擬測試：是否使用舊版 CellaVision 介面（僅本複本專案） */
    LEGACY_UI: 'blood-morphology-legacy-ui',
    EDITED_CELLS_PREFIX: 'editedCells:',
    // v2 新增：session token（登入/登出用）
    SESSION_TOKEN: 'bhm_session_token',
    SESSION_USER: 'bhm_session_user',
  }),

});
