/**
 * 舊版介面（CellaVision 風格）— 路由與切換
 * 僅在本專案複本使用；不影響 GitHub 主線改善版。
 */
(function () {
  var STORAGE_KEY = (typeof AppConfig !== 'undefined' && AppConfig.STORAGE_KEYS && AppConfig.STORAGE_KEYS.LEGACY_UI)
    ? AppConfig.STORAGE_KEYS.LEGACY_UI
    : 'blood-morphology-legacy-ui';

  var PAGES = {
    specimenList: { modern: '檢體管理.html', legacy: 'legacy/檢體管理.html' },
    imageReview: { modern: '影像檢視與細胞編輯.html', legacy: 'legacy/影像檢視與細胞編輯.html' },
    reportIssue: { modern: '報告核發.html', legacy: 'legacy/報告核發.html' }
  };

  function isLegacyUiEnabled() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function setLegacyUiEnabled(enabled) {
    try {
      if (enabled) localStorage.setItem(STORAGE_KEY, '1');
      else localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  function isOnLegacyPage() {
    return /\/legacy\//.test(window.location.pathname) || /\\legacy\\/.test(window.location.pathname);
  }

  function getPageFilename(kind) {
    var entry = PAGES[kind];
    if (!entry) return '';
    return isLegacyUiEnabled() ? entry.legacy : entry.modern;
  }

  function getSpecimenListPage() {
    return getPageFilename('specimenList');
  }

  function getImageReviewPage() {
    return getPageFilename('imageReview');
  }

  function getReportIssuePage() {
    return getPageFilename('reportIssue');
  }

  /** 從 legacy/ 子目錄回指專案根目錄（載入 assets、src） */
  function getProjectRootFromHere() {
    return isOnLegacyPage() ? '../' : '';
  }

  /**
   * 依目前頁面位置與舊版開關，組出正確的相對 URL。
   * @param {'specimenList'|'imageReview'|'reportIssue'} kind
   */
  function resolvePageUrl(kind) {
    var entry = PAGES[kind];
    if (!entry) return '';
    var useLegacy = isLegacyUiEnabled();
    var onLegacy = isOnLegacyPage();
    if (useLegacy) {
      if (onLegacy) return entry.legacy.split('/').pop();
      return entry.legacy;
    }
    if (onLegacy) return '../' + entry.modern;
    return entry.modern;
  }

  function appendQuery(url, query) {
    if (!query) return url;
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + query;
  }

  window.LegacyUi = {
    isEnabled: isLegacyUiEnabled,
    setEnabled: setLegacyUiEnabled,
    isOnLegacyPage: isOnLegacyPage,
    getSpecimenListPage: getSpecimenListPage,
    getImageReviewPage: getImageReviewPage,
    getReportIssuePage: getReportIssuePage,
    getProjectRootFromHere: getProjectRootFromHere,
    resolvePageUrl: resolvePageUrl,
    appendQuery: appendQuery
  };
})();
