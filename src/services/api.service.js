/**
 * ApiService — HTTP / Mock API 抽象層
 *
 * 責任：
 *  - 統一所有 HTTP 請求的進出口（單一責任）
 *  - 開發環境自動切換至 Mock 資料，不需後端
 *  - 所有請求自動附加 JWT Authorization Header
 *  - 統一錯誤格式：{ code, message, detail }
 *  - 處理 401 自動登出、網路逾時、重試
 *
 * 問題修正（對比原版）：
 *  - 原版：沒有 API 層，所有「資料」直接來自全域 JS 變數 APP_DATABASE
 *  - 原版：新增/修改狀態只存 localStorage，重新整理後可能丟失
 *  - 原版：無法與真實後端整合
 *  - 修正：透過此層，前端程式碼不需要知道「現在是 Mock 還是真實 API」
 */

const ApiService = (function () {
  'use strict';

  const BASE_URL = AppConfig.API_BASE_URL;
  const IS_MOCK = AppConfig.ENV === 'development';
  const TIMEOUT = AppConfig.API_TIMEOUT_MS;

  // ─── 私有工具 ────────────────────────────────────────────────

  function _buildHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    // AuthService 可能尚未載入（如登入頁），需防呼叫
    if (typeof AuthService !== 'undefined') {
      const token = AuthService.getToken();
      if (token) headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
  }

  function _handleHttpError(status, body) {
    if (status === 401) {
      if (typeof AuthService !== 'undefined') AuthService.logout();
      throw { code: 'UNAUTHORIZED', message: '認證已過期，請重新登入' };
    }
    if (status === 403) throw { code: 'FORBIDDEN', message: '您沒有執行此操作的權限' };
    if (status === 404) throw { code: 'NOT_FOUND', message: '找不到請求的資源' };
    if (status >= 500) throw { code: 'SERVER_ERROR', message: '伺服器發生錯誤，請稍後重試', detail: body };
    throw { code: 'HTTP_ERROR', message: body?.message || `請求失敗 (${status})` };
  }

  async function _fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) _handleHttpError(res.status, data);
      return data;
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') throw { code: 'TIMEOUT', message: '請求逾時，請確認網路狀態' };
      if (err.code) throw err; // 已格式化的錯誤
      throw { code: 'NETWORK_ERROR', message: '網路連線失敗，請確認網路狀態' };
    }
  }

  // ─── 真實 HTTP 請求 ──────────────────────────────────────────

  async function _realRequest(method, path, body) {
    const url = BASE_URL + path;
    const options = { method, headers: _buildHeaders() };
    if (body !== undefined) options.body = JSON.stringify(body);
    return _fetchWithTimeout(url, options);
  }

  // ─── Mock 路由（開發模式）───────────────────────────────────
  // 格式：{ method, pattern: RegExp, handler(matches, body) }
  // 上線時刪除此區塊即可，其他程式碼不需任何更改。

  const _mockRoutes = [
    {
      method: 'POST', pattern: /^\/auth\/login$/,
      handler: async (_, body) => {
        // Demo 帳號：在後端實作前提供測試入口
        // ⚠️ 上線時此段完全移除，驗證邏輯只存在後端
        const DEMO_ACCOUNTS = {
          'admin': { password: 'admin', user: { id: 'F12630E', name: '管理員', role: 'admin' } },
          'user':  { password: 'user',  user: { id: 'F99999', name: '一般使用者', role: 'staff' } },
        };
        await _mockDelay(300);
        const acc = DEMO_ACCOUNTS[body.account];
        if (acc && acc.password === body.password) {
          // 同步寫入原版 common.js 讀取的 sessionStorage key，確保 Demo 中編輯人員顯示正常
          try { sessionStorage.setItem('blood-morphology-user-account', body.account); } catch {}
          // 原版登入時的 Demo 重設邏輯：清除檢體狀態覆寫，重新讀取 database.js 原始資料
          try {
            // 重置 Demo 狀態（每次登入還原原始資料）
            sessionStorage.setItem('blood-morphology-specimen-ui-reset', '1');
            sessionStorage.removeItem('_mock_db_v2');   // 清除 v2 Mock DB 快取
            localStorage.removeItem('blood-morphology-specimen-status');
            // 清除所有細胞編輯快照
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && (k.startsWith('editedCells:') || k.startsWith('editedMetrics:'))) keysToRemove.push(k);
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
          } catch {}
          return { token: 'mock_jwt_' + Date.now(), user: acc.user };
        }
        _handleHttpError(401, { message: '帳號或密碼錯誤' });
      }
    },
    {
      method: 'POST', pattern: /^\/auth\/logout$/,
      handler: async () => { await _mockDelay(50); return { ok: true }; }
    },
    {
      method: 'GET', pattern: /^\/specimens(\?.*)?$/,
      handler: async (matches) => {
        await _mockDelay(200);
        const db = _getMockDb();
        return { data: db.specimens, total: db.specimens.length };
      }
    },
    {
      method: 'GET', pattern: /^\/specimens\/([^/]+)$/,
      handler: async (matches) => {
        await _mockDelay(150);
        const db = _getMockDb();
        const spec = db.specimens.find(s => s.id === matches[1]);
        if (!spec) _handleHttpError(404, {});
        return spec;
      }
    },
    {
      method: 'PATCH', pattern: /^\/specimens\/([^/]+)\/workflow$/,
      handler: async (matches, body) => {
        await _mockDelay(200);
        const db = _getMockDb();
        const spec = db.specimens.find(s => s.id === matches[1]);
        if (!spec) _handleHttpError(404, {});
        Object.assign(spec, body);
        _saveMockDb(db);
        return { ok: true, specimen: spec };
      }
    },
    {
      method: 'PATCH', pattern: /^\/specimens\/([^/]+)\/cells$/,
      handler: async (matches, body) => {
        await _mockDelay(200);
        const db = _getMockDb();
        const spec = db.specimens.find(s => s.id === matches[1]);
        if (!spec) _handleHttpError(404, {});
        spec.editedMetrics = body.metrics;
        spec.editedCells = body.cells;
        _saveMockDb(db);
        return { ok: true };
      }
    },
    {
      method: 'GET', pattern: /^\/settings\/thresholds$/,
      handler: async () => {
        await _mockDelay(100);
        return AppConfig.DEFAULT_LEAVE_THRESHOLDS;
      }
    },
    {
      method: 'PUT', pattern: /^\/settings\/thresholds$/,
      handler: async (_, body) => {
        await _mockDelay(150);
        return { ok: true, thresholds: body };
      }
    },
    {
      method: 'POST', pattern: /^\/ai\/classify$/,
      handler: async (_, body) => {
        // 未來整合真實 AI API 時，此處替換為後端 AI Proxy 的呼叫
        await _mockDelay(800);
        return {
          results: (body.cells || []).map(cell => ({
            cellId: cell.id,
            prediction: cell.currentCategory,
            confidence: 0.92,
            alternatives: []
          }))
        };
      }
    },
  ];

  function _getMockDb() {
    // Demo 狀態存於 sessionStorage（而非 localStorage）
    try {
      const raw = sessionStorage.getItem('_mock_db_v2');
      if (raw) return JSON.parse(raw);
    } catch {}
    // 首次：複製原始資料（需 APP_DATABASE 已載入）
    const db = { specimens: JSON.parse(JSON.stringify(
      (typeof APP_DATABASE !== 'undefined') ? APP_DATABASE.specimens : []
    ))};
    _saveMockDb(db);
    return db;
  }

  function _saveMockDb(db) {
    try { sessionStorage.setItem('_mock_db_v2', JSON.stringify(db)); } catch {}
  }

  function _mockDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function _mockRequest(method, path, body) {
    for (const route of _mockRoutes) {
      if (route.method !== method) continue;
      const matches = path.match(route.pattern);
      if (!matches) continue;
      return route.handler(matches, body);
    }
    throw { code: 'NOT_FOUND', message: `[Mock] 找不到路由: ${method} ${path}` };
  }

  // ─── 公開 API ────────────────────────────────────────────────

  async function get(path) {
    return IS_MOCK ? _mockRequest('GET', path) : _realRequest('GET', path);
  }

  async function post(path, body) {
    return IS_MOCK ? _mockRequest('POST', path, body) : _realRequest('POST', path, body);
  }

  async function patch(path, body) {
    return IS_MOCK ? _mockRequest('PATCH', path, body) : _realRequest('PATCH', path, body);
  }

  async function put(path, body) {
    return IS_MOCK ? _mockRequest('PUT', path, body) : _realRequest('PUT', path, body);
  }

  async function del(path) {
    return IS_MOCK ? _mockRequest('DELETE', path) : _realRequest('DELETE', path);
  }

  return { get, post, patch, put, delete: del };
})();
