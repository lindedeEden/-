/**
 * 舊版檢體管理 — 清單、篩選、側欄（CellaVision 風格）
 */
(function () {
  var DISMISSED_WORKLIST_KEY = 'blood-morphology-legacy-worklist-dismissed';
  var currentSpecimenId = null;
  var filteredList = [];

  function pad2(n) {
    var v = parseInt(n, 10);
    if (isNaN(v)) return '01';
    return v < 10 ? '0' + v : String(v);
  }

  function readLegacyDateIso(prefix) {
    var y = document.getElementById(prefix + '-y');
    var m = document.getElementById(prefix + '-m');
    var d = document.getElementById(prefix + '-d');
    if (!y || !m || !d) return '';
    var ys = String(y.value || '').trim();
    if (!ys) return '';
    return ys + '-' + pad2(m.value) + '-' + pad2(d.value);
  }

  function getFilterFieldValue(spec, field) {
    if (!spec || !field) return '';
    if (field === 'id') return spec.id || '';
    if (field === 'patientId') return spec.patientId || '';
    if (field === 'name') return spec.name || '';
    if (field === 'department') return spec.department || '';
    return '';
  }

  function applyFilters() {
    var startVal = readLegacyDateIso('legacy-date-start');
    var endVal = readLegacyDateIso('legacy-date-end');
    var filterFieldEl = document.getElementById('legacy-filter-field');
    var filterValueEl = document.getElementById('legacy-filter-value');
    var exactEl = document.getElementById('legacy-exact-match');
    var filterField = filterFieldEl ? filterFieldEl.value : '';
    var filterQ = filterValueEl ? filterValueEl.value.trim() : '';
    var exactMatch = exactEl ? !!exactEl.checked : false;
    var list = getBaseSpecimens();

    filteredList = list.filter(function (s) {
      if (startVal || endVal) {
        var d = (s.analysisTime || '').slice(0, 10);
        if (startVal && d < startVal) return false;
        if (endVal && d > endVal) return false;
      }
      if (filterField && filterQ) {
        var raw = getFilterFieldValue(s, filterField);
        var target = filterQ;
        var hay = String(raw || '');
        if (exactMatch) {
          if (hay !== target) return false;
        } else {
          if (hay.toUpperCase().indexOf(target.toUpperCase()) === -1) return false;
        }
      }
      return true;
    });

    var viewModeEl = document.getElementById('legacy-view-mode');
    var viewMode = viewModeEl ? viewModeEl.value : 'latest';
    filteredList.sort(function (a, b) {
      var ta = (a.analysisTime || '').replace(/[-:\s]/g, '');
      var tb = (b.analysisTime || '').replace(/[-:\s]/g, '');
      return viewMode === 'latest' ? tb.localeCompare(ta) : ta.localeCompare(tb);
    });
  }

  function getDismissedWorklistIds() {
    try {
      var raw = sessionStorage.getItem(DISMISSED_WORKLIST_KEY);
      if (!raw) return {};
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return {};
      var map = {};
      arr.forEach(function (id) { map[id] = true; });
      return map;
    } catch (e) {
      return {};
    }
  }

  function saveDismissedWorklistIds(idMap) {
    try {
      var ids = Object.keys(idMap || {}).filter(function (k) { return idMap[k]; });
      sessionStorage.setItem(DISMISSED_WORKLIST_KEY, JSON.stringify(ids));
    } catch (e) {}
  }

  function isWorkflowCompleted(s) {
    if (typeof isSpecimenWorkflowCompleted === 'function') return isSpecimenWorkflowCompleted(s);
    return !!(s && (s.statusDone || (s.status && s.status.indexOf('Verified') !== -1)));
  }

  function getBaseSpecimens() {
    var list = (typeof MOCK_SPECIMENS !== 'undefined') ? MOCK_SPECIMENS.slice() : [];
    if (typeof UsabilityStudy !== 'undefined' && UsabilityStudy.filterSpecimensForList) {
      list = UsabilityStudy.filterSpecimensForList(list);
    }
    return list;
  }

  /** 工作清單：所有未完成檢體（依情境篩選後） */
  function isSpecimenLockedLocal(s) {
    if (typeof isSpecimenLocked === 'function') return isSpecimenLocked(s);
    return !!(s && (s.locked || (s.status && s.status.indexOf('Locked') !== -1)));
  }

  function getPendingWorklistSpecimens() {
    var dismissed = getDismissedWorklistIds();
    return getBaseSpecimens()
      .filter(function (s) {
        return !isWorkflowCompleted(s) && !dismissed[s.id] && !isSpecimenLockedLocal(s);
      })
      .sort(function (a, b) {
        var ta = (a.analysisTime || '').replace(/[-:\s]/g, '');
        var tb = (b.analysisTime || '').replace(/[-:\s]/g, '');
        return tb.localeCompare(ta);
      });
  }

  function hashSpecimenId(id) {
    var h = 0;
    var str = String(id || '');
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  function getSystemSerialNumber(machine) {
    var m = String(machine || '').toUpperCase();
    if (m === 'DI1') return '60648';
    if (m === 'DI2') return '20357';
    return '60648';
  }

  /** 玻片盒/批次：依檢體 ID 穩定產生（格式同截圖） */
  function getSlideBatchInfo(spec) {
    var h = hashSpecimenId(spec && spec.id);
    return {
      batchId: (h % 20) + 1,
      position: (h % 12) + 1
    };
  }

  function formatMetricValue(val, fallback) {
    if (val === null || val === undefined || val === '' || val === '-') return fallback || '-';
    var n = parseFloat(String(val).replace(',', '.'));
    if (isNaN(n)) return String(val);
    return n.toFixed(2);
  }

  function getWbcDisplay(spec) {
    var m = spec.metrics || {};
    var c = spec.cbc || {};
    var raw = m.wbc || c.wbc || '-';
    if (raw === '-') return '-';
    return formatMetricValue(raw, '-') + ' x10e9/L';
  }

  function getRbcDisplay(spec) {
    var c = spec.cbc || {};
    var raw = c.rbc || '-';
    if (raw === '-') return '-';
    return formatMetricValue(raw, '-') + ' x10e12/L';
  }

  function addMinutesToTimeStr(timeStr, minutes) {
    if (!timeStr) return '';
    var m = timeStr.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
    if (!m) return timeStr;
    var d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5] + (minutes || 0));
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  /** 白血球分類列（對應 database.js metrics） */
  var DIFF_ROWS = [
    ['Band neutrophil', 'band'],
    ['Segmented neutrophil', 'segmentedNeutrophil', 'neut'],
    ['Lymphocyte', 'lymphocyte', 'lymph'],
    ['Monocyte', 'monocyte', 'mono'],
    ['Eosinophil', 'eosinophil', 'eo'],
    ['Basophil', 'basophil', 'baso'],
    ['Metamyelocyte', 'metamyelocyte'],
    ['Myelocyte', 'myelocyte'],
    ['Promyelocyte', 'promyelocyte'],
    ['Blast', 'blast'],
    ['Atypical lymphocyte', 'atypicalLymphocyte'],
    ['Plasma cell', 'plasmaCell'],
    ['Abnormal lymphocyte', 'abnormalLymphocyte'],
    ['Hypersegmented', 'hypersegmented'],
    ['Promonocyte', 'promonocyte']
  ];

  function getMetricPercent(m, key, altKey) {
    var raw = m[key];
    if ((raw === undefined || raw === null || raw === '' || raw === '-') && altKey) {
      raw = m[altKey];
    }
    if (raw === undefined || raw === null || raw === '' || raw === '-') return null;
    var n = parseFloat(String(raw).replace(',', '.'));
    if (isNaN(n)) return String(raw);
    return n.toFixed(1) + '%';
  }

  function formatClassificationLines(spec) {
    var m = spec.metrics || {};
    var lines = ['', '分類結果:'];
    var hasAny = false;
    DIFF_ROWS.forEach(function (row) {
      var pct = getMetricPercent(m, row[1], row[2]);
      if (pct !== null) {
        hasAny = true;
        lines.push(row[0] + ': ' + pct);
      }
    });
    if (!hasAny) lines.push('（無分類資料）');
    return lines;
  }

  function formatSlideData(spec) {
    if (!spec) return '（請選擇檢體）';
    var batch = getSlideBatchInfo(spec);
    var lines = [
      '玻片 ID: ' + spec.id + ', 玻片編號: 1',
      '系統序號: ' + getSystemSerialNumber(spec.machine),
      '玻片盒/批次 ID: ' + batch.batchId + ', 玻片位置: ' + batch.position,
      '白血球計數: ' + getWbcDisplay(spec),
      '紅血球濃度: ' + getRbcDisplay(spec),
      '分析完成: ' + (spec.analysisTime || '-')
    ];
    lines = lines.concat(formatClassificationLines(spec));
    if (spec.editor) {
      lines.push('簽核者: ' + spec.editor + ' (' + addMinutesToTimeStr(spec.analysisTime, 3) + ')');
    }
    return lines.join('\n');
  }

  function renderStatusIcons(specimen) {
    var html = '';
    if (isSpecimenLockedLocal(specimen)) {
      html += '<span class="legacy-status-icon legacy-status-shield" title="已保護並上鎖" aria-label="已保護並上鎖"></span>';
    }
    if (isWorkflowCompleted(specimen)) {
      html +=
        '<span class="legacy-status-icon legacy-status-reviewed" title="已檢閱" aria-label="已檢閱"></span>' +
        '<span class="legacy-status-icon legacy-status-lis" title="已傳送LIS" aria-label="已傳送LIS"></span>';
    }
    return html;
  }

  function renderTable() {
    applyFilters();
    var tbody = document.getElementById('legacy-specimen-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    filteredList.forEach(function (s) {
      var tr = document.createElement('tr');
      tr.dataset.specimenId = s.id;
      if (s.id === currentSpecimenId) tr.classList.add('selected');
      tr.innerHTML =
        '<td><div class="legacy-status-icons">' + renderStatusIcons(s) + '</div></td>' +
        '<td>' + (s.id || '') + '</td>' +
        '<td>' + (s.patientId || '') + '</td>' +
        '<td>' + (s.name || '') + '</td>' +
        '<td>' + (s.department || '') + '</td>' +
        '<td>' + (s.editor || '') + '</td>' +
        '<td>' + (s.analysisTime || '') + '</td>' +
        '<td></td>';
      tr.addEventListener('click', function () { selectRow(s.id); });
      tr.addEventListener('dblclick', function () {
        if (isSpecimenLockedLocal(s)) return;
        if (typeof isDigitalReviewReadOnly === 'function' && isDigitalReviewReadOnly(s)) return;
        openReview(s.id);
      });
      tbody.appendChild(tr);
    });
    var fs = document.getElementById('legacy-footer-status');
    if (fs) {
      var sc = typeof UsabilityStudy !== 'undefined' ? UsabilityStudy.getActiveScenario() : null;
      fs.textContent = sc && sc.id
        ? ('情境：' + sc.title + ' · 共 ' + filteredList.length + ' 筆')
        : ('就緒 · 共 ' + filteredList.length + ' 筆');
    }
    renderWorklist();
  }

  function selectRow(id) {
    currentSpecimenId = id;
    document.querySelectorAll('#legacy-specimen-tbody tr').forEach(function (tr) {
      tr.classList.toggle('selected', tr.dataset.specimenId === id);
    });
    document.querySelectorAll('#legacy-worklist-tbody tr').forEach(function (tr) {
      tr.classList.toggle('selected', tr.dataset.specimenId === id);
    });
    updateSidebar(id);
    updateToolbarFields(id);
  }

  function updateSidebar(id) {
    var spec = id && typeof getSpecimenById === 'function' ? getSpecimenById(id) : null;
    var reqEl = document.getElementById('legacy-request-data');
    var slideDataEl = document.getElementById('legacy-slide-data');
    var slidesBody = document.getElementById('legacy-slides-tbody');
    if (!spec) {
      if (reqEl) reqEl.textContent = '請從清單選擇一筆檢體。';
      if (slideDataEl) slideDataEl.textContent = '請從清單選擇一筆檢體。';
      if (slidesBody) slidesBody.innerHTML = '';
      updateToolbarFields(null);
      return;
    }
    if (reqEl) {
      reqEl.textContent = [
        '檢體單 ID: ' + spec.id,
        '狀態: ' + ((spec.status || []).join(', ') || '-'),
        '已分析: ' + (spec.analysisTime || '-'),
        '',
        '患者 ID: ' + (spec.patientId || '-'),
        '姓名: ' + (spec.name || '-'),
        '性別: ' + (spec.gender || '-'),
        '出生日期: ' + (spec.birthDate || '-'),
        '',
        '臨床診斷:',
        (spec.clinicalDiagnosis || spec.diagnosis || '（無）')
      ].join('\n');
    }
    if (slidesBody) {
      slidesBody.innerHTML =
        '<tr class="selected">' +
        '<td><input type="checkbox" checked disabled/></td>' +
        '<td>' + spec.id + '</td>' +
        '<td>' + (spec.analysisTime || '') + '</td>' +
        '<td>' + (spec.editor || '') + '</td>' +
        '</tr>';
    }
    if (slideDataEl) slideDataEl.textContent = formatSlideData(spec);
  }

  function renderWorklist() {
    var wrap = document.getElementById('legacy-worklist-tbody');
    if (!wrap) return;
    var pending = getPendingWorklistSpecimens();
    wrap.innerHTML = '';
    pending.forEach(function (s) {
      var tr = document.createElement('tr');
      tr.dataset.specimenId = s.id;
      if (s.id === currentSpecimenId) tr.classList.add('selected');
      tr.innerHTML = '<td title="' + s.id + '">' + s.id + '</td>';
      tr.addEventListener('click', function () { selectRow(s.id); });
      tr.addEventListener('dblclick', function () { openReview(s.id); });
      wrap.appendChild(tr);
    });
  }

  function removeFromWorklist() {
    if (!currentSpecimenId) return;
    var dismissed = getDismissedWorklistIds();
    dismissed[currentSpecimenId] = true;
    saveDismissedWorklistIds(dismissed);
    renderWorklist();
    var fs = document.getElementById('legacy-footer-status');
    if (fs) fs.textContent = '已從工作清單移除：' + currentSpecimenId;
  }

  function restoreToWorklist() {
    if (!currentSpecimenId) {
      window.alert('請先選擇一筆檢體。');
      return;
    }
    var dismissed = getDismissedWorklistIds();
    delete dismissed[currentSpecimenId];
    saveDismissedWorklistIds(dismissed);
    renderWorklist();
  }

  function openReview(id) {
    if (!id || typeof goToImageReview !== 'function') return;
    var spec = typeof getSpecimenById === 'function' ? getSpecimenById(id) : null;
    if (isSpecimenLockedLocal(spec)) return;
    goToImageReview(id);
  }

  var ctxMenuSpecimenId = null;

  function hideSpecimenContextMenu() {
    var menu = document.getElementById('legacy-specimen-ctx-menu');
    if (menu) menu.classList.remove('show');
    ctxMenuSpecimenId = null;
  }

  function showSpecimenContextMenu(e, specimenId) {
    var menu = document.getElementById('legacy-specimen-ctx-menu');
    if (!menu) return;
    ctxMenuSpecimenId = specimenId;
    menu.classList.add('show');
    var pad = 4;
    var mw = window.innerWidth;
    var mh = window.innerHeight;
    var rect = menu.getBoundingClientRect();
    var x = e.clientX;
    var y = e.clientY;
    if (x + rect.width > mw - pad) x = mw - rect.width - pad;
    if (y + rect.height > mh - pad) y = mh - rect.height - pad;
    menu.style.left = Math.max(pad, x) + 'px';
    menu.style.top = Math.max(pad, y) + 'px';
  }

  function bindSpecimenContextMenu() {
    var tbody = document.getElementById('legacy-specimen-tbody');
    if (tbody) {
      tbody.addEventListener('contextmenu', function (e) {
        var tr = e.target.closest('tr');
        if (!tr || !tr.dataset.specimenId) return;
        var id = tr.dataset.specimenId;
        if (id !== currentSpecimenId) selectRow(id);
        var spec = typeof getSpecimenById === 'function' ? getSpecimenById(id) : null;
        if (!spec || isSpecimenLockedLocal(spec) || isWorkflowCompleted(spec)) return;
        e.preventDefault();
        showSpecimenContextMenu(e, id);
      });
    }
    var btnLock = document.getElementById('legacy-specimen-ctx-lock');
    if (btnLock) {
      btnLock.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = ctxMenuSpecimenId;
        hideSpecimenContextMenu();
        if (!id) return;
        if (!window.confirm('確定要保護並上鎖此檢體？上鎖後將無法再進入閱片編輯。')) return;
        if (typeof lockSpecimenProtectAndHold === 'function' && lockSpecimenProtectAndHold(id)) {
          renderTable();
          selectRow(id);
          var fs = document.getElementById('legacy-footer-status');
          if (fs) fs.textContent = '已保護並上鎖：' + id;
        }
      });
    }
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#legacy-specimen-ctx-menu')) hideSpecimenContextMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') hideSpecimenContextMenu();
    });
  }

  function updateToolbarFields(id) {
    var specIdEl = document.getElementById('legacy-toolbar-specimen-id');
    var slideEl = document.getElementById('legacy-toolbar-slide-no');
    if (!id) {
      if (specIdEl) specIdEl.innerHTML = '&nbsp;';
      if (slideEl) slideEl.innerHTML = '&nbsp;';
      return;
    }
    if (specIdEl) specIdEl.textContent = id;
    if (slideEl) slideEl.textContent = '1';
  }

  function bindEvents() {
    var btnSearch = document.getElementById('legacy-btn-search');
    if (btnSearch) btnSearch.addEventListener('click', renderTable);
    var btnAddWl = document.getElementById('legacy-btn-add-worklist');
    if (btnAddWl) btnAddWl.addEventListener('click', restoreToWorklist);
    var btnOpenWl = document.getElementById('legacy-btn-open-worklist');
    if (btnOpenWl) btnOpenWl.addEventListener('click', function () {
      if (currentSpecimenId) openReview(currentSpecimenId);
    });
    var btnDelWl = document.getElementById('legacy-btn-del-worklist');
    if (btnDelWl) btnDelWl.addEventListener('click', removeFromWorklist);
    var btnStart = document.getElementById('legacy-btn-start');
    if (btnStart) btnStart.addEventListener('click', function () {
      if (currentSpecimenId) openReview(currentSpecimenId);
      else if (filteredList.length) openReview(filteredList[0].id);
    });
    var filterValue = document.getElementById('legacy-filter-value');
    if (filterValue) {
      filterValue.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') renderTable();
      });
    }
  }

  function init() {
    if (typeof LegacyUi !== 'undefined' && !LegacyUi.isEnabled()) {
      window.location.href = '../檢體管理.html';
      return;
    }
    if (typeof applySpecimenStatusOverridesFromStorage === 'function') {
      applySpecimenStatusOverridesFromStorage();
    }
    if (typeof LegacyScenario !== 'undefined') {
      window.LegacyScenarioOnApplied = function () {
        currentSpecimenId = null;
        if (typeof applySpecimenStatusOverridesFromStorage === 'function') {
          applySpecimenStatusOverridesFromStorage();
        }
        renderTable();
        updateSidebar(null);
        if (filteredList.length) selectRow(filteredList[0].id);
        else renderWorklist();
      };
      LegacyScenario.bind();
      LegacyScenario.updateBanner();
    }
    bindEvents();
    bindSpecimenContextMenu();
    renderWorklist();
    renderTable();
    if (typeof LegacyScenario !== 'undefined') LegacyScenario.updateBanner();
    if (typeof LegacyLis !== 'undefined') LegacyLis.bind();
    if (filteredList.length) selectRow(filteredList[0].id);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
