/**
 * 舊版影像檢視與細胞編輯 — CellaVision 風格
 */
(function () {
  'use strict';

  var CELL_PLACEHOLDER_SVG = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><radialGradient id="g" cx="40%" cy="40%" r="50%"><stop offset="0%" stop-color="#e8e4f0"/><stop offset="70%" stop-color="#c4bed4"/><stop offset="100%" stop-color="#9a92a8"/></radialGradient></defs><ellipse cx="60" cy="60" rx="48" ry="52" fill="url(#g)" stroke="#8a8299" stroke-width="1.5"/></svg>'
  );

  var METRIC_TO_CATEGORY = [
    { key: 'blast', name: 'Blast' },
    { key: 'promyelocyte', name: 'Promyelocyte' },
    { key: 'myelocyte', name: 'Myelocyte' },
    { key: 'metamyelocyte', name: 'Metamyelocyte' },
    { key: 'hypersegmented', name: 'Hypersegmented' },
    { key: 'promonocyte', name: 'Promonocyte' },
    { key: 'plasmaCell', name: 'Plasma Cell' },
    { key: 'atypicalLymphocyte', name: 'Abnormal Lymphocyte' },
    { key: 'band', name: 'Band' },
    { key: 'segmentedNeutrophil', name: 'Segmented Neutrophil' },
    { key: 'lymphocyte', name: 'Lymphocyte' },
    { key: 'monocyte', name: 'Monocyte' },
    { key: 'eosinophil', name: 'Eosinophil' },
    { key: 'basophil', name: 'Basophil' }
  ];

  /**
   * 舊版細胞影像區塊排序（對應右鍵分類選單／CellaVision 順序）
   */
  var LEGACY_CATEGORY_ORDER = [
    'Smudge Cell',
    'Unidentified',
    'Band',
    'Segmented Neutrophil',
    'Eosinophil',
    'Basophil',
    'Lymphocyte',
    'Monocyte',
    'Promyelocyte',
    'Myelocyte',
    'Metamyelocyte',
    'Promonocyte',
    'Blast',
    'Atypical Lymphocyte',
    'Abnormal Lymphocyte',
    'Plasma Cell',
    'Other',
    'Hypersegmented',
    'Abnormal Lymphoid Cell',
    'Plasmacytoid',
    'Abnormal Mononuclear Cell',
    'NRBC',
    'Giant PLT',
    'PLT Aggregation',
    'Megakaryocyte',
    'Artefact',
    'Not classed'
  ];

  /** 右鍵選單：三組，組間分隔線 */
  var CTX_MENU_GROUPS = [
    [
      'Smudge cell', 'Unidentified', 'Band neutrophil', 'Segmented neutrophil',
      'Eosinophil', 'Basophil', 'Lymphocyte', 'Monocyte'
    ],
    [
      'Promyelocyte', 'Myelocyte', 'Metamyelocyte', 'Promonocyte',
      'Blast (no lineage spec)', '*Atypical Lympho', 'Plasma cell', 'Other',
      'Hypersegmented', 'Abnormal Lymphoid Cell', 'Plasmacytoid', 'Abnormal Mononuclear Cell'
    ],
    [
      '*NRBC', '*Giant PLT', '*PLT Aggregation', 'Megakaryocyte',
      'Smudge cell', 'Artefact', 'Not classed'
    ]
  ];

  var CTX_TO_CATEGORY = {
    'Smudge cell': 'Smudge Cell',
    'Unidentified': 'Unidentified',
    'Band neutrophil': 'Band',
    'Segmented neutrophil': 'Segmented Neutrophil',
    'Eosinophil': 'Eosinophil',
    'Basophil': 'Basophil',
    'Lymphocyte': 'Lymphocyte',
    'Monocyte': 'Monocyte',
    'Promyelocyte': 'Promyelocyte',
    'Myelocyte': 'Myelocyte',
    'Metamyelocyte': 'Metamyelocyte',
    'Promonocyte': 'Promonocyte',
    'Blast (no lineage spec)': 'Blast',
    'Blast': 'Blast',
    '*Atypical Lympho': 'Abnormal Lymphocyte',
    'Atypical Lympho': 'Abnormal Lymphocyte',
    'Plasma cell': 'Plasma Cell',
    'Other': 'Other',
    'Hypersegmented': 'Hypersegmented',
    'Abnormal Lymphoid Cell': 'Abnormal Lymphocyte',
    'Plasmacytoid': 'Plasmacytoid',
    'Abnormal Mononuclear Cell': 'Abnormal Mononuclear Cell',
    '*NRBC': 'NRBC',
    'NRBC': 'NRBC',
    '*Giant PLT': 'Giant PLT',
    'Giant PLT': 'Giant PLT',
    '*PLT Aggregation': 'PLT Aggregation',
    'PLT Aggregation': 'PLT Aggregation',
    'Megakaryocyte': 'Megakaryocyte',
    'Artefact': 'Artefact',
    'Not classed': 'Not classed'
  };

  /** 簽核畫面：白血球分類列 */
  var SIGNOFF_WBC_ROWS = [
    { label: 'Unidentified', category: 'Unidentified' },
    { label: 'Band neutrophil', category: 'Band' },
    { label: 'Segmented neutrophil', category: 'Segmented Neutrophil' },
    { label: 'Eosinophil', category: 'Eosinophil' },
    { label: 'Basophil', category: 'Basophil' },
    { label: 'Lymphocyte', category: 'Lymphocyte' },
    { label: 'Monocyte', category: 'Monocyte' },
    { label: 'Promyelocyte', category: 'Promyelocyte' },
    { label: 'Myelocyte', category: 'Myelocyte' },
    { label: 'Metamyelocyte', category: 'Metamyelocyte' },
    { label: 'Promonocyte', category: 'Promonocyte' },
    { label: 'Blast (no lineage spec)', category: 'Blast' },
    { label: '*Atypical Lympho', category: 'Abnormal Lymphocyte' },
    { label: '*Plasma cell', category: 'Plasma Cell' },
    { label: 'Other', category: 'Other' },
    { label: 'Hypersegmented', category: 'Hypersegmented' },
    { label: 'Abnormal Lymphoid Cell', category: 'Abnormal Lymphoid Cell' },
    { label: 'Plasmacytoid', category: 'Plasmacytoid' },
    { label: 'Abnormal Mononuclear Cell', category: 'Abnormal Mononuclear Cell' }
  ];

  /** 簽核畫面：非白血球 */
  var SIGNOFF_NON_WBC_ROWS = [
    { label: '*NRBC', category: 'NRBC' },
    { label: '*Giant PLT', category: 'Giant PLT' },
    { label: '*PLT Aggregation', category: 'PLT Aggregation' },
    { label: 'Megakaryocyte', category: 'Megakaryocyte' },
    { label: 'Smudge cell', category: 'Smudge Cell' },
    { label: 'Artefact', category: 'Artefact' }
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
    'Atypical Lymphocyte': 'atypicalLymphocyte',
    'Band': 'band',
    'Segmented Neutrophil': 'segmentedNeutrophil',
    'Lymphocyte': 'lymphocyte',
    'Monocyte': 'monocyte',
    'Eosinophil': 'eosinophil',
    'Basophil': 'basophil',
    'NRBC': 'nrbc',
    'Giant PLT': 'giantPlt',
    'Megakaryocyte': 'megakaryocyte',
    'Smudge Cell': 'smudgeCell',
    'Artefact': 'artefact'
  };

  var LEGACY_SIGNOFF_DEFAULT_PASSWORD = '12345678';
  var currentSpecimenId = '';
  var currentSpecimen = null;
  var worklistSelectedId = '';
  var cellData = [];
  var selectedCellIds = new Set();
  var lastClickedIndex = -1;
  var lastClickedCategory = '';
  var readOnlyMode = false;
  var cellCounter = 0;
  var reviewTab = 'wbc';
  var cellGridResizeObserver = null;
  var CELL_GRID_GAP = 4;
  var CELL_GRID_MIN_TILE = 132;
  var DISMISSED_WORKLIST_KEY = 'blood-morphology-legacy-worklist-dismissed';

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

  /** 工作清單：所有未完成檢體（與檢體管理相同邏輯） */
  function getPendingWorklistSpecimens() {
    var dismissed = getDismissedWorklistIds();
    return getBaseSpecimens()
      .filter(function (s) { return !isWorkflowCompleted(s) && !dismissed[s.id]; })
      .sort(function (a, b) {
        var ta = (a.analysisTime || '').replace(/[-:\s]/g, '');
        var tb = (b.analysisTime || '').replace(/[-:\s]/g, '');
        return tb.localeCompare(ta);
      });
  }

  function getAssetRoot() {
    if (typeof LegacyUi !== 'undefined' && LegacyUi.getProjectRootFromHere) {
      return LegacyUi.getProjectRootFromHere();
    }
    var base = (typeof getBasePath === 'function') ? getBasePath() : '';
    if (/\/legacy\/?$/i.test(base)) return '../';
    return base;
  }

  function normalizeCellImageUrl(url) {
    if (!url) return CELL_PLACEHOLDER_SVG;
    if (/^(data:|https?:|\/\/)/i.test(url)) return url;
    if (url.indexOf('../') === 0 || url.indexOf('/') === 0) return url;
    return getAssetRoot() + url;
  }

  function normalizeCellList(cells) {
    if (!Array.isArray(cells)) return [];
    return cells.map(function (cell) {
      var copy = Object.assign({}, cell);
      copy.imageUrl = normalizeCellImageUrl(cell.imageUrl);
      return copy;
    });
  }

  function resolveCellImageUrl(category, indexInCategory) {
    var samples = window.CELL_SAMPLE_IMAGES || null;
    if (!samples) return CELL_PLACEHOLDER_SVG;
    var pool = samples[category];
    if ((!pool || !pool.length) && category === 'Abnormal Lymphocyte' && samples['Atypical Lymphocyte']) {
      pool = samples['Atypical Lymphocyte'];
    }
    if (!pool || !pool.length) return CELL_PLACEHOLDER_SVG;
    var rel = pool[(indexInCategory || 0) % pool.length];
    return getAssetRoot() + rel;
  }

  function metricValueToCount(val) {
    if (val === undefined || val === null || String(val).trim() === '' || val === '-') return 0;
    var n = parseFloat(String(val).replace(',', '.'), 10);
    return isNaN(n) || n <= 0 ? 0 : Math.round(n);
  }

  function getOrCreateCellData(specimenId) {
    if (typeof loadEditedCellsSnapshot === 'function') {
      var snapshot = loadEditedCellsSnapshot(specimenId);
      if (snapshot && snapshot.length > 0) return normalizeCellList(snapshot);
    }
    var existing = window.CELLS_BY_SPECIMEN && window.CELLS_BY_SPECIMEN[specimenId];
    if (existing && Array.isArray(existing) && existing.length > 0) {
      return normalizeCellList(existing);
    }

    var specimen = currentSpecimen;
    if (specimen && specimen.metrics) {
      var m = specimen.metrics;
      var byCategory = {};
      METRIC_TO_CATEGORY.forEach(function (item) {
        if (!byCategory[item.name]) byCategory[item.name] = 0;
        byCategory[item.name] += metricValueToCount(m[item.key]);
      });
      var list = [];
      var id = 0;
      Object.keys(byCategory).forEach(function (catName) {
        var count = byCategory[catName];
        for (var i = 0; i < count; i++) {
          list.push({
            id: 'cell-' + (++id),
            category: catName,
            imageUrl: resolveCellImageUrl(catName, i),
            reviewed: true
          });
        }
      });
      if (list.length > 0) return list;
    }

    var fallback = [
      { name: 'Segmented Neutrophil', count: 84 },
      { name: 'Lymphocyte', count: 1 },
      { name: 'Monocyte', count: 10 }
    ];
    var list2 = [];
    var id2 = 0;
    fallback.forEach(function (cat) {
      for (var j = 0; j < cat.count; j++) {
        list2.push({
          id: 'cell-' + (++id2),
          category: cat.name,
          imageUrl: resolveCellImageUrl(cat.name, j),
          reviewed: true
        });
      }
    });
    return list2;
  }

  function infoRow(label, value) {
    return '<div class="legacy-info-row"><div class="legacy-info-label">' + label + '</div>' +
      '<div class="legacy-info-value">' + (value || '-') + '</div></div>';
  }

  function infoLine(label, value) {
    return '<div class="legacy-info-line">' + label + ' ' + (value || '-') + '</div>';
  }

  function formatPatientInfo(spec) {
    if (!spec) return '';
    var m = spec.metrics || {};
    var c = spec.cbc || {};
    var html = '<div class="legacy-info-section">患者資料</div>';
    html += infoRow('檢體單 ID:', spec.id);
    html += infoRow('姓名:', spec.name);
    html += infoRow('出生日期:', spec.birthDate);
    html += infoRow('性別:', spec.gender);
    html += infoRow('採檢日期:', spec.analysisTime);
    html += '<div class="legacy-info-section">血球</div>';
    html += infoLine('WBC:', m.wbc || c.wbc);
    html += infoLine('RBC:', c.rbc);
    html += infoLine('Hb:', c.hb);
    html += infoLine('Hct:', c.hct);
    html += infoLine('MCV:', c.mcv);
    html += infoLine('MCH:', c.mch);
    html += infoLine('MCHC:', c.mchc);
    html += infoLine('PLT:', m.plt || c.plt);
    html += '<div class="legacy-info-section">分類計數</div>';
    html += infoLine('Seg:', (m.segmentedNeutrophil || m.neut || '-') + '%');
    html += infoLine('Band:', (m.band || '-') + '%');
    html += infoLine('Lymph:', (m.lymphocyte || m.lymph || '-') + '%');
    html += infoLine('Mono:', (m.monocyte || m.mono || '-') + '%');
    html += infoLine('Eo:', (m.eosinophil || m.eo || '-') + '%');
    html += infoLine('Baso:', (m.basophil || m.baso || '-') + '%');
    return html;
  }

  function selectWorklistRow(id) {
    worklistSelectedId = id || '';
    document.querySelectorAll('#legacy-review-worklist-tbody tr').forEach(function (tr) {
      tr.classList.toggle('selected', tr.dataset.specimenId === worklistSelectedId);
    });
  }

  function renderWorklist() {
    var tbody = document.getElementById('legacy-review-worklist-tbody');
    if (!tbody) return;
    var pending = getPendingWorklistSpecimens();
    tbody.innerHTML = '';
    pending.forEach(function (s) {
      var tr = document.createElement('tr');
      tr.dataset.specimenId = s.id;
      if (s.id === worklistSelectedId || (!worklistSelectedId && s.id === currentSpecimenId)) {
        tr.classList.add('selected');
      }
      tr.innerHTML = '<td title="' + s.id + '">' + s.id + '</td>';
      tr.addEventListener('click', function () { selectWorklistRow(s.id); });
      tr.addEventListener('dblclick', function () { navigateToSpecimen(s.id); });
      tbody.appendChild(tr);
    });
    if (!worklistSelectedId && currentSpecimenId) {
      var stillVisible = pending.some(function (s) { return s.id === currentSpecimenId; });
      if (stillVisible) worklistSelectedId = currentSpecimenId;
    }
  }

  function setReviewTab(tab, skipDialog) {
    reviewTab = tab === 'slide' ? 'slide' : 'wbc';
    document.querySelectorAll('.legacy-review-tab').forEach(function (btn) {
      var active = btn.dataset.tab === reviewTab;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    var wbcPanel = document.getElementById('legacy-review-panel-wbc');
    var slidePanel = document.getElementById('legacy-review-panel-slide');
    if (wbcPanel) wbcPanel.classList.toggle('hidden', reviewTab !== 'wbc');
    if (slidePanel) slidePanel.classList.toggle('hidden', reviewTab !== 'slide');
    if (reviewTab === 'slide') {
      if (skipDialog) {
        renderSignoffView();
      } else {
        enterSignoffView();
      }
    } else {
      closeSignoffDialog();
    }
  }

  function computeEditedMetricsFromCells() {
    if (!currentSpecimen || !cellData || !cellData.length) return;
    var total = cellData.length;
    if (!total) return;
    var countsByCategory = {};
    cellData.forEach(function (c) {
      if (!countsByCategory[c.category]) countsByCategory[c.category] = 0;
      countsByCategory[c.category]++;
    });
    var edited = {};
    Object.keys(CATEGORY_TO_METRIC_KEY).forEach(function (cat) {
      edited[CATEGORY_TO_METRIC_KEY[cat]] = '-';
    });
    Object.keys(countsByCategory).forEach(function (cat) {
      var key = CATEGORY_TO_METRIC_KEY[cat];
      if (!key) return;
      var count = countsByCategory[cat];
      var pct = total ? (count / total * 100) : 0;
      edited[key] = pct > 0 ? (pct.toFixed(1).replace(/\.0$/, '')) : '-';
    });
    currentSpecimen.editedMetrics = edited;
    try {
      localStorage.setItem('editedMetrics:' + currentSpecimen.id, JSON.stringify(edited));
    } catch (e) {}
    persistCells();
  }

  function getCellCountsByCategory() {
    var map = {};
    cellData.forEach(function (c) {
      if (!map[c.category]) map[c.category] = { count: 0, reviewed: 0 };
      map[c.category].count++;
      if (c.reviewed !== false) map[c.category].reviewed++;
    });
    return map;
  }

  function getWbcAbsolute() {
    if (!currentSpecimen) return NaN;
    var m = currentSpecimen.metrics || {};
    var c = currentSpecimen.cbc || {};
    var raw = m.wbc || c.wbc;
    if (raw === undefined || raw === null || raw === '' || raw === '-') return NaN;
    return parseFloat(String(raw).replace(',', '.'));
  }

  function sumWbcCounts(counts) {
    var total = 0;
    SIGNOFF_WBC_ROWS.forEach(function (row) {
      var info = counts[row.category];
      if (info) total += info.count;
    });
    return total;
  }

  function formatPct(count, total) {
    if (!total || !count) return '';
    return (count / total * 100).toFixed(1).replace(/\.0$/, '');
  }

  function buildSignoffBarHtml(pct, reviewed, count) {
    if (!count || pct <= 0) {
      return '<div class="legacy-signoff-bar"></div>';
    }
    var barW = Math.min(100, Math.max(0, pct));
    var reviewedRatio = Math.min(1, Math.max(0, reviewed / count));
    var blueW = barW * reviewedRatio;
    var greenW = barW - blueW;
    return '<div class="legacy-signoff-bar">' +
      (blueW > 0 ? '<div class="legacy-signoff-bar-blue" style="width:' + blueW + '%"></div>' : '') +
      (greenW > 0 ? '<div class="legacy-signoff-bar-green" style="width:' + greenW + '%"></div>' : '') +
      '</div>';
  }

  function buildSignoffWbcRowHtml(label, category, counts, wbcTotal, wbcAbs) {
    var info = counts[category] || { count: 0, reviewed: 0 };
    var count = info.count;
    var pct = wbcTotal ? (count / wbcTotal * 100) : 0;
    var pctStr = count ? formatPct(count, wbcTotal) : '';
    var conc = '';
    if (count && !isNaN(wbcAbs) && wbcAbs > 0) {
      conc = (wbcAbs * pct / 100).toFixed(1);
    }
    var check = count && info.reviewed >= count ? '✓' : '';
    return '<tr>' +
      '<td class="col-name">' + label + '</td>' +
      '<td class="num col-count">' + (count || '') + '</td>' +
      '<td class="num col-pct">' + pctStr + '</td>' +
      '<td class="num col-conc">' + conc + '</td>' +
      '<td class="col-bar">' + buildSignoffBarHtml(pct, info.reviewed, count) + '</td>' +
      '<td class="col-check legacy-signoff-check">' + check + '</td>' +
      '</tr>';
  }

  function buildSignoffNonWbcRowHtml(label, category, counts, allTotal) {
    var info = counts[category] || { count: 0, reviewed: 0 };
    var count = info.count;
    var pctStr = count ? formatPct(count, allTotal) : '';
    return '<tr>' +
      '<td class="col-name">' + label + '</td>' +
      '<td class="num col-count">' + (count || '') + '</td>' +
      '<td class="num col-pct">' + pctStr + '</td>' +
      '</tr>';
  }

  function renderSignoffView() {
    var root = document.getElementById('legacy-signoff-view');
    if (!root) return;
    computeEditedMetricsFromCells();
    var counts = getCellCountsByCategory();
    var allTotal = cellData.length;
    var wbcTotal = sumWbcCounts(counts);
    var wbcAbs = getWbcAbsolute();
    var wbcRows = '';
    SIGNOFF_WBC_ROWS.forEach(function (row) {
      wbcRows += buildSignoffWbcRowHtml(row.label, row.category, counts, wbcTotal, wbcAbs);
    });
    var totalConc = '';
    if (wbcTotal && !isNaN(wbcAbs) && wbcAbs > 0) {
      totalConc = wbcAbs.toFixed(1);
    }
    wbcRows +=
      '<tr class="legacy-signoff-total">' +
      '<td class="col-name">總計</td>' +
      '<td class="num col-count">' + (wbcTotal || '') + '</td>' +
      '<td class="num col-pct">' + (wbcTotal ? '100' : '') + '</td>' +
      '<td class="num col-conc">' + totalConc + '</td>' +
      '<td class="col-bar"></td>' +
      '<td class="col-check"></td>' +
      '</tr>';
    var nonWbcRows = '';
    SIGNOFF_NON_WBC_ROWS.forEach(function (row) {
      nonWbcRows += buildSignoffNonWbcRowHtml(row.label, row.category, counts, allTotal);
    });
    root.innerHTML =
      '<div class="legacy-signoff-layout">' +
      '<div class="legacy-signoff-left">' +
      '<div class="legacy-signoff-panel legacy-signoff-panel-grow">' +
      '<div class="legacy-signoff-panel-title">白血球</div>' +
      '<div class="legacy-signoff-table-scroll">' +
      '<table class="legacy-signoff-table">' +
      '<thead><tr>' +
      '<th class="col-name"></th><th class="num col-count">計數</th><th class="num col-pct">%</th>' +
      '<th class="num col-conc">x10e9/L</th><th class="col-bar"></th><th class="col-check"></th>' +
      '</tr></thead><tbody>' + wbcRows + '</tbody></table></div></div>' +
      '<div class="legacy-signoff-panel">' +
      '<div class="legacy-signoff-panel-title">非白血球</div>' +
      '<div class="legacy-signoff-table-scroll">' +
      '<table class="legacy-signoff-table legacy-signoff-table-nonwbc">' +
      '<thead><tr>' +
      '<th class="col-name"></th><th class="num col-count">計數</th><th class="num col-pct">%</th>' +
      '</tr></thead><tbody>' + nonWbcRows + '</tbody></table></div></div>' +
      '</div>' +
      '<div class="legacy-signoff-center">' +
      '<div class="legacy-signoff-side-panel legacy-signoff-rbc-panel">' +
      '<div class="legacy-signoff-panel-title">紅血球</div>' +
      '<div class="legacy-signoff-side-body">未下單</div></div></div>' +
      '<div class="legacy-signoff-right">' +
      '<div class="legacy-signoff-side-panel">' +
      '<div class="legacy-signoff-panel-title">血小板</div>' +
      '<div class="legacy-signoff-side-body">未下單</div></div>' +
      '<div class="legacy-signoff-remark-panel">' +
      '<div class="legacy-signoff-panel-title">備註</div>' +
      '<textarea id="legacy-signoff-remark" rows="4"></textarea>' +
      '<div class="legacy-signoff-remark-actions">' +
      '<button type="button" class="legacy-btn" id="legacy-signoff-review-btn">審核...</button>' +
      '</div></div></div></div>';
    var reviewBtn = document.getElementById('legacy-signoff-review-btn');
    if (reviewBtn) {
      reviewBtn.addEventListener('click', function () {
        if (!readOnlyMode) openSignoffDialog();
      });
    }
  }

  function openSignoffDialog() {
    var backdrop = document.getElementById('legacy-signoff-dialog-backdrop');
    var user = document.getElementById('legacy-signoff-username');
    var pass = document.getElementById('legacy-signoff-password');
    if (user) {
      var acct = (typeof getCurrentUserAccount === 'function') ? getCurrentUserAccount() : '';
      user.value = acct || user.value || '';
    }
    if (pass) pass.value = LEGACY_SIGNOFF_DEFAULT_PASSWORD;
    if (backdrop) backdrop.classList.add('show');
    if (user) user.focus();
  }

  function closeSignoffDialog() {
    var backdrop = document.getElementById('legacy-signoff-dialog-backdrop');
    if (backdrop) backdrop.classList.remove('show');
  }

  function enterSignoffView() {
    if (readOnlyMode) {
      renderSignoffView();
      return;
    }
    persistCells();
    computeEditedMetricsFromCells();
    renderSignoffView();
    openSignoffDialog();
  }

  function performLegacySignoff() {
    if (readOnlyMode) return;
    var user = document.getElementById('legacy-signoff-username');
    var pass = document.getElementById('legacy-signoff-password');
    if (!user || !String(user.value || '').trim()) {
      window.alert('請輸入使用者名稱。');
      if (user) user.focus();
      return;
    }
    if (!pass || !String(pass.value || '').trim()) {
      window.alert('請輸入密碼。');
      if (pass) pass.focus();
      return;
    }
    computeEditedMetricsFromCells();
    var spec = currentSpecimen;
    if (!spec) return;
    var confirmAi = false;
    if (spec.status && spec.status.indexOf('AI Alert') !== -1) confirmAi = true;
    if (typeof buildWorkflowDoneOnReportVerified === 'function' && typeof persistSpecimenStatusOverride === 'function') {
      var built = buildWorkflowDoneOnReportVerified(spec, { confirmAiOnVerify: confirmAi });
      spec.status = built.status;
      spec.workflowDone = built.workflowDone;
      spec.statusDone = typeof computeSpecimenStatusDoneFromWorkflow === 'function'
        ? computeSpecimenStatusDoneFromWorkflow(spec.status, spec.workflowDone)
        : false;
      var editorAccount = String(user.value || '').trim();
      if (spec.statusDone && editorAccount) spec.editor = editorAccount;
      persistSpecimenStatusOverride(spec.id, spec.status, { workflowDone: spec.workflowDone, editor: spec.editor || '' });
    }
    if (typeof applySpecimenStatusOverridesFromStorage === 'function') applySpecimenStatusOverridesFromStorage();
    closeSignoffDialog();
    if (typeof queueReportVerifiedToast === 'function') queueReportVerifiedToast(spec.id);
    if (typeof goToSpecimenList === 'function') goToSpecimenList({ preferMode: 'digital' });
  }

  function cancelSignoff() {
    closeSignoffDialog();
    setReviewTab('wbc', true);
  }

  function bindSignoffDialog() {
    var ok = document.getElementById('legacy-signoff-ok');
    var cancel = document.getElementById('legacy-signoff-cancel');
    var backdrop = document.getElementById('legacy-signoff-dialog-backdrop');
    if (ok) ok.addEventListener('click', performLegacySignoff);
    if (cancel) cancel.addEventListener('click', cancelSignoff);
    if (backdrop) {
      backdrop.addEventListener('click', function (e) {
        if (e.target === backdrop) cancelSignoff();
      });
    }
  }

  function bindReviewTabs() {
    document.querySelectorAll('.legacy-review-tab').forEach(function (btn) {
      if (!btn.dataset.tab || btn.disabled) return;
      btn.addEventListener('click', function () {
        setReviewTab(btn.dataset.tab);
      });
    });
  }

  function renderSidebar() {
    var info = document.getElementById('legacy-review-patient-info');
    if (info) info.innerHTML = formatPatientInfo(currentSpecimen);
    var sid = document.getElementById('legacy-toolbar-specimen-id');
    var slide = document.getElementById('legacy-toolbar-slide-no');
    if (sid) sid.textContent = currentSpecimenId || '';
    if (slide) slide.textContent = '1';
    renderWorklist();
    if (reviewTab === 'slide') renderSignoffView();
  }

  function openSelectedWorklistItem() {
    var id = worklistSelectedId || currentSpecimenId;
    if (id) navigateToSpecimen(id);
  }

  function removeFromWorklist() {
    var id = worklistSelectedId || currentSpecimenId;
    if (!id) return;
    var dismissed = getDismissedWorklistIds();
    dismissed[id] = true;
    saveDismissedWorklistIds(dismissed);
    if (worklistSelectedId === id) worklistSelectedId = '';
    renderWorklist();
    var fs = document.getElementById('legacy-review-footer-status');
    if (fs) fs.textContent = '已從工作清單移除：' + id;
  }

  function buildTileHtml(cell, num) {
    var sel = selectedCellIds.has(cell.id) ? ' selected' : '';
    var check = cell.reviewed !== false ? '<span class="legacy-cell-check">✓</span>' : '';
    var drag = readOnlyMode ? 'false' : 'true';
    return '<div class="legacy-cell-tile' + sel + '" draggable="' + drag + '" data-cell-id="' + cell.id + '" data-category="' + cell.category + '">' +
      '<span class="legacy-cell-num">' + num + '</span>' + check +
      '<span class="legacy-cell-box"></span>' +
      '<img src="' + normalizeCellImageUrl(cell.imageUrl) + '" alt="" draggable="false"/>' +
      '</div>';
  }

  function fitCellGrid(grid) {
    if (!grid) return;
    var width = grid.clientWidth;
    if (width <= 0) return;
    var gap = CELL_GRID_GAP;
    var minTile = CELL_GRID_MIN_TILE;
    var cols = Math.max(1, Math.floor((width + gap) / (minTile + gap)));
    var tile = Math.floor((width - (cols - 1) * gap) / cols);
    grid.style.setProperty('--legacy-grid-tile-size', tile + 'px');
    grid.style.gridTemplateColumns = 'repeat(' + cols + ', ' + tile + 'px)';
  }

  function fitAllCellGrids() {
    document.querySelectorAll('.legacy-cell-grid').forEach(fitCellGrid);
  }

  function observeCellGrids() {
    if (cellGridResizeObserver) {
      cellGridResizeObserver.disconnect();
      cellGridResizeObserver = null;
    }
    var root = document.getElementById('legacy-review-cell-areas');
    if (!root) return;
    fitAllCellGrids();
    requestAnimationFrame(fitAllCellGrids);
    if (typeof ResizeObserver === 'undefined') {
      if (!window._legacyCellGridResizeBound) {
        window.addEventListener('resize', fitAllCellGrids);
        window._legacyCellGridResizeBound = true;
      }
      return;
    }
    cellGridResizeObserver = new ResizeObserver(function () {
      fitAllCellGrids();
    });
    cellGridResizeObserver.observe(root);
  }

  function buildWellHtml(catName, cells) {
    var html = '<div class="legacy-cell-well" data-category="' + catName + '">';
    html += '<div class="legacy-cell-well-title">' + catName + '</div>';
    html += '<div class="legacy-cell-grid" data-category="' + catName + '">';
    cells.forEach(function (cell) {
      html += buildTileHtml(cell, ++cellCounter);
    });
    html += '</div></div>';
    return html;
  }

  function renderCellGrids() {
    var root = document.getElementById('legacy-review-cell-areas');
    if (!root) return;
    var byCat = {};
    cellData.forEach(function (c) {
      if (!byCat[c.category]) byCat[c.category] = [];
      byCat[c.category].push(c);
    });

    cellCounter = 0;
    var html = '';
    var rendered = {};

    LEGACY_CATEGORY_ORDER.forEach(function (cat) {
      var cells = byCat[cat];
      if (!cells || !cells.length) return;
      rendered[cat] = true;
      html += buildWellHtml(cat, cells);
    });

    Object.keys(byCat).forEach(function (cat) {
      if (rendered[cat]) return;
      var cells = byCat[cat];
      if (cells && cells.length) html += buildWellHtml(cat, cells);
    });

    root.innerHTML = html;
    bindCellEvents();
    observeCellGrids();
  }

  function getCategoryListAndIndex(cellId) {
    var el = document.querySelector('.legacy-cell-tile[data-cell-id="' + cellId + '"]');
    if (!el) return { category: null, index: -1, list: [] };
    var cat = el.getAttribute('data-category') || '';
    var all = Array.prototype.slice.call(document.querySelectorAll('.legacy-cell-tile'));
    var list = all.filter(function (t) { return t.getAttribute('data-category') === cat; });
    var idx = list.findIndex(function (t) { return t.getAttribute('data-cell-id') === cellId; });
    return { category: cat, index: idx, list: list };
  }

  function updateSelectionUI() {
    document.querySelectorAll('.legacy-cell-tile').forEach(function (el) {
      var id = el.getAttribute('data-cell-id');
      el.classList.toggle('selected', selectedCellIds.has(id));
    });
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
    if (selectedCellIds.has(cellId)) selectedCellIds.delete(cellId);
    else selectedCellIds.add(cellId);
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

  function clearDropHover() {
    document.querySelectorAll('.legacy-drop-hover').forEach(function (el) {
      el.classList.remove('legacy-drop-hover');
    });
  }

  function bindCellEvents() {
    document.querySelectorAll('.legacy-cell-tile').forEach(function (el) {
      var cellId = el.getAttribute('data-cell-id');
      el.addEventListener('click', function (e) {
        if (readOnlyMode) return;
        if (e.ctrlKey) { toggleSelect(cellId); return; }
        if (e.shiftKey) { rangeSelect(cellId); return; }
        singleSelect(cellId);
      });
      el.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        if (readOnlyMode) return;
        if (selectedCellIds.size === 0) singleSelect(cellId);
        showContextMenu(e);
      });
      el.addEventListener('dragstart', function (e) {
        if (readOnlyMode) {
          e.preventDefault();
          return;
        }
        if (!selectedCellIds.has(cellId)) {
          selectedCellIds.clear();
          selectedCellIds.add(cellId);
          updateSelectionUI();
        }
        try {
          e.dataTransfer.setData('text/plain', JSON.stringify(Array.from(selectedCellIds)));
        } catch (err) {}
        e.dataTransfer.effectAllowed = 'move';
      });
      el.addEventListener('dragend', clearDropHover);
      el.addEventListener('dragover', function (e) {
        if (readOnlyMode) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
      el.addEventListener('drop', function (e) {
        e.preventDefault();
        clearDropHover();
        if (readOnlyMode) return;
        var cat = el.getAttribute('data-category');
        if (cat) moveSelectedToCategory(cat);
      });
    });

    document.querySelectorAll('.legacy-cell-grid').forEach(function (grid) {
      var cat = grid.getAttribute('data-category');
      if (!cat) return;
      grid.addEventListener('dragover', function (e) {
        if (readOnlyMode) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        grid.classList.add('legacy-drop-hover');
        var well = grid.closest('.legacy-cell-well');
        if (well) well.classList.add('legacy-drop-hover');
      });
      grid.addEventListener('dragleave', function (e) {
        if (e.relatedTarget && grid.contains(e.relatedTarget)) return;
        grid.classList.remove('legacy-drop-hover');
        var well = grid.closest('.legacy-cell-well');
        if (well) well.classList.remove('legacy-drop-hover');
      });
      grid.addEventListener('drop', function (e) {
        e.preventDefault();
        clearDropHover();
        if (readOnlyMode) return;
        moveSelectedToCategory(cat);
      });
    });
  }

  function showContextMenu(e) {
    var menu = document.getElementById('legacy-ctx-menu');
    if (!menu) return;
    menu.classList.add('show');
    menu.style.visibility = 'hidden';
    menu.style.left = '0px';
    menu.style.top = '0px';
    var pad = 8;
    var mw = menu.offsetWidth;
    var mh = menu.offsetHeight;
    var x = e.clientX;
    var y = e.clientY;
    if (x + mw > window.innerWidth - pad) x = window.innerWidth - pad - mw;
    if (y + mh > window.innerHeight - pad) y = window.innerHeight - pad - mh;
    if (x < pad) x = pad;
    if (y < pad) y = pad;
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.visibility = 'visible';
  }

  function hideContextMenu() {
    var menu = document.getElementById('legacy-ctx-menu');
    if (menu) menu.classList.remove('show');
  }

  function moveSelectedToCategory(catName) {
    if (!catName || readOnlyMode) return;
    selectedCellIds.forEach(function (id) {
      var cell = cellData.find(function (c) { return c.id === id; });
      if (cell) {
        cell.category = catName;
        cell.reviewed = true;
      }
    });
    selectedCellIds.clear();
    lastClickedIndex = -1;
    lastClickedCategory = '';
    hideContextMenu();
    renderCellGrids();
  }

  function persistCells() {
    if (currentSpecimenId && typeof persistEditedCellsSnapshot === 'function') {
      persistEditedCellsSnapshot(currentSpecimenId, cellData);
    }
  }

  function openReportModal() {
    persistCells();
    var modal = document.getElementById('legacy-report-modal');
    var iframe = document.getElementById('legacy-report-iframe');
    if (!modal || !iframe) return;
    iframe.src = getAssetRoot() + '報告核發.html?specimen=' + encodeURIComponent(currentSpecimenId);
    modal.classList.add('show');
  }

  function closeReportModal() {
    var modal = document.getElementById('legacy-report-modal');
    var iframe = document.getElementById('legacy-report-iframe');
    if (modal) modal.classList.remove('show');
    if (iframe) iframe.src = 'about:blank';
  }

  function navigateToSpecimen(id) {
    if (!id) return;
    var page = (typeof LegacyUi !== 'undefined') ? LegacyUi.resolvePageUrl('imageReview') : '影像檢視與細胞編輯.html';
    var base = (typeof getBasePath === 'function') ? getBasePath() : '';
    window.location.href = base + page + '?specimen=' + encodeURIComponent(id);
  }

  function goBackToList() {
    if (typeof goToSpecimenList === 'function') goToSpecimenList();
    else window.location.href = '../legacy/檢體管理.html';
  }

  function buildContextMenu() {
    var menu = document.getElementById('legacy-ctx-menu');
    if (!menu) return;
    var parts = [];
    CTX_MENU_GROUPS.forEach(function (group, gi) {
      if (gi > 0) parts.push('<div class="legacy-ctx-sep"></div>');
      group.forEach(function (label) {
        parts.push('<button type="button" data-ctx-label="' + label.replace(/"/g, '&quot;') + '">' + label + '</button>');
      });
    });
    parts.push('<div class="legacy-ctx-sep"></div>');
    parts.push('<button type="button" data-ctx-action="note">新增備註...</button>');
    menu.innerHTML = parts.join('');
    menu.querySelectorAll('button[data-ctx-label]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var label = btn.getAttribute('data-ctx-label');
        var cat = CTX_TO_CATEGORY[label] || label;
        moveSelectedToCategory(cat);
        hideContextMenu();
      });
    });
    menu.querySelectorAll('button[data-ctx-action]').forEach(function (btn) {
      btn.addEventListener('click', hideContextMenu);
    });
  }

  function reloadAfterScenarioApply() {
    if (typeof applySpecimenStatusOverridesFromStorage === 'function') {
      applySpecimenStatusOverridesFromStorage();
    }
    var allowed = [];
    if (typeof UsabilityStudy !== 'undefined' && UsabilityStudy.filterSpecimensForList && typeof MOCK_SPECIMENS !== 'undefined') {
      allowed = UsabilityStudy.filterSpecimensForList(MOCK_SPECIMENS);
    } else if (typeof MOCK_SPECIMENS !== 'undefined') {
      allowed = MOCK_SPECIMENS.slice();
    }
    var stillValid = allowed.some(function (s) { return s.id === currentSpecimenId; });
    var nextSpecimenId = stillValid && currentSpecimenId ? currentSpecimenId : (allowed[0] ? allowed[0].id : '');
    if (!nextSpecimenId) {
      goBackToList();
      return;
    }
    if (nextSpecimenId !== currentSpecimenId) {
      navigateToSpecimen(nextSpecimenId);
      return;
    }
    currentSpecimen = typeof getSpecimenById === 'function' ? getSpecimenById(currentSpecimenId) : null;
    readOnlyMode = currentSpecimen && (
      (typeof isSpecimenLocked === 'function' && isSpecimenLocked(currentSpecimen)) ||
      currentSpecimen.locked ||
      (typeof isDigitalReviewReadOnly === 'function' && isDigitalReviewReadOnly(currentSpecimen)) ||
      (new URLSearchParams(window.location.search).get('readonly') === '1')
    );
    cellData = getOrCreateCellData(currentSpecimenId);
    worklistSelectedId = currentSpecimenId;
    setReviewTab('wbc', true);
    renderSidebar();
    renderCellGrids();
  }

  function initLegacyScenario() {
    if (typeof LegacyScenario === 'undefined') return;
    window.LegacyScenarioOnApplied = function () {
      reloadAfterScenarioApply();
    };
    LegacyScenario.bind();
    LegacyScenario.updateBanner();
    if (typeof UsabilityStudy !== 'undefined' && UsabilityStudy.isActive && UsabilityStudy.isActive()) {
      var fs = document.getElementById('legacy-review-footer-status');
      if (fs) fs.textContent = '情境模擬測試：' + (UsabilityStudy.getActiveScenario() || {}).title;
    }
  }

  function init() {
    if (typeof LegacyUi !== 'undefined' && !LegacyUi.isEnabled()) {
      var q = window.location.search || '';
      window.location.replace('../影像檢視與細胞編輯.html' + q);
      return;
    }

    currentSpecimenId = (typeof getSpecimenIdFromUrl === 'function') ? getSpecimenIdFromUrl() : '';
    if (!currentSpecimenId && typeof MOCK_SPECIMENS !== 'undefined' && MOCK_SPECIMENS.length) {
      currentSpecimenId = MOCK_SPECIMENS[0].id;
    }
    currentSpecimen = typeof getSpecimenById === 'function' ? getSpecimenById(currentSpecimenId) : null;
    readOnlyMode = currentSpecimen && (
      (typeof isSpecimenLocked === 'function' && isSpecimenLocked(currentSpecimen)) ||
      currentSpecimen.locked ||
      (typeof isDigitalReviewReadOnly === 'function' && isDigitalReviewReadOnly(currentSpecimen)) ||
      (new URLSearchParams(window.location.search).get('readonly') === '1')
    );

    cellData = getOrCreateCellData(currentSpecimenId);
    worklistSelectedId = currentSpecimenId;
    initLegacyScenario();
    if (typeof LegacyLis !== 'undefined') LegacyLis.bind();
    buildContextMenu();
    bindReviewTabs();
    bindSignoffDialog();
    setReviewTab('wbc');
    renderSidebar();
    renderCellGrids();

    var btnOpenWl = document.getElementById('legacy-btn-open-worklist');
    if (btnOpenWl) btnOpenWl.addEventListener('click', openSelectedWorklistItem);
    var btnDelWl = document.getElementById('legacy-btn-del-worklist');
    if (btnDelWl) btnDelWl.addEventListener('click', removeFromWorklist);
    var btnBackList = document.getElementById('legacy-tb-back-list');
    if (btnBackList) btnBackList.addEventListener('click', goBackToList);
    document.getElementById('legacy-report-modal-close').addEventListener('click', closeReportModal);

    window.legacyImageReviewSave = function () {
      if (readOnlyMode) return;
      setReviewTab('slide');
    };

    document.addEventListener('click', function (e) {
      if (!e.target.closest('#legacy-ctx-menu')) hideContextMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        hideContextMenu();
        var backdrop = document.getElementById('legacy-signoff-dialog-backdrop');
        if (backdrop && backdrop.classList.contains('show')) cancelSignoff();
      }
    });

    window.addEventListener('message', function (e) {
      var data = e.data || {};
      if (data.type === 'reportVerified' || data.type === 'reportManualAlert' || data.type === 'reportFollowUpDone') {
        closeReportModal();
        if (typeof applySpecimenStatusOverridesFromStorage === 'function') applySpecimenStatusOverridesFromStorage();
        if (data.type === 'reportVerified' && typeof goToSpecimenList === 'function') {
          goToSpecimenList({ preferMode: 'digital' });
        } else if (typeof goToSpecimenList === 'function') {
          goToSpecimenList();
        }
      }
      if (data.type === 'reportCancel') closeReportModal();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
