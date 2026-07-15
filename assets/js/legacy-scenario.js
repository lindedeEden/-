/**
 * 舊版介面 — 情境模擬測試（檢體管理／影像檢視共用）
 */
(function () {
  var DISMISSED_WORKLIST_KEY = 'blood-morphology-legacy-worklist-dismissed';

  function refreshPanel(previewId) {
    var body = document.getElementById('legacy-modal-scenario-body');
    if (!body || typeof UsabilityStudy === 'undefined') return;
    var selectedId = (previewId !== undefined && previewId !== null)
      ? previewId
      : UsabilityStudy.getActiveScenarioId();
    body.innerHTML = UsabilityStudy.buildLegacySettingsPanelHtml(selectedId);
    body.querySelectorAll('input[name="legacy-usability-scenario"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        refreshPanel(UsabilityStudy.getSelectedScenarioIdFromLegacyPanel());
      });
    });
  }

  function openModal() {
    refreshPanel();
    var modal = document.getElementById('legacy-modal-scenario');
    if (modal) modal.classList.remove('hidden');
  }

  function closeModal() {
    var modal = document.getElementById('legacy-modal-scenario');
    if (modal) modal.classList.add('hidden');
  }

  function clearWorklistDismissals() {
    try { sessionStorage.removeItem(DISMISSED_WORKLIST_KEY); } catch (e) {}
  }

  function updateBanner() {
    var el = document.getElementById('legacy-scenario-banner');
    if (!el || typeof UsabilityStudy === 'undefined') return;
    var sc = UsabilityStudy.getActiveScenario();
    if (sc && sc.id) {
      el.classList.remove('hidden');
      var taskLine = typeof UsabilityStudy.getScenarioTaskCard === 'function'
        ? UsabilityStudy.getScenarioTaskCard(sc)
        : (sc.taskCard || '');
      el.textContent = '情境模擬測試：' + sc.title + (taskLine ? ' — ' + taskLine.split('\n')[0] : '');
    } else {
      el.classList.add('hidden');
      el.textContent = '';
    }
  }

  function updateFooterStatus(footerId) {
    var fs = document.getElementById(footerId || 'legacy-footer-status');
    if (!fs || typeof UsabilityStudy === 'undefined') return;
    var sc = UsabilityStudy.getActiveScenario();
    if (sc && sc.id) {
      fs.textContent = '情境模擬測試：' + sc.title;
      return;
    }
    if (fs.dataset.legacyDefaultStatus) {
      fs.textContent = fs.dataset.legacyDefaultStatus;
    }
  }

  function applyScenario() {
    if (typeof UsabilityStudy === 'undefined') return;
    var nextId = UsabilityStudy.getSelectedScenarioIdFromLegacyPanel();
    var switchModern = UsabilityStudy.isModernUiSelectedFromLegacyPanel();
    UsabilityStudy.applyScenario(nextId);
    if (switchModern) {
      if (typeof LegacyUi !== 'undefined') LegacyUi.setEnabled(false);
      window.location.href = '../檢體管理.html';
      return;
    }
    if (typeof LegacyUi !== 'undefined') LegacyUi.setEnabled(true);
    clearWorklistDismissals();
    closeModal();
    updateBanner();
    if (typeof window.LegacyScenarioOnApplied === 'function') {
      window.LegacyScenarioOnApplied(nextId);
    }
    var fs = document.getElementById('legacy-footer-status');
    var fsReview = document.getElementById('legacy-review-footer-status');
    var appliedText = nextId
      ? ('已套用：' + ((UsabilityStudy.getActiveScenario() || {}).title || ''))
      : '已還原正式清單';
    if (fs) fs.textContent = appliedText;
    if (fsReview) fsReview.textContent = appliedText;
  }

  function switchToModernUi() {
    if (typeof LegacyUi !== 'undefined') LegacyUi.setEnabled(false);
    window.location.href = '../檢體管理.html';
  }

  function bind() {
    var btnScenario = document.getElementById('legacy-btn-scenario');
    if (btnScenario) btnScenario.addEventListener('click', openModal);
    var btnModern = document.getElementById('legacy-btn-modern-ui');
    if (btnModern) btnModern.addEventListener('click', switchToModernUi);
    var scCancel = document.getElementById('legacy-modal-scenario-cancel');
    var scClose = document.getElementById('legacy-modal-scenario-close');
    var scApply = document.getElementById('legacy-modal-scenario-apply');
    if (scCancel) scCancel.addEventListener('click', closeModal);
    if (scClose) scClose.addEventListener('click', closeModal);
    if (scApply) scApply.addEventListener('click', applyScenario);
    var backdrop = document.getElementById('legacy-modal-scenario');
    if (backdrop) {
      backdrop.addEventListener('click', function (e) {
        if (e.target === backdrop) closeModal();
      });
    }
  }

  window.LegacyScenario = {
    bind: bind,
    open: openModal,
    close: closeModal,
    apply: applyScenario,
    updateBanner: updateBanner,
    updateFooterStatus: updateFooterStatus,
    refreshPanel: refreshPanel
  };
})();
