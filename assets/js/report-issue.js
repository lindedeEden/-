// 報告核發介面 - 動態資料與風險判讀（留單門檻見 common.js 之 LEAVE_THRESHOLDS）
(function () {
  'use strict';

  var COMMON_ROWS = [
    ['Band', 'band'],
    ['Segmented neutrophil', 'segmentedNeutrophil'],
    ['Eosinophil', 'eosinophil'],
    ['Monocyte', 'monocyte'],
    ['Basophil', 'basophil'],
    ['Lymphocyte', 'lymphocyte'],
    ['Atypical lymphocyte', 'atypicalLymphocyte']
  ];

  var ABNORMAL_ROWS = [
    ['Blast', 'blast'],
    ['Promyelocyte', 'promyelocyte'],
    ['Myelocyte', 'myelocyte'],
    ['Metamyelocyte', 'metamyelocyte'],
    ['Hypersegmented', 'hypersegmented'],
    ['Promonocyte', 'promonocyte'],
    ['Plasma cell', 'plasmaCell'],
    ['Abnormal lymphocyte', 'abnormalLymphocyte']
  ];

  var OTHER_ROWS = [
    ['NRBC', 'nrbc'],
    ['Giant PLT', 'giantPlt'],
    ['Megakaryocyte', 'megakaryocyte'],
    ['Smudge cell', 'smudgeCell'],
    ['Artefact', 'artefact']
  ];

  function getSpecimen() {
    var id = (typeof getSpecimenIdFromUrl === 'function') ? getSpecimenIdFromUrl() : '';
    if (!id && typeof APP_DATABASE !== 'undefined' && APP_DATABASE.specimens && APP_DATABASE.specimens.length > 0) {
      id = APP_DATABASE.specimens[0].id;
    }
    if (!id) return null;
    var spec;
    if (typeof getSpecimenById === 'function') {
      spec = getSpecimenById(id);
    } else {
      var list = (typeof APP_DATABASE !== 'undefined' && APP_DATABASE.specimens) ? APP_DATABASE.specimens : [];
      spec = list.find(function (s) { return s.id === id; }) || null;
    }
    if (!spec) return null;
    // 從 localStorage 讀取影像檢視頁儲存的人工編輯結果（若有）
    try {
      var key = 'editedMetrics:' + spec.id;
      var raw = window.localStorage.getItem(key);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          spec.editedMetrics = parsed;
        }
      }
    } catch (e) {
      // 若讀取失敗則忽略，維持原本 metrics 顯示
    }
    return spec;
  }

  function buildWbcTable(spec) {
    var metrics = spec.metrics || {};
    var editedMetrics = spec.editedMetrics || {};
    var prev = spec.prevReport || {};
    var tbody = document.getElementById('wbc-table-body');
    if (!tbody) return;
    var html = '';

    function addSection(label) {
      html += '<tr class="bg-zinc-50/30 dark:bg-zinc-800/10"><td class="px-4 py-1.5 text-xs font-bold text-zinc-600 uppercase tracking-widest" colspan="5">' + label + '</td></tr>';
    }

    function addRow(rowLabel, key) {
      var flow = getFlowCytMetricValue(spec, key);
      var ai = metrics[key] || '-';
      // 人員編輯：若有人工編輯結果，優先顯示；否則退回原始 metrics
      var edited = editedMetrics[key] != null ? editedMetrics[key] : (metrics[key] || '-');
      var prevVal = prev[key] || '-';
      var abnormal = typeof isAbnormalMetricValue === 'function' && isAbnormalMetricValue(key, edited);
      var rowClass = abnormal ? 'bg-medical-red/5 hover:bg-medical-red/10' : 'hover:bg-zinc-50/50';
      var nameClass = abnormal ? 'text-medical-red font-bold' : 'text-zinc-800 dark:text-zinc-200 font-semibold';
      var valueClass = abnormal ? 'text-medical-red font-bold' : 'text-zinc-600';
      var editedClass = abnormal ? 'text-medical-red font-black bg-medical-red/10' : 'text-zinc-900 dark:text-zinc-100 font-bold bg-blue-50/30';
      html += '<tr class="' + rowClass + '">';
      html += '<td class="px-4 py-2 text-base ' + nameClass + '">';
      if (abnormal) {
        html += rowLabel + ' <span class="material-symbols-outlined text-[18px] align-middle">error</span>';
      } else {
        html += rowLabel;
      }
      html += '</td>';
      html += '<td class="px-2 py-2 text-base text-right tabular ' + valueClass + '">' + (flow || '-') + '</td>';
      html += '<td class="px-2 py-2 text-base text-right tabular ' + valueClass + '">' + (ai || '-') + '</td>';
      html += '<td class="px-2 py-2 text-base text-right tabular ' + editedClass + '">' + (edited || '-') + '</td>';
      html += '<td class="px-2 py-2 text-base text-right tabular text-zinc-600">' + (prevVal || '-') + '</td>';
      html += '</tr>';
    }

    addSection('常見細胞');
    COMMON_ROWS.forEach(function (r) { addRow(r[0], r[1]); });
    addSection('未成熟與異常細胞');
    ABNORMAL_ROWS.forEach(function (r) { addRow(r[0], r[1]); });

    tbody.innerHTML = html;
  }

  // 判斷人員編輯結果是否與 AI 不同（醫檢師有更動才以人員編輯判定橫幅，未更動則以 AI 判定）
  function editedDiffersFromAi(editedMetrics, metrics) {
    if (typeof LEAVE_THRESHOLDS === 'undefined') return false;
    var keys = Object.keys(LEAVE_THRESHOLDS);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (parseMetricNum(editedMetrics[k]) !== parseMetricNum(metrics[k])) return true;
    }
    return false;
  }

  function getEffectiveMetricsForRisk(spec) {
    var metrics = spec.metrics || {};
    var editedMetrics = spec.editedMetrics || {};
    var hasEdited = Object.keys(editedMetrics).length > 0;
    var useEdited = hasEdited && editedDiffersFromAi(editedMetrics, metrics);
    /** 人員編輯僅覆寫分類百分比；WBC 等非分類欄位仍取自 metrics */
    return useEdited ? Object.assign({}, metrics, editedMetrics) : metrics;
  }

  function getRiskState(spec, effectiveMetrics) {
    var prev = spec.prevReport || {};
    var effective = effectiveMetrics || {};
    var hasNewLeave = typeof hasAnyNewLeaveCondition === 'function'
      ? hasAnyNewLeaveCondition(effective, prev)
      : false;
    var hasLeaveNow = false;
    if (typeof LEAVE_THRESHOLDS !== 'undefined' && typeof isAbnormalMetricValue === 'function') {
      var keys = Object.keys(LEAVE_THRESHOLDS);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (isAbnormalMetricValue(k, effective[k])) {
          hasLeaveNow = true;
          break;
        }
      }
    }
    return {
      hasNewLeave: hasNewLeave,
      hasLeaveNow: hasLeaveNow,
      isPersistentLeave: !hasNewLeave && hasLeaveNow
    };
  }

  function specimenHasAiAlert(spec) {
    if (!spec || !Array.isArray(spec.status)) return false;
    return spec.status.indexOf('AI Alert') !== -1;
  }

  function isAiAlertPendingConfirmation(spec) {
    if (!specimenHasAiAlert(spec)) return false;
    if (typeof isAiAlertConfirmed === 'function' && isAiAlertConfirmed(spec)) return false;
    return true;
  }

  function shouldShowManualReviewFromReportBtn(spec) {
    if (!spec) return false;
    var effective = getEffectiveMetricsForRisk(spec);
    var risk = getRiskState(spec, effective);
    /** 紅色（新發留單）或黃色（延續性異常）橫幅時提供「改為人工鏡檢」 */
    if (!risk.hasLeaveNow) return false;
    /** 已有待辦需拉片：改點「已拉片完成」，不重複顯示 */
    if (typeof needsPendingFollowUpReview === 'function' && needsPendingFollowUpReview(spec)) return false;
    var st = spec.status || [];
    /** 數位閱片尚未完成（含僅 Digital Review） */
    if (st.indexOf('Digital Review') !== -1) {
      return typeof isDigitalReviewDone === 'function' ? !isDigitalReviewDone(spec) : true;
    }
    /** DR 已完成、僅 AI 尚待確認（須已有 DR+AI 膠囊） */
    return isAiAlertPendingConfirmation(spec);
  }

  function addFollowUpForManualReviewFromReport(spec) {
    if (!spec || !spec.id) return { addedFollowUp: false };
    if (!Array.isArray(spec.status)) spec.status = [];
    var hadFollowUp = spec.status.indexOf('Follow-up') !== -1;
    var st = spec.status.slice();
    /** 劇本規則：改人工鏡檢前應已有 DR（±AI）；缺漏時補上膠囊僅作防呆 */
    if (st.indexOf('Digital Review') === -1) st.push('Digital Review');
    if (!hadFollowUp && st.indexOf('Follow-up') === -1) st.push('Follow-up');
    if (typeof migrateLegacyManualAlertStatus === 'function') {
      st = migrateLegacyManualAlertStatus(st);
    }
    spec.status = st;
    if (typeof persistSpecimenStatusOverride === 'function') {
      var workflowPatch = typeof buildWorkflowDoneAfterManualFollowUpFromReport === 'function'
        ? buildWorkflowDoneAfterManualFollowUpFromReport(spec, st)
        : { entityReview: false };
      persistSpecimenStatusOverride(spec.id, spec.status, { workflowDone: workflowPatch });
      if (spec.workflowDone && typeof workflowPatch === 'object') {
        spec.workflowDone = workflowPatch;
      }
    }
    return { addedFollowUp: !hadFollowUp };
  }

  function applyRiskBanner(spec) {
    var effective = getEffectiveMetricsForRisk(spec);
    var risk = getRiskState(spec, effective);
    var banner = document.getElementById('risk-banner');
    var icon = document.getElementById('risk-icon');
    var text = document.getElementById('risk-text');
    if (!banner || !icon || !text) return;
    banner.className = 'px-6 py-2.5 flex items-center justify-between gap-4 shrink-0 border-b';
    if (risk.hasNewLeave) {
      banner.className += ' bg-medical-red border-medical-red/20';
      icon.textContent = 'warning';
      icon.className = 'material-symbols-outlined text-white fill-1 scale-100';
      text.className = 'text-md font-bold leading-tight tracking-tight text-white';
      text.textContent = '留單警示：本次出現新發留單條件，請確認是否需人工鏡檢';
    } else if (risk.hasLeaveNow) {
      banner.className += ' bg-amber-500 border-amber-500/20';
      icon.textContent = 'info';
      icon.className = 'material-symbols-outlined text-white';
      text.className = 'text-md font-bold leading-tight tracking-tight text-white';
      text.textContent = '延續性異常：前次同留單條件已存在，不重複留單';
    } else {
      banner.className += ' bg-emerald-600 border-emerald-600/20';
      icon.textContent = 'check_circle';
      icon.className = 'material-symbols-outlined text-white';
      text.className = 'text-md font-bold leading-tight tracking-tight text-white';
      text.textContent = '狀態良好：未達留單標準';
    }
  }

  function buildOtherTable(spec) {
    var metrics = spec.metrics || {};
    var editedMetrics = spec.editedMetrics || {};
    var prev = spec.prevReport || {};
    var tbody = document.getElementById('other-table-body');
    if (!tbody) return;
    var html = '';
    OTHER_ROWS.forEach(function (r) {
      var label = r[0];
      var key = r[1];
      var flow = getFlowCytMetricValue(spec, key);
      var ai = metrics[key] || '-';
      // 其他發現的人員編輯欄位，同樣優先採用 editedMetrics
      var edited = editedMetrics[key] != null ? editedMetrics[key] : (metrics[key] || '-');
      var prevVal = prev[key] || '-';
      html += '<tr class="hover:bg-zinc-50/30">';
      html += '<td class="px-3 py-1.5 text-zinc-700 dark:text-zinc-300 text-xs font-semibold">' + label + '</td>';
      html += '<td class="px-2 py-1.5 text-zinc-600 text-xs text-right tabular">' + (flow || '-') + '</td>';
      html += '<td class="px-2 py-1.5 text-zinc-600 text-xs text-right tabular">' + (ai || '-') + '</td>';
      html += '<td class="px-2 py-1.5 text-zinc-900 dark:text-zinc-100 text-xs font-bold text-right tabular bg-blue-50/30">' + (edited || '-') + '</td>';
      html += '<td class="px-2 py-1.5 text-zinc-600 text-xs text-right tabular">' + (prevVal || '-') + '</td>';
      html += '</tr>';
    });
    tbody.innerHTML = html;
  }

  function fillCbcPanel(spec) {
    var c = spec.cbc || {};
    var effective = getEffectiveMetricsForRisk(spec);
    var wbcValue = effective.wbc != null ? effective.wbc : (c.wbc != null ? c.wbc : '-');
    var wbcAbnormal = typeof isAbnormalMetricValue === 'function' && isAbnormalMetricValue('wbc', wbcValue);
    var byId = {
      'cbc-wbc': wbcValue,
      'cbc-rbc': c.rbc,
      'cbc-hb': c.hb,
      'cbc-hct': c.hct,
      'cbc-mcv': c.mcv,
      'cbc-mch': c.mch,
      'cbc-mchc': c.mchc,
      'cbc-plt': c.plt
    };
    var defaultValueClass = 'text-zinc-900 dark:text-zinc-100 text-sm font-bold tabular';
    var abnormalValueClass = 'text-medical-red text-sm font-black tabular';
    var defaultLabelClass = 'text-zinc-600 text-[9px] font-bold uppercase tracking-tight';
    var abnormalLabelClass = 'text-medical-red text-[9px] font-bold uppercase tracking-tight';
    Object.keys(byId).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.textContent = byId[id] != null ? byId[id] : '-';
      if (id === 'cbc-wbc') {
        el.className = wbcAbnormal ? abnormalValueClass : defaultValueClass;
        var labelEl = el.previousElementSibling;
        if (labelEl) labelEl.className = wbcAbnormal ? abnormalLabelClass : defaultLabelClass;
      } else {
        el.className = defaultValueClass;
      }
    });
  }

  function renderReportView(spec) {
    if (!spec) return;
    var effective = getEffectiveMetricsForRisk(spec);
    var risk = getRiskState(spec, effective);
    var title = document.getElementById('report-specimen-id');
    if (title) title.textContent = spec.id || '';
    var prevWbcHeader = document.getElementById('wbc-prev-report-header');
    if (prevWbcHeader && typeof getPrevReportHeaderLabel === 'function') {
      prevWbcHeader.textContent = getPrevReportHeaderLabel(spec, '前次報告(%)');
    }
    var prevOtherHeader = document.getElementById('other-prev-report-header');
    if (prevOtherHeader && typeof getPrevReportHeaderLabel === 'function') {
      prevOtherHeader.textContent = getPrevReportHeaderLabel(spec, '前次報告');
    }
    var statusWrap = document.getElementById('report-status-tags');
    if (statusWrap) {
      var statuses = spec.status || [];
      var displayStatuses = statuses.filter(function (s) { return s !== 'Verified'; });
      var html = displayStatuses.map(function (s) {
        var style = 'bg-gray-100 text-gray-800';
        var label = typeof getStatusDisplayLabel === 'function' ? getStatusDisplayLabel(s) : s;
        var prefixIcon = '';
        if (s === 'AI Alert' && typeof isAiAlertConfirmed === 'function' && isAiAlertConfirmed(spec)) {
          style = 'bg-green-100 text-green-800';
          prefixIcon = '<span class="material-symbols-outlined text-[14px] mr-0.5 align-middle">check</span>';
        } else if (s === 'AI Alert' && typeof STATUS_STYLES !== 'undefined') style = STATUS_STYLES['AI Alert'] || style;
        else if (s === 'PLT Check' && typeof isEntityStatusCompleted === 'function' && isEntityStatusCompleted(spec, 'PLT Check')) {
          style = 'bg-green-100 text-green-800';
          prefixIcon = '<span class="material-symbols-outlined text-[14px] mr-0.5 align-middle">check</span>';
        } else if (s === 'PLT Check' && typeof STATUS_STYLES !== 'undefined') style = STATUS_STYLES['PLT Check'] || style;
        else if (s === 'Follow-up' && typeof isEntityStatusCompleted === 'function' && isEntityStatusCompleted(spec, 'Follow-up')) {
          style = 'bg-green-100 text-green-800';
          prefixIcon = '<span class="material-symbols-outlined text-[14px] mr-0.5 align-middle">check</span>';
        } else if (s === 'Follow-up' && typeof STATUS_STYLES !== 'undefined') style = STATUS_STYLES['Follow-up'] || style;
        else if (s === 'Digital Review' && typeof isDigitalReviewDone === 'function' && isDigitalReviewDone(spec)) {
          style = 'bg-green-100 text-green-800';
          prefixIcon = '<span class="material-symbols-outlined text-[14px] mr-0.5 align-middle">check</span>';
        } else if (s === 'Digital Review' && typeof STATUS_STYLES !== 'undefined') {
          style = STATUS_STYLES['Digital Review'] || style;
        }
        return '<span class="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-semibold ' + style + '">' + prefixIcon + label + '</span>';
      }).join('');
      statusWrap.innerHTML = html;
    }
    var manualAlertBtn = document.getElementById('manual-alert-btn');
    if (manualAlertBtn) manualAlertBtn.classList.toggle('hidden', !shouldShowManualReviewFromReportBtn(spec));
    applyReportFooterActions(spec);
    applyRiskBanner(spec);
    buildWbcTable(spec);
    buildOtherTable(spec);
    fillCbcPanel(spec);
  }

  var verifySignOffUnlocked = false;
  var verifyUnlockSpecimenId = null;

  function applyReportFooterActions(spec) {
    var sid = spec && spec.id ? spec.id : '';
    if (sid !== verifyUnlockSpecimenId) {
      verifySignOffUnlocked = false;
      verifyUnlockSpecimenId = sid;
    }
    var pendingFollowUp = typeof needsPendingFollowUpReview === 'function' && needsPendingFollowUpReview(spec);
    var effective = typeof getEffectiveMetricsForRisk === 'function' ? getEffectiveMetricsForRisk(spec) : {};
    var risk = typeof getRiskState === 'function' ? getRiskState(spec, effective) : { hasNewLeave: false };
    var signOffBlocked = (pendingFollowUp || !!risk.hasLeaveNow) && !verifySignOffUnlocked;
    var showLock = pendingFollowUp || !!risk.hasLeaveNow;
    var confirmBtn = document.getElementById('confirm-btn');
    var lockBtn = document.getElementById('verify-lock-btn');
    var lockIcon = document.getElementById('verify-lock-icon');
    var followUpDoneBtn = document.getElementById('follow-up-done-btn');
    if (confirmBtn) {
      confirmBtn.disabled = !!signOffBlocked;
      confirmBtn.setAttribute('aria-disabled', signOffBlocked ? 'true' : 'false');
      confirmBtn.classList.toggle('opacity-50', !!signOffBlocked);
      confirmBtn.classList.toggle('cursor-not-allowed', !!signOffBlocked);
      confirmBtn.classList.toggle('pointer-events-none', !!signOffBlocked);
      confirmBtn.title = signOffBlocked ? '尚有需拉片或未解除留單鎖定，請開鎖、改為人工鏡檢或先完成拉片' : '';
    }
    if (lockBtn) {
      lockBtn.classList.toggle('hidden', !showLock);
      lockBtn.setAttribute('aria-hidden', showLock ? 'false' : 'true');
      if (showLock) {
        if (verifySignOffUnlocked) {
          lockBtn.classList.remove('bg-zinc-200', 'border-zinc-300', 'text-zinc-600');
          lockBtn.classList.add('bg-amber-50', 'border-amber-400', 'text-amber-800');
          lockBtn.title = '已開鎖，可強制簽核（略過拉片／不補需拉片）';
          lockBtn.setAttribute('aria-label', '已開鎖，點擊重新上鎖');
        } else {
          lockBtn.classList.add('bg-zinc-200', 'border-zinc-300', 'text-zinc-600');
          lockBtn.classList.remove('bg-amber-50', 'border-amber-400', 'text-amber-800');
          lockBtn.title = risk.hasNewLeave
            ? '紅色留單：點擊開鎖後可強制數位簽核'
            : (risk.hasLeaveNow ? '延續性異常：點擊開鎖後可強制數位簽核' : '點擊開鎖後可強制簽核（略過需拉片）');
          lockBtn.setAttribute('aria-label', '點擊開鎖簽核');
        }
        if (lockIcon) lockIcon.textContent = verifySignOffUnlocked ? 'lock_open' : 'lock';
      }
    }
    if (followUpDoneBtn) {
      followUpDoneBtn.classList.toggle('hidden', !pendingFollowUp);
    }
  }

  function refreshReportFromParent() {
    if (typeof applySpecimenStatusOverridesFromStorage === 'function') {
      applySpecimenStatusOverridesFromStorage();
    }
    var spec = getSpecimen();
    if (!spec) return;
    renderReportView(spec);
  }

  function init() {
    if (typeof window.initAppFontLevel === 'function') window.initAppFontLevel();

    var spec = getSpecimen();
    if (!spec) return;
    renderReportView(spec);

    if (window.__reportIssueUiBound) return;
    window.__reportIssueUiBound = true;

    window.addEventListener('message', function (e) {
      var data = e.data || {};
      if (data.type !== 'specimenDataUpdated') return;
      var myId = (typeof getSpecimenIdFromUrl === 'function') ? getSpecimenIdFromUrl() : '';
      if (!data.specimenId || !myId || data.specimenId !== myId) return;
      refreshReportFromParent();
    });

    var closeBtn = document.getElementById('btn-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        if (window.self !== window.top && window.parent) {
          window.parent.postMessage({ type: 'reportCancel' }, '*');
        } else if (typeof goToSpecimenList === 'function') {
          goToSpecimenList({ preferMode: 'digital' });
        }
      });
    }

    var confirmBtn = document.getElementById('confirm-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', function () {
        var s = getSpecimen();
        if (s && typeof needsPendingFollowUpReview === 'function' && needsPendingFollowUpReview(s) && !verifySignOffUnlocked) return;
        if (s) {
          var effectiveSign = getEffectiveMetricsForRisk(s);
          var riskSign = getRiskState(s, effectiveSign);
          if (riskSign.hasLeaveNow && !verifySignOffUnlocked) return;
        }
        var sid = s ? s.id : '';
        var navigateNextDigitalReview = false;
        var confirmAiOnVerify = false;
        var forceUnlockSignOff = !!verifySignOffUnlocked;
        if (s) {
          var effective = getEffectiveMetricsForRisk(s);
          var risk = getRiskState(s, effective);
          navigateNextDigitalReview = !risk.hasNewLeave;
          confirmAiOnVerify = specimenHasAiAlert(s) && !risk.hasNewLeave;
        }
        if (window.self !== window.top && window.parent) {
          window.parent.postMessage({
            type: 'reportVerified',
            specimenId: sid,
            navigateNextDigitalReview: navigateNextDigitalReview,
            confirmAiOnVerify: confirmAiOnVerify,
            forceUnlockSignOff: forceUnlockSignOff
          }, '*');
        } else if (typeof goToSpecimenList === 'function') {
          if (s && typeof buildWorkflowDoneOnReportVerified === 'function' && typeof persistSpecimenStatusOverride === 'function') {
            var built = buildWorkflowDoneOnReportVerified(s, {
              confirmAiOnVerify: confirmAiOnVerify,
              forceUnlockSignOff: forceUnlockSignOff
            });
            s.status = built.status;
            s.workflowDone = built.workflowDone;
            s.statusDone = typeof computeSpecimenStatusDoneFromWorkflow === 'function'
              ? computeSpecimenStatusDoneFromWorkflow(s.status, s.workflowDone)
              : false;
            var editorAccount = typeof getCurrentUserAccount === 'function' ? getCurrentUserAccount() : '';
            if (!s.statusDone) s.editor = '';
            else if (editorAccount) s.editor = editorAccount;
            persistSpecimenStatusOverride(sid, s.status, { workflowDone: s.workflowDone, editor: s.editor || '' });
          }
          if (s && s.statusDone && typeof queueReportVerifiedToast === 'function') queueReportVerifiedToast(sid);
          goToSpecimenList({ preferMode: 'digital' });
        }
      });
    }

    var verifyLockBtn = document.getElementById('verify-lock-btn');
    if (verifyLockBtn) {
      verifyLockBtn.addEventListener('click', function () {
        var s = getSpecimen();
        if (!s || typeof needsPendingFollowUpReview !== 'function') return;
        var effectiveLock = getEffectiveMetricsForRisk(s);
        var riskLock = getRiskState(s, effectiveLock);
        var needsLock = needsPendingFollowUpReview(s) || !!riskLock.hasLeaveNow;
        if (!needsLock) return;
        verifySignOffUnlocked = !verifySignOffUnlocked;
        applyReportFooterActions(s);
      });
    }

    var followUpDoneBtn = document.getElementById('follow-up-done-btn');
    if (followUpDoneBtn) {
      followUpDoneBtn.addEventListener('click', function () {
        var s = getSpecimen();
        if (!s || typeof needsPendingFollowUpReview !== 'function' || !needsPendingFollowUpReview(s)) return;
        var sid = s.id;
        if (window.self !== window.top && window.parent) {
          window.parent.postMessage({ type: 'reportFollowUpDone', specimenId: sid }, '*');
        } else {
          if (typeof markFollowUpReviewDone === 'function') markFollowUpReviewDone(sid);
          if (typeof queueFollowUpDoneToast === 'function') queueFollowUpDoneToast(sid);
          if (typeof goToSpecimenList === 'function') goToSpecimenList();
        }
      });
    }

    var manualAlertBtn = document.getElementById('manual-alert-btn');
    if (manualAlertBtn) {
      manualAlertBtn.addEventListener('click', function () {
        var s = getSpecimen();
        if (!s || !shouldShowManualReviewFromReportBtn(s)) return;
        var result = addFollowUpForManualReviewFromReport(s);
        var addedFollowUp = !!(result && result.addedFollowUp);
        refreshReportFromParent();
        if (window.self !== window.top && window.parent) {
          window.parent.postMessage({
            type: 'reportManualAlert',
            specimenId: s.id,
            addedFollowUp: addedFollowUp
          }, '*');
        } else if (typeof goToSpecimenList === 'function') {
          if (typeof queueManualAlertToast === 'function') queueManualAlertToast(s.id, addedFollowUp);
          goToSpecimenList({ preferMode: 'digital' });
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

