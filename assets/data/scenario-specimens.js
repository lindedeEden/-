/**
 * 改善後成效調查 — 各情境專屬檢體清單
 * 切換情境時僅顯示對應 specimenIds；正式清單則顯示 database.js 全量資料。
 * 新版／舊版共用同一組題目（taskCard）與檢體（specimenIds）。
 */
var APP_USABILITY_SCENARIOS = {
  /** 正式清單（關閉成效調查模式） */
  normal: {
    id: '',
    title: '正式清單',
    specimenIds: null,
    taskCard: null
  },
  scenarios: [
    {
      id: 'scenario-1',
      title: '情境一：需推片確認資訊缺失',
      specimenIds: [
        'H5080706280',
        'H5080720696',
        'H5080721201',
        'H5080706301',
        'H5080720847',
        'H5080720647',
        'H5080720276',
        'H5080706286',
        'H5080721101',
        'H5080706275'
      ],
      /** 主持人對照用，不顯示於受試者畫面 */
      answerIds: ['H5080706280', 'H5080720696', 'H5080721201'],
      taskCard:
        '目前工作清單上共有 10 筆檢體。在開始編輯前，您想知道哪些檢體有「需拉片確認」待辦，以免白做工。請找出所有仍需推片／拉片確認的檢體編號，並簡要說明您的判斷依據。'
    },
    {
      id: 'scenario-2',
      title: '情境二：檢體實體位置／機台位置缺失',
      /** 接續情境一；清單含情境一之三筆需拉片確認 + 兩筆血小板確認 */
      continuesFrom: 'scenario-1',
      followUpIds: ['H5080706280', 'H5080720696', 'H5080721201'],
      specimenIds: [
        'H5080706280',
        'H5080720696',
        'H5080721201',
        'H5080720847',
        'H5080720647',
        'H5080706301',
        'H5080720276',
        'H5080706286',
        'H5080706275',
        'H5080721101'
      ],
      /** 主持人對照用：Follow-up → 檢體歸位；PLT Check → 操作機台 */
      answerKey: {
        followUpLocations: [
          { id: 'H5080706280', location: '090-2' },
          { id: 'H5080720696', location: '125-12' },
          { id: 'H5080721201', location: '208-6' }
        ],
        pltCheckMachines: [
          { id: 'H5080720847', machine: 'DI1' },
          { id: 'H5080720647', machine: 'DI2' }
        ],
        trapIds: ['H5080706301']
      },
      taskCard:
        '你是負責實體作業/核發報告的醫檢師。\n' +
        '請在實體作業模式下完成以下任務：\n\n' +
        '（一）找出 3 筆「需拉片確認」檢體的採血管歸位位置，並標記完成。\n\n' +
        '（二）找出 2 筆「血小板確認」待辦，請分別說出各筆的玻片所在機台，並標記完成。'
    },
    {
      id: 'scenario-3',
      title: '情境三：歷史數據與臨床資訊缺失',
      /** 任務指定檢體（受試者須進入閱片頁查前次報告） */
      taskSpecimenIds: ['H5080706286', 'H5080720647', 'H5080721401'],
      taskSpecimenId: 'H5080706286',
      specimenIds: [
        'H5080706286',
        'H5080720647',
        'H5080721401',
        'H5080721201',
        'H5080706280',
        'H5080720847',
        'H5080720696',
        'H5080706301',
        'H5080720276',
        'H5080706275'
      ],
      answerKey: {
        prevReportAnswers: [
          {
            id: 'H5080706286',
            metric: 'Blast',
            prevValue: '1%',
            accept: ['1%', '1.0%', '1', 'blast 1', 'blast 1%']
          },
          {
            id: 'H5080720647',
            metric: 'Blast',
            prevValue: '2%',
            accept: ['2%', '2.0%', '2', 'blast 2', 'blast 2%']
          },
          {
            id: 'H5080721401',
            metric: 'WBC',
            prevValue: '10',
            accept: ['10', '10.0', '10.00', 'wbc 10', '10 (10e9/L)', '10.0 (10e9/L)']
          }
        ],
        timingNote: '請記錄各檢體答畢時間（各筆參考 < 90 秒）'
      },
      taskCard:
        '你是負責數位閱片/顯微鏡檢的醫檢師。\n' +
        '正在數位閱片模式下，發現三筆AI分類警示檢體，需要確認病人歷史報告，\n' +
        '檢體編號：H5080706286、H5080720647、H5080721401\n' +
        '在模擬介面下確認病患歷史報告，並口頭說明與本次報告的關聯'
    },
    {
      id: 'scenario-4',
      title: '情境四～五：異常警示不足 / 留單警示不足',
      specimenIds: [
        'H5080721101',
        'H5080721102',
        'H5080720647',
        'H5080721103',
        'H5080721104',
        'H5080721301',
        'H5080721105',
        'H5080706286',
        'H5080721106',
        'H5080721107'
      ],
      answerKey: {
        anomalyReports: [
          {
            id: 'H5080720647',
            type: 'true-abnormal',
            expect: '真實異常（Blast 6%）',
            shouldReport: true
          },
          {
            id: 'H5080721103',
            type: 'true-abnormal',
            expect: '真實異常（Promyelocyte 3% / Present）',
            shouldReport: true
          },
          {
            id: 'H5080721104',
            type: 'ai-false-positive',
            expect: 'AI 誤判：3 顆 Lymphocyte 被標為 Blast 3%，應回報為誤報／非真實異常',
            shouldReport: true
          },
          {
            id: 'H5080721301',
            type: 'ai-false-positive',
            expect: 'AI 誤判：Lymphocyte 被標為 Blast，應回報為誤報／非真實異常',
            shouldReport: true
          },
          {
            id: 'H5080706286',
            type: 'ai-uncertain',
            expect: 'AI Alert Blast 2%（可為誤報）：應回報並說明需人工確認',
            shouldReport: true
          }
        ],
        noReportIds: [
          'H5080721101',
          'H5080721102',
          'H5080721105',
          'H5080721106',
          'H5080721107'
        ],
        timingNote: '記錄總完成時間（10 筆）；（一）異常回報可註記順序（應回報 5 筆）；（二）留單口頭回報分開記錄'
      },
      taskCard:
        '你是數位閱片／顯微鏡檢醫檢師。\n' +
        '請在數位閱片模式下依序完成 10 筆檢體的閱片與報告簽核。\n\n' +
        '（一）閱片時異常發現\n' +
        '若發現異常細胞（含 AI 偽陽性），請立即口頭告知發現內容。\n\n' +
        '（二）留單判斷\n' +
        '該筆檢體閱片過程中，一旦發現需要留單，請立即口頭告知。'
    }
  ]
};
