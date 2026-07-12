/**
 * CellConstants — 所有與細胞類型相關的常數
 *
 * 問題修正：
 *  - 原版：ABNORMAL_ORDER、DEFAULT_CATEGORY_ORDER、CATEGORY_TO_METRIC_KEY 等
 *          陣列/物件定義在 image-review.js 的 IIFE 內（私有），
 *          report-issue.js 又重複定義了 COMMON_ROWS / ABNORMAL_ROWS，
 *          造成維護兩份清單、容易不同步。
 *  - 修正：單一來源，各頁面引用同一常數。
 */

const CellConstants = Object.freeze({

  // 成熟細胞（用於 100 格計數）
  MATURE_TYPES: Object.freeze([
    'Segmented Neutrophil', 'Band', 'Eosinophil', 'Monocyte',
    'Basophil', 'Lymphocyte', 'Atypical Lymphocyte',
  ]),

  // 未成熟 / 異常細胞
  ABNORMAL_TYPES: Object.freeze([
    'Blast', 'Promyelocyte', 'Myelocyte', 'Metamyelocyte',
    'Hypersegmented', 'Promonocyte', 'Plasma Cell', 'Abnormal Lymphocyte',
    'Megakaryocyte',
  ]),

  // 其他發現
  OTHER_TYPES: Object.freeze(['NRBC', 'Giant PLT', 'Smudge Cell', 'Unidentified', 'Artefact']),

  // 影像檢視分類區預設排序
  DISPLAY_ORDER: Object.freeze([
    'Band', 'Segmented Neutrophil', 'Eosinophil', 'Monocyte', 'Basophil',
    'Lymphocyte', 'Atypical Lymphocyte', 'Abnormal Lymphocyte',
    'Blast', 'Promyelocyte', 'Myelocyte', 'Metamyelocyte', 'Hypersegmented',
    'Promonocyte', 'Plasma Cell', 'Megakaryocyte', 'NRBC', 'Giant PLT',
    'Smudge Cell', 'Unidentified', 'Artefact',
  ]),

  // UI 顯示名稱 → DB metrics key
  CATEGORY_TO_METRIC_KEY: Object.freeze({
    'Blast': 'blast',
    'Promyelocyte': 'promyelocyte',
    'Myelocyte': 'myelocyte',
    'Metamyelocyte': 'metamyelocyte',
    'Hypersegmented': 'hypersegmented',
    'Promonocyte': 'promonocyte',
    'Plasma Cell': 'plasmaCell',
    'Abnormal Lymphocyte': 'abnormalLymphocyte',
    'Atypical Lymphocyte': 'atypicalLymphocyte',
    'Lymphocyte': 'lymphocyte',
    'Monocyte': 'monocyte',
    'Eosinophil': 'eosinophil',
    'Basophil': 'basophil',
    'Band': 'band',
    'Segmented Neutrophil': 'segmentedNeutrophil',
    'NRBC': 'nrbc',
    'Giant PLT': 'giantPlt',
    'Megakaryocyte': 'megakaryocyte',
    'Smudge Cell': 'smudgeCell',
    'Artefact': 'artefact',
  }),

  // metrics key → 中文顯示標籤（報告頁、門檻設定頁使用）
  METRIC_LABELS: Object.freeze({
    wbc: 'WBC (×10³/μL)',
    plt: 'PLT (×10³/μL)',
    band: 'Band (%)',
    segmentedNeutrophil: 'Segmented Neutrophil (%)',
    eosinophil: 'Eosinophil (%)',
    monocyte: 'Monocyte (%)',
    basophil: 'Basophil (%)',
    lymphocyte: 'Lymphocyte (%)',
    atypicalLymphocyte: 'Atypical Lymphocyte (%)',
    blast: 'Blast',
    promyelocyte: 'Promyelocyte',
    myelocyte: 'Myelocyte (%)',
    metamyelocyte: 'Metamyelocyte (%)',
    hypersegmented: 'Hypersegmented (%)',
    promonocyte: 'Promonocyte',
    plasmaCell: 'Plasma Cell',
    abnormalLymphocyte: 'Abnormal Lymphocyte',
    nrbc: 'NRBC',
    giantPlt: 'Giant PLT',
    megakaryocyte: 'Megakaryocyte',
    smudgeCell: 'Smudge Cell',
    artefact: 'Artefact',
  }),

  // 狀態膠囊：key → { label, colorClass }
  STATUS_CONFIG: Object.freeze({
    'PLT Check':      { label: '血小板確認',   color: 'bg-blue-100 text-blue-800' },
    'Digital Review': { label: '數位閱片',     color: 'bg-purple-100 text-purple-800' },
    'AI Alert':       { label: 'AI分類警示',   color: 'bg-orange-100 text-orange-800' },
    'Follow-up':      { label: '需拉片確認',   color: 'bg-red-100 text-red-800' },
    'Verified':       { label: '已完成',       color: 'bg-green-100 text-green-800' },
    'Locked':         { label: '鎖定中',       color: 'bg-gray-200 text-gray-800 border border-gray-300' },
  }),

});
