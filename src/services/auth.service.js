/**
 * AuthService — 認證服務
 *
 * 責任：
 *  1. 登入 / 登出 / Token 管理
 *  2. 閒置自動登出計時器
 *  3. 頁面守衛（未登入時導回登入頁）
 *
 * 問題修正（對比原版 login.js）：
 *  - 原版：帳號密碼直接寫死在前端 JS → 任何人打開 DevTools 即可看到
 *  - 原版：用 localStorage 存登入狀態 → XSS 可竊取、跨分頁永久存活
 *  - 修正：帳密驗證移至後端；前端只存 JWT Token 於 sessionStorage（分頁關閉即清除）
 *  - 修正：加入 CSRF Token（真實後端需配合）
 *  - 修正：閒置 30 分鐘自動登出
 */

const AuthService = (function () {
  'use strict';

  const cfg = AppConfig.AUTH;
  let _idleTimer = null;
  let _idleLastActivity = Date.now();

  // ─── 私有工具 ────────────────────────────────────────────────

  function _getToken() {
    try { return sessionStorage.getItem(cfg.TOKEN_STORAGE_KEY); } catch { return null; }
  }

  function _setToken(token) {
    try { sessionStorage.setItem(cfg.TOKEN_STORAGE_KEY, token); } catch { /* storage blocked */ }
  }

  function _clearToken() {
    try {
      sessionStorage.removeItem(cfg.TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(cfg.USER_KEY);
      // 同步清除原版 common.js 使用的 key
      sessionStorage.removeItem(cfg.LEGACY_USER_KEY);
    } catch { /* ignore */ }
  }

  function _getUser() {
    try {
      const raw = sessionStorage.getItem(cfg.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function _setUser(user) {
    try { sessionStorage.setItem(cfg.USER_KEY, JSON.stringify(user)); } catch { /* ignore */ }
  }

  // ─── 閒置偵測 ────────────────────────────────────────────────

  function _resetIdleTimer() {
    _idleLastActivity = Date.now();
  }

  function _startIdleWatcher() {
    ['mousemove', 'keydown', 'click', 'touchstart'].forEach(evt => {
      document.addEventListener(evt, _resetIdleTimer, { passive: true });
    });
    _idleTimer = setInterval(() => {
      if (Date.now() - _idleLastActivity > cfg.SESSION_TIMEOUT_MS) {
        logout({ reason: 'idle_timeout' });
      }
    }, cfg.IDLE_CHECK_INTERVAL_MS);
  }

  function _stopIdleWatcher() {
    if (_idleTimer) { clearInterval(_idleTimer); _idleTimer = null; }
  }

  // ─── 公開 API ────────────────────────────────────────────────

  /**
   * 登入
   * @param {string} account
   * @param {string} password
   * @returns {Promise<{ok: boolean, error?: string}>}
   *
   * 上線時：ApiService.post('/auth/login', { account, password })
   *         後端回傳 { token, user: { id, name, role } }
   */
  async function login(account, password) {
    try {
      const result = await ApiService.post('/auth/login', { account, password });
      if (!result.token) throw new Error('伺服器未回傳 Token');
      _setToken(result.token);
      _setUser(result.user);
      _startIdleWatcher();
      try {
        localStorage.removeItem(AppConfig.STORAGE_KEYS.USABILITY_SCENARIO);
      } catch { /* ignore */ }
      return { ok: true, user: result.user };
    } catch (err) {
      return { ok: false, error: err.message || '登入失敗，請稍後再試' };
    }
  }

  /**
   * 登出
   * @param {object} [opts] - { reason: 'idle_timeout' | 'manual' }
   */
  function logout(opts = {}) {
    _stopIdleWatcher();
    _clearToken();
    // 通知後端 Token 失效（防止 Token 被偷後重用）
    ApiService.post('/auth/logout', {}).catch(() => {});
    const loginUrl = AppConfig.ROUTES.LOGIN;
    if (opts.reason === 'idle_timeout') {
      window.location.href = loginUrl + '?expired=1';
    } else {
      window.location.href = loginUrl;
    }
  }

  /**
   * 頁面守衛：在需要登入的頁面頂部呼叫
   * 若尚未登入，立即導回登入頁（防止直接輸入 URL 跳過登入）
   */
  function requireAuth() {
    if (!_getToken()) {
      window.location.href = AppConfig.ROUTES.LOGIN + '?redirect=' + encodeURIComponent(window.location.href);
    }
  }

  /**
   * 取得目前登入使用者
   * @returns {{id: string, name: string, role: string} | null}
   */
  function getCurrentUser() {
    return _getUser();
  }

  /**
   * 取得 JWT Token（供 ApiService 附加 Authorization Header 使用）
   */
  function getToken() {
    return _getToken();
  }

  return { login, logout, requireAuth, getCurrentUser, getToken };
})();
