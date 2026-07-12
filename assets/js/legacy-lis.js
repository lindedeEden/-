/**

 * 虛擬 LIS 查詢視窗 — 舊版／情境模擬

 */

(function () {

  'use strict';



  var selectedId = null;

  var filterText = '';

  var sortDir = null;



  function esc(s) {

    return String(s == null ? '' : s)

      .replace(/&/g, '&amp;')

      .replace(/</g, '&lt;')

      .replace(/>/g, '&gt;')

      .replace(/"/g, '&quot;');

  }



  function getRecords() {

    if (typeof LIS_MOCK_DATA !== 'undefined' && LIS_MOCK_DATA.rebuild) {
      LIS_MOCK_DATA.rebuild();
    }

    if (typeof LIS_MOCK_DATA === 'undefined' || !LIS_MOCK_DATA.records) {
      return [];
    }

    var rows = LIS_MOCK_DATA.records.slice();

    if (typeof UsabilityStudy !== 'undefined' && UsabilityStudy.isActive && UsabilityStudy.isActive()) {
      var sc = UsabilityStudy.getActiveScenario && UsabilityStudy.getActiveScenario();
      if (sc && sc.specimenIds && sc.specimenIds.length) {
        var idSet = {};
        sc.specimenIds.forEach(function (id) { idSet[id] = true; });
        rows = rows.filter(function (r) { return idSet[r.specimenId]; });
      }
    }

    return rows;

  }



  function lastFiveDigits(id) {

    var tail = String(id || '').slice(-5);

    var n = parseInt(tail, 10);

    return isNaN(n) ? 0 : n;

  }



  function getFilteredRecords() {

    var q = filterText.trim().toUpperCase();

    var rows = getRecords().filter(function (r) {

      if (!q) return true;

      return (r.specimenId || '').toUpperCase().indexOf(q) !== -1

        || (r.patientId || '').toUpperCase().indexOf(q) !== -1

        || (r.name || '').toUpperCase().indexOf(q) !== -1;

    });

    if (sortDir) {

      rows.sort(function (a, b) {

        var na = lastFiveDigits(a.specimenId);

        var nb = lastFiveDigits(b.specimenId);

        if (na !== nb) return sortDir === 'asc' ? na - nb : nb - na;

        return String(a.specimenId).localeCompare(String(b.specimenId));

      });

    }

    return rows;

  }



  function getDisplayNote(rec) {

    if (!rec) return '';

    if (rec.noteType === 'follow-up') return '需拉片確認';

    return '';

  }



  function updateSortHeader() {

    var th = document.getElementById('legacy-lis-sort-id');

    if (!th) return;

    var label = '檢驗單 ID';

    if (sortDir === 'asc') label += ' ▲';

    else if (sortDir === 'desc') label += ' ▼';

    th.textContent = label;

  }



  function renderList() {

    var tbody = document.getElementById('legacy-lis-list-tbody');

    if (!tbody) return;

    var rows = getFilteredRecords();

    if (!selectedId && rows.length) selectedId = rows[0].specimenId;

    if (selectedId && !rows.some(function (r) { return r.specimenId === selectedId; })) {

      selectedId = rows.length ? rows[0].specimenId : null;

    }

    tbody.innerHTML = rows.map(function (r) {

      var cls = r.specimenId === selectedId ? 'selected' : '';

      return '<tr class="' + cls + '" data-id="' + esc(r.specimenId) + '">' +

        '<td title="' + esc(r.specimenId) + '">' + esc(r.specimenId) + '</td>' +

        '<td title="' + esc(r.name) + '">' + esc(r.name) + '</td>' +

        '</tr>';

    }).join('');

    tbody.querySelectorAll('tr').forEach(function (tr) {

      tr.addEventListener('click', function () {

        selectedId = tr.dataset.id;

        renderList();

        renderDetail();

      });

    });

    updateSortHeader();

    var status = document.getElementById('legacy-lis-status');

    if (status) {

      var scenarioHint = '';

      if (typeof LIS_MOCK_DATA !== 'undefined' && LIS_MOCK_DATA.scenarioSpecimenIds) {

        scenarioHint = '；含情境檢體 ' + LIS_MOCK_DATA.scenarioSpecimenIds.length + ' 筆';

      }

      var sortHint = sortDir ? '；排序：後五碼' + (sortDir === 'asc' ? '升冪' : '降冪') : '';

      status.textContent = '共 ' + getRecords().length + ' 筆；顯示 ' + rows.length + ' 筆' +

        scenarioHint + sortHint + (filterText ? '（已篩選）' : '');

    }

  }



  function renderReportTable(report, rec) {

    if (!report) return '<p>（無報告資料）</p>';

    var pltCheck = rec && (rec.pltCheck || rec.noteType === 'plt-check');

    var pltVal = esc(report.plt) + (pltCheck ? '<span class="legacy-lis-plt-flag">**</span>' : '');

    var diffRows = [

      ['Band', report.band], ['Seg', report.seg], ['Lymph', report.lymph],

      ['Mono', report.mono], ['Eos', report.eo], ['Baso', report.baso], ['Blast', report.blast]

    ];

    var html = '<div class="legacy-lis-report-title">本次報告結果 — 週邊血液</div>' +

      '<table class="legacy-lis-report-table">' +

      '<tr><th>WBC (10⁹/L)</th><td class="num">' + esc(report.wbc) + '</td></tr>' +

      '<tr><th>RBC (10¹²/L)</th><td class="num">' + esc(report.rbc) + '</td></tr>' +

      '<tr><th>Hb (g/dL)</th><td class="num">' + esc(report.hgb) + '</td></tr>' +

      '<tr><th>Hct (%)</th><td class="num">' + esc(report.hct) + '</td></tr>' +

      '<tr><th>PLT (10⁹/L)</th><td class="num">' + pltVal + '</td></tr>' +

      '</table>' +

      '<div class="legacy-lis-report-title">白血球分類 (%)</div>' +

      '<table class="legacy-lis-report-table"><tbody>';

    diffRows.forEach(function (pair) {

      html += '<tr><th>' + esc(pair[0]) + '</th><td class="num">' + esc(pair[1] || '-') + '</td></tr>';

    });

    html += '</tbody></table>';

    return html;

  }



  function renderDetail() {

    var root = document.getElementById('legacy-lis-detail');

    if (!root) return;

    var rec = selectedId && typeof LIS_MOCK_DATA !== 'undefined'

      ? LIS_MOCK_DATA.getBySpecimenId(selectedId)

      : null;

    if (!rec) {

      root.innerHTML = '<div class="legacy-lis-report-area"><p>請從左側清單選擇檢驗單。</p></div>';

      return;

    }

    var noteText = getDisplayNote(rec);

    var noteCls = noteText ? 'legacy-lis-note-box alert' : 'legacy-lis-note-box empty';

    var noteDisplay = noteText || '（無註記）';

    root.innerHTML =

      '<div class="legacy-lis-patient-bar">' +

      '<div class="legacy-lis-patient-grid">' +

      '<div><div class="lbl">檢驗單 ID</div><div class="val">' + esc(rec.specimenId) + '</div></div>' +

      '<div><div class="lbl">病歷號</div><div class="val">' + esc(rec.patientId) + '</div></div>' +

      '<div><div class="lbl">姓名</div><div class="val">' + esc(rec.name) + '</div></div>' +

      '<div><div class="lbl">性別</div><div class="val">' + esc(rec.gender) + '</div></div>' +

      '<div><div class="lbl">出生日期</div><div class="val">' + esc(rec.birthDate) + '</div></div>' +

      '<div><div class="lbl">年齡</div><div class="val">' + esc(rec.age) + ' 歲</div></div>' +

      '<div><div class="lbl">科別</div><div class="val">' + esc(rec.department) + '</div></div>' +

      '<div><div class="lbl">開單醫師</div><div class="val">' + esc(rec.physician) + '</div></div>' +

      '<div><div class="lbl">檢體歸位</div><div class="val">' + esc(rec.location) + '</div></div>' +

      '<div><div class="lbl">操作機台</div><div class="val">' + esc(rec.machine) + '</div></div>' +

      '<div><div class="lbl">採檢時間</div><div class="val">' + esc(rec.collectedAt) + '</div></div>' +

      '</div>' +

      '<div class="' + noteCls + '">註記：' + esc(noteDisplay) + '</div>' +

      '</div>' +

      '<div class="legacy-lis-report-area" id="legacy-lis-report-area">' +

      renderReportTable(rec.report, rec) + '</div>' +

      '<div class="legacy-lis-detail-actions">' +

      '<button type="button" class="legacy-btn" id="legacy-lis-btn-history">查詢歷史報告</button>' +

      '</div>';

    var btnHist = document.getElementById('legacy-lis-btn-history');

    if (btnHist) btnHist.addEventListener('click', openHistoryDialog);

  }



  function openHistoryDialog() {

    var rec = selectedId && LIS_MOCK_DATA ? LIS_MOCK_DATA.getBySpecimenId(selectedId) : null;

    var backdrop = document.getElementById('legacy-lis-history-backdrop');

    var body = document.getElementById('legacy-lis-history-body');

    var title = document.getElementById('legacy-lis-history-title');

    if (!backdrop || !body) return;

    if (!rec) return;

    if (title) title.textContent = '歷史報告 — ' + rec.specimenId + ' ' + rec.name;

    if (!rec.history || !rec.history.length) {

      body.innerHTML = '<p style="margin:0;color:#666;">此檢驗單無歷史報告紀錄。</p>';

    } else {

      body.innerHTML =

        '<table class="legacy-lis-history-table">' +

        '<thead><tr><th>報告日期</th><th>WBC</th><th>PLT</th><th>Blast</th><th>Eos</th><th>摘要</th></tr></thead><tbody>' +

        rec.history.map(function (h) {

          return '<tr><td>' + esc(h.date) + '</td><td class="num">' + esc(h.wbc) + '</td>' +

            '<td class="num">' + esc(h.plt) + '</td><td class="num">' + esc(h.blast || '-') + '</td>' +

            '<td class="num">' + esc(h.eo || '-') + '</td><td>' + esc(h.summary || '') + '</td></tr>';

        }).join('') +

        '</tbody></table>';

    }

    backdrop.classList.add('show');

  }



  function closeHistoryDialog() {

    var backdrop = document.getElementById('legacy-lis-history-backdrop');

    if (backdrop) backdrop.classList.remove('show');

  }



  function toggleSort() {

    sortDir = sortDir === 'asc' ? 'desc' : 'asc';

    renderList();

  }



  function open(opts) {

    opts = opts || {};

    filterText = '';

    sortDir = null;

    var search = document.getElementById('legacy-lis-search');

    if (search) search.value = '';

    if (typeof LIS_MOCK_DATA !== 'undefined' && LIS_MOCK_DATA.rebuild) {
      LIS_MOCK_DATA.rebuild();
    }

    selectedId = opts.specimenId || null;

    if (!selectedId && typeof getSpecimenById === 'function') {

      var ext = document.getElementById('legacy-toolbar-specimen-id');

      var txt = ext ? String(ext.textContent || '').trim() : '';

      if (txt && LIS_MOCK_DATA && LIS_MOCK_DATA.getBySpecimenId(txt)) selectedId = txt;

    }

    var backdrop = document.getElementById('legacy-lis-backdrop');

    if (backdrop) backdrop.classList.add('show');

    renderList();

    renderDetail();

  }



  function close() {

    closeHistoryDialog();

    var backdrop = document.getElementById('legacy-lis-backdrop');

    if (backdrop) backdrop.classList.remove('show');

  }



  function patchListHeader() {

    var th = document.getElementById('legacy-lis-sort-id');

    if (!th) {

      var first = document.querySelector('.legacy-lis-list-table thead th');

      if (first) {

        first.id = 'legacy-lis-sort-id';

        first.className = 'legacy-lis-sortable';

        first.title = '依檢驗單 ID 後五碼排序（點擊切換升冪／降冪）';

        first.addEventListener('click', toggleSort);

      }

    }

    var hint = document.querySelector('.legacy-lis-toolbar span');

    if (hint) hint.remove();

  }



  function ensureShell() {

    if (document.getElementById('legacy-lis-backdrop')) {

      patchListHeader();

      return;

    }

    var wrap = document.createElement('div');

    wrap.innerHTML =

      '<div id="legacy-lis-backdrop" class="legacy-lis-backdrop" aria-modal="true" role="dialog">' +

      '<div class="legacy-lis-window">' +

      '<div class="legacy-lis-titlebar">' +

      '<span id="legacy-lis-title">CGH LIS — 檢驗資訊系統（模擬）</span>' +

      '<div class="legacy-lis-titlebar-actions">' +

      '<button type="button" class="legacy-btn" id="legacy-lis-close">關閉</button>' +

      '</div></div>' +

      '<div class="legacy-lis-toolbar">' +

      '<label>檢索 <input type="text" id="legacy-lis-search" placeholder="檢驗單 ID / 病歷號 / 姓名"/></label>' +

      '<button type="button" class="legacy-btn" id="legacy-lis-btn-search">查詢</button>' +

      '</div>' +

      '<div class="legacy-lis-body">' +

      '<div class="legacy-lis-list-panel">' +

      '<div class="legacy-lis-list-title">檢體清單</div>' +

      '<div class="legacy-lis-list-scroll">' +

      '<table class="legacy-lis-list-table"><thead><tr>' +

      '<th id="legacy-lis-sort-id" class="legacy-lis-sortable" title="依檢驗單 ID 後五碼排序（點擊切換升冪／降冪）">檢驗單 ID</th>' +

      '<th>姓名</th></tr></thead>' +

      '<tbody id="legacy-lis-list-tbody"></tbody></table></div></div>' +

      '<div class="legacy-lis-detail-panel" id="legacy-lis-detail"></div>' +

      '</div>' +

      '<div class="legacy-lis-statusbar" id="legacy-lis-status">就緒</div>' +

      '</div></div>' +

      '<div id="legacy-lis-history-backdrop" class="legacy-lis-history-backdrop" aria-modal="true" role="dialog">' +

      '<div class="legacy-lis-history-dialog">' +

      '<div class="legacy-lis-titlebar">' +

      '<span id="legacy-lis-history-title">歷史報告</span>' +

      '<button type="button" class="legacy-btn" id="legacy-lis-history-close">關閉</button>' +

      '</div>' +

      '<div class="legacy-lis-history-body" id="legacy-lis-history-body"></div>' +

      '</div></div>';

    while (wrap.firstChild) document.body.appendChild(wrap.firstChild);

    var title = document.getElementById('legacy-lis-title');

    if (title && typeof LIS_MOCK_DATA !== 'undefined' && LIS_MOCK_DATA.systemName) {

      title.textContent = LIS_MOCK_DATA.systemName;

    }

    var hint = document.querySelector('.legacy-lis-toolbar span');

    if (hint) hint.remove();

  }



  function bind() {

    if (bind._done) return;

    bind._done = true;

    ensureShell();

    var sortTh = document.getElementById('legacy-lis-sort-id');

    if (sortTh) sortTh.addEventListener('click', toggleSort);

    var btnOpen = document.getElementById('legacy-btn-lis');

    if (btnOpen) btnOpen.addEventListener('click', function () { open({}); });

    var btnClose = document.getElementById('legacy-lis-close');

    if (btnClose) btnClose.addEventListener('click', close);

    var backdrop = document.getElementById('legacy-lis-backdrop');

    if (backdrop) {

      backdrop.addEventListener('click', function (e) {

        if (e.target === backdrop) close();

      });

    }

    var search = document.getElementById('legacy-lis-search');

    var btnSearch = document.getElementById('legacy-lis-btn-search');

    if (btnSearch) {

      btnSearch.addEventListener('click', function () {

        filterText = search ? search.value : '';

        renderList();

        renderDetail();

      });

    }

    if (search) {

      search.addEventListener('keydown', function (e) {

        if (e.key === 'Enter') {

          filterText = search.value;

          renderList();

          renderDetail();

        }

      });

    }

    var histClose = document.getElementById('legacy-lis-history-close');

    var histBackdrop = document.getElementById('legacy-lis-history-backdrop');

    if (histClose) histClose.addEventListener('click', closeHistoryDialog);

    if (histBackdrop) {

      histBackdrop.addEventListener('click', function (e) {

        if (e.target === histBackdrop) closeHistoryDialog();

      });

    }

    document.addEventListener('keydown', function (e) {

      if (e.key !== 'Escape') return;

      if (document.getElementById('legacy-lis-history-backdrop') &&

          document.getElementById('legacy-lis-history-backdrop').classList.contains('show')) {

        closeHistoryDialog();

        return;

      }

      if (document.getElementById('legacy-lis-backdrop') &&

          document.getElementById('legacy-lis-backdrop').classList.contains('show')) {

        close();

      }

    });

  }



  window.LegacyLis = {

    open: open,

    close: close,

    bind: bind

  };

})();


