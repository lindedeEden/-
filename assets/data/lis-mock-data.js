/**
 * 虛擬 LIS 查詢 — 成效調查用
 * 註記規則：需拉片確認 → 註記欄；血小板確認 → 報告 PLT 旁 **
 *
 * 註記對照（全情境一致）：
 *   需拉片確認 ×3：H5080706280、H5080720696、H5080721201
 *   血小板確認 ×2：H5080720847、H5080720647（PLT 旁 **）
 *   陷阱（無註記）：H5080706301（CellaVision 有 Follow-up，LIS 不顯示）
 *   上鎖：H5080706275
 *   其餘情境檢體：無註記、無 PLT**
 */
(function () {
  var PHYSICIANS = ['王明德', '李雅婷', '陳志宏', '張家豪', '林佳蓉', '黃俊傑', '吳承恩', '鄭淑芬', '周建國', '劉家銘'];

  /** 最高優先：覆寫 database 推論，確保陷阱／上鎖／雙類型待辦正確 */
  var LIS_CANONICAL_MARKERS = {
    H5080706280: { noteType: 'follow-up', note: '需拉片確認', pltCheck: false },
    H5080720696: { noteType: 'follow-up', note: '需拉片確認', pltCheck: false },
    H5080721201: { noteType: 'follow-up', note: '需拉片確認', pltCheck: false },
    H5080720847: { noteType: 'plt-check', note: '', pltCheck: true },
    H5080720647: { noteType: 'plt-check', note: '', pltCheck: true },
    H5080706301: { noteType: 'none', note: '', pltCheck: false },
    H5080706275: { noteType: 'locked', note: '', pltCheck: false }
  };

  var LIS_HISTORY_EXPECTED = {
    H5080706286: { blast: '1.0', label: '情境三 Blast 1%' },
    H5080720647: { blast: '2.0', label: '情境三 Blast 2%' },
    H5080721401: { wbc: '10.0', label: '情境三 WBC 10' }
  };

  function row(specimenId, patientId, name, gender, birthDate, age, department, physician, location, machine, note, noteType, collectedAt, report, history, pltCheck) {
    return {
      specimenId: specimenId,
      patientId: patientId,
      name: name,
      gender: gender,
      birthDate: birthDate,
      age: age,
      department: department,
      physician: physician || '—',
      location: location || '—',
      machine: machine || '—',
      note: note || '',
      noteType: noteType || 'none',
      pltCheck: !!pltCheck,
      collectedAt: collectedAt || '—',
      report: report,
      history: history || []
    };
  }

  var LIS_DETAIL_OVERRIDES = {
    H5080706280: {
      physician: '王明德',
      history: [{ date: '2025-07-15', wbc: '6.10', plt: '228', eo: '25.0', blast: '-', summary: 'Eosinophil 偏高' }]
    },
    H5080720696: {
      physician: '李雅婷',
      history: [{ date: '2025-06-20', wbc: '6.50', plt: '298', eo: '2.5', blast: '-', summary: '常規追蹤' }]
    },
    H5080721201: {
      physician: '陳志宏',
      history: [{ date: '2025-07-28', wbc: '10.80', plt: '155', blast: '3.0', eo: '1.5', summary: 'Blast 3%' }]
    },
    H5080720847: {
      physician: '張家豪',
      history: [{ date: '2025-07-10', wbc: '10.80', plt: '250', eo: '-', blast: '-', summary: '術前常規' }]
    },
    H5080720647: {
      physician: '林佳蓉',
      history: [{ date: '2025-07-22', wbc: '9.20', plt: '200', blast: '2.0', eo: '3.0', summary: 'Blast 2%' }]
    },
    H5080706301: {
      physician: '黃俊傑',
      history: [{ date: '2025-05-12', wbc: '7.10', plt: '255', blast: '-', eo: '2.0', summary: '術後追蹤已完成' }]
    },
    H5080706275: {
      physician: '劉家銘',
      history: [{ date: '2025-07-01', wbc: '5.50', plt: '95', blast: '-', eo: '2.0', summary: '腎功能追蹤' }]
    },
    H5080706286: {
      physician: '王明德',
      history: [{ date: '2025-06-01', wbc: '9.50', plt: '270', blast: '1.0', eo: '1.5', summary: '產檢常規（Blast 1%）' }]
    },
    H5080721401: {
      physician: '范家豪',
      history: [{ date: '2025-07-05', wbc: '10.0', plt: '220', blast: '-', eo: '2.0', summary: '感染追蹤（WBC 10）' }]
    }
  };

  var DECOY_RECORDS = [
    row('H5080799001', '88001001', '趙文雄', '男', '1965-02-18', 60, '家醫科', '簡志豪', '201-3', 'DI1',
      '', 'none', '2025-08-07 14:20',
      { wbc: '6.10', rbc: '4.60', hgb: '14.5', hct: '43.0', plt: '245', band: '-', seg: '60.0', lymph: '30.0', mono: '7.0', eo: '2.0', baso: '1.0', blast: '-' },
      [], false
    ),
    row('H5080799002', '88001002', '孫麗華', '女', '1980-07-25', 45, '內分泌科', '高美玲', '115-8', 'DI2',
      '', 'none', '2025-08-07 14:35',
      { wbc: '7.50', rbc: '4.30', hgb: '13.0', hct: '39.0', plt: '220', band: '1.0', seg: '55.0', lymph: '35.0', mono: '6.0', eo: '2.0', baso: '1.0', blast: '-' },
      [], false
    ),
    row('H5080799003', '88001003', '馬國強', '男', '1955-11-30', 70, '胸腔科', '馮志偉', '090-15', 'DI1',
      '', 'none', '2025-08-07 15:10',
      { wbc: '5.80', rbc: '4.05', hgb: '12.0', hct: '36.5', plt: '190', band: '-', seg: '62.0', lymph: '28.0', mono: '6.0', eo: '3.0', baso: '1.0', blast: '-' },
      [], false
    ),
    row('H5080799004', '88001004', '羅秀英', '女', '1992-04-12', 33, '風濕免疫科', '葉佳慧', '125-20', 'DI2',
      '', 'none', '2025-08-07 15:42',
      { wbc: '6.40', rbc: '4.18', hgb: '12.6', hct: '37.5', plt: '305', band: '-', seg: '57.0', lymph: '33.0', mono: '6.0', eo: '3.0', baso: '1.0', blast: '-' },
      [], false
    )
  ];

  function buildMarkerMapFromScenarioAnswerKeys() {
    var map = {};
    if (typeof APP_USABILITY_SCENARIOS === 'undefined' || !APP_USABILITY_SCENARIOS.scenarios) {
      return map;
    }
    APP_USABILITY_SCENARIOS.scenarios.forEach(function (sc) {
      (sc.answerIds || []).forEach(function (id) {
        map[id] = { noteType: 'follow-up', note: '需拉片確認', pltCheck: false };
      });
      (sc.followUpIds || []).forEach(function (id) {
        map[id] = { noteType: 'follow-up', note: '需拉片確認', pltCheck: false };
      });
      var ak = sc.answerKey;
      if (!ak) return;
      (ak.followUpLocations || []).forEach(function (item) {
        if (item && item.id) {
          map[item.id] = { noteType: 'follow-up', note: '需拉片確認', pltCheck: false };
        }
      });
      (ak.pltCheckMachines || []).forEach(function (item) {
        if (item && item.id) {
          map[item.id] = { noteType: 'plt-check', note: '', pltCheck: true };
        }
      });
      (ak.trapIds || []).forEach(function (id) {
        map[id] = { noteType: 'none', note: '', pltCheck: false };
      });
    });
    return map;
  }

  function buildMarkerMap() {
    var map = buildMarkerMapFromScenarioAnswerKeys();
    Object.keys(LIS_CANONICAL_MARKERS).forEach(function (id) {
      map[id] = LIS_CANONICAL_MARKERS[id];
    });
    return map;
  }

  function collectScenarioSpecimenIdsOrdered() {
    var ordered = [];
    var seen = {};
    if (typeof APP_USABILITY_SCENARIOS === 'undefined' || !APP_USABILITY_SCENARIOS.scenarios) {
      return ordered;
    }
    APP_USABILITY_SCENARIOS.scenarios.forEach(function (sc) {
      var ids = (sc.specimenIds || []).slice();
      if (sc.taskSpecimenIds) ids = ids.concat(sc.taskSpecimenIds);
      if (sc.taskSpecimenId) ids.push(sc.taskSpecimenId);
      ids.forEach(function (id) {
        if (!id || seen[id]) return;
        seen[id] = true;
        ordered.push(id);
      });
    });
    return ordered;
  }

  function findDbSpecimen(id) {
    if (typeof APP_DATABASE === 'undefined' || !APP_DATABASE.specimens) return null;
    for (var i = 0; i < APP_DATABASE.specimens.length; i++) {
      if (APP_DATABASE.specimens[i].id === id) return APP_DATABASE.specimens[i];
    }
    return null;
  }

  function metricsToReport(sp) {
    var m = sp.metrics || {};
    var c = sp.cbc || {};
    return {
      wbc: m.wbc || c.wbc || '-',
      rbc: c.rbc || '4.20',
      hgb: c.hb || '13.5',
      hct: c.hct || '40.0',
      plt: m.plt || c.plt || '-',
      band: m.band || '-',
      seg: m.segmentedNeutrophil || m.neut || '-',
      lymph: m.lymphocyte || m.lymph || '-',
      mono: m.monocyte || m.mono || '-',
      eo: m.eosinophil || m.eo || '-',
      baso: m.basophil || m.baso || '-',
      blast: m.blast || '-'
    };
  }

  function historyFromPrevReport(sp) {
    var pr = sp.prevReport;
    if (!pr || (pr.wbc == null && pr.plt == null)) return [];
    return [{
      date: sp.prevReportDate || '前次',
      wbc: pr.wbc || '-',
      plt: pr.plt || '-',
      blast: pr.blast || '-',
      eo: pr.eosinophil || pr.eo || '-',
      summary: '前次報告'
    }];
  }

  function inferNoteTypeFromDb(sp) {
    if (sp.locked || (sp.status || []).indexOf('Locked') !== -1) return 'locked';
    if ((sp.status || []).indexOf('Follow-up') !== -1) return 'follow-up';
    if ((sp.status || []).indexOf('PLT Check') !== -1) return 'plt-check';
    return 'none';
  }

  function resolveLisMarking(sp, markerMap) {
    var marker = markerMap[sp.id];
    if (marker) return marker;
    var noteType = inferNoteTypeFromDb(sp);
    return {
      noteType: noteType,
      note: noteType === 'follow-up' ? '需拉片確認' : '',
      pltCheck: noteType === 'plt-check'
    };
  }

  function physicianFor(sp, idx) {
    return PHYSICIANS[idx % PHYSICIANS.length];
  }

  function buildFromDatabase(sp, idx, detailOverride, markerMap) {
    detailOverride = detailOverride || {};
    var marking = resolveLisMarking(sp, markerMap);
    var history = detailOverride.history || historyFromPrevReport(sp);
    return row(
      sp.id,
      sp.patientId,
      sp.name,
      sp.gender,
      sp.birthDate,
      sp.age,
      sp.department,
      detailOverride.physician || physicianFor(sp, idx),
      sp.location,
      sp.machine,
      marking.note,
      marking.noteType,
      sp.analysisTime,
      metricsToReport(sp),
      history,
      marking.pltCheck
    );
  }

  function buildScenarioRecords(markerMap) {
    var ids = collectScenarioSpecimenIdsOrdered();
    var records = [];
    var missing = [];
    ids.forEach(function (id, idx) {
      var sp = findDbSpecimen(id);
      if (!sp) {
        missing.push(id);
        return;
      }
      records.push(buildFromDatabase(sp, idx, LIS_DETAIL_OVERRIDES[id] || null, markerMap));
    });
    if (missing.length && typeof console !== 'undefined' && console.warn) {
      console.warn('[LIS] 情境檢體未在 database 找到：', missing.join(', '));
    }
    return records;
  }

  function findRecord(records, id) {
    for (var i = 0; i < records.length; i++) {
      if (records[i].specimenId === id) return records[i];
    }
    return null;
  }

  function validateLisAnnotations(markerMap, records) {
    var errors = [];
    var scenarioIds = collectScenarioSpecimenIdsOrdered();

    scenarioIds.forEach(function (id) {
      if (!findRecord(records, id)) errors.push('缺少 LIS 紀錄：' + id);
    });

    ['H5080706280', 'H5080720696', 'H5080721201'].forEach(function (id) {
      var m = markerMap[id];
      var rec = findRecord(records, id);
      if (!m || m.noteType !== 'follow-up') errors.push(id + ' 應標記需拉片確認');
      if (rec && rec.note !== '需拉片確認') errors.push(id + ' LIS 註記欄應為「需拉片確認」');
      if (rec && rec.pltCheck) errors.push(id + ' 不應有血小板 **');
    });

    ['H5080720847', 'H5080720647'].forEach(function (id) {
      var m = markerMap[id];
      var rec = findRecord(records, id);
      if (!m || !m.pltCheck) errors.push(id + ' 應標記血小板確認');
      if (rec && rec.note) errors.push(id + ' 血小板確認不應出現在註記欄');
      if (rec && !rec.pltCheck) errors.push(id + ' 報告 PLT 應顯示 **');
    });

    var trap = findRecord(records, 'H5080706301');
    if (trap && (trap.noteType === 'follow-up' || trap.note)) {
      errors.push('H5080706301 陷阱檢體 LIS 不應顯示需拉片確認');
    }

    Object.keys(LIS_HISTORY_EXPECTED).forEach(function (id) {
      var exp = LIS_HISTORY_EXPECTED[id];
      var rec = findRecord(records, id);
      if (!rec || !rec.history || !rec.history.length) {
        errors.push(id + ' 缺少歷史報告（' + exp.label + '）');
        return;
      }
      var h = rec.history[0];
      if (exp.blast != null && String(h.blast) !== exp.blast) {
        errors.push(id + ' 歷史 Blast 應為 ' + exp.blast + '（' + exp.label + '）');
      }
      if (exp.wbc != null && String(h.wbc) !== exp.wbc) {
        errors.push(id + ' 歷史 WBC 應為 ' + exp.wbc + '（' + exp.label + '）');
      }
    });

    var neutralIds = [
      'H5080720276', 'H5080721101', 'H5080721102', 'H5080721103', 'H5080721104',
      'H5080721105', 'H5080721106', 'H5080721107', 'H5080721301'
    ];
    neutralIds.forEach(function (id) {
      if (scenarioIds.indexOf(id) === -1) return;
      var rec = findRecord(records, id);
      if (!rec) return;
      if (rec.noteType === 'follow-up' && rec.note) {
        errors.push(id + ' 不應有需拉片確認註記');
      }
    });

    if (errors.length && typeof console !== 'undefined' && console.warn) {
      console.warn('[LIS 註記驗證] 發現 ' + errors.length + ' 項問題：', errors);
    }
    return errors;
  }

  var markerMap = buildMarkerMap();
  var records = buildScenarioRecords(markerMap).concat(DECOY_RECORDS);
  var lastValidation = validateLisAnnotations(markerMap, records);

  function rebuildRecords() {
    markerMap = buildMarkerMap();
    records = buildScenarioRecords(markerMap).concat(DECOY_RECORDS);
    lastValidation = validateLisAnnotations(markerMap, records);
    window.LIS_MOCK_DATA.records = records;
    window.LIS_MOCK_DATA.markerMap = markerMap;
    window.LIS_MOCK_DATA.lastValidation = lastValidation;
  }

  function getAnnotationSummary() {
    var scenarioIds = collectScenarioSpecimenIdsOrdered();
    return scenarioIds.map(function (id) {
      var rec = findRecord(records, id);
      if (!rec) return { id: id, missing: true };
      return {
        id: id,
        note: rec.note || '（無）',
        noteType: rec.noteType,
        pltCheck: rec.pltCheck,
        location: rec.location,
        machine: rec.machine,
        hasHistory: !!(rec.history && rec.history.length)
      };
    });
  }

  window.LIS_MOCK_DATA = {
    systemName: 'CGH LIS — 檢驗資訊系統（模擬）',
    records: records,
    scenarioSpecimenIds: collectScenarioSpecimenIdsOrdered(),
    markerMap: markerMap,
    lastValidation: lastValidation,
    rebuild: rebuildRecords,
    validate: function () { return validateLisAnnotations(markerMap, records); },
    getAnnotationSummary: getAnnotationSummary,
    getBySpecimenId: function (id) {
      return findRecord(records, id);
    },
    getFollowUpRecords: function () {
      return records.filter(function (r) { return r.noteType === 'follow-up'; });
    },
    getPltCheckRecords: function () {
      return records.filter(function (r) { return r.pltCheck || r.noteType === 'plt-check'; });
    },
    isScenarioSpecimen: function (id) {
      return this.scenarioSpecimenIds.indexOf(id) !== -1;
    }
  };
})();
