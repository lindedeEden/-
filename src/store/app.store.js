/**
 * AppStore — 集中式狀態管理（輕量 Pub/Sub Store）
 *
 * 問題修正（對比原版）：
 *  - 原版：MOCK_SPECIMENS、LEAVE_THRESHOLDS、目前選取檢體 ID 等
 *          全部以全域變數散落各處，不同頁面讀寫同一份 localStorage 字串。
 *  - 原版：狀態改變不觸發任何通知，UI 必須主動 pull（容易不一致）。
 *  - 修正：所有「跨元件共用狀態」集中此處；改變時自動通知訂閱者（push）。
 *  - 修正：Store 本身不直接寫 localStorage；持久化由 StorageService 負責。
 *
 * 使用方式：
 *   AppStore.subscribe('specimens', list => renderTable(list));
 *   AppStore.set('specimens', newList);
 *   const user = AppStore.get('currentUser');
 */

const AppStore = (function () {
  'use strict';

  // 初始狀態
  const _state = {
    currentUser: null,        // { id, name, role }
    specimens: [],            // 目前頁面的檢體清單
    currentSpecimen: null,    // 影像檢視 / 報告頁正在操作的檢體
    thresholds: Object.assign({}, AppConfig.DEFAULT_LEAVE_THRESHOLDS),
    ui: {
      fontLevel: 1,           // 0~3
      cellZoom: 100,          // 50~200
      specimenMode: 'digital',// 'digital' | 'entity'
      filterStatus: [],
      filterDept: '',
      filterMachine: '',
      sortField: 'urgency',
      sortDir: 'desc',
      loading: false,
      error: null,
    },
  };

  // 訂閱表：key → Set<callback>
  const _subs = {};

  function _notify(key) {
    (_subs[key] || new Set()).forEach(cb => {
      try { cb(_state[key]); } catch (e) { console.error('[AppStore] subscriber error:', e); }
    });
    // 'ui' 的子屬性變更也通知 'ui'
    if (typeof key === 'string' && key.startsWith('ui.')) {
      (_subs['ui'] || new Set()).forEach(cb => {
        try { cb(_state.ui); } catch {}
      });
    }
  }

  /**
   * 讀取狀態（深層複製防止外部直接修改 state）
   * @param {string} key - 頂層 key，或 'ui.fontLevel' 等子路徑
   */
  function get(key) {
    if (key.includes('.')) {
      const [top, ...rest] = key.split('.');
      let val = _state[top];
      for (const k of rest) val = val?.[k];
      return val;
    }
    const val = _state[key];
    if (val == null || typeof val !== 'object') return val;
    return JSON.parse(JSON.stringify(val));
  }

  /**
   * 更新狀態並通知訂閱者
   * @param {string} key
   * @param {*} value
   */
  function set(key, value) {
    if (key.includes('.')) {
      const [top, sub] = key.split('.');
      if (typeof _state[top] === 'object') {
        _state[top] = { ..._state[top], [sub]: value };
        _notify(top);
        return;
      }
    }
    _state[key] = value;
    _notify(key);
  }

  /**
   * 訂閱某個 key 的變化
   * @param {string} key
   * @param {function} callback
   * @returns {function} unsubscribe 函式
   */
  function subscribe(key, callback) {
    if (!_subs[key]) _subs[key] = new Set();
    _subs[key].add(callback);
    return () => _subs[key].delete(callback);
  }

  /**
   * 更新 UI 子狀態（便利方法）
   */
  function setUi(subKey, value) {
    return set('ui.' + subKey, value);
  }

  /**
   * 初始化 Store（登入後呼叫）
   * 從服務層載入初始資料
   */
  async function init() {
    // 還原 UI 偏好（只有 UI 偏好才存 localStorage）
    try {
      const savedFont = localStorage.getItem(AppConfig.STORAGE_KEYS.FONT_LEVEL);
      if (savedFont !== null) setUi('fontLevel', parseInt(savedFont, 10) || 1);

      const savedZoom = localStorage.getItem(AppConfig.STORAGE_KEYS.CELL_ZOOM);
      if (savedZoom !== null) setUi('cellZoom', parseInt(savedZoom, 10) || 100);
    } catch {}

    // 載入留單門檻（從後端）
    const thresholds = await SpecimenService.loadThresholds();
    set('thresholds', thresholds);
  }

  return { get, set, setUi, subscribe, init };
})();
