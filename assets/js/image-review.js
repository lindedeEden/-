/**
 * 影像檢視與細胞編輯 - 資料綁定、導航、選取與儲存防呆
 * 依 5.3.2 規格實作
 */
(function () {
  'use strict';

  var ABNORMAL_ORDER = ['Blast', 'Promyelocyte', 'Myelocyte', 'Metamyelocyte', 'Hypersegmented', 'Promonocyte', 'Plasma Cell', 'Abnormal Lymphocyte'];
  // 右側細胞區塊預設排序需與「分析與歷史報告」一致（成熟細胞先、異常細胞後）
  var DEFAULT_CATEGORY_ORDER = [
    'Band',
    'Segmented Neutrophil',
    'Eosinophil',
    'Monocyte',
    'Basophil',
    'Lymphocyte',
    'Abnormal Lymphocyte',
    'Blast',
    'Promyelocyte',
    'Myelocyte',
    'Metamyelocyte',
    'Hypersegmented',
    'Promonocyte',
    'Plasma Cell',
    'Megakaryocyte',
    'NRBC',
    'Giant PLT',
    'Smudge Cell',
    'Unidentified',
    'Artefact'
  ];
  var CATEGORY_TO_METRIC_KEY = {
    'Blast': 'blast',
    'Promyelocyte': 'promyelocyte',
    'Myelocyte': 'myelocyte',
    'Metamyelocyte': 'metamyelocyte',
    'Hypersegmented': 'hypersegmented',
    'Promonocyte': 'promonocyte',
    'Plasma Cell': 'plasmaCell',
    'Abnormal Lymphocyte': 'abnormalLymphocyte',
    'Lymphocyte': 'lymphocyte',
    'Monocyte': 'monocyte',
    'Eosinophil': 'eosinophil',
    'Basophil': 'basophil'
  };
  var COMMON_TYPES = ['Segmented Neutrophil', 'Band', 'Lymphocyte', 'Monocyte', 'Eosinophil', 'Basophil', 'Giant PLT', 'NRBC', 'Smudge Cell'];
  var ABNORMAL_TYPES = ['Blast', 'Promyelocyte', 'Myelocyte', 'Metamyelocyte', 'Hypersegmented', 'Promonocyte', 'Plasma Cell', 'Abnormal Lymphocyte', 'Megakaryocyte'];
  var OTHER_TYPES = ['Unidentified', 'Artefact'];

  /** 單一通用模擬圖：內嵌 SVG（免外連），可改為 assets/images/cell-placeholder.png 使用本地檔 */
  var CELL_PLACEHOLDER_SVG = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><radialGradient id="g" cx="40%" cy="40%" r="50%"><stop offset="0%" stop-color="#e8e4f0"/><stop offset="70%" stop-color="#c4bed4"/><stop offset="100%" stop-color="#9a92a8"/></radialGradient></defs><ellipse cx="60" cy="60" rx="48" ry="52" fill="url(#g)" stroke="#8a8299" stroke-width="1.5"/><ellipse cx="52" cy="55" rx="18" ry="20" fill="rgba(255,255,255,0.4)"/></svg>'
  );
  var DEFAULT_IMAGE = CELL_PLACEHOLDER_SVG;

  /** 依類別從 CELL_SAMPLE_IMAGES 輪替指派真實範例圖；無對照時用占位 SVG */
  function resolveCellImageUrl(category, indexInCategory) {
    var samples = (typeof window.CELL_SAMPLE_IMAGES !== 'undefined' && window.CELL_SAMPLE_IMAGES)
      ? window.CELL_SAMPLE_IMAGES
      : null;
    if (!samples) return DEFAULT_IMAGE;
    var pool = samples[category];
    if ((!pool || !pool.length) && category === 'Abnormal Lymphocyte' && samples['Atypical Lymphocyte']) {
      pool = samples['Atypical Lymphocyte'];
    }
    if (!pool || !pool.length) return DEFAULT_IMAGE;
    var rel = pool[(indexInCategory || 0) % pool.length];
    var base = (typeof window.getBasePath === 'function') ? window.getBasePath() : '';
    return base + rel;
  }

  var currentSpecimenId = '';
  var currentSpecimen = null;
  var digitalReviewList = [];
  var cellData = [];
  var selectedCellIds = new Set();
  var lastClickedIndex = -1;
  var lastClickedCategory = null;
  var zoomLevel = 100;
  var rightMouseHeld = false;
  /** 單手模式（右鍵長按）內左鍵次數：奇數＝錨點單選，偶數＝同區塊範圍選或跨區塊僅移錨點 */
  var oneHandLmbCount = 0;
  /** 唯讀：數位閱片已完成或 URL ?readonly=1（仍可縮放／瀏覽，不可改分類／核發） */
  var readOnlyMode = false;
  /** 主內容區捲動時，細胞縮圖曾進入視野者（data-cell-id）；換檢體時清空 */
  var viewedCellIds = new Set();
  var cellViewObserver = null;
  var gridResizeObserver = null;

  function getReadonlyFromUrl() {
    try {
      return new URLSearchParams(window.location.search).get('readonly') === '1';
    } catch (e) {
      return false;
    }
  }

  function computeReadOnlyMode(spec) {
    if (!spec) return !!getReadonlyFromUrl();
    if (getReadonlyFromUrl()) return true;
    if (spec.locked) return true;
    return typeof isDigitalReviewReadOnly === 'function' && isDigitalReviewReadOnly(spec);
  }

  function applyReadOnlyChrome() {
    var banner = document.getElementById('image-review-readonly-banner');
    if (readOnlyMode) {
      if (banner) {
        banner.classList.remove('hidden');
        if (currentSpecimen && currentSpecimen.locked) {
          banner.textContent = '此檢體已鎖定（他人編輯中），僅能檢視影像與縮放，無法變更細胞分類或核發報告。';
        } else if (typeof isDigitalReviewHandoffToFollowUp === 'function' && isDigitalReviewHandoffToFollowUp(currentSpecimen)) {
          banner.textContent = '唯讀模式：已交接至需拉片確認，以下為數位閱片人員編輯快照，僅供檢視。';
        } else {
          banner.textContent = '唯讀模式：數位閱片已簽核結案，僅能檢視影像與縮放，無法變更細胞分類或核發報告。';
        }
      }
      var addFlag = document.getElementById('sidebar-add-flag');
      if (addFlag) {
        addFlag.classList.add('opacity-50', 'pointer-events-none');
        addFlag.title = '唯讀模式無法變更狀態標記';
      }
      document.querySelectorAll('#sidebar-status-tags [data-status] .material-symbols-outlined').forEach(function (ic) {
        ic.classList.add('hidden');
      });
    } else {
      if (banner) banner.classList.add('hidden');
    }
    updateSaveReportButtonState();
  }

  /** 未檢視完所有細胞或唯讀時，「儲存並核發報告」反灰不可點 */
  function updateSaveReportButtonState() {
    var saveBtn = document.getElementById('btn-save-report');
    if (!saveBtn) return;
    var total = getTotalCells();
    var viewed = viewedCellIds.size;
    var allViewed = total > 0 && viewed >= total;

    if (readOnlyMode) {
      saveBtn.disabled = true;
      saveBtn.setAttribute('aria-disabled', 'true');
      saveBtn.classList.add('opacity-50', 'cursor-not-allowed');
      saveBtn.title = currentSpecimen && currentSpecimen.locked ? '檢體已鎖定' : '數位閱片已完成';
      return;
    }

    if (!allViewed) {
      saveBtn.disabled = true;
      saveBtn.setAttribute('aria-disabled', 'true');
      saveBtn.classList.add('opacity-50', 'cursor-not-allowed');
      saveBtn.title = total === 0
        ? '尚無細胞資料'
        : '請先檢視所有細胞（' + viewed + ' / ' + total + '）';
      return;
    }

    saveBtn.disabled = false;
    saveBtn.setAttribute('aria-disabled', 'false');
    saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    saveBtn.removeAttribute('title');
  }

  function getDigitalReviewList() {
    if (typeof APP_DATABASE === 'undefined' || !APP_DATABASE.specimens) return [];
    var list = APP_DATABASE.specimens.filter(function (s) {
      if (s.locked) return false;
      return typeof hasPendingDigitalReviewWork === 'function' && hasPendingDigitalReviewWork(s);
    });
    if (typeof UsabilityStudy !== 'undefined' && UsabilityStudy.isActive && UsabilityStudy.isActive()) {
      list = UsabilityStudy.filterSpecimensForList(list);
    }
    return list;
  }

  /** 依清單／情境順序，取得簽核完成後下一筆待數位閱片檢體（DR 或 DR+AI 待辦） */
  function getOrderedSpecimensForDigitalNavigation() {
    if (typeof APP_DATABASE === 'undefined' || !APP_DATABASE.specimens) return [];
    var list = APP_DATABASE.specimens.slice();
    if (typeof UsabilityStudy !== 'undefined' && UsabilityStudy.isActive && UsabilityStudy.isActive()) {
      list = UsabilityStudy.filterSpecimensForList(list);
    }
    return list;
  }

  function getNextPendingDigitalSpecimenAfter(completedId) {
    var pending = getDigitalReviewList();
    if (!pending.length) return null;
    var pendingById = {};
    pending.forEach(function (s) { pendingById[s.id] = s; });
    var ordered = getOrderedSpecimensForDigitalNavigation();
    var startIdx = 0;
    if (completedId) {
      for (var k = 0; k < ordered.length; k++) {
        if (ordered[k].id === completedId) {
          startIdx = k + 1;
          break;
        }
      }
    }
    var i;
    for (i = startIdx; i < ordered.length; i++) {
      if (pendingById[ordered[i].id]) return pendingById[ordered[i].id];
    }
    for (i = 0; i < startIdx; i++) {
      if (pendingById[ordered[i].id]) return pendingById[ordered[i].id];
    }
    return pending[0];
  }

  function getSpecimenById(id) {
    if (typeof window.getSpecimenById === 'function') return window.getSpecimenById(id);
    var list = typeof APP_DATABASE !== 'undefined' && APP_DATABASE.specimens ? APP_DATABASE.specimens : [];
    return list.find(function (s) { return s.id === id; }) || null;
  }

  /** 依檢體 metrics 的百分比決定每類細胞張數（例如 promyelocyte 5% → 5 張單一通用圖）。key → 類別名。 */
  var METRIC_TO_CATEGORY = [
    { key: 'blast', name: 'Blast' },
    { key: 'promyelocyte', name: 'Promyelocyte' },
    { key: 'myelocyte', name: 'Myelocyte' },
    { key: 'metamyelocyte', name: 'Metamyelocyte' },
    { key: 'hypersegmented', name: 'Hypersegmented' },
    { key: 'promonocyte', name: 'Promonocyte' },
    { key: 'plasmaCell', name: 'Plasma Cell' },
    { key: 'abnormalLymphocyte', name: 'Abnormal Lymphocyte' },
    { key: 'atypicalLymphocyte', name: 'Abnormal Lymphocyte' },
    { key: 'band', name: 'Band' },
    { key: 'segmentedNeutrophil', name: 'Segmented Neutrophil' },
    { key: 'lymphocyte', name: 'Lymphocyte' },
    { key: 'monocyte', name: 'Monocyte' },
    { key: 'eosinophil', name: 'Eosinophil' },
    { key: 'basophil', name: 'Basophil' }
  ];

  function metricValueToCount(val) {
    if (val === undefined || val === null || String(val).trim() === '' || val === '-') return 0;
    var n = parseFloat(String(val).replace(',', '.'), 10);
    return isNaN(n) || n <= 0 ? 0 : Math.round(n);
  }

  function getOrCreateCellData(specimenId) {
    if (typeof loadEditedCellsSnapshot === 'function') {
      var snapshot = loadEditedCellsSnapshot(specimenId);
      if (snapshot && snapshot.length > 0) return snapshot.slice();
    }
    var existing = window.CELLS_BY_SPECIMEN && window.CELLS_BY_SPECIMEN[specimenId];
    if (existing && Array.isArray(existing) && existing.length > 0) return existing.slice();
    var specimen = currentSpecimen;
    if (specimen && specimen.metrics) {
      var m = specimen.metrics;
      var byCategory = {};
      METRIC_TO_CATEGORY.forEach(function (item) {
        var name = item.name;
        if (!byCategory[name]) byCategory[name] = 0;
        byCategory[name] += metricValueToCount(m[item.key]);
      });
      var list = [];
      var id = 0;
      var order = ABNORMAL_ORDER.slice();
      COMMON_TYPES.forEach(function (t) { if (order.indexOf(t) < 0) order.push(t); });
      Object.keys(byCategory).forEach(function (t) { if (order.indexOf(t) < 0) order.push(t); });
      order.forEach(function (catName) {
        var count = byCategory[catName];
        if (!count) return;
        for (var i = 0; i < count; i++) {
          list.push({
            id: 'cell-' + (++id),
            category: catName,
            imageUrl: resolveCellImageUrl(catName, i),
            aiSuggestion: catName === 'Segmented Neutrophil' ? { label: 'Segmented', pct: 92 } : (catName === 'Blast' ? { label: 'Blast', pct: 88 } : null)
          });
        }
      });
      if (list.length > 0) return list;
    }
    var categories = [
      { name: 'Blast', count: 2, abnormal: true },
      { name: 'Promyelocyte', count: 6, abnormal: true },
      { name: 'Myelocyte', count: 5, abnormal: true },
      { name: 'Band', count: 8, abnormal: false },
      { name: 'Segmented Neutrophil', count: 60, abnormal: false },
      { name: 'Lymphocyte', count: 15, abnormal: false },
      { name: 'Monocyte', count: 6, abnormal: false },
      { name: 'Eosinophil', count: 4, abnormal: false },
      { name: 'Unidentified', count: 4, abnormal: false }
    ];
    var id = 0;
    var list = [];
    categories.forEach(function (cat) {
      for (var i = 0; i < cat.count; i++) {
        list.push({
          id: 'cell-' + (++id),
          category: cat.name,
          imageUrl: resolveCellImageUrl(cat.name, i),
          aiSuggestion: cat.name === 'Segmented Neutrophil' ? { label: 'Segmented', pct: 92 } : (cat.name === 'Blast' ? { label: 'Blast', pct: 88 } : null)
        });
      }
    });
    return list;
  }

  function isLeaveConditionReachedByCurrentCells(category, count, pct) {
    var metricKey = CATEGORY_TO_METRIC_KEY[category];
    if (!metricKey) return false;
    var threshold = typeof LEAVE_THRESHOLDS !== 'undefined' ? LEAVE_THRESHOLDS[metricKey] : undefined;
    if (threshold == null) return false;
    var currentValue = threshold === 'present' ? count : pct;
    if (typeof isAbnormalMetricValue === 'function') {
      return isAbnormalMetricValue(metricKey, currentValue);
    }
    if (threshold === 'present') return count > 0;
    if (typeof threshold === 'number') return pct >= threshold;
    return false;
  }

  function getSortedCategoryOrder(byCat, totalCount, prevReport) {
    var defaultOrder = DEFAULT_CATEGORY_ORDER.slice();
    Object.keys(byCat).forEach(function (t) {
      if (defaultOrder.indexOf(t) < 0) defaultOrder.push(t);
    });

    var leaveHitCategories = defaultOrder.filter(function (cat) {
      if (!byCat[cat]) return false;
      var count = byCat[cat].length;
      var pct = totalCount > 0 ? (count / totalCount * 100) : 0;
      return isLeaveConditionReachedByCurrentCells(cat, count, pct, prevReport);
    });

    // 所有命中留單門檻的類別都置頂；其餘項目保留 defaultOrder 的相對順序。
    if (leaveHitCategories.length === 0) return defaultOrder;
    var prioritized = leaveHitCategories;
    var rest = defaultOrder.filter(function (cat) { return prioritized.indexOf(cat) < 0; });
    return prioritized.concat(rest);
  }

  /** 與檢體管理介面相同：分析與歷史的列順序與標籤；流式計數欄用 flowCyt */
  function getAnalysisTableRows(spec) {
    var m = spec.metrics || {};
    var prev = spec.prevReport || {};
    var flow = function (key) { return getFlowCytMetricValue(spec, key); };
    return [
      ['WBC (10e9/L)', flow('wbc'), m.wbc, prev.wbc],
      ['PLT (10e9/L)', flow('plt'), m.plt, prev.plt],
      ['Band (%)', flow('band'), m.band, prev.band],
      ['Segmented neutrophil (%)', flow('segmentedNeutrophil'), m.segmentedNeutrophil, prev.segmentedNeutrophil],
      ['Eosinophil (%)', flow('eosinophil'), m.eosinophil, prev.eosinophil],
      ['Monocyte (%)', flow('monocyte'), m.monocyte, prev.monocyte],
      ['Basophil (%)', flow('basophil'), m.basophil, prev.basophil],
      ['Lymphocyte (%)', flow('lymphocyte'), m.lymphocyte, prev.lymphocyte],
      ['Atypical lymphocyte (%)', flow('atypicalLymphocyte'), m.atypicalLymphocyte, prev.atypicalLymphocyte],
      ['Blast (%)', flow('blast'), m.blast, prev.blast],
      ['Promyelocyte (%)', flow('promyelocyte'), m.promyelocyte, prev.promyelocyte],
      ['Myelocyte (%)', flow('myelocyte'), m.myelocyte, prev.myelocyte],
      ['Metamyelocyte (%)', flow('metamyelocyte'), m.metamyelocyte, prev.metamyelocyte],
      ['Hypersegmented (%)', flow('hypersegmented'), m.hypersegmented, prev.hypersegmented],
      ['Promonocyte (%)', flow('promonocyte'), m.promonocyte, prev.promonocyte],
      ['Plasma cell (%)', flow('plasmaCell'), m.plasmaCell, prev.plasmaCell],
      ['Abnormal lymphocyte (%)', flow('abnormalLymphocyte'), m.abnormalLymphocyte, prev.abnormalLymphocyte]
    ];
  }

  function shouldHighlightAnalysisRow(label, aiValueStr) {
    var LABEL_TO_KEY = {
      'WBC (10e9/L)': 'wbc',
      'Lymphocyte (%)': 'lymphocyte',
      'Monocyte (%)': 'monocyte',
      'Eosinophil (%)': 'eosinophil',
      'Basophil (%)': 'basophil',
      'Atypical lymphocyte (%)': 'atypicalLymphocyte',
      'Blast (%)': 'blast',
      'Promyelocyte (%)': 'promyelocyte',
      'Myelocyte (%)': 'myelocyte',
      'Metamyelocyte (%)': 'metamyelocyte',
      'Hypersegmented (%)': 'hypersegmented',
      'Promonocyte (%)': 'promonocyte',
      'Plasma cell (%)': 'plasmaCell',
      'Abnormal lymphocyte (%)': 'abnormalLymphocyte'
    };
    var key = LABEL_TO_KEY[label];
    if (!key || typeof isAbnormalMetricValue !== 'function') return false;
    return isAbnormalMetricValue(key, aiValueStr);
  }

  function getMetricKeys() {
    return ['wbc', 'blast', 'promyelocyte', 'myelocyte', 'metamyelocyte', 'band', 'segmentedNeutrophil', 'lymphocyte', 'monocyte', 'eosinophil', 'basophil', 'atypicalLymphocyte', 'hypersegmented', 'promonocyte', 'plasmaCell', 'abnormalLymphocyte'];
  }

  function getMetricLabel(key) {
    var labels = { wbc: 'WBC', blast: 'Blast', promyelocyte: 'Promyelocyte', myelocyte: 'Myelocyte', metamyelocyte: 'Metamyelocyte', band: 'Band', segmentedNeutrophil: 'Seg. Neutro', lymphocyte: 'Lymphocyte', monocyte: 'Monocyte', eosinophil: 'Eosinophil', basophil: 'Basophil', atypicalLymphocyte: 'A-Lym', hypersegmented: 'Hyperseg.', promonocyte: 'Promonocyte', plasmaCell: 'Plasma Cell', abnormalLymphocyte: 'Abn Lym' };
    return labels[key] || key;
  }

  function renderSidebar() {
    var specimen = currentSpecimen;
    if (!specimen) return;

    var titleEl = document.getElementById('specimen-id-title');
    if (titleEl) titleEl.textContent = specimen.id;

    var tagsContainer = document.getElementById('sidebar-status-tags');
    if (tagsContainer) {
      var statuses = specimen.status || [];
      var displayStatuses = statuses.filter(function (s) { return s !== 'Verified'; });
      tagsContainer.innerHTML = displayStatuses.map(function (s) {
        var style;
        var label = typeof getStatusDisplayLabel === 'function' ? getStatusDisplayLabel(s) : s;
        var prefixIcon = '';
        if (s === 'AI Alert' && typeof isAiAlertConfirmed === 'function' && isAiAlertConfirmed(specimen)) {
          style = 'bg-green-100 text-green-800';
          prefixIcon = '<span class="material-symbols-outlined text-[14px] mr-0.5 align-middle">check</span>';
        } else if (s === 'AI Alert') style = 'bg-orange-100 text-orange-800';
        else if (s === 'PLT Check') style = 'bg-blue-100 text-blue-800';
        else if (s === 'Follow-up' && typeof isEntityStatusCompleted === 'function' && isEntityStatusCompleted(specimen, 'Follow-up')) {
          style = 'bg-green-100 text-green-800';
          prefixIcon = '<span class="material-symbols-outlined text-[14px] mr-0.5 align-middle">check</span>';
        } else if (s === 'Follow-up') style = 'bg-red-100 text-red-800';
        else if (s === 'Digital Review' && typeof isDigitalReviewDone === 'function' && isDigitalReviewDone(specimen)) {
          style = 'bg-green-100 text-green-800';
          prefixIcon = '<span class="material-symbols-outlined text-[14px] mr-0.5 align-middle">check</span>';
        } else if (s === 'Digital Review') style = 'bg-purple-100 text-purple-800';
        else style = 'bg-gray-100 text-gray-800';
        return '<div class="group relative inline-flex items-center gap-1 px-3 py-1 rounded-full ' + style + ' text-[10px] font-bold uppercase tracking-wider" data-status="' + s + '">' + prefixIcon + label + ' <span class="material-symbols-outlined text-[14px] hidden group-hover:inline cursor-pointer">close</span></div>';
      }).join('');
      var addFlag = document.getElementById('sidebar-add-flag');
      if (addFlag && !document.querySelector('#sidebar-status-tags + .relative')) {
        var wrap = document.createElement('div');
        wrap.className = 'relative dropdown-container';
        wrap.innerHTML = '<button type="button" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-gray-300 text-gray-600 text-[10px] font-medium hover:bg-gray-50" id="add-flag-btn"><span class="material-symbols-outlined text-sm">add</span> Add Flag</button><div class="dropdown-menu absolute left-0 top-full mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-xl z-50 hidden"><div class="p-2 border-b border-gray-200"><span class="text-[10px] font-bold text-gray-500 uppercase">新增標記</span></div><div class="p-1"><button type="button" class="w-full text-left px-2 py-2 hover:bg-gray-50 rounded text-xs" data-flag="AI Alert">' + (typeof getStatusDisplayLabel === 'function' ? getStatusDisplayLabel('AI Alert') : 'AI Alert') + '</button><button type="button" class="w-full text-left px-2 py-2 hover:bg-gray-50 rounded text-xs" data-flag="PLT Check">' + (typeof getStatusDisplayLabel === 'function' ? getStatusDisplayLabel('PLT Check') : 'PLT Check') + '</button><button type="button" class="w-full text-left px-2 py-2 hover:bg-gray-50 rounded text-xs" data-flag="Follow-up">' + (typeof getStatusDisplayLabel === 'function' ? getStatusDisplayLabel('Follow-up') : 'Follow-up') + '</button><button type="button" class="w-full text-left px-2 py-2 hover:bg-gray-50 rounded text-xs" data-flag="Digital Review">' + (typeof getStatusDisplayLabel === 'function' ? getStatusDisplayLabel('Digital Review') : 'Digital Review') + '</button></div></div></div>';
        tagsContainer.parentNode.insertBefore(wrap, tagsContainer.nextSibling);
      }
      tagsContainer.querySelectorAll('[data-status]').forEach(function (el) {
        var close = el.querySelector('.material-symbols-outlined');
        if (close) close.addEventListener('click', function (e) { e.stopPropagation(); removeStatus(el.getAttribute('data-status')); });
      });

      var dropdown = document.querySelector('#sidebar-add-flag .dropdown-menu');
      if (dropdown) {
        var flagRows = dropdown.querySelectorAll('[data-flag]');
        flagRows.forEach(function (labelEl) {
          var flag = labelEl.getAttribute('data-flag') || '';
          if (!flag) return;
          var triggerAddFlag = function (e) {
            if (e) e.preventDefault();
            addStatus(flag);
          };
          labelEl.onclick = triggerAddFlag;
          labelEl.onkeydown = function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
              triggerAddFlag(e);
            }
          };
          if (!labelEl.hasAttribute('tabindex')) labelEl.setAttribute('tabindex', '0');
        });
      }
    }

    var searchEl = document.getElementById('sidebar-search');
    if (searchEl) {
      searchEl.placeholder = '檢體 ID 搜尋…';
      searchEl.value = '';
      searchEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var id = (searchEl.value || '').trim();
          if (id && getSpecimenById(id)) goToSpecimen(id);
        }
      });
    }

    var prevBtn = document.getElementById('sidebar-prev');
    var nextBtn = document.getElementById('sidebar-next');
    if (prevBtn) prevBtn.onclick = function () { navigatePrevNext(-1); };
    if (nextBtn) nextBtn.onclick = function () { navigatePrevNext(1); };

    var detailsEl = document.getElementById('sidebar-patient-details');
    if (detailsEl) {
      var summary = detailsEl.querySelector('summary');
      var nameEl = summary && summary.querySelector('.patient-name-summary');
      if (nameEl) {
        var summaryText = ' - ' + (specimen.name || '') + ' (' + (specimen.gender || '') + ')';
        if (specimen.birthDate) {
          summaryText += ' / ' + specimen.birthDate;
          if (specimen.age != null && specimen.age !== '') {
            summaryText += ' (' + specimen.age + ' 歲)';
          }
        }
        nameEl.textContent = summaryText;
      }
      var idEl = document.getElementById('sidebar-patient-id');
      var deptEl = document.getElementById('sidebar-patient-dept');
      var machineEl = document.getElementById('sidebar-patient-machine');
      var locEl = document.getElementById('sidebar-patient-location');
      if (idEl) idEl.textContent = specimen.patientId || '';
      if (deptEl) deptEl.textContent = specimen.department || '';
      if (machineEl) machineEl.textContent = specimen.machine || '';
      if (locEl) locEl.textContent = specimen.location || '';
    }

    var tableContainer = document.getElementById('sidebar-analysis-table');
    if (tableContainer) {
      var rows = getAnalysisTableRows(specimen);
      var prevHeader = typeof getPrevReportHeaderLabel === 'function' ? getPrevReportHeaderLabel(specimen, '前次報告') : '前次報告';
      var header = '<div class="grid grid-cols-4 gap-2 font-semibold text-gray-600 py-1.5 border-b border-gray-300/80 sticky top-0 bg-card z-[1] text-[10px] uppercase tracking-wider">' +
        '<div class="col-span-1"></div><div class="col-span-1 text-right">流式計數</div><div class="col-span-1 text-right">AI</div><div class="col-span-1 text-right">' + prevHeader + '</div></div>';
      var body = rows.map(function (r) {
        var label = r[0];
        var aiVal = r[2];
        var highlight = shouldHighlightAnalysisRow(label, aiVal);
        var rowClass = highlight ? 'bg-red-50 border-b border-red-100' : 'border-b border-gray-200';
        var labelClass = highlight ? 'text-red-700 font-semibold px-0.5' : 'text-gray-600 font-medium leading-tight';
        var valClass = highlight ? 'font-bold text-red-600' : 'text-gray-800';
        var flowClass = highlight ? 'text-gray-400' : 'text-gray-800';
        var labelHtml = label.indexOf('WBC') >= 0 ? 'WBC<br/><span class="text-[9px]">(10e9/L)</span>' : label;
        return '<div class="grid grid-cols-4 gap-2 items-center py-1.5 ' + rowClass + '">' +
          '<div class="col-span-1 ' + labelClass + '">' + labelHtml + '</div>' +
          '<div class="col-span-1 text-right ' + flowClass + '">' + (r[1] || '-') + '</div>' +
          '<div class="col-span-1 text-right ' + valClass + '">' + (aiVal || '-') + '</div>' +
          '<div class="col-span-1 text-right ' + valClass + '">' + (r[3] || '-') + '</div></div>';
      }).join('');
      tableContainer.innerHTML = header + '<div class="space-y-0 text-xs">' + body + '</div>';
    }
  }

  function notifyReportIframeToRefresh() {
    var modal = document.getElementById('report-issue-modal');
    var iframe = document.getElementById('report-issue-iframe');
    if (!modal || modal.classList.contains('hidden') || !iframe || !iframe.contentWindow) return;
    try {
      iframe.contentWindow.postMessage({ type: 'specimenDataUpdated', specimenId: currentSpecimenId }, '*');
    } catch (e) {}
  }

  function syncEntityWorkflowAfterCapsuleToggle(statusKey, markDone) {
    if (!currentSpecimen) return;
    if (!currentSpecimen.workflowDone || typeof currentSpecimen.workflowDone !== 'object') {
      currentSpecimen.workflowDone = { digitalReview: false, aiAlertConfirmed: false, entityReview: false, entityStatusDone: {} };
    }
    if (!currentSpecimen.workflowDone.entityStatusDone || typeof currentSpecimen.workflowDone.entityStatusDone !== 'object') {
      currentSpecimen.workflowDone.entityStatusDone = {};
    }
    currentSpecimen.workflowDone.entityStatusDone[statusKey] = !!markDone;
    var st = currentSpecimen.status || [];
    var entityStatuses = st.filter(function (x) {
      return x === 'PLT Check' || x === 'Follow-up';
    });
    currentSpecimen.workflowDone.entityReview = entityStatuses.length > 0 && entityStatuses.every(function (x) {
      return !!currentSpecimen.workflowDone.entityStatusDone[x];
    });
    currentSpecimen.statusDone = typeof computeSpecimenStatusDoneFromWorkflow === 'function'
      ? computeSpecimenStatusDoneFromWorkflow(st, currentSpecimen.workflowDone)
      : false;
    if (!currentSpecimen.statusDone) currentSpecimen.editor = '';
    else {
      var editorAccount = typeof getCurrentUserAccount === 'function' ? getCurrentUserAccount() : '';
      if (editorAccount) currentSpecimen.editor = editorAccount;
    }
    if (typeof window.persistSpecimenStatusOverride === 'function') {
      window.persistSpecimenStatusOverride(currentSpecimen.id, st, {
        workflowDone: currentSpecimen.workflowDone,
        editor: currentSpecimen.editor || ''
      });
    }
  }

  function removeStatus(status) {
    if (!currentSpecimen || !currentSpecimen.status) return;
    currentSpecimen.status = currentSpecimen.status.filter(function (s) { return s !== status; });
    if (typeof window.persistSpecimenStatusOverride === 'function') {
      window.persistSpecimenStatusOverride(currentSpecimen.id, currentSpecimen.status);
    }
    digitalReviewList = getDigitalReviewList();
    renderSidebar();
    notifyReportIframeToRefresh();
  }

  function addStatus(status) {
    if (!currentSpecimen) return;
    if (status === 'Manual Alert') status = 'Follow-up';
    if (!Array.isArray(currentSpecimen.status)) currentSpecimen.status = [];
    var st = currentSpecimen.status.slice();
    if (st.indexOf(status) === -1) st.push(status);
    currentSpecimen.status = st;
    if (typeof window.persistSpecimenStatusOverride === 'function') {
      window.persistSpecimenStatusOverride(currentSpecimen.id, currentSpecimen.status);
    }
    digitalReviewList = getDigitalReviewList();
    renderSidebar();
    notifyReportIframeToRefresh();
  }

  function navigatePrevNext(delta) {
    var idx = digitalReviewList.findIndex(function (s) { return s.id === currentSpecimenId; });
    idx += delta;
    if (idx < 0) idx = digitalReviewList.length - 1;
    if (idx >= digitalReviewList.length) idx = 0;
    var next = digitalReviewList[idx];
    if (next) goToSpecimen(next.id);
  }

  function goToSpecimen(id) {
    var base = (typeof window.getBasePath === 'function') ? window.getBasePath() : '';
    window.location.href = base + '影像檢視與細胞編輯.html?specimen=' + encodeURIComponent(id);
  }

  function getTotalCells() { return cellData.length; }
  function getUnidentifiedCount() { return cellData.filter(function (c) { return c.category === 'Unidentified'; }).length; }
  function getViewedProgress() {
    var total = getTotalCells();
    if (total === 0) return 100;
    return Math.round((viewedCellIds.size / total) * 100);
  }

  function disconnectCellViewObserver() {
    if (cellViewObserver) {
      cellViewObserver.disconnect();
      cellViewObserver = null;
    }
  }

  /** root 為 #main-cell-groups 之父層（main 內 overflow-y-auto 捲動容器） */
  function setupCellViewObserver() {
    disconnectCellViewObserver();
    var groupsEl = document.getElementById('main-cell-groups');
    if (!groupsEl) return;
    var scrollRoot = groupsEl.parentElement;
    if (!scrollRoot) return;
    var cells = groupsEl.querySelectorAll('.cell-image-container');
    if (!cells.length) {
      updateProgressBar();
      return;
    }
    cellViewObserver = new IntersectionObserver(function (entries) {
      var changed = false;
      entries.forEach(function (ent) {
        if (!ent.isIntersecting || ent.intersectionRatio < 0.35) return;
        var id = ent.target.getAttribute('data-cell-id');
        if (id && !viewedCellIds.has(id)) {
          viewedCellIds.add(id);
          changed = true;
        }
      });
      if (changed) updateProgressBar();
    }, { root: scrollRoot, rootMargin: '0px', threshold: [0, 0.25, 0.5, 0.75, 1] });
    for (var i = 0; i < cells.length; i++) {
      cellViewObserver.observe(cells[i]);
    }
    updateProgressBar();
  }

  function updateProgressBar() {
    var total = getTotalCells();
    var viewed = viewedCellIds.size;
    var unidentified = getUnidentifiedCount();
    var textEl = document.getElementById('toolbar-progress-text');
    var barEl = document.getElementById('toolbar-progress-bar');
    if (textEl) {
      textEl.textContent = '已檢視 ' + viewed + ' / ' + total + ' · Unidentified ' + unidentified;
    }
    var pct = total ? (viewed / total * 100) : 100;
    if (barEl) barEl.style.width = pct + '%';
    updateSaveReportButtonState();
  }

  function renderCellGroups() {
    var container = document.getElementById('main-cell-groups');
    if (!container) return;

    var total = cellData.length;
    var byCat = {};
    cellData.forEach(function (c) {
      if (!byCat[c.category]) byCat[c.category] = [];
      byCat[c.category].push(c);
    });

    var prevReport = (currentSpecimen && currentSpecimen.prevReport) ? currentSpecimen.prevReport : {};
    var catOrder = getSortedCategoryOrder(byCat, total, prevReport);

    var html = '';
    catOrder.forEach(function (catName) {
      var cells = byCat[catName];
      if (!cells || cells.length === 0) return;
      var count = cells.length;
      var pctRaw = total ? (count / total * 100) : 0;
      var pct = total ? Math.round(pctRaw) : 0;
      var leaveHit = isLeaveConditionReachedByCurrentCells(catName, count, pctRaw, prevReport);
      var sectionClass = leaveHit ? 'bg-red-50 border border-red-200' : 'bg-white border border-gray-300';
      var titleClass = leaveHit ? 'text-red-800' : 'text-gray-800';
      var subClass = leaveHit ? 'text-red-600' : 'text-gray-600';
      html += '<div class="group section-card ' + sectionClass + ' rounded-xl overflow-hidden" data-category="' + catName + '">';
      html += '<div class="flex items-center justify-between p-4 cursor-pointer hover:opacity-90 transition-colors section-header" onclick="window.imageReviewToggleGrid(this)">';
      html += '<div class="flex items-center gap-3">';
      if (leaveHit) html += '<span class="material-symbols-outlined text-red-500 font-bold">warning</span>';
      html += '<div class="flex items-baseline gap-2"><h2 class="text-lg font-bold ' + titleClass + '">' + catName + '</h2><span class="text-sm font-medium ' + subClass + ' section-count">(' + count + ' Cells, ' + pct + '%)</span></div></div>';
      html += '<span class="toggle-icon material-symbols-outlined text-gray-400 transition-transform duration-200 icon-rotate-180">expand_more</span></div>';
      html += '<div class="grid-content px-4 pb-4 grid-expanded transition-all duration-300 section-content">';
      html += '<div class="grid gap-2 mt-2 cell-grid" data-category="' + catName + '">';
      cells.forEach(function (cell) {
        var sel = selectedCellIds.has(cell.id) ? ' ring-2 ring-primary' : '';
        html += '<div class="cell-image-container relative aspect-square cursor-pointer transition-all rounded-lg border-2 border-gray-300' + sel + '" data-cell-id="' + cell.id + '" data-category="' + catName + '" draggable="' + (readOnlyMode ? 'false' : 'true') + '"><img alt="Cell" class="w-full h-full object-cover rounded-lg" src="' + (cell.imageUrl || '') + '"/></div>';
      });
      html += '</div></div></div>';
    });
    container.innerHTML = html;
    bindCellEvents();
    setupCellViewObserver();
    scheduleApplyZoom();
  }

  function bindCellEvents() {
    var containers = document.querySelectorAll('.cell-image-container');
    containers.forEach(function (el) {
      var cellId = el.getAttribute('data-cell-id');
      el.addEventListener('click', function (e) {
        if (rightMouseHeld) {
          oneHandLmbCount++;
          if (oneHandLmbCount % 2 === 1) {
            singleSelect(cellId);
          } else {
            var ohInfo = getCategoryListAndIndex(cellId);
            if (lastClickedCategory === ohInfo.category) {
              rangeSelect(cellId);
            } else {
              singleSelect(cellId);
            }
          }
          return;
        }
        if (e.ctrlKey) { toggleSelect(cellId); return; }
        if (e.shiftKey) { rangeSelect(cellId); return; }
        singleSelect(cellId);
      });
      el.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        if (readOnlyMode) return;
        // 若已有多選 (單手模式或 Ctrl/Shift)，維持目前選取集合
        if (selectedCellIds.size === 0) {
          singleSelect(cellId);
        } else if (!selectedCellIds.has(cellId)) {
          // 沒有選到目前這顆，還是以目前選取集合為主
        }
        var firstId = selectedCellIds.size > 0 ? selectedCellIds.values().next().value : cellId;
        showContextMenu(e, firstId);
      });
      el.addEventListener('dragstart', function (e) {
        if (readOnlyMode) {
          e.preventDefault();
          return;
        }
        if (!selectedCellIds.has(cellId)) selectedCellIds.clear(); selectedCellIds.add(cellId);
        e.dataTransfer.setData('text/plain', JSON.stringify(Array.from(selectedCellIds)));
        e.dataTransfer.effectAllowed = 'move';
      });
      el.addEventListener('dragover', function (e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
      el.addEventListener('drop', function (e) {
        e.preventDefault();
        if (readOnlyMode) return;
        var cat = el.getAttribute('data-category');
        if (cat) moveSelectedToCategory(cat);
      });
    });

    var sectionCards = document.querySelectorAll('.section-card');
    sectionCards.forEach(function (card) {
      var cat = card.getAttribute('data-category');
      var content = card.querySelector('.section-content');
      if (content) {
        content.addEventListener('dragover', function (e) { e.preventDefault(); e.currentTarget.classList.add('bg-primary/5'); });
        content.addEventListener('dragleave', function (e) { e.currentTarget.classList.remove('bg-primary/5'); });
        content.addEventListener('drop', function (e) {
          e.preventDefault();
          e.currentTarget.classList.remove('bg-primary/5');
          if (readOnlyMode) return;
          if (cat) moveSelectedToCategory(cat);
        });
      }
    });
  }

  function getCategoryListAndIndex(cellId) {
    var el = document.querySelector('.cell-image-container[data-cell-id="' + cellId + '"]');
    if (!el) return { category: null, index: -1, list: [] };
    var cat = el.getAttribute('data-category') || '';
    var list = Array.prototype.slice.call(document.querySelectorAll('.cell-image-container[data-category="' + cat + '"]'));
    var idx = list.findIndex(function (e) { return e.getAttribute('data-cell-id') === cellId; });
    return { category: cat, index: idx, list: list };
  }

  function singleSelect(cellId) {
    selectedCellIds.clear();
    selectedCellIds.add(cellId);
    var info = getCategoryListAndIndex(cellId);
    lastClickedIndex = info.index;
    lastClickedCategory = info.category;
    updateSelectionUI();
  }
  function toggleSelect(cellId) {
    if (selectedCellIds.has(cellId)) selectedCellIds.delete(cellId); else selectedCellIds.add(cellId);
    var info = getCategoryListAndIndex(cellId);
    lastClickedIndex = info.index;
    lastClickedCategory = info.category;
    updateSelectionUI();
  }
  function rangeSelect(cellId) {
    var info = getCategoryListAndIndex(cellId);
    var idx = info.index;
    var cat = info.category;
    var list = info.list;
    if (idx < 0 || !list.length) return;
    var from = idx;
    var to = idx;
    if (lastClickedIndex >= 0 && lastClickedCategory === cat) {
      from = Math.min(lastClickedIndex, idx);
      to = Math.max(lastClickedIndex, idx);
    }
    for (var i = from; i <= to; i++) {
      var id = list[i] && list[i].getAttribute('data-cell-id');
      if (id) selectedCellIds.add(id);
    }
    lastClickedIndex = idx;
    lastClickedCategory = cat;
    updateSelectionUI();
  }
  function updateSelectionUI() {
    document.querySelectorAll('.cell-image-container').forEach(function (el) {
      var id = el.getAttribute('data-cell-id');
      if (selectedCellIds.has(id)) el.classList.add('ring-2', 'ring-primary'); else el.classList.remove('ring-2', 'ring-primary');
    });
  }

  var CELL_IMAGE_BASE_REM = 4.5; // 100% 時每格約 4.5rem，隨 html 字級一併縮放

  function getRootFontSizePx() {
    var px = parseFloat(window.getComputedStyle(document.documentElement).fontSize);
    return isNaN(px) || px <= 0 ? 16 : px;
  }

  function getCellSizePx() {
    return CELL_IMAGE_BASE_REM * (zoomLevel / 100) * getRootFontSizePx();
  }

  function getGridGapPx(gridEl) {
    if (!gridEl) return 8;
    var gap = window.getComputedStyle(gridEl).columnGap || window.getComputedStyle(gridEl).gap;
    var n = parseFloat(gap);
    return isNaN(n) || n < 0 ? 8 : n;
  }

  function applyZoom() {
    var factor = zoomLevel / 100;
    if (typeof window.syncCellZoomCssVar === 'function') {
      window.syncCellZoomCssVar(zoomLevel);
    } else {
      try {
        document.documentElement.style.setProperty('--cell-zoom-factor', String(factor));
      } catch (e) {}
    }
    var cellPx = getCellSizePx();
    var cellPxStr = cellPx.toFixed(2) + 'px';
    try {
      document.documentElement.style.setProperty('--cell-image-size', cellPxStr);
    } catch (e) {}
    document.querySelectorAll('.cell-grid').forEach(function (g) {
      var width = g.clientWidth;
      if (width <= 0) {
        g.style.gridTemplateColumns = 'repeat(auto-fill, ' + cellPxStr + ')';
        return;
      }
      var gapPx = getGridGapPx(g);
      var cols = Math.max(1, Math.floor((width + gapPx) / (cellPx + gapPx)));
      g.style.gridTemplateColumns = 'repeat(' + cols + ', ' + cellPxStr + ')';
    });
  }

  /** Edge 等瀏覽器在捲軸／字型載入後才穩定版面，需延後重算 */
  function scheduleApplyZoom() {
    applyZoom();
    requestAnimationFrame(function () {
      applyZoom();
      requestAnimationFrame(applyZoom);
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(applyZoom).catch(function () {});
    }
  }

  function disconnectGridResizeObserver() {
    if (gridResizeObserver) {
      gridResizeObserver.disconnect();
      gridResizeObserver = null;
    }
  }

  function setupGridResizeObserver() {
    disconnectGridResizeObserver();
    if (typeof window.ResizeObserver === 'undefined') return;
    var groupsEl = document.getElementById('main-cell-groups');
    if (!groupsEl) return;
    var scrollRoot = groupsEl.parentElement;
    gridResizeObserver = new ResizeObserver(function () {
      applyZoom();
    });
    gridResizeObserver.observe(groupsEl);
    if (scrollRoot) gridResizeObserver.observe(scrollRoot);
  }

  // 依目前細胞區塊的分類結果，計算「人員編輯」用的百分比數據，
  // 供報告核發介面的人員編輯欄位與其他發現欄位使用。
  function computeEditedMetricsFromCells() {
    if (!currentSpecimen || !cellData || !cellData.length) return;
    var total = cellData.length;
    if (total === 0) return;

    // 細胞群組標題 → metrics / otherFindings 對應欄位 key
    var categoryToKey = {
      'Blast': 'blast',
      'Promyelocyte': 'promyelocyte',
      'Myelocyte': 'myelocyte',
      'Metamyelocyte': 'metamyelocyte',
      'Hypersegmented': 'hypersegmented',
      'Promonocyte': 'promonocyte',
      'Plasma Cell': 'plasmaCell',
      'Abnormal Lymphocyte': 'abnormalLymphocyte',
      'Band': 'band',
      'Segmented Neutrophil': 'segmentedNeutrophil',
      'Lymphocyte': 'lymphocyte',
      'Monocyte': 'monocyte',
      'Eosinophil': 'eosinophil',
      'Basophil': 'basophil',
      // 其他發現
      'NRBC': 'nrbc',
      'Giant PLT': 'giantPlt',
      'Megakaryocyte': 'megakaryocyte',
      'Smudge Cell': 'smudgeCell',
      'Artefact': 'artefact'
    };

    var countsByCategory = {};
    cellData.forEach(function (c) {
      if (!countsByCategory[c.category]) countsByCategory[c.category] = 0;
      countsByCategory[c.category]++;
    });

    var edited = {};
    Object.keys(categoryToKey).forEach(function (cat) {
      edited[categoryToKey[cat]] = '-';
    });

    Object.keys(countsByCategory).forEach(function (cat) {
      var key = categoryToKey[cat];
      if (!key) return;
      var count = countsByCategory[cat];
      var pct = total ? (count / total * 100) : 0;
      edited[key] = pct > 0 ? (pct.toFixed(1).replace(/\.0$/, '')) : '-';
    });

    // 將人工編輯結果暫存到目前檢體
    currentSpecimen.editedMetrics = edited;
    // 並存到 localStorage，讓報告核發 iframe 也能讀取到同一筆結果
    try {
      var key = 'editedMetrics:' + currentSpecimen.id;
      window.localStorage.setItem(key, JSON.stringify(edited));
    } catch (e) {
      // 若瀏覽器禁止 localStorage，略過不影響其他功能
    }
    if (typeof persistEditedCellsSnapshot === 'function') {
      persistEditedCellsSnapshot(currentSpecimen.id, cellData);
    }
  }

  function moveSelectedToCategory(category) {
    if (readOnlyMode) return;
    var ids = Array.from(selectedCellIds);
    ids.forEach(function (id) {
      var cell = cellData.find(function (c) { return c.id === id; });
      if (cell) cell.category = category;
    });
    selectedCellIds.clear();
    renderCellGroups();
  }

  var aiLabelToCategory = { 'Segmented': 'Segmented Neutrophil', 'Lym': 'Lymphocyte', 'Mono': 'Monocyte', 'Eo': 'Eosinophil', 'Baso': 'Basophil', 'Band': 'Band', 'Blast': 'Blast', 'Promyelocyte': 'Promyelocyte', 'Myelocyte': 'Myelocyte' };

  function showContextMenu(e, cellId) {
    if (readOnlyMode) {
      e.preventDefault();
      return;
    }
    var menu = document.getElementById('context-menu');
    if (!menu) return;
    var cell = cellData.find(function (c) { return c.id === cellId; });
    var ai = cell && cell.aiSuggestion ? cell.aiSuggestion : null;

    var aiBlock = menu.querySelector('.context-ai-block');
    if (aiBlock) {
      if (ai) {
        aiBlock.style.display = 'block';
        var labelText = (ai.label || '') + (ai.pct != null ? ' ' + ai.pct + '%' : '');
        var labelEl = aiBlock.querySelector('.ai-suggestion-label');
        if (labelEl) labelEl.textContent = labelText;
        var moveBtn = aiBlock.querySelector('.ai-move-btn');
        var targetCat = aiLabelToCategory[ai.label] || ai.label || (cell && cell.category);
        if (moveBtn) {
          moveBtn.textContent = 'Move to ' + (targetCat || ai.label || '');
          moveBtn.onclick = function () { moveSelectedToCategory(targetCat); };
        }
      } else aiBlock.style.display = 'none';
    }

    // 先顯示再量測；先套用視窗高度上限，避免量到未收合的完整內容高度而導致底部超出畫面。
    var w = window.innerWidth;
    var h = window.innerHeight;
    var pad = 8;
    var maxAvailH = Math.max(120, h - 2 * pad);
    menu.style.display = 'flex';
    menu.style.flexDirection = 'column';
    menu.style.visibility = 'hidden';
    menu.style.maxHeight = maxAvailH + 'px';
    menu.style.overflowY = 'auto';
    menu.style.boxSizing = 'border-box';
    void menu.offsetHeight;

    var rect = menu.getBoundingClientRect();
    var mw = rect.width;
    var mh = rect.height;
    var x = e.clientX;
    var y = e.clientY;
    if (x + mw > w - pad) x = w - pad - mw;
    if (y + mh > h - pad) y = h - pad - mh;
    if (x < pad) x = pad;
    if (y < pad) y = pad;

    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.visibility = 'visible';
  }

  function hideContextMenu() {
    var menu = document.getElementById('context-menu');
    if (!menu) return;
    menu.style.display = 'none';
    menu.style.maxHeight = '';
    menu.style.overflowY = '';
    menu.style.boxSizing = '';
  }

  function onSaveReport() {
    if (readOnlyMode) return;
    var saveBtn = document.getElementById('btn-save-report');
    if (saveBtn && saveBtn.disabled) return;
    var total = getTotalCells();
    var unidentified = getUnidentifiedCount();
    var viewed = viewedCellIds.size;
    if (total === 0) {
      var modalEmpty = document.getElementById('modal-save-block');
      if (modalEmpty) {
        modalEmpty.querySelector('.modal-message').textContent = '尚無細胞資料，無法儲存。';
        modalEmpty.classList.remove('hidden');
      }
      return;
    }
    if (unidentified > 0 || viewed < total) {
      var modal = document.getElementById('modal-save-block');
      if (modal) {
        var parts = [];
        if (viewed < total) parts.push('尚有 ' + (total - viewed) + ' 張細胞未檢視（請於主內容區捲動，使所有細胞曾進入視野）。');
        if (unidentified > 0) parts.push('尚有 Unidentified 未分類細胞（' + unidentified + '）。');
        modal.querySelector('.modal-message').textContent = parts.join(' ');
        modal.classList.remove('hidden');
      }
      return;
    }
    // 儲存並開啟報告核發前，先依目前細胞分類結果更新「人員編輯」數據
    computeEditedMetricsFromCells();

    var modalEl = document.getElementById('report-issue-modal');
    var iframeEl = document.getElementById('report-issue-iframe');
    if (modalEl && iframeEl) {
      var base = (typeof window.getBasePath === 'function') ? window.getBasePath() : '';
      var url = base + '報告核發.html';
      if (currentSpecimenId) url += '?specimen=' + encodeURIComponent(currentSpecimenId);
      iframeEl.src = url;
      modalEl.classList.remove('hidden');
    }
  }

  window.imageReviewToggleGrid = function (headerEl) {
    var card = headerEl.closest('.section-card');
    if (!card) return;
    var content = card.querySelector('.grid-content');
    var icon = card.querySelector('.toggle-icon');
    if (content.classList.contains('grid-expanded')) {
      content.classList.remove('grid-expanded');
      content.classList.add('grid-collapsed');
      if (icon) icon.classList.remove('icon-rotate-180');
    } else {
      content.classList.remove('grid-collapsed');
      content.classList.add('grid-expanded');
      if (icon) icon.classList.add('icon-rotate-180');
    }
  };

  function init() {
    if (typeof window.initAppFontLevel === 'function') window.initAppFontLevel();
    if (typeof window.initCellImageZoomLevel === 'function') zoomLevel = window.initCellImageZoomLevel();

    try {
      currentSpecimenId = (typeof window.getSpecimenIdFromUrl === 'function') ? window.getSpecimenIdFromUrl() : '';
    } catch (e) { currentSpecimenId = ''; }
    if (!currentSpecimenId && typeof APP_DATABASE !== 'undefined' && APP_DATABASE.specimens && APP_DATABASE.specimens.length > 0) {
      currentSpecimenId = APP_DATABASE.specimens[0].id;
    }
    if (!currentSpecimenId) currentSpecimenId = 'H5080720647';

    currentSpecimen = getSpecimenById(currentSpecimenId);
    if (!currentSpecimen && typeof window.getSpecimenById === 'function') currentSpecimen = window.getSpecimenById(currentSpecimenId);
    if (!currentSpecimen && typeof APP_DATABASE !== 'undefined' && APP_DATABASE.specimens && APP_DATABASE.specimens.length > 0) {
      currentSpecimen = APP_DATABASE.specimens.find(function (s) { return s.id === currentSpecimenId; }) || APP_DATABASE.specimens[0];
    }

    readOnlyMode = computeReadOnlyMode(currentSpecimen);

    digitalReviewList = getDigitalReviewList();
    viewedCellIds.clear();
    disconnectCellViewObserver();
    disconnectGridResizeObserver();
    cellData = getOrCreateCellData(currentSpecimenId);

    renderSidebar();
    renderCellGroups();
    setupGridResizeObserver();
    applyReadOnlyChrome();

    var ctxMenu = document.getElementById('context-menu');
    document.addEventListener('click', function (e) {
      if (ctxMenu && !ctxMenu.contains(e.target)) hideContextMenu();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideContextMenu(); });

    document.addEventListener('mousedown', function (e) {
      if (e.button === 2) {
        // 進入單手模式，不清除既有選取，讓 Shift / Ctrl 多選後仍可直接用右鍵開單一選單
        rightMouseHeld = true;
        oneHandLmbCount = 0;
      }
    });
    document.addEventListener('mouseup', function (e) {
      if (e.button === 2) {
        rightMouseHeld = false;
        oneHandLmbCount = 0;
      }
    });

    var saveBtn = document.getElementById('btn-save-report');
    if (saveBtn) saveBtn.addEventListener('click', onSaveReport);

    var zoomEl = document.getElementById('zoom-value');
    var zoomIn = document.getElementById('zoom-in');
    var zoomOut = document.getElementById('zoom-out');
    function updateZoom(delta) {
      if (typeof window.adjustCellImageZoomLevel === 'function') {
        zoomLevel = window.adjustCellImageZoomLevel(delta);
      } else {
        zoomLevel = Math.min(200, Math.max(50, zoomLevel + delta));
      }
      if (zoomEl) zoomEl.textContent = zoomLevel + '%';
      scheduleApplyZoom();
    }
    if (zoomEl) zoomEl.textContent = zoomLevel + '%';
    if (zoomIn) zoomIn.addEventListener('click', function () { updateZoom(10); });
    if (zoomOut) zoomOut.addEventListener('click', function () { updateZoom(-10); });

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(scheduleApplyZoom, 100);
    });

    var fontSmaller = document.getElementById('font-smaller');
    var fontLarger = document.getElementById('font-larger');
    if (fontSmaller && typeof window.adjustAppFontLevel === 'function') {
      fontSmaller.addEventListener('click', function () {
        window.adjustAppFontLevel(-1);
        scheduleApplyZoom();
      });
    }
    if (fontLarger && typeof window.adjustAppFontLevel === 'function') {
      fontLarger.addEventListener('click', function () {
        window.adjustAppFontLevel(1);
        scheduleApplyZoom();
      });
    }

    var reportClose = document.getElementById('report-issue-close');
    var reportModal = document.getElementById('report-issue-modal');
    if (reportClose && reportModal) {
      reportClose.addEventListener('click', function () {
        reportModal.classList.add('hidden');
      });
      reportModal.addEventListener('click', function (e) {
        if (e.target === reportModal) reportModal.classList.add('hidden');
      });
    }

    var contextMenu = document.getElementById('context-menu');
    if (contextMenu) {
      contextMenu.querySelectorAll('.menu-item, .menu-item-danger').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var cat = btn.getAttribute('data-category') || btn.textContent.trim();
          moveSelectedToCategory(cat);
          hideContextMenu();
        });
      });
    }

    var modalClose = document.getElementById('modal-save-block-close');
    if (modalClose) modalClose.addEventListener('click', function () { document.getElementById('modal-save-block').classList.add('hidden'); });

    // 從報告核發 iframe 接收簽核完成事件
    window.addEventListener('message', function (e) {
      var data = e.data || {};
      if (!data) return;
      if (data.type === 'reportCancel') {
        var cancelModal = document.getElementById('report-issue-modal');
        if (cancelModal) cancelModal.classList.add('hidden');
        return;
      }
      if (data.type === 'reportManualAlert') {
        var manualAlertId = data.specimenId || currentSpecimenId;
        if (manualAlertId && cellData && cellData.length && typeof persistEditedCellsSnapshot === 'function') {
          persistEditedCellsSnapshot(manualAlertId, cellData);
        }
        if (typeof applySpecimenStatusOverridesFromStorage === 'function') {
          applySpecimenStatusOverridesFromStorage();
        }
        if (manualAlertId && currentSpecimen && currentSpecimen.id === manualAlertId) {
          var refreshed = typeof getSpecimenById === 'function' ? getSpecimenById(manualAlertId) : null;
          if (refreshed) currentSpecimen = refreshed;
          digitalReviewList = getDigitalReviewList();
          renderSidebar();
        }
        var manualModal = document.getElementById('report-issue-modal');
        if (manualModal) manualModal.classList.add('hidden');
        if (typeof queueManualAlertToast === 'function') {
          queueManualAlertToast(manualAlertId, data.addedFollowUp !== false);
        }
        if (typeof goToSpecimenList === 'function') {
          goToSpecimenList({ preferMode: 'digital' });
        } else if (typeof window.goToSpecimenList === 'function') {
          window.goToSpecimenList({ preferMode: 'digital' });
        }
        return;
      }
      if (data.type === 'reportFollowUpDone') {
        var followId = data.specimenId || currentSpecimenId;
        if (!followId) return;
        if (typeof markFollowUpReviewDone === 'function') {
          markFollowUpReviewDone(followId);
        } else if (currentSpecimen && currentSpecimen.id === followId) {
          syncEntityWorkflowAfterCapsuleToggle('Follow-up', true);
        }
        if (typeof queueFollowUpDoneToast === 'function') queueFollowUpDoneToast(followId);
        var followUpModal = document.getElementById('report-issue-modal');
        if (followUpModal) followUpModal.classList.add('hidden');
        if (typeof goToSpecimenList === 'function') {
          goToSpecimenList();
        } else if (typeof window.goToSpecimenList === 'function') {
          window.goToSpecimenList();
        }
        return;
      }
      if (data.type !== 'reportVerified') return;
      var id = data.specimenId || currentSpecimenId;
      if (!id || typeof APP_DATABASE === 'undefined' || !APP_DATABASE.specimens) return;
      var spec = APP_DATABASE.specimens.find(function (s) { return s.id === id; });
      if (!spec) return;
      if (!Array.isArray(spec.status)) spec.status = [];
      if (typeof buildWorkflowDoneOnReportVerified === 'function') {
        var verifiedBuilt = buildWorkflowDoneOnReportVerified(spec, {
          confirmAiOnVerify: !!data.confirmAiOnVerify,
          forceUnlockSignOff: !!data.forceUnlockSignOff
        });
        spec.status = verifiedBuilt.status;
        spec.workflowDone = verifiedBuilt.workflowDone;
      } else {
        if (!spec.workflowDone || typeof spec.workflowDone !== 'object') spec.workflowDone = {};
        spec.workflowDone.digitalReview = true;
        spec.workflowDone.digitalReviewSignedOff = true;
        if (typeof spec.workflowDone.entityReview !== 'boolean') {
          spec.workflowDone.entityReview = (typeof hasAnyEntityReviewTask === 'function') ? !hasAnyEntityReviewTask(spec) : false;
        }
        if (Array.isArray(spec.status)) {
          spec.status = spec.status.filter(function (x) { return x !== 'Verified'; });
        }
      }
      spec.statusDone = typeof computeSpecimenStatusDoneFromWorkflow === 'function'
        ? computeSpecimenStatusDoneFromWorkflow(spec.status, spec.workflowDone)
        : !!(spec.workflowDone.digitalReview && spec.workflowDone.entityReview);
      var editorAccount = typeof getCurrentUserAccount === 'function' ? getCurrentUserAccount() : '';
      if (!spec.statusDone) spec.editor = '';
      else if (editorAccount) spec.editor = editorAccount;
      if (typeof window.persistSpecimenStatusOverride === 'function') {
        window.persistSpecimenStatusOverride(id, spec.status, { workflowDone: spec.workflowDone, editor: spec.statusDone ? editorAccount : '' });
      }
      if (spec.statusDone && typeof queueReportVerifiedToast === 'function') {
        queueReportVerifiedToast(id);
      }
      notifyReportIframeToRefresh();
      if (currentSpecimen && currentSpecimen.id === id) {
        currentSpecimen.status = spec.status.slice();
        currentSpecimen.workflowDone = spec.workflowDone;
        currentSpecimen.statusDone = spec.statusDone;
        if (!currentSpecimen.statusDone) currentSpecimen.editor = '';
        else if (editorAccount) currentSpecimen.editor = editorAccount;
        digitalReviewList = getDigitalReviewList();
        renderSidebar();
      }
      var reportModal = document.getElementById('report-issue-modal');
      if (reportModal) reportModal.classList.add('hidden');
      if (data.navigateNextDigitalReview) {
        var nextPending = getNextPendingDigitalSpecimenAfter(id);
        if (nextPending && nextPending.id) {
          goToSpecimen(nextPending.id);
          return;
        }
      }
      if (typeof window.goToSpecimenList === 'function') {
        window.goToSpecimenList({ preferMode: 'digital' });
      }
    });
  }

  var initTries = 0;
  function runInit() {
    if (!document.getElementById('main-cell-groups')) {
      if (initTries < 20) { initTries++; setTimeout(runInit, 30); }
      return;
    }
    init();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runInit);
  } else {
    runInit();
  }
})();
