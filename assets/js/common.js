/**
 * 血球分類軟體 - 共用資料與工具
 * 病患／檢體資料請由 assets/data/database.js 載入後使用 APP_DATABASE。
 */

/** 與檢體管理／影像檢視／報告核發共用的字型段階（0 小、1 中、2 大、3 最大），存於 localStorage */
var APP_FONT_LEVEL_STORAGE_KEY = 'blood-morphology-font-level';
var APP_FONT_LEVEL_CLASSES = ['font-size-small', 'font-size-normal', 'font-size-large', 'font-size-xlarge'];
var APP_CELL_IMAGE_ZOOM_STORAGE_KEY = 'blood-morphology-cell-image-zoom';

function clampAppFontLevel(n) {
  var x = parseInt(n, 10);
  if (isNaN(x)) return 1;
  return Math.max(0, Math.min(3, x));
}

function getStoredFontLevel() {
  try {
    var v = localStorage.getItem(APP_FONT_LEVEL_STORAGE_KEY);
    if (v === null || v === '') return 1;
    return clampAppFontLevel(v);
  } catch (e) {
    return 1;
  }
}

function applyAppFontLevel(level) {
  level = clampAppFontLevel(level);
  var root = document.documentElement;
  APP_FONT_LEVEL_CLASSES.forEach(function (c) { root.classList.remove(c); });
  root.classList.add(APP_FONT_LEVEL_CLASSES[level]);
  try {
    localStorage.setItem(APP_FONT_LEVEL_STORAGE_KEY, String(level));
  } catch (e) {}
  return level;
}

/** 進入頁面時呼叫：自 localStorage 還原並套用至 html */
function initAppFontLevel() {
  return applyAppFontLevel(getStoredFontLevel());
}

/** 相對於目前儲存段階增減（例如 -1 / +1） */
function adjustAppFontLevel(delta) {
  return applyAppFontLevel(getStoredFontLevel() + delta);
}

function clampCellImageZoomLevel(n) {
  var x = parseInt(n, 10);
  if (isNaN(x)) return 100;
  return Math.max(50, Math.min(200, x));
}

function getStoredCellImageZoomLevel() {
  try {
    var v = localStorage.getItem(APP_CELL_IMAGE_ZOOM_STORAGE_KEY);
    if (v === null || v === '') return 100;
    return clampCellImageZoomLevel(v);
  } catch (e) {
    return 100;
  }
}

function syncCellZoomCssVar(level) {
  try {
    document.documentElement.style.setProperty('--cell-zoom-factor', String(clampCellImageZoomLevel(level) / 100));
  } catch (e) {}
}

function applyCellImageZoomLevel(level) {
  level = clampCellImageZoomLevel(level);
  syncCellZoomCssVar(level);
  try {
    localStorage.setItem(APP_CELL_IMAGE_ZOOM_STORAGE_KEY, String(level));
  } catch (e) {}
  return level;
}

function initCellImageZoomLevel() {
  return applyCellImageZoomLevel(getStoredCellImageZoomLevel());
}

function adjustCellImageZoomLevel(delta) {
  return applyCellImageZoomLevel(getStoredCellImageZoomLevel() + delta);
}

/**
 * 留單門檻預設值（林口長庚留單標準對應之數值／Present）
 * 與影像檢視分析表高亮、報告核發風險橫幅共用；執行時以 LEAVE_THRESHOLDS 為準（可自檢體管理「系統設定」覆寫並存 localStorage）。
 */
var DEFAULT_LEAVE_THRESHOLDS = {
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
  abnormalLymphocyte: 'present'
};

/** 列表／設定畫面用中文標籤（key 同 DEFAULT_LEAVE_THRESHOLDS） */
var LEAVE_THRESHOLD_LABELS = {
  wbc: 'WBC',
  lymphocyte: 'Lymphocyte (%)',
  monocyte: 'Monocyte (%)',
  eosinophil: 'Eosinophil (%)',
  basophil: 'Basophil (%)',
  atypicalLymphocyte: 'Atypical lymphocyte (%)',
  blast: 'Blast',
  promyelocyte: 'Promyelocyte',
  myelocyte: 'Myelocyte (%)',
  metamyelocyte: 'Metamyelocyte (%)',
  hypersegmented: 'Hypersegmented (%)',
  promonocyte: 'Promonocyte',
  plasmaCell: 'Plasma cell',
  abnormalLymphocyte: 'Abnormal lymphocyte'
};

var APP_LEAVE_THRESHOLDS_STORAGE_KEY = 'blood-morphology-leave-thresholds';

function cloneLeaveThresholds(source) {
  return JSON.parse(JSON.stringify(source || DEFAULT_LEAVE_THRESHOLDS));
}

/** 執行中門檻（可與預設不同） */
var LEAVE_THRESHOLDS = cloneLeaveThresholds(DEFAULT_LEAVE_THRESHOLDS);

function loadLeaveThresholdsFromStorage() {
  try {
    var raw = localStorage.getItem(APP_LEAVE_THRESHOLDS_STORAGE_KEY);
    if (!raw) return;
    var parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;
    Object.keys(DEFAULT_LEAVE_THRESHOLDS).forEach(function (k) {
      var pv = parsed[k];
      var def = DEFAULT_LEAVE_THRESHOLDS[k];
      if (pv === undefined || pv === null) return;
      if (def === 'present') {
        if (pv === 'present') LEAVE_THRESHOLDS[k] = 'present';
        return;
      }
      if (typeof def === 'number') {
        var n = typeof pv === 'number' ? pv : parseFloat(String(pv).replace(',', '.'), 10);
        if (!isNaN(n) && n >= 0) LEAVE_THRESHOLDS[k] = n;
      }
    });
  } catch (e) {}
}

function persistLeaveThresholdsToStorage() {
  try {
    localStorage.setItem(APP_LEAVE_THRESHOLDS_STORAGE_KEY, JSON.stringify(LEAVE_THRESHOLDS));
  } catch (e) {}
}

function resetLeaveThresholdsToDefaults() {
  var fresh = cloneLeaveThresholds(DEFAULT_LEAVE_THRESHOLDS);
  Object.keys(DEFAULT_LEAVE_THRESHOLDS).forEach(function (k) {
    LEAVE_THRESHOLDS[k] = fresh[k];
  });
  try {
    localStorage.removeItem(APP_LEAVE_THRESHOLDS_STORAGE_KEY);
  } catch (e) {}
}

function parseMetricNum(v) {
  if (v === '-' || v === '' || v == null) return null;
  var n = parseFloat(String(v).replace(',', '.'), 10);
  return isNaN(n) ? null : n;
}

/** 流式計數欄顯示值（與檢體管理一致：成熟細胞取自 flowCyt，未成熟/異常細胞一律 '-'） */
function getFlowCytMetricValue(spec, key) {
  if (!spec) return '-';
  if (key === 'wbc' || key === 'plt') {
    var m = spec.metrics || {};
    return m[key] != null && m[key] !== '' ? m[key] : '-';
  }
  var f = spec.flowCyt || {};
  return f[key] !== undefined ? f[key] : '-';
}

function isAbnormalMetricValue(key, value) {
  var th = LEAVE_THRESHOLDS[key];
  if (th == null) return false;
  var num = parseMetricNum(value);
  if (th === 'present') return num != null && num > 0;
  if (typeof th === 'number') return num != null && num >= th;
  return false;
}

/**
 * 留單新發判定（嚴格同 key）：
 * - current 達門檻且 prev 未達門檻 => true
 * - 其餘 => false
 */
function isNewLeaveConditionByKey(key, currentValue, prevValue) {
  return isAbnormalMetricValue(key, currentValue) && !isAbnormalMetricValue(key, prevValue);
}

/** 任一留單 key 為新發（嚴格同 key） */
function hasAnyNewLeaveCondition(currentMetrics, prevMetrics) {
  if (typeof LEAVE_THRESHOLDS === 'undefined') return false;
  var keys = Object.keys(LEAVE_THRESHOLDS);
  var cur = currentMetrics || {};
  var prev = prevMetrics || {};
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (isNewLeaveConditionByKey(k, cur[k], prev[k])) return true;
  }
  return false;
}

function parseFlexibleDateTime(v) {
  if (!v) return null;
  var s = String(v).trim().replace(/\//g, '-').replace('T', ' ');
  var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (!m) return null;
  var y = parseInt(m[1], 10);
  var mo = parseInt(m[2], 10) - 1;
  var d = parseInt(m[3], 10);
  var hh = m[4] ? parseInt(m[4], 10) : 0;
  var mm = m[5] ? parseInt(m[5], 10) : 0;
  var dt = new Date(y, mo, d, hh, mm, 0, 0);
  return isNaN(dt.getTime()) ? null : dt;
}

/** 取得前次報告距離目前檢體分析時間的天數（null 表示無資料） */
function getPrevReportDaysAgo(spec) {
  if (!spec || !spec.prevReportDate) return null;
  var prev = parseFlexibleDateTime(spec.prevReportDate);
  if (!prev) return null;
  var anchor = parseFlexibleDateTime(spec.analysisTime) || new Date();
  var diff = anchor.getTime() - prev.getTime();
  if (!isFinite(diff)) return null;
  var days = Math.floor(diff / 86400000);
  return days < 0 ? 0 : days;
}

/** 產生欄標：前次報告（X天前） */
function getPrevReportHeaderLabel(spec, baseLabel) {
  var base = baseLabel || '前次報告';
  var days = getPrevReportDaysAgo(spec);
  if (days == null) return base + '（-）';
  return base + '（' + days + '天前）';
}

/** 從報告核發「改為人工鏡檢」返回檢體管理時，顯示一次性提示（sessionStorage 單次消耗） */
var MANUAL_ALERT_TOAST_STORAGE_KEY = 'blood-morphology-manual-alert-toast';

function queueManualAlertToast(specimenId, addedFollowUp) {
  if (!specimenId) return;
  try {
    sessionStorage.setItem(
      MANUAL_ALERT_TOAST_STORAGE_KEY,
      JSON.stringify({
        specimenId: String(specimenId),
        addedFollowUp: addedFollowUp !== false
      })
    );
  } catch (e) {}
}

/** 讀取並清除佇列；回傳 { specimenId, addedFollowUp } 或 null */
function consumeManualAlertToastQueue() {
  try {
    var raw = sessionStorage.getItem(MANUAL_ALERT_TOAST_STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(MANUAL_ALERT_TOAST_STORAGE_KEY);
    var parsed = JSON.parse(raw);
    if (!parsed || !parsed.specimenId) return null;
    return {
      specimenId: String(parsed.specimenId),
      addedFollowUp: parsed.addedFollowUp !== false
    };
  } catch (e) {
    return null;
  }
}

var FOLLOW_UP_DONE_TOAST_STORAGE_KEY = 'blood-morphology-follow-up-done-toast';
var REPORT_VERIFIED_TOAST_STORAGE_KEY = 'blood-morphology-report-verified-toast';

function queueReportVerifiedToast(specimenId) {
  if (!specimenId) return;
  try {
    var completed = false;
    if (typeof getSpecimenById === 'function' && typeof isSpecimenWorkflowCompleted === 'function') {
      var spec = getSpecimenById(specimenId);
      completed = !!(spec && isSpecimenWorkflowCompleted(spec));
    }
    sessionStorage.setItem(REPORT_VERIFIED_TOAST_STORAGE_KEY, JSON.stringify({
      specimenId: String(specimenId),
      workflowCompleted: completed
    }));
  } catch (e) {}
}

function consumeReportVerifiedToastQueue() {
  try {
    var raw = sessionStorage.getItem(REPORT_VERIFIED_TOAST_STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(REPORT_VERIFIED_TOAST_STORAGE_KEY);
    var parsed = JSON.parse(raw);
    if (!parsed || !parsed.specimenId) return null;
    return {
      specimenId: String(parsed.specimenId),
      workflowCompleted: !!parsed.workflowCompleted
    };
  } catch (e) {
    return null;
  }
}

function queueFollowUpDoneToast(specimenId) {
  if (!specimenId) return;
  try {
    var completed = false;
    if (typeof getSpecimenById === 'function' && typeof isSpecimenWorkflowCompleted === 'function') {
      var spec = getSpecimenById(specimenId);
      completed = !!(spec && isSpecimenWorkflowCompleted(spec));
    }
    sessionStorage.setItem(FOLLOW_UP_DONE_TOAST_STORAGE_KEY, JSON.stringify({
      specimenId: String(specimenId),
      workflowCompleted: completed
    }));
  } catch (e) {}
}

/** 檢體是否仍有待辦的需拉片確認（有膠囊且尚未綠勾） */
function needsPendingFollowUpReview(spec) {
  if (!spec || !Array.isArray(spec.status)) return false;
  if (spec.status.indexOf('Follow-up') === -1) return false;
  return typeof isEntityStatusCompleted === 'function' && !isEntityStatusCompleted(spec, 'Follow-up');
}

/** 標記需拉片確認完成（與列表點膠囊／報告「已拉片完成」共用） */
function markFollowUpReviewDone(specimenId) {
  if (!specimenId || typeof getSpecimenById !== 'function') return false;
  var spec = getSpecimenById(specimenId);
  if (!spec || !Array.isArray(spec.status) || spec.status.indexOf('Follow-up') === -1) return false;
  if (typeof isEntityStatusCompleted === 'function' && isEntityStatusCompleted(spec, 'Follow-up')) return true;
  if (!spec.workflowDone || typeof spec.workflowDone !== 'object') {
    spec.workflowDone = { digitalReview: false, digitalReviewSignedOff: false, aiAlertConfirmed: false, entityReview: false, entityStatusDone: {} };
  }
  if (!spec.workflowDone.entityStatusDone || typeof spec.workflowDone.entityStatusDone !== 'object') {
    spec.workflowDone.entityStatusDone = {};
  }
  spec.workflowDone.entityStatusDone['Follow-up'] = true;
  /** AI+需拉片雙旗標：拉片完成時一併確認 AI（數位欄位） */
  if (typeof isAiAlertAndFollowUpSpecimen === 'function' && isAiAlertAndFollowUpSpecimen(spec) && spec.status.indexOf('AI Alert') !== -1) {
    spec.workflowDone.aiAlertConfirmed = true;
  }
  spec.workflowDone.entityReview = typeof recomputeEntityReviewFromStatus === 'function'
    ? recomputeEntityReviewFromStatus(spec.status, spec.workflowDone.entityStatusDone)
    : false;
  spec.statusDone = typeof computeSpecimenStatusDoneFromWorkflow === 'function'
    ? computeSpecimenStatusDoneFromWorkflow(spec.status, spec.workflowDone)
    : false;
  if (!spec.statusDone) spec.editor = '';
  else {
    var editorAccount = typeof getCurrentUserAccount === 'function' ? getCurrentUserAccount() : '';
    if (editorAccount) spec.editor = editorAccount;
  }
  if (typeof persistSpecimenStatusOverride === 'function') {
    persistSpecimenStatusOverride(specimenId, spec.status, {
      workflowDone: spec.workflowDone,
      editor: spec.editor || ''
    });
  }
  return true;
}

function consumeFollowUpDoneToastQueue() {
  try {
    var raw = sessionStorage.getItem(FOLLOW_UP_DONE_TOAST_STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(FOLLOW_UP_DONE_TOAST_STORAGE_KEY);
    var parsed = JSON.parse(raw);
    if (!parsed || !parsed.specimenId) return null;
    return {
      specimenId: String(parsed.specimenId),
      workflowCompleted: !!parsed.workflowCompleted
    };
  } catch (e) {
    return null;
  }
}

// 檢體清單：由數據資料庫提供，未載入時為空陣列
var MOCK_SPECIMENS = (typeof APP_DATABASE !== 'undefined' && APP_DATABASE.specimens) ? APP_DATABASE.specimens : [];

// 從 URL 取得目前檢體 ID（用於影像檢視、報告核發）
function getSpecimenIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('specimen') || params.get('id') || '';
}

var REVIEW_RETURN_LIST_MODE_KEY = 'blood-morphology-review-return-list-mode';
var SPECIMEN_LIST_MODE_STORAGE_KEY = 'blood-morphology-specimen-list-mode';

/** 進入影像檢視前記住檢體管理模式，返回列表時還原（改人工鏡檢／簽核後跳回列表） */
function rememberSpecimenListModeForReviewReturn() {
  try {
    var mode = localStorage.getItem(SPECIMEN_LIST_MODE_STORAGE_KEY);
    if (mode !== 'digital' && mode !== 'entity') mode = 'digital';
    sessionStorage.setItem(REVIEW_RETURN_LIST_MODE_KEY, mode);
  } catch (e) {}
}

function consumeReviewReturnListMode() {
  try {
    var mode = sessionStorage.getItem(REVIEW_RETURN_LIST_MODE_KEY);
    if (mode === 'digital' || mode === 'entity') return mode;
  } catch (e) {}
  return null;
}

function clearReviewReturnListMode() {
  try {
    sessionStorage.removeItem(REVIEW_RETURN_LIST_MODE_KEY);
  } catch (e) {}
}

function persistSpecimenListModeSelection(mode) {
  if (mode !== 'digital' && mode !== 'entity') return;
  try {
    localStorage.setItem(SPECIMEN_LIST_MODE_STORAGE_KEY, mode);
  } catch (e) {}
}

// 導向影像檢視頁（opts.readonly 為 true 時附加 readonly=1，供唯讀檢視）
function goToImageReview(specimenId, opts) {
  if (!specimenId || typeof getSpecimenById !== 'function') return false;
  var spec = getSpecimenById(specimenId);
  if (spec && typeof isSpecimenLocked === 'function' && isSpecimenLocked(spec) && !(opts && opts.readonly)) return false;
  if (spec && spec.locked && !(opts && opts.readonly)) return false;
  rememberSpecimenListModeForReviewReturn();
  const base = getBasePath();
  var page = (typeof LegacyUi !== 'undefined') ? LegacyUi.resolvePageUrl('imageReview') : '影像檢視與細胞編輯.html';
  let url = base + page + '?specimen=' + encodeURIComponent(specimenId);
  if (opts && opts.readonly) url += '&readonly=1';
  window.location.href = url;
  return true;
}

/**
 * 退回 Digital Review（將數位流程重開，供檢體管理「退回」動作呼叫）。
 * 會寫入與 persistSpecimenStatusOverride 相同之 localStorage 覆寫。
 */
function reopenDigitalReview(specimenId) {
  if (!specimenId || typeof getSpecimenById !== 'function') return false;
  var spec = getSpecimenById(specimenId);
  if (!spec) return false;
  if (!spec.workflowDone || typeof spec.workflowDone !== 'object') spec.workflowDone = { digitalReview: false, digitalReviewSignedOff: false, entityReview: false, entityStatusDone: {} };
  spec.workflowDone.digitalReview = false;
  spec.workflowDone.digitalReviewSignedOff = false;
  spec.statusDone = computeSpecimenStatusDoneFromWorkflow(spec.status, spec.workflowDone);
  spec.editor = '';
  if (typeof clearEditedCellsSnapshot === 'function') {
    clearEditedCellsSnapshot(specimenId);
  }
  if (typeof persistSpecimenStatusOverride === 'function') {
    persistSpecimenStatusOverride(specimenId, spec.status, { workflowDone: spec.workflowDone, editor: '' });
  }
  return true;
}

/** 改為人工鏡檢交接後、待拉片：數位已完成但未簽核結案 */
function isDigitalReviewHandoffToFollowUp(spec) {
  if (!spec) return false;
  var wf = normalizeWorkflowDone(spec.workflowDone, spec.statusDone);
  if (!wf.digitalReview || wf.digitalReviewSignedOff) return false;
  return typeof needsPendingFollowUpReview === 'function' && needsPendingFollowUpReview(spec);
}

// 導向報告核發頁（可帶檢體 ID）
function goToReportIssue(specimenId) {
  const base = getBasePath();
  var page = (typeof LegacyUi !== 'undefined') ? LegacyUi.resolvePageUrl('reportIssue') : '報告核發.html';
  let url = base + page;
  if (specimenId) url += '?specimen=' + encodeURIComponent(specimenId);
  window.location.href = url;
}

// 返回檢體管理（opts.preferMode：返回後強制還原數位／實體模式）
function goToSpecimenList(opts) {
  var prefer = opts && opts.preferMode;
  if (prefer !== 'digital' && prefer !== 'entity') {
    prefer = consumeReviewReturnListMode();
  }
  if (prefer === 'digital' || prefer === 'entity') {
    persistSpecimenListModeSelection(prefer);
  }
  const base = getBasePath();
  var page = (typeof LegacyUi !== 'undefined') ? LegacyUi.resolvePageUrl('specimenList') : '檢體管理.html';
  window.location.href = base + page;
}

// 取得目前路徑的 base（避免子資料夾時連結錯誤）
function getBasePath() {
  const path = window.location.pathname;
  const lastSlash = path.lastIndexOf('/');
  if (lastSlash === -1) return '';
  return path.substring(0, lastSlash + 1);
}

// 依 ID 取得檢體
function getSpecimenById(id) {
  return MOCK_SPECIMENS.find(function (s) { return s.id === id; }) || null;
}

// 狀態標籤樣式對應；影像頁 Add Flag 選項前小圓點請用同色調之 *-500（如 orange-500、red-500）
const STATUS_STYLES = {
  'PLT Check': 'bg-blue-100 text-blue-800',
  'Digital Review': 'bg-purple-100 text-purple-800',
  'AI Alert': 'bg-orange-100 text-orange-800',
  'Follow-up': 'bg-red-100 text-red-800',
  'Verified': 'bg-green-100 text-green-800',
  'Locked': 'bg-gray-200 text-gray-800 border border-gray-300'
};

/** 狀態膠囊顯示用中文（內部 key 仍為英文） */
var STATUS_DISPLAY_LABELS = {
  'PLT Check': '血小板確認',
  'Digital Review': '數位閱片',
  'AI Alert': 'AI分類警示',
  'Follow-up': '需拉片確認',
  'Locked': '鎖定中',
  'Verified': '已完成'
};

function getStatusDisplayLabel(statusKey) {
  if (!statusKey) return '';
  return STATUS_DISPLAY_LABELS[statusKey] || statusKey;
}

/** 舊版 Manual Alert 併入需拉片確認（Follow-up） */
function migrateLegacyManualAlertStatus(statusArr) {
  if (!Array.isArray(statusArr)) return [];
  var st = statusArr.slice();
  if (st.indexOf('Manual Alert') === -1) return st;
  st = st.filter(function (x) { return x !== 'Manual Alert'; });
  if (st.indexOf('Follow-up') === -1) st.push('Follow-up');
  return st;
}

function migrateLegacyEntityStatusDone(entityStatusDone) {
  if (!entityStatusDone || typeof entityStatusDone !== 'object') return { entity: {}, legacyAiAlert: false };
  var entity = {};
  var legacyAiAlert = false;
  Object.keys(entityStatusDone).forEach(function (k) {
    if (k === 'Manual Alert') {
      if (entity['Follow-up'] === undefined) entity['Follow-up'] = !!entityStatusDone[k];
      return;
    }
    if (k === 'AI Alert') {
      legacyAiAlert = legacyAiAlert || !!entityStatusDone[k];
      return;
    }
    entity[k] = !!entityStatusDone[k];
  });
  return { entity: entity, legacyAiAlert: legacyAiAlert };
}

// 模式預設勾選的狀態（數位閱片 / 實體作業）
const MODE_DEFAULT_STATUS = {
  digital: ['Digital Review', 'AI Alert'],
  entity: ['Follow-up', 'PLT Check']
};

/**
 * 四種膠囊規則（檢體管理清單／劇本）— 詳見 ARCHITECTURE.md
 *
 * 【進線】三步驟（互不相抵觸後合併 status）：
 *   1. AI 預分類達留單門檻 → AI Alert
 *   2. LIS 需推片確認 → Follow-up；否則 → Digital Review（FU 與 DR 互斥）
 *   3. 血小板規則 → PLT Check（可與上併存）
 *
 * 【模式】AI+FU（±PLT）僅實體；DR 路徑若有 AI 必 DR+AI；DR±PLT 可數位與實體並行
 * 【過渡】改為人工鏡檢 → DR✓（+AI✓）+ FU 待辦（+PLT 若本有）→ 僅實體清單
 * 【不存在初始】單獨 AI、AI+PLT、DR+FU、DR+PLT+FU 等（見文件 §七）
 */

/** AI+需拉片確認 雙旗標：僅實體作業清單，不進數位閱片模式 */
function isAiAlertAndFollowUpSpecimen(spec) {
  if (!spec || !Array.isArray(spec.status)) return false;
  var st = spec.status;
  return st.indexOf('AI Alert') !== -1 && st.indexOf('Follow-up') !== -1;
}

/**
 * 是否仍有待辦的數位閱片流程。
 * 含 DR 待辦，或 DR+AI 時 AI 尚待確認（DR 已完成後第二段）。
 * 不含 AI+FU 雙旗標；不含無 DR 膠囊的單獨 AI（劇本不應存在）。
 */
function hasPendingDigitalReviewWork(spec) {
  if (!spec || !Array.isArray(spec.status)) return false;
  if (isAiAlertAndFollowUpSpecimen(spec)) return false;
  var st = spec.status;
  if (st.indexOf('Digital Review') >= 0) {
    return typeof isDigitalReviewDone === 'function' && !isDigitalReviewDone(spec);
  }
  if (st.indexOf('AI Alert') >= 0 && matchesAiAlertForDigitalList(spec)) {
    return typeof isAiAlertConfirmed === 'function' && !isAiAlertConfirmed(spec);
  }
  return false;
}

/**
 * 數位閱片模式清單排除：
 * - AI+FU 雙旗標（僅實體作業）
 * - 無待辦數位流程（含數位已結僅剩 PLT／FU 實體待辦）
 * 整體流程已完成者不排除，以便在 Verified 篩選下仍可見。
 */
function shouldExcludeFromDigitalSpecimenList(spec) {
  if (isAiAlertAndFollowUpSpecimen(spec)) return true;
  if (typeof isSpecimenWorkflowCompleted === 'function' && isSpecimenWorkflowCompleted(spec)) {
    return false;
  }
  return !hasPendingDigitalReviewWork(spec);
}

/** 數位清單內之 AI 待確認：須有 DR 膠囊且非 AI+FU 雙旗標 */
function matchesAiAlertForDigitalList(spec) {
  if (!spec || !Array.isArray(spec.status) || spec.status.indexOf('AI Alert') === -1) return false;
  if (spec.status.indexOf('Follow-up') !== -1) return false;
  return spec.status.indexOf('Digital Review') !== -1;
}

/**
 * 報告端「改為人工鏡檢」過渡狀態：數位閱片與 AI（若有）標完成，新增需拉片確認待辦。
 * 初始狀態不應出現 DR+FU 並存；此為 DR（±AI）完成後之實體交接。
 */
function buildWorkflowDoneAfterManualFollowUpFromReport(spec, statusArr) {
  var wf = normalizeWorkflowDone(spec && spec.workflowDone, spec && spec.statusDone);
  var entityStatusDone = {};
  ENTITY_REVIEW_STATUS_SET.forEach(function (k) {
    if (wf.entityStatusDone && wf.entityStatusDone[k] !== undefined) {
      entityStatusDone[k] = !!wf.entityStatusDone[k];
    }
  });
  var st = Array.isArray(statusArr) ? statusArr : (spec && spec.status) || [];
  var aiAlertConfirmed = !!wf.aiAlertConfirmed;
  if (st.indexOf('AI Alert') !== -1) {
    aiAlertConfirmed = true;
  }
  if (st.indexOf('Follow-up') !== -1) {
    entityStatusDone['Follow-up'] = false;
  }
  return {
    digitalReview: true,
    digitalReviewSignedOff: false,
    aiAlertConfirmed: aiAlertConfirmed,
    entityReview: false,
    entityStatusDone: entityStatusDone
  };
}

function recomputeEntityReviewFromStatus(statusArr, entityStatusDone) {
  var entityStatuses = (statusArr || []).filter(function (x) {
    return ENTITY_REVIEW_STATUS_SET.indexOf(x) !== -1;
  });
  if (entityStatuses.length === 0) return true;
  return entityStatuses.every(function (k) {
    return entityStatusDone && entityStatusDone[k] === true;
  });
}

/**
 * 報告簽核完成（數位流程）：
 * - confirmAiOnVerify：綠／黃橫幅簽核 → aiAlertConfirmed
 * - forceUnlockSignOff：開鎖強制簽核 → 確認 AI；有待拉片則一併標完成
 * - 簽核完成時若 workflow 已走數位流程，補上 Digital Review 膠囊（顯示完成勾選）
 */
function buildWorkflowDoneOnReportVerified(spec, options) {
  options = options || {};
  var wf = normalizeWorkflowDone(spec && spec.workflowDone, spec && spec.statusDone);
  var entityStatusDone = {};
  ENTITY_REVIEW_STATUS_SET.forEach(function (k) {
    if (wf.entityStatusDone && wf.entityStatusDone[k] !== undefined) {
      entityStatusDone[k] = !!wf.entityStatusDone[k];
    }
  });
  var st = spec && Array.isArray(spec.status) ? spec.status.slice().filter(function (x) { return x !== 'Verified'; }) : [];
  var hadDigitalReview = st.indexOf('Digital Review') !== -1;
  var confirmAi = !!(options.confirmAiOnVerify || options.forceUnlockSignOff);

  if (hadDigitalReview || confirmAi || options.forceUnlockSignOff) {
    wf.digitalReview = true;
    wf.digitalReviewSignedOff = true;
  }

  if (confirmAi && st.indexOf('AI Alert') !== -1) {
    wf.aiAlertConfirmed = true;
  }

  if (options.forceUnlockSignOff && st.indexOf('Follow-up') !== -1) {
    entityStatusDone['Follow-up'] = true;
  }

  /** 簽核完成數位流程時補上數位閱片膠囊（含僅需拉片、開鎖強制簽核等情境） */
  if (wf.digitalReview && st.indexOf('Digital Review') === -1) {
    st.push('Digital Review');
  }

  wf.entityReview = recomputeEntityReviewFromStatus(st, entityStatusDone);
  wf.entityStatusDone = entityStatusDone;
  return { status: st, workflowDone: wf };
}

/** 手動增刪 flag／簽核完成狀態覆寫（新版：status + workflowDone） */
var APP_SPECIMEN_STATUS_STORAGE_KEY = 'blood-morphology-specimen-status';
/** 數位閱片人員編輯之細胞分類快照（Demo：localStorage） */
var APP_EDITED_CELLS_STORAGE_PREFIX = 'editedCells:';
var APP_EDITED_METRICS_STORAGE_PREFIX = 'editedMetrics:';
/** 實體作業膠囊（不含 AI Alert；AI 完成記於 workflowDone.aiAlertConfirmed） */
var ENTITY_REVIEW_STATUS_SET = ['PLT Check', 'Follow-up'];

function persistEditedCellsSnapshot(specimenId, cells) {
  if (!specimenId || !Array.isArray(cells) || cells.length === 0) return;
  try {
    localStorage.setItem(APP_EDITED_CELLS_STORAGE_PREFIX + specimenId, JSON.stringify(cells));
  } catch (e) {}
}

function loadEditedCellsSnapshot(specimenId) {
  if (!specimenId) return null;
  try {
    var raw = localStorage.getItem(APP_EDITED_CELLS_STORAGE_PREFIX + specimenId);
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch (e) {
    return null;
  }
}

function clearEditedCellsSnapshot(specimenId) {
  if (!specimenId) return;
  try {
    localStorage.removeItem(APP_EDITED_CELLS_STORAGE_PREFIX + specimenId);
    localStorage.removeItem(APP_EDITED_METRICS_STORAGE_PREFIX + specimenId);
  } catch (e) {}
}

/** 登入重設 Demo 時清除所有檢體編輯快照 */
function clearAllSpecimenEditSnapshotsFromStorage() {
  try {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k) continue;
      if (k.indexOf(APP_EDITED_CELLS_STORAGE_PREFIX) === 0 || k.indexOf(APP_EDITED_METRICS_STORAGE_PREFIX) === 0) {
        keys.push(k);
      }
    }
    keys.forEach(function (k) { localStorage.removeItem(k); });
  } catch (e) {}
}

function normalizeWorkflowDone(rawWorkflow, rawStatusDone) {
  var digitalReview = false;
  var digitalReviewSignedOff = false;
  var aiAlertConfirmed = false;
  var entityReview = false;
  var entityStatusDone = {};
  if (rawWorkflow && typeof rawWorkflow === 'object') {
    digitalReview = !!rawWorkflow.digitalReview;
    if (rawWorkflow.digitalReviewSignedOff !== undefined) {
      digitalReviewSignedOff = !!rawWorkflow.digitalReviewSignedOff;
    } else if (digitalReview) {
      digitalReviewSignedOff = true;
    }
    aiAlertConfirmed = !!rawWorkflow.aiAlertConfirmed;
    entityReview = !!rawWorkflow.entityReview;
    if (rawWorkflow.entityStatusDone && typeof rawWorkflow.entityStatusDone === 'object') {
      var migrated = migrateLegacyEntityStatusDone(rawWorkflow.entityStatusDone);
      if (migrated.legacyAiAlert) aiAlertConfirmed = true;
      ENTITY_REVIEW_STATUS_SET.forEach(function (k) {
        if (migrated.entity[k] !== undefined) {
          entityStatusDone[k] = !!migrated.entity[k];
        }
      });
    }
  }
  if (rawStatusDone) {
    digitalReview = true;
    digitalReviewSignedOff = true;
    aiAlertConfirmed = true;
    entityReview = true;
    ENTITY_REVIEW_STATUS_SET.forEach(function (k) { entityStatusDone[k] = true; });
  }
  return {
    digitalReview: digitalReview,
    digitalReviewSignedOff: digitalReviewSignedOff,
    aiAlertConfirmed: aiAlertConfirmed,
    entityReview: entityReview,
    entityStatusDone: entityStatusDone
  };
}

function normalizeStatusStorageEntry(raw) {
  if (raw == null) return { status: [], statusDone: false, workflowDone: normalizeWorkflowDone(null, false), editor: '', locked: false };
  if (Array.isArray(raw)) {
    var stArr = migrateLegacyManualAlertStatus(raw.slice().filter(function (x) { return x !== 'Verified'; }));
    return {
      status: stArr,
      statusDone: false,
      workflowDone: normalizeWorkflowDone(null, false),
      editor: '',
      locked: stArr.indexOf('Locked') !== -1
    };
  }
  if (raw && typeof raw === 'object' && Array.isArray(raw.status)) {
    var status = migrateLegacyManualAlertStatus(raw.status.slice().filter(function (x) { return x !== 'Verified'; }));
    var locked = raw.locked !== undefined ? !!raw.locked : status.indexOf('Locked') !== -1;
    return {
      status: status,
      statusDone: !!raw.statusDone,
      workflowDone: normalizeWorkflowDone(raw.workflowDone, raw.statusDone),
      editor: typeof raw.editor === 'string' ? raw.editor : '',
      locked: locked
    };
  }
  return { status: [], statusDone: false, workflowDone: normalizeWorkflowDone(null, false), editor: '', locked: false };
}

function isSpecimenLocked(spec) {
  if (!spec) return false;
  if (spec.locked) return true;
  return hasStatus(spec, 'Locked');
}

/** 舊版留單：保護並上鎖（不簽核、回到清單後右鍵操作） */
function lockSpecimenProtectAndHold(specimenId) {
  var spec = typeof getSpecimenById === 'function' ? getSpecimenById(specimenId) : null;
  if (!spec || isSpecimenLocked(spec)) return false;
  if (typeof isSpecimenWorkflowCompleted === 'function' && isSpecimenWorkflowCompleted(spec)) return false;
  spec.locked = true;
  var st = Array.isArray(spec.status)
    ? spec.status.slice().filter(function (x) { return x !== 'Verified'; })
    : [];
  if (st.indexOf('Locked') === -1) st.push('Locked');
  spec.status = st;
  if (typeof persistSpecimenStatusOverride === 'function') {
    persistSpecimenStatusOverride(specimenId, st, { locked: true });
  }
  return true;
}

function hasStatus(spec, statusKey) {
  if (!spec || !Array.isArray(spec.status)) return false;
  return spec.status.indexOf(statusKey) !== -1;
}

function hasAnyEntityReviewTask(spec) {
  if (!spec || !Array.isArray(spec.status)) return false;
  return spec.status.some(function (s) { return ENTITY_REVIEW_STATUS_SET.indexOf(s) !== -1; });
}

function isDigitalReviewDone(spec) {
  if (!spec) return false;
  if (!hasStatus(spec, 'Digital Review')) return true;
  var wf = normalizeWorkflowDone(spec.workflowDone, spec.statusDone);
  return !!wf.digitalReview;
}

/** 閱片頁／列表唯讀：已簽核結案，或改為人工鏡檢交接後之編輯快照 */
function isDigitalReviewReadOnly(spec) {
  if (!spec) return false;
  if (spec.locked) return true;
  var wf = normalizeWorkflowDone(spec.workflowDone, spec.statusDone);
  if (!wf.digitalReview) return false;
  if (wf.digitalReviewSignedOff) return true;
  return typeof isDigitalReviewHandoffToFollowUp === 'function' && isDigitalReviewHandoffToFollowUp(spec);
}

/** AI 分類警示是否已確認（數位流程） */
function isAiAlertConfirmed(spec) {
  if (!spec) return false;
  if (!hasStatus(spec, 'AI Alert')) return true;
  var wf = normalizeWorkflowDone(spec.workflowDone, spec.statusDone);
  return !!wf.aiAlertConfirmed;
}

/** 數位流程完成：數位閱片（若有）＋ AI 警示（若有） */
function isDigitalWorkflowDone(spec) {
  if (!spec) return false;
  return isDigitalReviewDone(spec) && isAiAlertConfirmed(spec);
}

function isEntityReviewDone(spec) {
  if (!spec) return false;
  if (!hasAnyEntityReviewTask(spec)) return true;
  var wf = normalizeWorkflowDone(spec.workflowDone, spec.statusDone);
  var st = spec.status || [];
  var hasPartial = false;
  for (var i = 0; i < st.length; i++) {
    var key = st[i];
    if (ENTITY_REVIEW_STATUS_SET.indexOf(key) === -1) continue;
    hasPartial = true;
    if (!wf.entityStatusDone || wf.entityStatusDone[key] !== true) return false;
  }
  if (hasPartial) return true;
  return !!wf.entityReview;
}

function isEntityStatusCompleted(spec, statusKey) {
  if (!spec) return false;
  if (ENTITY_REVIEW_STATUS_SET.indexOf(statusKey) === -1) return false;
  var wf = normalizeWorkflowDone(spec.workflowDone, spec.statusDone);
  if (wf.entityStatusDone && wf.entityStatusDone[statusKey] !== undefined) return !!wf.entityStatusDone[statusKey];
  return !!wf.entityReview;
}

function persistSpecimenStatusOverride(specimenId, statusArray, options) {
  if (!specimenId) return;
  try {
    var raw = localStorage.getItem(APP_SPECIMEN_STATUS_STORAGE_KEY);
    var map = {};
    if (raw) {
      try { map = JSON.parse(raw) || {}; } catch (e2) { map = {}; }
    }
    if (!map || typeof map !== 'object') map = {};
    var prev = normalizeStatusStorageEntry(map[specimenId]);
    var nextStatus = migrateLegacyManualAlertStatus(
      Array.isArray(statusArray) ? statusArray.slice().filter(function (x) { return x !== 'Verified'; }) : []
    );
    var workflowInput = prev.workflowDone;
    if (options && options.workflowDone && typeof options.workflowDone === 'object') {
      var prevEntityStatusDone = (prev.workflowDone && prev.workflowDone.entityStatusDone) ? prev.workflowDone.entityStatusDone : {};
      var nextEntityStatusDone = {};
      if (options.workflowDone.entityStatusDone && typeof options.workflowDone.entityStatusDone === 'object') {
        ENTITY_REVIEW_STATUS_SET.forEach(function (k) {
          if (options.workflowDone.entityStatusDone[k] !== undefined) {
            nextEntityStatusDone[k] = !!options.workflowDone.entityStatusDone[k];
          } else if (prevEntityStatusDone[k] !== undefined) {
            nextEntityStatusDone[k] = !!prevEntityStatusDone[k];
          }
        });
      } else {
        ENTITY_REVIEW_STATUS_SET.forEach(function (k) {
          if (prevEntityStatusDone[k] !== undefined) nextEntityStatusDone[k] = !!prevEntityStatusDone[k];
        });
      }
      workflowInput = {
        digitalReview: options.workflowDone.digitalReview !== undefined ? options.workflowDone.digitalReview : prev.workflowDone.digitalReview,
        digitalReviewSignedOff: options.workflowDone.digitalReviewSignedOff !== undefined ? options.workflowDone.digitalReviewSignedOff : prev.workflowDone.digitalReviewSignedOff,
        aiAlertConfirmed: options.workflowDone.aiAlertConfirmed !== undefined ? options.workflowDone.aiAlertConfirmed : prev.workflowDone.aiAlertConfirmed,
        entityReview: options.workflowDone.entityReview !== undefined ? options.workflowDone.entityReview : prev.workflowDone.entityReview,
        entityStatusDone: nextEntityStatusDone
      };
    }
    var nextWorkflowDone = normalizeWorkflowDone(
      workflowInput,
      options && options.statusDone !== undefined ? !!options.statusDone : prev.statusDone
    );
    var nextDone = computeSpecimenStatusDoneFromWorkflow(nextStatus, nextWorkflowDone);
    var nextEditor = options && options.editor !== undefined ? options.editor : prev.editor;
    if (!nextDone) nextEditor = '';
    var nextLocked = prev.locked;
    if (options && options.locked !== undefined) nextLocked = !!options.locked;
    if (nextStatus.indexOf('Locked') !== -1) nextLocked = true;
    map[specimenId] = {
      status: nextStatus,
      statusDone: nextDone,
      workflowDone: nextWorkflowDone,
      editor: (nextEditor || ''),
      locked: nextLocked
    };
    localStorage.setItem(APP_SPECIMEN_STATUS_STORAGE_KEY, JSON.stringify(map));
    if (typeof APP_DATABASE !== 'undefined' && APP_DATABASE.specimens) {
      var live = APP_DATABASE.specimens.find(function (s) { return s.id === specimenId; });
      if (live) {
        live.status = nextStatus.slice();
        live.statusDone = nextDone;
        live.workflowDone = nextWorkflowDone;
        live.editor = nextEditor || '';
        live.locked = nextLocked;
      }
    }
  } catch (e) {}
}

function applySpecimenStatusOverridesFromStorage() {
  if (typeof APP_DATABASE === 'undefined' || !APP_DATABASE.specimens) return;
  try {
    var raw = localStorage.getItem(APP_SPECIMEN_STATUS_STORAGE_KEY);
    if (!raw) return;
    var map = JSON.parse(raw);
    if (!map || typeof map !== 'object') return;
    Object.keys(map).forEach(function (id) {
      var spec = APP_DATABASE.specimens.find(function (s) { return s.id === id; });
      if (!spec) return;
      var ent = normalizeStatusStorageEntry(map[id]);
      spec.status = migrateLegacyManualAlertStatus(ent.status);
      spec.workflowDone = normalizeWorkflowDone(ent.workflowDone, ent.statusDone);
      spec.statusDone = computeSpecimenStatusDoneFromWorkflow(spec.status, spec.workflowDone);
      spec.locked = !!ent.locked;
      if (!spec.statusDone) spec.editor = '';
      else spec.editor = typeof ent.editor === 'string' ? ent.editor : '';
    });
  } catch (e) {}
}

/** 登入後寫入 sessionStorage，供簽核完成時帶入編輯人員帳號 */
function getCurrentUserAccount() {
  try {
    return sessionStorage.getItem('blood-morphology-user-account') || '';
  } catch (e) {
    return '';
  }
}

/**
 * 檢體是否為「已完成」狀態：數位閱片與實體作業兩條流程都完成。
 * 規則：已完成時列表時效顯示與排序皆視為 0。
 */
function isSpecimenWorkflowCompleted(spec) {
  if (!spec) return false;
  return isDigitalWorkflowDone(spec) && isEntityReviewDone(spec);
}

/**
 * 與 isSpecimenWorkflowCompleted 一致地計算 statusDone。
 * 評估時傳入 statusDone: false，避免舊版 statusDone 旗標干擾 normalize。
 */
function computeSpecimenStatusDoneFromWorkflow(statusArr, workflowDoneObj) {
  return isSpecimenWorkflowCompleted({
    status: Array.isArray(statusArr) ? statusArr.slice() : [],
    workflowDone: workflowDoneObj || { digitalReview: false, digitalReviewSignedOff: false, aiAlertConfirmed: false, entityReview: false, entityStatusDone: {} },
    statusDone: false
  });
}

/** 列表／依時效排序用：已完成一律 0；未完成則用 urgency 欄位（空則空字串） */
function getSpecimenDisplayUrgency(spec) {
  if (!spec) return '';
  if (isSpecimenWorkflowCompleted(spec)) return 0;
  var u = spec.urgency;
  if (u == null || u === '') return '';
  return u;
}

(function () {
  loadLeaveThresholdsFromStorage();
  if (typeof APP_DATABASE !== 'undefined' && Array.isArray(APP_DATABASE.specimens)) {
    APP_DATABASE.specimens.forEach(function (spec) {
      spec.workflowDone = normalizeWorkflowDone(spec.workflowDone, spec.statusDone);
      spec.statusDone = computeSpecimenStatusDoneFromWorkflow(spec.status, spec.workflowDone);
      if (typeof isSpecimenLocked === 'function' && isSpecimenLocked(spec)) spec.locked = true;
    });
  }
  applySpecimenStatusOverridesFromStorage();
  if (typeof APP_DATABASE !== 'undefined' && Array.isArray(APP_DATABASE.specimens)) {
    APP_DATABASE.specimens.forEach(function (spec) {
      if (typeof isSpecimenWorkflowCompleted === 'function' && !isSpecimenWorkflowCompleted(spec)) {
        spec.editor = '';
      }
    });
  }
})();
