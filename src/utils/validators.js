/**
 * Validators — 輸入驗證工具
 *
 * 問題修正：
 *  - 原版：login.js 中只有「帳號/密碼空字串」的簡單檢查，
 *          且驗證邏輯直接散落在 event handler 內，無法重用。
 *  - 修正：統一的驗證函式，回傳 { valid: bool, error: string }，
 *          前端驗證 + 後端驗證形成雙重保護。
 */

const Validators = Object.freeze({

  /**
   * 驗證登入表單
   */
  loginForm(account, password) {
    if (!account || !account.trim()) return { valid: false, error: '請輸入帳號' };
    if (account.trim().length > 50) return { valid: false, error: '帳號長度不得超過 50 字元' };
    if (!password) return { valid: false, error: '請輸入密碼' };
    if (password.length > 128) return { valid: false, error: '密碼長度異常' };
    return { valid: true };
  },

  /**
   * 驗證留單門檻設定
   * value 可以是數字或 'present'
   */
  thresholdValue(key, value) {
    const def = AppConfig.DEFAULT_LEAVE_THRESHOLDS[key];
    if (def === 'present') {
      if (value !== 'present') return { valid: false, error: `${key} 只允許設為 'present'` };
      return { valid: true };
    }
    const num = parseFloat(value);
    if (isNaN(num) || num < 0 || num > 999) {
      return { valid: false, error: `${key} 必須為 0~999 的數值` };
    }
    return { valid: true };
  },

  /**
   * 驗證細胞分類百分比總和（100格計數：可接受 98~102）
   */
  cellCountTotal(cells) {
    const countable = cells.filter(c =>
      CellConstants.MATURE_TYPES.includes(c.category) ||
      CellConstants.ABNORMAL_TYPES.includes(c.category)
    );
    const total = countable.length;
    if (total < 98 || total > 102) {
      return { valid: false, error: `計數格數為 ${total}，建議範圍 98~102` };
    }
    return { valid: true };
  },

});
