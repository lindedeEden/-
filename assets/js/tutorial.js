/**
 * 血球分類軟體 - 使用者教學（步驟式高亮導覽、跨頁）
 * 檢體管理 → 影像檢視與細胞編輯 → 報告核發
 */
(function () {
  var STORAGE_KEY_COMPLETED = 'bloodCellTutorialCompleted';
  var STORAGE_KEY_PHASE = 'bloodCellTutorialPhase';
  var STORAGE_KEY_STEP = 'bloodCellTutorialStep';

  function getState() {
    return {
      completed: localStorage.getItem(STORAGE_KEY_COMPLETED) === '1',
      phase: localStorage.getItem(STORAGE_KEY_PHASE) || '',
      step: parseInt(localStorage.getItem(STORAGE_KEY_STEP) || '0', 10)
    };
  }

  function setState(completed, phase, step) {
    if (completed !== undefined) localStorage.setItem(STORAGE_KEY_COMPLETED, completed ? '1' : '');
    if (phase !== undefined) localStorage.setItem(STORAGE_KEY_PHASE, phase);
    if (step !== undefined) localStorage.setItem(STORAGE_KEY_STEP, String(step));
  }

  var SPECIMEN_STEPS = [
    {
      selector: null,
      title: '歡迎使用',
      body: '本系統為<strong>血球型態閱片 Demo</strong>，示範流程：<strong>檢體管理 → 影像檢視 → 報告核發</strong>。資料存於本機，供連續操作測試。'
    },
    {
      selector: '#tutorial-area-tl',
      title: '模式與篩選',
      body: '<strong>數位閱片</strong>：待辦 DR／AI 警示檢體。<strong>實體作業</strong>：需拉片、血小板等實體待辦。<br/>可再勾選狀態、日期、單位、機台與搜尋條件；表頭可排序。'
    },
    {
      selector: '#tutorial-specimen-list',
      title: '檢體列表',
      body: '列上<strong>膠囊</strong>標示待辦類型，完成後轉綠勾。雙擊或點<strong>進入閱片</strong>開啟影像頁；<strong>Locked</strong> 不可編輯。實體模式下可直接點膠囊標記完成。'
    },
    {
      selector: '#tutorial-sidebar-body',
      title: '檢體總覽',
      body: '右側顯示選取檢體之基本資料，以及流式、AI、前次報告對照；異常達留單門檻以紅色標示（門檻可於系統設定調整）。'
    },
    {
      selector: '#specimen-tbody',
      title: '開始閱片',
      body: '選定檢體後<strong>雙擊列</strong>或點<strong>進入閱片</strong>。數位閱片已完成者可<strong>唯讀檢視</strong>。'
    }
  ];

  var IMAGE_STEPS = [
    {
      selector: null,
      title: '影像檢視',
      body: '左側為檢體資訊與分析表，右側為細胞影像。命中留單門檻的類別會置頂並以紅色強調。'
    },
    {
      selector: '#tutorial-image-tl',
      title: '導航與狀態',
      body: '可返回列表、切換檢體（上一筆／下一筆或搜尋 ID），狀態膠囊與列表一致。'
    },
    {
      selector: '#tutorial-image-tr',
      title: '進度與工具',
      body: '<strong>檢視進度</strong>：捲動過的細胞才計入已檢視。<strong>縮放／字型</strong>全站共用。須檢視完且無 Unidentified 才可核發報告。'
    },
    {
      selector: '#main-cell-groups',
      title: '細胞編輯',
      body: '左鍵選取、Ctrl 多選、Shift 範圍選；拖曳或右鍵選單可改分類。長按右鍵為單手操作模式。'
    },
    {
      selector: '#btn-save-report',
      title: '儲存並核發',
      body: '完成閱片後點<strong>儲存並核發報告</strong>，於彈出視窗確認資料並簽核。'
    }
  ];

  var REPORT_STEPS = [
    {
      selector: null,
      title: '報告核發',
      body: '簽核前最後比對<strong>流式、AI、人員編輯、前次報告</strong>與 CBC；以人員編輯為準。'
    },
    {
      selector: '#tutorial-report-tl',
      title: '風險橫幅',
      body: '<strong>紅</strong>：新發留單；<strong>黃</strong>：延續性異常；<strong>綠</strong>：未達留單。需改人工鏡檢時點<strong>改為人工鏡檢</strong>，檢體轉至實體作業待辦。'
    },
    {
      selector: '#tutorial-report-bl',
      title: '分類與 CBC',
      body: 'WBC 分類與其他發現並列四欄比對；達門檻之列紅色標示。右側為病患與檢體資訊。'
    },
    {
      selector: '#confirm-btn',
      title: '確認簽核',
      body: '確認無誤後點<strong>確認並簽核</strong>，完成數位閱片流程，並可繼續下一筆待辦。'
    },
    {
      selector: null,
      title: '教學完成',
      body: '導覽結束。可隨時由檢體管理頂部<strong>使用教學</strong>重播。'
    }
  ];

  function getStepsForPage(page) {
    if (page === 'specimen') return SPECIMEN_STEPS;
    if (page === 'image') return IMAGE_STEPS;
    if (page === 'report') return REPORT_STEPS;
    return [];
  }

  var overlay = null;
  var spotlight = null;
  var card = null;

  function createOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'tutorial-overlay';
    overlay.className = 'tutorial-overlay';
    spotlight = document.createElement('div');
    spotlight.id = 'tutorial-spotlight';
    spotlight.className = 'tutorial-spotlight';
    card = document.createElement('div');
    card.id = 'tutorial-card';
    card.className = 'tutorial-card';
    card.innerHTML = '<div class="tutorial-card-title"></div><div class="tutorial-card-body"></div><div class="tutorial-card-actions"><button type="button" class="tutorial-btn tutorial-btn-skip">跳過</button><span class="tutorial-card-dots"></span><div class="tutorial-card-nav"><button type="button" class="tutorial-btn tutorial-btn-prev">上一步</button><button type="button" class="tutorial-btn tutorial-btn-next">下一步</button></div></div>';
    overlay.appendChild(spotlight);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    return overlay;
  }

  function getRect(el) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return { top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height };
  }

  function positionSpotlight(selector, container) {
    var doc = container && container.ownerDocument ? container.ownerDocument : document;
    var root = doc.body;
    if (!spotlight) return;
    if (!selector) {
      spotlight.style.display = 'none';
      return;
    }
    var el = root.querySelector(selector);
    if (!el) {
      spotlight.style.display = 'none';
      return;
    }
    var r = el.getBoundingClientRect();
    spotlight.style.display = 'block';
    spotlight.style.top = r.top + 'px';
    spotlight.style.left = r.left + 'px';
    spotlight.style.width = r.width + 'px';
    spotlight.style.height = r.height + 'px';
  }

  function showStep(page, index, fromHelp) {
    var steps = getStepsForPage(page);
    if (index >= steps.length) {
      if (page === 'specimen') {
        setState(undefined, 'image', 0);
        closeTutorial();
        return;
      }
      if (page === 'image') {
        setState(undefined, 'report', 0);
        closeTutorial();
        return;
      }
      if (page === 'report') {
        setState(true, '', 0);
        closeTutorial();
        return;
      }
      closeTutorial();
      return;
    }
    var step = steps[index];
    setState(undefined, page, index);
    createOverlay();
    overlay.classList.add('tutorial-visible');
    var titleEl = card.querySelector('.tutorial-card-title');
    var bodyEl = card.querySelector('.tutorial-card-body');
    var nextBtn = card.querySelector('.tutorial-btn-next');
    var prevBtn = card.querySelector('.tutorial-btn-prev');
    var skipBtn = card.querySelector('.tutorial-btn-skip');
    var dotsEl = card.querySelector('.tutorial-card-dots');
    titleEl.textContent = step.title;
    bodyEl.innerHTML = step.body;
    var isLast = index === steps.length - 1;
    nextBtn.textContent = isLast ? '完成' : '下一步';
    prevBtn.style.display = index === 0 ? 'none' : 'inline-flex';
    skipBtn.style.display = fromHelp ? 'none' : 'inline-flex';
    dotsEl.textContent = (index + 1) + ' / ' + steps.length;
    positionSpotlight(step.selector, document);
    prevBtn.onclick = function () { showStep(page, index - 1, fromHelp); };
    nextBtn.onclick = function () {
      if (isLast && page === 'specimen') {
        setState(undefined, 'image', 0);
        closeTutorial();
        return;
      }
      if (isLast && page === 'image') {
        setState(undefined, 'report', 0);
        closeTutorial();
        return;
      }
      if (isLast && page === 'report') {
        setState(true, '', 0);
        closeTutorial();
        return;
      }
      showStep(page, index + 1, fromHelp);
    };
    skipBtn.onclick = function () {
      setState(true, '', 0);
      closeTutorial();
    };
  }

  function closeTutorial() {
    if (overlay) {
      overlay.classList.remove('tutorial-visible');
    }
  }

  function startSpecimenTutorial(fromHelp) {
    fromHelp = !!fromHelp;
    showStep('specimen', 0, fromHelp);
  }

  function startImageTutorial(fromHelp) {
    fromHelp = !!fromHelp;
    showStep('image', 0, fromHelp);
  }

  function startReportTutorial(fromHelp) {
    fromHelp = !!fromHelp;
    showStep('report', 0, fromHelp);
  }

  function runOnSpecimenPage() {
    var state = getState();
    if (state.completed && !state.phase) return;
    var fromHelp = typeof window.startTutorialFromHelp !== 'undefined' && window.startTutorialFromHelp;
    if (state.phase === 'image' || state.phase === 'report') return;
    if (state.phase === 'specimen' || state.phase === '') {
      if (!fromHelp && state.completed) return;
      if (fromHelp) {
        startSpecimenTutorial(true);
        return;
      }
      startSpecimenTutorial(false);
    }
  }

  function runOnImagePage() {
    var state = getState();
    if (state.phase !== 'image') return;
    startImageTutorial(false);
  }

  function runOnReportPage() {
    var state = getState();
    if (state.phase !== 'report') return;
    startReportTutorial(false);
  }

  window.Tutorial = {
    getState: getState,
    setState: setState,
    startSpecimen: startSpecimenTutorial,
    startImage: startImageTutorial,
    startReport: startReportTutorial,
    close: closeTutorial,
    runOnSpecimenPage: runOnSpecimenPage,
    runOnImagePage: runOnImagePage,
    runOnReportPage: runOnReportPage
  };
})();
