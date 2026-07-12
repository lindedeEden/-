/**
 * SpecimenService — 檢體業務邏輯服務
 *
 * 責任：
 *  - 封裝所有與「檢體」相關的業務規則
 *  - 不直接操作 DOM，不知道 localStorage 存在
 *  - 透過 ApiService 存取資料
 *
 * 問題修正（對比原版 common.js + image-review.js + report-issue.js 混合）：
 *  - 原版：業務邏輯、DOM 操作、資料存取三者完全混在一起
 *  - 原版：工作流程狀態靠 localStorage 字串比對，極易出現不一致
 *  - 原版：「留單門檻」讀寫散落在 common.js、檢體管理、報告核發三處
 *  - 修正：業務邏輯集中此處，UI 只呼叫 Service，Service 只呼叫 ApiService
 */

const SpecimenService = (function () {
  'use strict';

  // ─── 留單門檻（從後端載入，後備使用 config 預設值）──────────
  let _thresholds = Object.assign({}, AppConfig.DEFAULT_LEAVE_THRESHOLDS);

  async function loadThresholds() {
    try {
      const remote = await ApiService.get('/settings/thresholds');
      _thresholds = Object.assign({}, AppConfig.DEFAULT_LEAVE_THRESHOLDS, remote);
    } catch {
      // 後端不可用時使用預設值，不中斷使用
    }
    return _thresholds;
  }

  async function saveThresholds(newThresholds) {
    await ApiService.put('/settings/thresholds', newThresholds);
    _thresholds = Object.assign({}, newThresholds);
  }

  function getThresholds() { return Object.assign({}, _thresholds); }

  // ─── 異常值判定 ──────────────────────────────────────────────

  function parseNum(v) {
    if (v == null || v === '-' || v === '') return null;
    const n = parseFloat(String(v).replace(',', '.'));
    return isNaN(n) ? null : n;
  }

  /**
   * 某項指標是否超過留單門檻
   */
  function isAboveThreshold(key, value) {
    const th = _thresholds[key];
    if (th == null) return false;
    const num = parseNum(value);
    if (th === 'present') return num != null && num > 0;
    return typeof th === 'number' && num != null && num >= th;
  }

  /**
   * 是否為新發異常（本次超標而前次未超標）
   */
  function isNewAbnormal(key, current, previous) {
    return isAboveThreshold(key, current) && !isAboveThreshold(key, previous);
  }

  /**
   * 取得所有新發異常項目清單
   * @returns {Array<{key, label, currentValue, previousValue}>}
   */
  function getNewAbnormals(specimen) {
    if (!specimen) return [];
    const cur = specimen.metrics || {};
    const prev = specimen.prevReport || {};
    return Object.keys(_thresholds)
      .filter(k => isNewAbnormal(k, cur[k], prev[k]))
      .map(k => ({
        key: k,
        label: CellConstants.METRIC_LABELS[k] || k,
        currentValue: cur[k],
        previousValue: prev[k],
      }));
  }

  // ─── 工作流程狀態 ─────────────────────────────────────────────
  // 說明：工作流程狀態應儲存於後端資料庫，確保多人/多設備一致性。
  // 此處的函式負責計算「目前狀態」，並透過 ApiService 將變更送至後端。

  const ENTITY_STATUS_SET = ['PLT Check', 'Follow-up'];

  function _normalizeWorkflow(raw, legacyDone) {
    const base = {
      digitalReview: false,
      digitalReviewSignedOff: false,
      aiAlertConfirmed: false,
      entityReview: false,
      entityStatusDone: {},
    };
    if (legacyDone) {
      return { ...base, digitalReview: true, digitalReviewSignedOff: true,
               aiAlertConfirmed: true, entityReview: true,
               entityStatusDone: Object.fromEntries(ENTITY_STATUS_SET.map(k => [k, true])) };
    }
    if (!raw || typeof raw !== 'object') return base;
    const entityStatusDone = {};
    ENTITY_STATUS_SET.forEach(k => {
      if (raw.entityStatusDone?.[k] !== undefined) entityStatusDone[k] = !!raw.entityStatusDone[k];
    });
    return {
      digitalReview: !!raw.digitalReview,
      digitalReviewSignedOff: raw.digitalReviewSignedOff !== undefined ? !!raw.digitalReviewSignedOff : !!raw.digitalReview,
      aiAlertConfirmed: !!raw.aiAlertConfirmed,
      entityReview: !!raw.entityReview,
      entityStatusDone,
    };
  }

  function _hasStatus(spec, key) {
    return Array.isArray(spec?.status) && spec.status.includes(key);
  }

  function isDigitalReviewDone(spec) {
    if (!_hasStatus(spec, 'Digital Review')) return true;
    return !!_normalizeWorkflow(spec.workflowDone, spec.statusDone).digitalReview;
  }

  function isAiAlertConfirmed(spec) {
    if (!_hasStatus(spec, 'AI Alert')) return true;
    return !!_normalizeWorkflow(spec.workflowDone, spec.statusDone).aiAlertConfirmed;
  }

  function isEntityReviewDone(spec) {
    const st = spec?.status || [];
    const entityTasks = st.filter(s => ENTITY_STATUS_SET.includes(s));
    if (entityTasks.length === 0) return true;
    const wf = _normalizeWorkflow(spec.workflowDone, spec.statusDone);
    return entityTasks.every(k => wf.entityStatusDone?.[k] === true);
  }

  function isWorkflowCompleted(spec) {
    return isDigitalReviewDone(spec) && isAiAlertConfirmed(spec) && isEntityReviewDone(spec);
  }

  function isReadOnly(spec) {
    if (!spec) return false;
    if (spec.locked) return true;
    const wf = _normalizeWorkflow(spec.workflowDone, spec.statusDone);
    return wf.digitalReview && wf.digitalReviewSignedOff;
  }

  // ─── 資料存取（透過 ApiService）──────────────────────────────

  async function listSpecimens(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    const path = '/specimens' + (query ? '?' + query : '');
    const res = await ApiService.get(path);
    return res.data || [];
  }

  async function getSpecimen(id) {
    return ApiService.get('/specimens/' + id);
  }

  /**
   * 更新工作流程狀態（數位閱片完成、AI 確認、拉片完成等）
   * @param {string} specimenId
   * @param {object} workflowUpdate - 部分更新物件
   */
  async function updateWorkflow(specimenId, workflowUpdate) {
    return ApiService.patch('/specimens/' + specimenId + '/workflow', workflowUpdate);
  }

  /**
   * 儲存細胞人工編輯結果
   * @param {string} specimenId
   * @param {object} metrics - 編輯後百分比
   * @param {Array}  cells   - 細胞陣列快照
   */
  async function saveCellEdits(specimenId, metrics, cells) {
    return ApiService.patch('/specimens/' + specimenId + '/cells', { metrics, cells });
  }

  /**
   * 標記 Digital Review 完成（簽核）
   */
  async function signOffDigitalReview(specimenId, spec) {
    const wf = _normalizeWorkflow(spec.workflowDone, spec.statusDone);
    wf.digitalReview = true;
    wf.digitalReviewSignedOff = true;
    return updateWorkflow(specimenId, { workflowDone: wf });
  }

  /**
   * 改為人工鏡檢（加入 Follow-up，數位流程繼續）
   */
  async function escalateToFollowUp(specimenId, spec) {
    const newStatus = [...new Set([...(spec.status || []), 'Follow-up'])];
    const wf = _normalizeWorkflow(spec.workflowDone, spec.statusDone);
    wf.digitalReview = true;
    wf.digitalReviewSignedOff = false;
    if (newStatus.includes('AI Alert')) wf.aiAlertConfirmed = true;
    wf.entityStatusDone = wf.entityStatusDone || {};
    wf.entityStatusDone['Follow-up'] = false;
    return updateWorkflow(specimenId, { status: newStatus, workflowDone: wf });
  }

  return {
    // 門檻
    loadThresholds, saveThresholds, getThresholds,
    // 異常判定
    isAboveThreshold, isNewAbnormal, getNewAbnormals, parseNum,
    // 工作流程
    isWorkflowCompleted, isDigitalReviewDone, isAiAlertConfirmed,
    isEntityReviewDone, isReadOnly,
    // 資料
    listSpecimens, getSpecimen, updateWorkflow, saveCellEdits,
    signOffDigitalReview, escalateToFollowUp,
  };
})();
