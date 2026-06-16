const storageKey = "zfl18-boardgame-rule-cards";
const SCHEMA_VERSION = 3;
const today = new Date();

const REVIEW_STATUS = {
  UNMARKED: null,
  MASTERED: "mastered",
  STILL_FORGET: "still_forget",
  MUST_REVIEW: "must_review"
};

const REVIEW_STATUS_LABELS = {
  [REVIEW_STATUS.MASTERED]: "已掌握",
  [REVIEW_STATUS.STILL_FORGET]: "还会忘",
  [REVIEW_STATUS.MUST_REVIEW]: "下次必看"
};

const REVIEW_SESSION_KEY = storageKey + "-review-session";

const REVIEW_SESSION_SOURCE = {
  MUST_REVIEW: "must_review",
  STILL_FORGET: "still_forget",
  UNRESOLVED_DISPUTES: "unresolved_disputes",
  CHECKLIST: "checklist",
  PARTY: "party",
  ALL_PENDING: "all_pending"
};

const REVIEW_SESSION_SOURCE_LABELS = {
  [REVIEW_SESSION_SOURCE.MUST_REVIEW]: "🔔 下次必看复习",
  [REVIEW_SESSION_SOURCE.STILL_FORGET]: "💭 还会忘复习",
  [REVIEW_SESSION_SOURCE.UNRESOLVED_DISPUTES]: "⚖️ 未裁定争议复习",
  [REVIEW_SESSION_SOURCE.CHECKLIST]: "📋 聚会清单复习",
  [REVIEW_SESSION_SOURCE.PARTY]: "🎊 聚会准备复习",
  [REVIEW_SESSION_SOURCE.ALL_PENDING]: "📖 全部待复习"
};

const RULE_CATEGORY_LABELS = {
  forgets: "容易忘的规则",
  disputes: "常见争议",
  setup: "开局准备",
  scoring: "计分提醒"
};

const REVIEW_MARK_ACTION = {
  MASTERED: REVIEW_STATUS.MASTERED,
  STILL_FORGET: REVIEW_STATUS.STILL_FORGET,
  MUST_REVIEW: REVIEW_STATUS.MUST_REVIEW,
  SKIP: "skip"
};

let reviewSession = null;

function generateId() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Date.now() + "-" + Math.random().toString(36).slice(2, 11);
}

const RULE_TAGS = ["易错结算", "开局流程", "新人教学", "扩展专属", "计分终局"];

const TAG_COLORS = {
  "易错结算": "var(--red)",
  "开局流程": "var(--blue)",
  "新人教学": "var(--green)",
  "扩展专属": "var(--lavender)",
  "计分终局": "var(--yellow)"
};

function createRuleCard(text, status = REVIEW_STATUS.UNMARKED, createdAt = null, tags = []) {
  return {
    id: generateId(),
    text: String(text || ""),
    status: status ?? REVIEW_STATUS.UNMARKED,
    createdAt: createdAt || new Date().toISOString(),
    tags: Array.isArray(tags) ? tags.filter(t => RULE_TAGS.includes(t)) : []
  };
}

function isRuleCardV1(rule) {
  return rule && typeof rule === "object" && "id" in rule && "createdAt" in rule;
}

function isRuleCardV2(rule) {
  return isRuleCardV1(rule) && "tags" in rule;
}

function normalizeRule(rule) {
  if (typeof rule === "string") {
    return createRuleCard(rule, REVIEW_STATUS.UNMARKED);
  }
  if (isRuleCardV1(rule)) {
    return {
      id: rule.id || generateId(),
      text: String(rule.text || ""),
      status: rule.status ?? REVIEW_STATUS.UNMARKED,
      createdAt: rule.createdAt || new Date().toISOString(),
      tags: Array.isArray(rule.tags) ? rule.tags.filter(t => RULE_TAGS.includes(t)) : []
    };
  }
  return createRuleCard(rule?.text ?? "", rule?.status ?? REVIEW_STATUS.UNMARKED);
}

function normalizeRuleArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(normalizeRule);
}

function ruleText(rule) {
  return typeof rule === "string" ? rule : rule?.text ?? "";
}

function ruleStatus(rule) {
  return typeof rule === "string" ? REVIEW_STATUS.UNMARKED : rule?.status ?? REVIEW_STATUS.UNMARKED;
}

function normalizeExpansion(exp) {
  if (!exp || typeof exp !== "object") return null;
  return {
    id: exp.id || crypto.randomUUID(),
    name: String(exp.name || ""),
    forgets: normalizeRuleArray(exp.forgets),
    disputes: normalizeRuleArray(exp.disputes),
    setup: normalizeRuleArray(exp.setup),
    scoring: normalizeRuleArray(exp.scoring)
  };
}

function normalizeDisputeRulings(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((entry) => ({
    disputeText: String(entry.disputeText || ""),
    expansionId: String(entry.expansionId || ""),
    rulings: Array.isArray(entry.rulings)
      ? entry.rulings.map((r) => ({
          id: r.id || crypto.randomUUID(),
          decision: String(r.decision || ""),
          participants: Number(r.participants) || 0,
          date: String(r.date || ""),
          notes: String(r.notes || "")
        }))
      : []
  }));
}

function normalizeExpansionArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(normalizeExpansion).filter(Boolean);
}

function migrateRuleArrayV0ToV1(rules, defaultDate = null) {
  if (!Array.isArray(rules)) return [];
  const baseDate = defaultDate || new Date().toISOString();
  return rules.map((rule, index) => {
    if (isRuleCardV1(rule)) {
      return {
        id: rule.id || generateId(),
        text: String(rule.text || ""),
        status: rule.status ?? REVIEW_STATUS.UNMARKED,
        createdAt: rule.createdAt || baseDate,
        tags: Array.isArray(rule.tags) ? rule.tags.filter(t => RULE_TAGS.includes(t)) : []
      };
    }
    const text = typeof rule === "string" ? rule : (rule?.text || "");
    const status = typeof rule === "string" ? REVIEW_STATUS.UNMARKED : (rule?.status ?? REVIEW_STATUS.UNMARKED);
    return createRuleCard(text, status, baseDate);
  });
}

function migrateGameV0ToV1(game) {
  if (!game || typeof game !== "object") return null;
  const normalizedLastPlayed = normalizeLastPlayed(game.lastPlayed);
  const migratedDate = new Date(`${normalizedLastPlayed}T00:00:00`).toISOString();
  return {
    ...game,
    id: game.id || generateId(),
    lastPlayed: normalizedLastPlayed,
    forgets: migrateRuleArrayV0ToV1(game.forgets, migratedDate),
    disputes: migrateRuleArrayV0ToV1(game.disputes, migratedDate),
    setup: migrateRuleArrayV0ToV1(game.setup, migratedDate),
    scoring: migrateRuleArrayV0ToV1(game.scoring, migratedDate),
    expansions: Array.isArray(game.expansions)
      ? game.expansions.map((exp) => ({
          ...exp,
          id: exp.id || generateId(),
          forgets: migrateRuleArrayV0ToV1(exp.forgets, migratedDate),
          disputes: migrateRuleArrayV0ToV1(exp.disputes, migratedDate),
          setup: migrateRuleArrayV0ToV1(exp.setup, migratedDate),
          scoring: migrateRuleArrayV0ToV1(exp.scoring, migratedDate)
        }))
      : []
  };
}

function migrateV0ToV1(parsed) {
  const result = { ...parsed };
  if (Array.isArray(result.games)) {
    result.games = result.games.map(migrateGameV0ToV1).filter(Boolean);
  }
  result.schemaVersion = SCHEMA_VERSION;
  return result;
}

function migrateV1ToV2(parsed) {
  const result = { ...parsed };
  if (Array.isArray(result.games)) {
    result.games = result.games.map((game) => {
      if (!game || typeof game !== "object") return game;
      const addTags = (rules) => {
        if (!Array.isArray(rules)) return rules;
        return rules.map((rule) => {
          if (rule && typeof rule === "object" && !Array.isArray(rule.tags)) {
            return { ...rule, tags: [] };
          }
          return rule;
        });
      };
      const migrated = {
        ...game,
        forgets: addTags(game.forgets),
        disputes: addTags(game.disputes),
        setup: addTags(game.setup),
        scoring: addTags(game.scoring)
      };
      if (Array.isArray(migrated.expansions)) {
        migrated.expansions = migrated.expansions.map((exp) => {
          if (!exp || typeof exp !== "object") return exp;
          return {
            ...exp,
            forgets: addTags(exp.forgets),
            disputes: addTags(exp.disputes),
            setup: addTags(exp.setup),
            scoring: addTags(exp.scoring)
          };
        });
      }
      return migrated;
    });
  }
  result.schemaVersion = SCHEMA_VERSION;
  return result;
}

function migrateV2ToV3(parsed) {
  const result = { ...parsed };
  if (Array.isArray(result.games)) {
    result.games = result.games.map((game) => {
      if (!game || typeof game !== "object") return game;
      const migrated = { ...game };
      if (!Array.isArray(migrated.loanRecords)) {
        migrated.loanRecords = [];
      } else {
        migrated.loanRecords = migrated.loanRecords.map((record) => {
          if (!record || typeof record !== "object") return record;
          return {
            id: record.id || generateId(),
            borrower: typeof record.borrower === "string" ? record.borrower : "",
            borrowedAt: typeof record.borrowedAt === "string" ? record.borrowedAt : new Date().toISOString().slice(0, 10),
            expectedReturnAt: typeof record.expectedReturnAt === "string" ? record.expectedReturnAt : "",
            notes: typeof record.notes === "string" ? record.notes : "",
            returnedAt: record.returnedAt || null
          };
        });
      }
      return migrated;
    });
  }
  result.schemaVersion = SCHEMA_VERSION;
  return result;
}

function runMigrations(parsed) {
  if (!parsed || typeof parsed !== "object") {
    return { schemaVersion: SCHEMA_VERSION, games: [] };
  }
  const currentVersion = typeof parsed.schemaVersion === "number" ? parsed.schemaVersion : 0;
  if (currentVersion >= SCHEMA_VERSION) {
    return parsed;
  }
  let migrated = parsed;
  if (currentVersion < 1) {
    migrated = migrateV0ToV1(migrated);
  }
  if (currentVersion < 2) {
    migrated = migrateV1ToV2(migrated);
  }
  if (currentVersion < 3) {
    migrated = migrateV2ToV3(migrated);
  }
  return migrated;
}

const defaultState = {
  schemaVersion: SCHEMA_VERSION,
  selectedId: "",
  selectedExpansionId: "",
  selectedChecklistIds: [],
  selectedChecklistExpansionIds: {},
  checklistPlayerFilter: "all",
  filterMustReview: false,
  filterViews: [],
  activeFilterViewId: "",
  tagFilter: "",
  listTagFilter: "",
  checklistTagFilter: "",
  partyTagFilter: "",
  games: [
    {
      id: crypto.randomUUID(),
      name: "奥尔良",
      minPlayers: 2,
      maxPlayers: 4,
      duration: 90,
      complexity: "中",
      lastPlayed: "2025-11-20",
      cover: "",
      forgets: normalizeRuleArray(["商站建造前先确认道路或水路连接", "袋中随从抽完后不是重洗弃堆，而是从已回袋内容继续抽"]),
      disputes: normalizeRuleArray(["事件顺序和玩家动作结算先后", "科技板是否能替代所有同类随从"]),
      setup: normalizeRuleArray(["按人数放置货物板块", "每位玩家拿起始随从、商人和个人板"]),
      scoring: normalizeRuleArray(["货物分数", "商站和市民乘区块", "金币和建筑剩余加分"]),
      loanRecords: [],
      expansions: [
        {
          id: crypto.randomUUID(),
          name: "贸易与阴谋",
          forgets: normalizeRuleArray(["阴谋卡使用后立即结算，不能留存到下一轮", "贸易路线必须连续，不能跳过已有商站"]),
          disputes: normalizeRuleArray(["贸易卡能否在他人回合使用"]),
          setup: normalizeRuleArray(["每位玩家额外拿取2张阴谋卡", "放置贸易板块到对应区域"]),
          scoring: normalizeRuleArray(["贸易路线长度加分", "阴谋卡剩余扣分"])
        },
        {
          id: crypto.randomUUID(),
          name: "新大陆",
          forgets: normalizeRuleArray(["航行必须消耗粮食，不够则损失船员", "新大陆商站需双倍建造成本"]),
          disputes: normalizeRuleArray([]),
          setup: normalizeRuleArray(["放置新大陆地图板块", "每位玩家获得1艘船标记"]),
          scoring: normalizeRuleArray(["新大陆商站双倍分数", "航行成功次数奖励"])
        }
      ],
      disputeRulings: normalizeDisputeRulings([
        { disputeText: "事件顺序和玩家动作结算先后", expansionId: "", rulings: [] },
        { disputeText: "科技板是否能替代所有同类随从", expansionId: "", rulings: [] },
        { disputeText: "贸易卡能否在他人回合使用", expansionId: "", rulings: [] }
      ])
    },
    {
      id: crypto.randomUUID(),
      name: "盖亚计划",
      minPlayers: 1,
      maxPlayers: 4,
      duration: 150,
      complexity: "重",
      lastPlayed: "2025-08-02",
      cover: "",
      forgets: normalizeRuleArray(["联邦连接时卫星数量和能量消耗要一起核对", "研究升到顶必须拿对应科技板限制"]),
      disputes: normalizeRuleArray(["被动充能是否能拒绝", "星球改造费用受哪些能力影响"]),
      setup: normalizeRuleArray(["随机终局计分板和回合得分板", "按种族设置起始资源和母星"]),
      scoring: normalizeRuleArray(["终局计分板", "科技轨排名", "联邦和建筑分"]),
      loanRecords: [],
      expansions: [],
      disputeRulings: normalizeDisputeRulings([
        { disputeText: "被动充能是否能拒绝", expansionId: "", rulings: [] },
        { disputeText: "星球改造费用受哪些能力影响", expansionId: "", rulings: [] }
      ])
    },
    {
      id: crypto.randomUUID(),
      name: "花砖物语",
      minPlayers: 2,
      maxPlayers: 4,
      duration: 45,
      complexity: "轻",
      lastPlayed: "2026-03-15",
      cover: "",
      forgets: normalizeRuleArray(["每轮结束先铺墙再补工厂展示区", "地板线扣分后清空对应砖"]),
      disputes: normalizeRuleArray(["同色砖放置限制是否看整面墙", "中央区起始玩家标记是否必须拿"]),
      setup: normalizeRuleArray(["按人数放工厂圆盘", "每个圆盘补4块砖"]),
      scoring: normalizeRuleArray(["横竖相邻即时分", "完整行列和颜色终局加分"]),
      loanRecords: [],
      expansions: [],
      disputeRulings: normalizeDisputeRulings([
        { disputeText: "同色砖放置限制是否看整面墙", expansionId: "", rulings: [] },
        { disputeText: "中央区起始玩家标记是否必须拿", expansionId: "", rulings: [] }
      ])
    }
  ]
};

let state = loadState();
if (!state.selectedId) state.selectedId = state.games[0]?.id || "";

const els = {
  searchInput: document.querySelector("#searchInput"),
  playerFilter: document.querySelector("#playerFilter"),
  complexityFilter: document.querySelector("#complexityFilter"),
  sortMode: document.querySelector("#sortMode"),
  filterMustReview: document.querySelector("#filterMustReview"),
  gameForm: document.querySelector("#gameForm"),
  nameInput: document.querySelector("#nameInput"),
  minPlayersInput: document.querySelector("#minPlayersInput"),
  maxPlayersInput: document.querySelector("#maxPlayersInput"),
  durationInput: document.querySelector("#durationInput"),
  complexityInput: document.querySelector("#complexityInput"),
  lastPlayedInput: document.querySelector("#lastPlayedInput"),
  coverInput: document.querySelector("#coverInput"),
  gameList: document.querySelector("#gameList"),
  detailView: document.querySelector("#detailView"),
  gameCount: document.querySelector("#gameCount"),
  ruleCount: document.querySelector("#ruleCount"),
  staleGame: document.querySelector("#staleGame"),
  reviewPendingCount: document.querySelector("#reviewPendingCount"),
  visibleCount: document.querySelector("#visibleCount"),
  exportBtn: document.querySelector("#exportBtn"),
  importBtn: document.querySelector("#importBtn"),
  importFile: document.querySelector("#importFile"),
  resetBtn: document.querySelector("#resetBtn"),
  backupMessage: document.querySelector("#backupMessage"),
  confirmDialog: document.querySelector("#confirmDialog"),
  confirmTitle: document.querySelector("#confirmTitle"),
  confirmMessage: document.querySelector("#confirmMessage"),
  confirmOk: document.querySelector("#confirmOk"),
  confirmCancel: document.querySelector("#confirmCancel"),
  checklistPlayerFilter: document.querySelector("#checklistPlayerFilter"),
  checklistTagFilter: document.querySelector("#checklistTagFilter"),
  checklistGameList: document.querySelector("#checklistGameList"),
  checklistView: document.querySelector("#checklistView"),
  checklistSelectedCount: document.querySelector("#checklistSelectedCount"),
  clearChecklistBtn: document.querySelector("#clearChecklistBtn"),
  generateChecklistBtn: document.querySelector("#generateChecklistBtn"),
  loanDialog: document.querySelector("#loanDialog"),
  loanDialogTitle: document.querySelector("#loanDialogTitle"),
  loanForm: document.querySelector("#loanForm"),
  loanBorrowerInput: document.querySelector("#loanBorrowerInput"),
  loanBorrowedAtInput: document.querySelector("#loanBorrowedAtInput"),
  loanExpectedReturnInput: document.querySelector("#loanExpectedReturnInput"),
  loanNotesInput: document.querySelector("#loanNotesInput"),
  loanCancelBtn: document.querySelector("#loanCancelBtn"),
  loanHistoryDialog: document.querySelector("#loanHistoryDialog"),
  loanHistoryTitle: document.querySelector("#loanHistoryTitle"),
  loanHistoryContent: document.querySelector("#loanHistoryContent"),
  loanHistoryCloseBtn: document.querySelector("#loanHistoryCloseBtn"),
  loanActiveCount: document.querySelector("#loanActiveCount"),
  loanOverdueCount: document.querySelector("#loanOverdueCount"),
  loanActiveItem: document.querySelector("#loanActiveItem"),
  loanOverdueItem: document.querySelector("#loanOverdueItem"),
  loanStatsPanel: document.querySelector("#loanStatsPanel"),
  loanStatsBorrowerCount: document.querySelector("#loanStatsBorrowerCount"),
  loanStatActive: document.querySelector("#loanStatActive"),
  loanStatOverdue: document.querySelector("#loanStatOverdue"),
  loanStatTopBorrower: document.querySelector("#loanStatTopBorrower"),
  loanStatTopBorrowerCount: document.querySelector("#loanStatTopBorrowerCount"),
  loanStatRecentReturn: document.querySelector("#loanStatRecentReturn"),
  loanStatRecentReturnDate: document.querySelector("#loanStatRecentReturnDate"),
  loanBorrowersList: document.querySelector("#loanBorrowersList"),
  borrowerDetailDialog: document.querySelector("#borrowerDetailDialog"),
  borrowerDetailName: document.querySelector("#borrowerDetailName"),
  borrowerDetailTotal: document.querySelector("#borrowerDetailTotal"),
  borrowerDetailActive: document.querySelector("#borrowerDetailActive"),
  borrowerDetailOverdue: document.querySelector("#borrowerDetailOverdue"),
  borrowerDetailAvgDays: document.querySelector("#borrowerDetailAvgDays"),
  borrowerDetailActiveList: document.querySelector("#borrowerDetailActiveList"),
  borrowerDetailHistoryList: document.querySelector("#borrowerDetailHistoryList"),
  borrowerDetailCloseBtn: document.querySelector("#borrowerDetailCloseBtn"),
  editDialog: document.querySelector("#editDialog"),
  editDialogTitle: document.querySelector("#editDialogTitle"),
  editForm: document.querySelector("#editForm"),
  editNameInput: document.querySelector("#editNameInput"),
  editMinPlayersInput: document.querySelector("#editMinPlayersInput"),
  editMaxPlayersInput: document.querySelector("#editMaxPlayersInput"),
  editDurationInput: document.querySelector("#editDurationInput"),
  editComplexityInput: document.querySelector("#editComplexityInput"),
  editLastPlayedInput: document.querySelector("#editLastPlayedInput"),
  editCoverInput: document.querySelector("#editCoverInput"),
  editCoverPreview: document.querySelector("#editCoverPreview"),
  editCoverPreviewImg: document.querySelector("#editCoverPreviewImg"),
  editCoverCompressInfo: document.querySelector("#editCoverCompressInfo"),
  editForgesContainer: document.querySelector("#editForgesContainer"),
  editDisputesContainer: document.querySelector("#editDisputesContainer"),
  editSetupContainer: document.querySelector("#editSetupContainer"),
  editScoringContainer: document.querySelector("#editScoringContainer"),
  editErrorMessage: document.querySelector("#editErrorMessage"),
  editCancelBtn: document.querySelector("#editCancelBtn"),
  expansionDialog: document.querySelector("#expansionDialog"),
  expansionDialogTitle: document.querySelector("#expansionDialogTitle"),
  expansionList: document.querySelector("#expansionList"),
  expansionNameInput: document.querySelector("#expansionNameInput"),
  expansionAddBtn: document.querySelector("#expansionAddBtn"),
  expansionCancelBtn: document.querySelector("#expansionCancelBtn"),
  editExpansionSelect: document.querySelector("#editExpansionSelect"),
  rulingDialog: document.querySelector("#rulingDialog"),
  rulingDialogTitle: document.querySelector("#rulingDialogTitle"),
  rulingDisputeLabel: document.querySelector("#rulingDisputeLabel"),
  rulingForm: document.querySelector("#rulingForm"),
  rulingDecisionInput: document.querySelector("#rulingDecisionInput"),
  rulingParticipantsInput: document.querySelector("#rulingParticipantsInput"),
  rulingDateInput: document.querySelector("#rulingDateInput"),
  rulingNotesInput: document.querySelector("#rulingNotesInput"),
  rulingCancelBtn: document.querySelector("#rulingCancelBtn"),
  rulingSubmitBtn: document.querySelector("#rulingSubmitBtn"),
  coverGalleryGrid: document.querySelector("#coverGalleryGrid"),
  coverGalleryCount: document.querySelector("#coverGalleryCount"),
  coverGalleryFileInput: document.querySelector("#coverGalleryFileInput"),
  partyStatusLabel: document.querySelector("#partyStatusLabel"),
  partyIntro: document.querySelector("#partyIntro"),
  startPartyBtn: document.querySelector("#startPartyBtn"),
  partyConfigView: document.querySelector("#partyConfigView"),
  partyNameInput: document.querySelector("#partyNameInput"),
  partyPlayerCountInput: document.querySelector("#partyPlayerCountInput"),
  partyCandidateList: document.querySelector("#partyCandidateList"),
  partyPlayersContainer: document.querySelector("#partyPlayersContainer"),
  partyGenerateBtn: document.querySelector("#partyGenerateBtn"),
  partyResultView: document.querySelector("#partyResultView"),
  partyResultTitle: document.querySelector("#partyResultTitle"),
  partyRecommendations: document.querySelector("#partyRecommendations"),
  partyTagFilterContainer: document.querySelector("#partyTagFilterContainer"),
  partyPreparation: document.querySelector("#partyPreparation"),
  partyBackToConfigBtn: document.querySelector("#partyBackToConfigBtn"),
  partyResetBtn: document.querySelector("#partyResetBtn"),
  saveViewBtn: document.querySelector("#saveViewBtn"),
  filterViewsList: document.querySelector("#filterViewsList"),
  saveViewDialog: document.querySelector("#saveViewDialog"),
  saveViewTitle: document.querySelector("#saveViewTitle"),
  saveViewHint: document.querySelector("#saveViewHint"),
  saveViewPreview: document.querySelector("#saveViewPreview"),
  saveViewNameInput: document.querySelector("#saveViewNameInput"),
  saveViewCancelBtn: document.querySelector("#saveViewCancelBtn"),
  saveViewConfirmBtn: document.querySelector("#saveViewConfirmBtn"),
  batchCoverBtn: document.querySelector("#batchCoverBtn"),
  batchCoverDialog: document.querySelector("#batchCoverDialog"),
  batchCoverFileInput: document.querySelector("#batchCoverFileInput"),
  batchCoverDropzone: document.querySelector("#batchCoverDropzone"),
  batchCoverPreview: document.querySelector("#batchCoverPreview"),
  batchCoverTotal: document.querySelector("#batchCoverTotal"),
  batchCoverMatched: document.querySelector("#batchCoverMatched"),
  batchCoverUnmatched: document.querySelector("#batchCoverUnmatched"),
  batchCoverBackBtn: document.querySelector("#batchCoverBackBtn"),
  batchCoverConfirmBtn: document.querySelector("#batchCoverConfirmBtn"),
  batchCoverCloseBtn: document.querySelector("#batchCoverCloseBtn"),
  batchCoverResultText: document.querySelector("#batchCoverResultText"),
  listTagFilter: document.querySelector("#listTagFilter"),
  reviewSessionDialog: document.querySelector("#reviewSessionDialog"),
  reviewSessionTitle: document.querySelector("#reviewSessionTitle"),
  reviewSessionProgress: document.querySelector("#reviewSessionProgress"),
  reviewSessionProgressFill: document.querySelector("#reviewSessionProgressFill"),
  reviewSessionContent: document.querySelector("#reviewSessionContent"),
  reviewSessionCloseBtn: document.querySelector("#reviewSessionCloseBtn")
};

function ruleTags(rule) {
  if (!rule || typeof rule !== "object") return [];
  return Array.isArray(rule.tags) ? rule.tags : [];
}

function renderTagChips(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return "";
  return `<span class="rule-tags">${tags.map(t => `<span class="rule-tag-chip tag-${t}">${escapeHtml(t)}</span>`).join("")}</span>`;
}

function renderTagSelector(selectedTags, namePrefix) {
  const prefix = namePrefix || "tags";
  return `<div class="tag-selector">${RULE_TAGS.map(t => {
    const checked = Array.isArray(selectedTags) && selectedTags.includes(t) ? "checked" : "";
    return `<label class="tag-selector-item"><input type="checkbox" name="${prefix}" value="${escapeHtml(t)}" ${checked} /><span class="rule-tag-chip tag-${t}">${escapeHtml(t)}</span></label>`;
  }).join("")}</div>`;
}

function renderTagFilterBar(currentFilter) {
  const chips = [`<button type="button" class="tag-filter-chip ${!currentFilter ? 'active' : ''}" data-tag-filter="">全部</button>`];
  for (const t of RULE_TAGS) {
    const active = currentFilter === t ? "active" : "";
    chips.push(`<button type="button" class="tag-filter-chip ${active}" data-tag-filter="${escapeHtml(t)}"><span class="rule-tag-chip tag-${t}">${escapeHtml(t)}</span></button>`);
  }
  return `<div class="tag-filter-bar">${chips.join("")}</div>`;
}

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(defaultState);
  try {
    const parsed = JSON.parse(saved);
    const migrated = runMigrations(parsed);
    const games = Array.isArray(migrated.games)
      ? migrated.games.map((game) => {
          const normalized = {
            ...game,
            id: game.id || generateId(),
            name: String(game.name || ""),
            minPlayers: Math.max(1, Number(game.minPlayers) || 2),
            maxPlayers: Math.max(1, Number(game.maxPlayers) || 4),
            duration: Math.max(5, Number(game.duration) || 60),
            complexity: ["轻", "中", "重"].includes(game.complexity) ? game.complexity : "中",
            lastPlayed: normalizeLastPlayed(game.lastPlayed),
            cover: String(game.cover || ""),
            loanRecords: Array.isArray(game.loanRecords) ? game.loanRecords : [],
            forgets: normalizeRuleArray(game.forgets),
            disputes: normalizeRuleArray(game.disputes),
            setup: normalizeRuleArray(game.setup),
            scoring: normalizeRuleArray(game.scoring),
            expansions: normalizeExpansionArray(game.expansions),
            disputeRulings: normalizeDisputeRulings(game.disputeRulings)
          };
          if (normalized.minPlayers > normalized.maxPlayers) {
            normalized.maxPlayers = normalized.minPlayers;
          }
          const newContainers = [{ disputes: normalized.disputes, expansionId: "" }];
          for (const exp of normalized.expansions || []) {
            newContainers.push({ disputes: exp.disputes, expansionId: exp.id });
          }
          syncDisputeRulingsForGame(normalized, null, newContainers);
          return normalized;
        })
      : structuredClone(defaultState).games;
    const result = {
      ...structuredClone(defaultState),
      ...migrated,
      games,
      schemaVersion: SCHEMA_VERSION,
      selectedExpansionId: migrated.selectedExpansionId || "",
      selectedChecklistIds: Array.isArray(migrated.selectedChecklistIds) ? migrated.selectedChecklistIds : [],
      selectedChecklistExpansionIds:
        typeof migrated.selectedChecklistExpansionIds === "object" && migrated.selectedChecklistExpansionIds !== null
          ? migrated.selectedChecklistExpansionIds
          : {},
      checklistPlayerFilter: migrated.checklistPlayerFilter || "all",
      filterMustReview: migrated.filterMustReview || false,
      filterViews: Array.isArray(migrated.filterViews) ? migrated.filterViews : [],
      activeFilterViewId: typeof migrated.activeFilterViewId === "string" ? migrated.activeFilterViewId : "",
      tagFilter: typeof migrated.tagFilter === "string" ? migrated.tagFilter : "",
    listTagFilter: typeof migrated.listTagFilter === "string" ? migrated.listTagFilter : "",
    checklistTagFilter: typeof migrated.checklistTagFilter === "string" ? migrated.checklistTagFilter : "",
    partyTagFilter: typeof migrated.partyTagFilter === "string" ? migrated.partyTagFilter : ""
  };
    if (saved !== JSON.stringify(result)) {
      localStorage.setItem(storageKey, JSON.stringify(result));
    }
    return result;
  } catch {
    return structuredClone(defaultState);
  }
}

function getCurrentLoan(game) {
  if (!game || !Array.isArray(game.loanRecords)) return null;
  return game.loanRecords.find((record) => !record.returnedAt) || null;
}

function getSortedLoanRecords(game) {
  if (!game || !Array.isArray(game.loanRecords)) return [];
  return [...game.loanRecords].sort((a, b) => new Date(b.borrowedAt) - new Date(a.borrowedAt));
}

function getAllLoanRecords() {
  const records = [];
  for (const game of state.games) {
    if (!Array.isArray(game.loanRecords)) continue;
    for (const record of game.loanRecords) {
      records.push({
        ...record,
        gameId: game.id,
        gameName: game.name
      });
    }
  }
  return records;
}

function getLoanStats() {
  const allRecords = getAllLoanRecords();
  const activeLoans = allRecords.filter((r) => !r.returnedAt);
  const overdueLoans = activeLoans.filter((r) => isOverdue(r));
  const returnedRecords = allRecords.filter((r) => r.returnedAt);

  const borrowerMap = new Map();
  for (const record of allRecords) {
    const name = record.borrower || "未知";
    if (!borrowerMap.has(name)) {
      borrowerMap.set(name, {
        name,
        total: 0,
        active: 0,
        overdue: 0,
        returned: 0,
        totalDays: 0,
        lastActive: null,
        records: []
      });
    }
    const borrower = borrowerMap.get(name);
    borrower.total++;
    borrower.records.push(record);
    if (!record.returnedAt) {
      borrower.active++;
      if (isOverdue(record)) borrower.overdue++;
      if (!borrower.lastActive || new Date(record.borrowedAt) > new Date(borrower.lastActive)) {
        borrower.lastActive = record.borrowedAt;
      }
    } else {
      borrower.returned++;
      const days = daysBetween(record.borrowedAt, record.returnedAt);
      borrower.totalDays += days;
    }
  }

  const borrowers = Array.from(borrowerMap.values()).sort((a, b) => {
    if (b.active !== a.active) return b.active - a.active;
    if (b.overdue !== a.overdue) return b.overdue - a.overdue;
    return b.total - a.total;
  });

  let topBorrower = null;
  let topBorrowerCount = 0;
  if (borrowers.length > 0) {
    const sorted = [...borrowers].sort((a, b) => b.total - a.total);
    topBorrower = sorted[0].name;
    topBorrowerCount = sorted[0].total;
  }

  let recentReturn = null;
  let recentReturnDate = null;
  if (returnedRecords.length > 0) {
    const sorted = [...returnedRecords].sort((a, b) => new Date(b.returnedAt) - new Date(a.returnedAt));
    recentReturn = sorted[0].gameName;
    recentReturnDate = sorted[0].returnedAt;
  }

  return {
    allRecords,
    activeLoans,
    overdueLoans,
    returnedRecords,
    borrowers,
    topBorrower,
    topBorrowerCount,
    recentReturn,
    recentReturnDate
  };
}

function getBorrowerRecords(borrowerName) {
  const allRecords = getAllLoanRecords();
  const filtered = allRecords.filter((r) => (r.borrower || "未知") === borrowerName);
  const active = filtered.filter((r) => !r.returnedAt);
  const history = filtered.filter((r) => r.returnedAt);
  const overdue = active.filter((r) => isOverdue(r));
  let totalDays = 0;
  for (const r of history) {
    totalDays += daysBetween(r.borrowedAt, r.returnedAt);
  }
  const avgDays = history.length > 0 ? Math.round(totalDays / history.length) : 0;
  return {
    name: borrowerName,
    total: filtered.length,
    active: active.length,
    overdue: overdue.length,
    avgDays,
    activeRecords: active.sort((a, b) => new Date(b.borrowedAt) - new Date(a.borrowedAt)),
    historyRecords: history.sort((a, b) => new Date(b.returnedAt) - new Date(a.returnedAt))
  };
}

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 5;
}

function getAvatarText(name) {
  if (!name) return "?";
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.slice(0, 1).toUpperCase();
}

function isValidDateString(str) {
  if (typeof str !== "string") return false;
  const trimmed = str.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  const d = new Date(`${trimmed}T00:00:00`);
  if (isNaN(d.getTime())) return false;
  const parts = trimmed.split("-").map(Number);
  return d.getFullYear() === parts[0] && d.getMonth() + 1 === parts[1] && d.getDate() === parts[2];
}

function getDefaultLastPlayed() {
  const d = new Date();
  d.setMonth(d.getMonth() - 2);
  return d.toISOString().slice(0, 10);
}

function normalizeLastPlayed(value) {
  if (isValidDateString(value)) {
    const d = new Date(`${value}T00:00:00`);
    const now = new Date();
    if (d > now) {
      return now.toISOString().slice(0, 10);
    }
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      const now = new Date();
      if (parsed > now) parsed.setTime(now.getTime());
      return parsed.toISOString().slice(0, 10);
    }
  }
  return getDefaultLastPlayed();
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(fromStr, toStr) {
  const from = new Date(`${fromStr}T00:00:00`);
  const to = new Date(`${toStr}T00:00:00`);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return 0;
  const diff = Math.floor((to - from) / 86400000);
  return isNaN(diff) ? 0 : diff;
}

function isOverdue(loan) {
  if (!loan || !loan.expectedReturnAt || loan.returnedAt) return false;
  return daysBetween(loan.expectedReturnAt, new Date().toISOString().slice(0, 10)) > 0;
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function daysSince(dateString) {
  if (!isValidDateString(dateString)) return 0;
  const date = new Date(`${dateString}T00:00:00`);
  if (isNaN(date.getTime())) return 0;
  const diff = Math.floor((today - date) / 86400000);
  return Math.max(0, isNaN(diff) ? 0 : diff);
}

function getExpansionById(game, expansionId) {
  if (!game || !expansionId || !Array.isArray(game.expansions)) return null;
  return game.expansions.find((e) => e.id === expansionId) || null;
}

function getDisputeRulingEntry(game, disputeText, expansionId) {
  const rulings = Array.isArray(game.disputeRulings) ? game.disputeRulings : [];
  const expId = expansionId || "";
  return rulings.find((entry) => entry.disputeText === disputeText && (entry.expansionId || "") === expId) || null;
}

function hasUnresolvedDisputes(game) {
  if (!game) return false;
  const rulings = Array.isArray(game.disputeRulings) ? game.disputeRulings : [];
  const containers = [{ container: game, expansionId: "" }];
  for (const exp of game.expansions || []) {
    containers.push({ container: exp, expansionId: exp.id });
  }
  for (const { container, expansionId } of containers) {
    const disputes = container?.disputes || [];
    for (const dispute of disputes) {
      const text = ruleText(dispute);
      const entry = rulings.find((r) => r.disputeText === text && (r.expansionId || "") === expansionId);
      if (!entry || entry.rulings.length === 0) return true;
    }
  }
  return false;
}

function ensureDisputeRulingEntry(game, disputeText, expansionId) {
  if (!Array.isArray(game.disputeRulings)) {
    game.disputeRulings = [];
  }
  const expId = expansionId || "";
  let entry = game.disputeRulings.find((r) => r.disputeText === disputeText && (r.expansionId || "") === expId);
  if (!entry) {
    entry = { disputeText, expansionId: expId, rulings: [] };
    game.disputeRulings.push(entry);
  }
  return entry;
}

function syncDisputeRulingsForGame(game, _oldDisputesMap, newContainers) {
  if (!Array.isArray(game.disputeRulings)) {
    game.disputeRulings = [];
  }
  const newDisputeKeys = new Set();
  for (const { disputes, expansionId } of newContainers) {
    const expId = expansionId || "";
    for (const dispute of disputes || []) {
      const text = ruleText(dispute);
      newDisputeKeys.add(`${expId}::${text}`);
      ensureDisputeRulingEntry(game, text, expId);
    }
  }
  game.disputeRulings = game.disputeRulings.filter((entry) => {
    const key = `${entry.expansionId || ""}::${entry.disputeText}`;
    return newDisputeKeys.has(key);
  });
}

function getCurrentExpansion(game) {
  return getExpansionById(game, state.selectedExpansionId);
}

function getRuleContainer(game, expansionId) {
  if (!game) return null;
  if (!expansionId) return game;
  return getExpansionById(game, expansionId);
}

function getCurrentRuleContainer(game) {
  return getRuleContainer(game, state.selectedExpansionId);
}

function getAllRules(game, expansionId) {
  const container = getRuleContainer(game, expansionId);
  if (!container) return [];
  return [...container.forgets, ...container.disputes, ...container.setup, ...container.scoring];
}

function getAllRuleObjects() {
  const rules = [];
  for (const game of state.games) {
    rules.push(...getAllRules(game, ""));
    for (const exp of game.expansions) {
      rules.push(...getAllRules(game, exp.id));
    }
  }
  return rules;
}

function countRulesByStatus(status) {
  return getAllRuleObjects().filter((rule) => ruleStatus(rule) === status).length;
}

function getReviewPendingCount() {
  const all = getAllRuleObjects();
  return all.filter((rule) => {
    const s = ruleStatus(rule);
    return s === REVIEW_STATUS.UNMARKED || s === REVIEW_STATUS.STILL_FORGET || s === REVIEW_STATUS.MUST_REVIEW;
  }).length;
}

function hasMustReviewRule(game) {
  if (getAllRules(game, "").some((rule) => ruleStatus(rule) === REVIEW_STATUS.MUST_REVIEW)) return true;
  for (const exp of game.expansions || []) {
    if (getAllRules(game, exp.id).some((rule) => ruleStatus(rule) === REVIEW_STATUS.MUST_REVIEW)) return true;
  }
  return false;
}

function setRuleStatus(gameId, ruleKey, ruleIndex, status, expansionId = "") {
  const game = state.games.find((g) => g.id === gameId);
  if (!game) return;
  const container = getRuleContainer(game, expansionId);
  if (!container) return;
  const rules = container[ruleKey];
  if (!rules || ruleIndex < 0 || ruleIndex >= rules.length) return;
  const currentStatus = ruleStatus(rules[ruleIndex]);
  if (currentStatus === status) {
    rules[ruleIndex].status = REVIEW_STATUS.UNMARKED;
  } else {
    rules[ruleIndex].status = status;
  }
  saveState();
}

function getReviewProgress(game, expansionId = "") {
  const all = getAllRules(game, expansionId);
  if (all.length === 0) return { total: 0, mastered: 0, pending: 0, mustReview: 0 };
  const mastered = all.filter((r) => ruleStatus(r) === REVIEW_STATUS.MASTERED).length;
  const mustReview = all.filter((r) => ruleStatus(r) === REVIEW_STATUS.MUST_REVIEW).length;
  const stillForget = all.filter((r) => ruleStatus(r) === REVIEW_STATUS.STILL_FORGET).length;
  const unmarked = all.filter((r) => ruleStatus(r) === REVIEW_STATUS.UNMARKED).length;
  return {
    total: all.length,
    mastered,
    mustReview,
    stillForget,
    unmarked,
    pending: stillForget + mustReview + unmarked
  };
}

function getAllRulesIncludingExpansions(game) {
  const rules = [...getAllRules(game, "")];
  for (const exp of game.expansions || []) {
    rules.push(...getAllRules(game, exp.id));
  }
  return rules;
}

function getFilteredGames() {
  const keyword = els.searchInput.value.trim();
  const player = els.playerFilter.value;
  const complexity = els.complexityFilter.value;
  const mustReviewOnly = els.filterMustReview && els.filterMustReview.checked;
  const listTagFilter = els.listTagFilter ? els.listTagFilter.value : (state.listTagFilter || "");
  const games = state.games.filter((game) => {
    const allRulesText = getAllRulesIncludingExpansions(game).map(ruleText).join("");
    const expansionNames = (game.expansions || []).map((e) => e.name).join("");
    const text = `${game.name}${expansionNames}${allRulesText}`;
    const matchesKeyword = !keyword || text.includes(keyword);
    const matchesPlayer = player === "all" || (Number(player) >= game.minPlayers && Number(player) <= game.maxPlayers);
    const matchesComplexity = complexity === "all" || game.complexity === complexity;
    const matchesMustReview = !mustReviewOnly || hasMustReviewRule(game);
    const matchesTag = !listTagFilter || getAllRulesIncludingExpansions(game).some((r) => ruleTags(r).includes(listTagFilter));
    return matchesKeyword && matchesPlayer && matchesComplexity && matchesMustReview && matchesTag;
  });

  if (els.sortMode.value === "name") return games.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  if (els.sortMode.value === "complexity") {
    const rank = { 轻: 1, 中: 2, 重: 3 };
    return games.sort((a, b) => rank[b.complexity] - rank[a.complexity]);
  }
  return games.sort((a, b) => daysSince(b.lastPlayed) - daysSince(a.lastPlayed));
}

function getTotalReviewProgress(game) {
  const all = getAllRulesIncludingExpansions(game);
  if (all.length === 0) return { total: 0, mastered: 0, pending: 0, mustReview: 0 };
  const mastered = all.filter((r) => ruleStatus(r) === REVIEW_STATUS.MASTERED).length;
  const mustReview = all.filter((r) => ruleStatus(r) === REVIEW_STATUS.MUST_REVIEW).length;
  const stillForget = all.filter((r) => ruleStatus(r) === REVIEW_STATUS.STILL_FORGET).length;
  const unmarked = all.filter((r) => ruleStatus(r) === REVIEW_STATUS.UNMARKED).length;
  return {
    total: all.length,
    mastered,
    mustReview,
    stillForget,
    unmarked,
    pending: stillForget + mustReview + unmarked
  };
}

function renderSummary() {
  const allRuleCount = state.games.reduce((sum, game) => sum + getAllRulesIncludingExpansions(game).length, 0);
  const stale = [...state.games].sort((a, b) => daysSince(b.lastPlayed) - daysSince(a.lastPlayed))[0];
  els.gameCount.textContent = state.games.length;
  els.ruleCount.textContent = allRuleCount;
  els.staleGame.textContent = stale ? `${daysSince(stale.lastPlayed)}天` : "-";
  if (els.reviewPendingCount) {
    els.reviewPendingCount.textContent = getReviewPendingCount();
  }
  const loanStats = getLoanStats();
  if (els.loanActiveCount) {
    els.loanActiveCount.textContent = loanStats.activeLoans.length;
  }
  if (els.loanOverdueCount) {
    els.loanOverdueCount.textContent = loanStats.overdueLoans.length;
  }
  renderLoanStatsPanel(loanStats);
  renderBorrowerList(loanStats);
}

function renderLoanStatsPanel(loanStats) {
  if (!els.loanStatsPanel) return;
  if (els.loanStatsBorrowerCount) {
    els.loanStatsBorrowerCount.textContent = `${loanStats.borrowers.length} 位借阅人`;
  }
  if (els.loanStatActive) {
    els.loanStatActive.textContent = loanStats.activeLoans.length;
  }
  if (els.loanStatOverdue) {
    els.loanStatOverdue.textContent = loanStats.overdueLoans.length;
  }
  if (els.loanStatTopBorrower) {
    els.loanStatTopBorrower.textContent = loanStats.topBorrower || "-";
  }
  if (els.loanStatTopBorrowerCount) {
    els.loanStatTopBorrowerCount.textContent = loanStats.topBorrower
      ? `共 ${loanStats.topBorrowerCount} 次借阅`
      : "暂无记录";
  }
  if (els.loanStatRecentReturn) {
    els.loanStatRecentReturn.textContent = loanStats.recentReturn || "-";
  }
  if (els.loanStatRecentReturnDate) {
    els.loanStatRecentReturnDate.textContent = loanStats.recentReturnDate
      ? `${formatDate(loanStats.recentReturnDate)} 归还`
      : "暂无记录";
  }
}

function renderBorrowerList(loanStats) {
  if (!els.loanBorrowersList) return;
  if (loanStats.borrowers.length === 0) {
    els.loanBorrowersList.innerHTML = `
      <div class="borrower-empty">
        暂无借阅记录。从桌游详情页点击「借出桌游」开始记录吧～
      </div>
    `;
    return;
  }
  els.loanBorrowersList.innerHTML = loanStats.borrowers
    .map((borrower) => {
      const badges = [];
      if (borrower.overdue > 0) {
        badges.push(`<span class="borrower-badge overdue">⚠️ ${borrower.overdue} 本逾期</span>`);
      } else if (borrower.active > 0) {
        badges.push(`<span class="borrower-badge active">📤 ${borrower.active} 本借阅中</span>`);
      }
      return `
        <div class="borrower-card" data-borrower="${escapeHtml(borrower.name)}" data-color="${getAvatarColor(borrower.name)}">
          <div class="borrower-avatar">${getAvatarText(borrower.name)}</div>
          <div class="borrower-info">
            <div class="borrower-name">${escapeHtml(borrower.name)}</div>
            <div class="borrower-meta">
              <span>累计 ${borrower.total} 次</span>
              ${badges.join("")}
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function openBorrowerDetail(borrowerName) {
  if (!els.borrowerDetailDialog) return;
  const data = getBorrowerRecords(borrowerName);
  els.borrowerDetailName.textContent = `👤 ${data.name} 的借阅详情`;
  els.borrowerDetailTotal.textContent = data.total;
  els.borrowerDetailActive.textContent = data.active;
  els.borrowerDetailOverdue.textContent = data.overdue;
  els.borrowerDetailAvgDays.textContent = `${data.avgDays} 天`;

  if (data.activeRecords.length === 0) {
    els.borrowerDetailActiveList.innerHTML = `
      <div class="borrower-detail-empty">当前没有未归还的桌游 ✅</div>
    `;
  } else {
    els.borrowerDetailActiveList.innerHTML = data.activeRecords
      .map((record) => {
        const overdue = isOverdue(record);
        const borrowedDays = daysBetween(record.borrowedAt, new Date().toISOString().slice(0, 10));
        return `
          <div class="borrower-detail-item active ${overdue ? "overdue" : ""}" data-game-id="${record.gameId}">
            <div class="borrower-detail-item-header">
              <span class="borrower-detail-item-title">《${escapeHtml(record.gameName)}》</span>
              <span class="borrower-detail-item-status ${overdue ? "overdue" : "active"}">
                ${overdue ? `⚠️ 逾期 ${daysBetween(record.expectedReturnAt || record.borrowedAt, new Date().toISOString().slice(0, 10))} 天` : "📤 借阅中"}
              </span>
            </div>
            <div class="borrower-detail-item-dates">
              <span>借出：${formatDate(record.borrowedAt)}</span>
              ${record.expectedReturnAt ? `<span>预计归还：${formatDate(record.expectedReturnAt)}</span>` : ""}
              <span>已借 ${borrowedDays} 天</span>
            </div>
            ${record.notes ? `<div class="borrower-detail-item-notes">备注：${escapeHtml(record.notes)}</div>` : ""}
          </div>
        `;
      })
      .join("");
  }

  if (data.historyRecords.length === 0) {
    els.borrowerDetailHistoryList.innerHTML = `
      <div class="borrower-detail-empty">暂无历史借阅记录</div>
    `;
  } else {
    els.borrowerDetailHistoryList.innerHTML = data.historyRecords
      .map((record) => {
        const borrowedDays = daysBetween(record.borrowedAt, record.returnedAt);
        return `
          <div class="borrower-detail-item" data-game-id="${record.gameId}">
            <div class="borrower-detail-item-header">
              <span class="borrower-detail-item-title">《${escapeHtml(record.gameName)}》</span>
              <span class="borrower-detail-item-status returned">✅ 已归还</span>
            </div>
            <div class="borrower-detail-item-dates">
              <span>借出：${formatDate(record.borrowedAt)}</span>
              <span>归还：${formatDate(record.returnedAt)}</span>
              <span>借阅 ${borrowedDays} 天</span>
            </div>
            ${record.notes ? `<div class="borrower-detail-item-notes">备注：${escapeHtml(record.notes)}</div>` : ""}
          </div>
        `;
      })
      .join("");
  }

  els.borrowerDetailDialog.classList.remove("hidden");
}

function closeBorrowerDetail() {
  if (!els.borrowerDetailDialog) return;
  els.borrowerDetailDialog.classList.add("hidden");
}

function renderReviewProgressBadges(game) {
  const progress = getTotalReviewProgress(game);
  if (progress.total === 0) return "";
  const badges = [];
  if (progress.mustReview > 0) {
    badges.push(`<span class="review-badge must-review" title="下次必看">${progress.mustReview} 🔔</span>`);
  }
  if (progress.stillForget > 0) {
    badges.push(`<span class="review-badge still-forget" title="还会忘">${progress.stillForget} 💭</span>`);
  }
  if (progress.mastered > 0) {
    badges.push(`<span class="review-badge mastered" title="已掌握">${progress.mastered} ✅</span>`);
  }
  return badges.length > 0 ? `<div class="review-progress">${badges.join("")}</div>` : "";
}

function renderList() {
  const games = getFilteredGames();
  els.visibleCount.textContent = `${games.length}个匹配`;
  els.gameList.innerHTML =
    games
      .map((game) => {
        const selected = game.id === state.selectedId ? "selected" : "";
        const currentLoan = getCurrentLoan(game);
        const overdue = currentLoan && isOverdue(currentLoan);
        const loanBadge = currentLoan
          ? `<span class="loan-ribbon ${overdue ? "overdue" : ""}">
              ${overdue ? "⚠️ 逾期未还" : "📤 已借出"}
              ${currentLoan.borrower ? ` · ${escapeHtml(currentLoan.borrower)}` : ""}
            </span>`
          : "";
        const progressBadges = renderReviewProgressBadges(game);
        const unresolvedDisputeBadge = hasUnresolvedDisputes(game)
          ? `<span class="dispute-unresolved-ribbon">⚖️ 未裁定</span>`
          : "";
        return `
          <article class="game-card ${selected}" data-game-id="${game.id}">
            <div class="cover ${currentLoan ? "on-loan" : ""}">
              ${
                game.cover
                  ? `<img src="${game.cover}" alt="${escapeHtml(game.name)}封面" />`
                  : `<span>${escapeHtml(game.name.slice(0, 2))}</span>`
              }
              <span class="stale-ribbon">${daysSince(game.lastPlayed)}天未玩</span>
              ${loanBadge}
              ${unresolvedDisputeBadge}
            </div>
            <div class="game-body">
              <h3>${escapeHtml(game.name)}</h3>
              <div class="game-meta">
                <span class="pill">${game.minPlayers}-${game.maxPlayers}人</span>
                <span class="pill">${game.duration}分钟</span>
                <span class="pill heavy">${escapeHtml(game.complexity)}</span>
              </div>
              ${progressBadges}
            </div>
          </article>
        `;
      })
      .join("") || `<p class="empty">没有符合筛选的桌游。</p>`;
}

function renderLoanStatus(game) {
  const currentLoan = getCurrentLoan(game);
  if (!currentLoan) {
    return `
      <section class="loan-section">
        <h3>📚 借出状态</h3>
        <div class="loan-status available">
          <span class="loan-status-icon">✅</span>
          <span class="loan-status-text">当前在馆，可随时借出</span>
        </div>
        <div class="loan-actions">
          <button id="loanOutBtn" type="button" class="primary">借出桌游</button>
          <button id="viewLoanHistoryBtn" type="button">查看借出记录</button>
        </div>
      </section>
    `;
  }
  const overdue = isOverdue(currentLoan);
  const borrowedDays = daysBetween(currentLoan.borrowedAt, new Date().toISOString().slice(0, 10));
  return `
    <section class="loan-section">
      <h3>📚 借出状态</h3>
      <div class="loan-status ${overdue ? "overdue" : "on-loan"}">
        <span class="loan-status-icon">${overdue ? "⚠️" : "📤"}</span>
        <div class="loan-status-text">
          <strong>${overdue ? "已逾期未还" : "已借出"}</strong>
          ${currentLoan.borrower ? `<span>借给：${escapeHtml(currentLoan.borrower)}</span>` : ""}
          <span>借出日期：${formatDate(currentLoan.borrowedAt)}（已借出 ${borrowedDays} 天）</span>
          ${currentLoan.expectedReturnAt ? `<span>预计归还：${formatDate(currentLoan.expectedReturnAt)}</span>` : ""}
          ${currentLoan.notes ? `<span class="loan-notes">备注：${escapeHtml(currentLoan.notes)}</span>` : ""}
        </div>
      </div>
      <div class="loan-actions">
        <button id="returnBtn" type="button" class="primary">标记归还</button>
        <button id="viewLoanHistoryBtn" type="button">查看借出记录</button>
      </div>
    </section>
  `;
}

function renderReviewSummary(game, expansionId = "") {
  const progress = getReviewProgress(game, expansionId);
  if (progress.total === 0) return "";

  const mustReviewCount = progress.mustReview;
  const stillForgetCount = progress.stillForget;
  const pendingCount = progress.pending;

  const unresolvedDisputes = (() => {
    const rulings = Array.isArray(game.disputeRulings) ? game.disputeRulings : [];
    const containers = [{ container: game, expansionId: "" }];
    for (const exp of game.expansions || []) {
      containers.push({ container: exp, expansionId: exp.id });
    }
    let count = 0;
    for (const { container, expansionId: eid } of containers) {
      if (expansionId && eid !== expansionId) continue;
      if (!expansionId && eid !== "") continue;
      const disputes = container?.disputes || [];
      for (const dispute of disputes) {
        const text = ruleText(dispute);
        const entry = rulings.find((r) => r.disputeText === text && (r.expansionId || "") === eid);
        if (!entry || entry.rulings.length === 0) count++;
      }
    }
    return count;
  })();

  const resumeBanner = renderResumeBanner(null);

  const actionBtns = [];
  if (mustReviewCount > 0) {
    actionBtns.push(`<button type="button" class="review-start-btn" data-start-review="${REVIEW_SESSION_SOURCE.MUST_REVIEW}">🔔 复习下次必看 (${mustReviewCount})</button>`);
  }
  if (stillForgetCount > 0) {
    actionBtns.push(`<button type="button" class="review-start-btn secondary" data-start-review="${REVIEW_SESSION_SOURCE.STILL_FORGET}">💭 复习还会忘 (${stillForgetCount})</button>`);
  }
  if (unresolvedDisputes > 0) {
    actionBtns.push(`<button type="button" class="review-start-btn secondary" data-start-review="${REVIEW_SESSION_SOURCE.UNRESOLVED_DISPUTES}">⚖️ 复习未裁定 (${unresolvedDisputes})</button>`);
  }
  if (pendingCount > 0) {
    actionBtns.push(`<button type="button" class="review-start-btn secondary" data-start-review="${REVIEW_SESSION_SOURCE.ALL_PENDING}">📖 全部待复习 (${pendingCount})</button>`);
  }

  const actionsHtml = actionBtns.length > 0
    ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">${actionBtns.join("")}</div>`
    : "";

  return `
    <section class="review-summary">
      ${resumeBanner}
      <h3>📖 复习进度</h3>
      <div class="review-stats">
        <div class="review-stat">
          <span class="review-stat-value">${progress.total}</span>
          <span class="review-stat-label">总规则</span>
        </div>
        <div class="review-stat">
          <span class="review-stat-value mastered">${progress.mastered}</span>
          <span class="review-stat-label">已掌握</span>
        </div>
        <div class="review-stat">
          <span class="review-stat-value still-forget">${progress.stillForget}</span>
          <span class="review-stat-label">还会忘</span>
        </div>
        <div class="review-stat">
          <span class="review-stat-value must-review">${progress.mustReview}</span>
          <span class="review-stat-label">下次必看</span>
        </div>
        <div class="review-stat">
          <span class="review-stat-value pending">${progress.pending}</span>
          <span class="review-stat-label">待复习</span>
        </div>
      </div>
      <div class="review-progress-bar">
        <div class="review-progress-fill" style="width: ${progress.total > 0 ? (progress.mastered / progress.total) * 100 : 0}%"></div>
      </div>
      ${actionsHtml}
    </section>
  `;
}

function renderExpansionSwitcher(game) {
  const expansions = game.expansions || [];
  const hasExpansions = expansions.length > 0;
  const currentExpansionId = state.selectedExpansionId || "";
  const currentLabel = currentExpansionId
    ? (expansions.find((e) => e.id === currentExpansionId)?.name || "基础游戏")
    : "基础游戏";

  return `
    <section class="expansion-switcher">
      <div class="expansion-switcher-header">
        <h3>📦 内容选择</h3>
        <button id="manageExpansionsBtn" type="button" class="text-btn">管理扩展包</button>
      </div>
      <div class="expansion-tabs">
        <button type="button" class="expansion-tab ${!currentExpansionId ? "active" : ""}" data-expansion-id="">
          基础游戏
        </button>
        ${expansions.map((exp) => `
          <button type="button" class="expansion-tab ${exp.id === currentExpansionId ? "active" : ""}" data-expansion-id="${exp.id}">
            ${escapeHtml(exp.name)}
          </button>
        `).join("")}
      </div>
      <div class="expansion-current-label">
        当前查看：<strong>${escapeHtml(currentLabel)}</strong>
        ${hasExpansions ? `<span class="expansion-count">共 ${expansions.length} 个扩展包</span>` : ""}
      </div>
    </section>
  `;
}

function renderDetail() {
  const game = state.games.find((item) => item.id === state.selectedId) || state.games[0];
  if (!game) {
    els.detailView.innerHTML = `<p class="empty">先添加一个桌游。</p>`;
    return;
  }
  state.selectedId = game.id;
  
  const currentExpansionId = state.selectedExpansionId || "";
  const container = getRuleContainer(game, currentExpansionId);
  const currentExpansion = getCurrentExpansion(game);
  const isBaseGame = !currentExpansionId;

  els.detailView.innerHTML = `
    <div class="quick-card">
      <div class="detail-cover">
        ${game.cover ? `<img src="${game.cover}" alt="${escapeHtml(game.name)}封面" />` : `<span>${escapeHtml(game.name.slice(0, 2))}</span>`}
      </div>
      <div>
        <h2>${escapeHtml(game.name)}</h2>
        <div class="game-meta">
          <span class="pill">${game.minPlayers}-${game.maxPlayers}人</span>
          <span class="pill">${game.duration}分钟</span>
          <span class="pill heavy">${escapeHtml(game.complexity)}</span>
          <span class="pill">${daysSince(game.lastPlayed)}天未玩</span>
        </div>
      </div>
      ${renderExpansionSwitcher(game)}
      ${renderReviewSummary(game, currentExpansionId)}
      ${renderTagFilterBar(state.tagFilter)}
      ${renderLoanStatus(game)}
      ${renderRuleSection("容易忘的规则", "forgets", container?.forgets || [], currentExpansionId)}
      ${renderDisputeSection(game, container?.disputes || [], currentExpansionId)}
      ${renderRuleSection("开局准备", "setup", container?.setup || [], currentExpansionId)}
      ${renderRuleSection("计分提醒", "scoring", container?.scoring || [], currentExpansionId)}
      <form class="add-rule" id="ruleForm">
        <select id="ruleTypeInput">
          <option value="forgets">容易忘的规则</option>
          <option value="disputes">常见争议</option>
          <option value="setup">开局准备</option>
          <option value="scoring">计分提醒</option>
        </select>
        <textarea id="ruleTextInput" rows="3" placeholder="补充一条${isBaseGame ? "基础游戏" : escapeHtml(currentExpansion?.name || "扩展包")}的规则提醒" required></textarea>
        ${renderTagSelector([], "newRuleTags")}
        <button class="primary" type="submit">加入规则卡片</button>
      </form>
      <div class="detail-actions">
        <button id="editGameBtn" type="button" class="primary">编辑</button>
        <button id="playedTodayBtn" type="button">标记今天玩过</button>
        <button id="deleteGameBtn" type="button">删除桌游</button>
      </div>
    </div>
  `;
}

function renderStatusButtons(gameId, ruleKey, ruleIndex, currentStatus, expansionId = "") {
  const statuses = [
    { value: REVIEW_STATUS.MASTERED, label: "已掌握", icon: "✅" },
    { value: REVIEW_STATUS.STILL_FORGET, label: "还会忘", icon: "💭" },
    { value: REVIEW_STATUS.MUST_REVIEW, label: "下次必看", icon: "🔔" }
  ];
  return statuses
    .map((s) => {
      const active = currentStatus === s.value ? "active" : "";
      return `<button type="button" class="status-btn ${active} ${s.value}" title="${s.label}" 
        data-status="${s.value}" data-rule-game="${gameId}" data-rule-key="${ruleKey}" data-rule-index="${ruleIndex}" data-rule-expansion="${expansionId}">${s.icon}</button>`;
    })
    .join("");
}

function renderRuleSection(title, key, items, expansionId = "") {
  const tagFilter = state.tagFilter || "";
  const filteredItems = tagFilter
    ? items.filter((item) => ruleTags(item).includes(tagFilter))
    : items;
  return `
    <section class="rule-section">
      <h3>${title}</h3>
      <ul class="rule-list">
        ${
          filteredItems
            .map(
              (item) => {
                const text = ruleText(item);
                const status = ruleStatus(item);
                const tags = ruleTags(item);
                const statusClass = status ? `status-${status}` : "";
                const originalIndex = items.indexOf(item);
                return `
                <li class="${statusClass}">
                  <div class="rule-content">
                    <span class="rule-text">${escapeHtml(text)}</span>
                    ${renderTagChips(tags)}
                    ${status ? `<span class="rule-status-label">${REVIEW_STATUS_LABELS[status]}</span>` : ""}
                  </div>
                  <div class="rule-actions">
                    ${renderStatusButtons(state.selectedId, key, originalIndex, status, expansionId)}
                    <button type="button" class="delete-btn" title="删除" data-rule-key="${key}" data-rule-index="${originalIndex}" data-rule-expansion="${expansionId}">×</button>
                  </div>
                </li>
              `;
              }
            )
            .join("") || `<li><span>暂无内容。</span></li>`
        }
      </ul>
    </section>
  `;
}

function renderDisputeSection(game, items, expansionId = "") {
  const rulings = Array.isArray(game.disputeRulings) ? game.disputeRulings : [];
  const expId = expansionId || "";
  const tagFilter = state.tagFilter || "";
  const filteredItems = tagFilter
    ? items.filter((item) => ruleTags(item).includes(tagFilter))
    : items;
  const disputeItems = filteredItems
    .map((item) => {
      const originalIndex = items.indexOf(item);
      const text = ruleText(item);
      const status = ruleStatus(item);
      const tags = ruleTags(item);
      const statusClass = status ? `status-${status}` : "";
      const entry = rulings.find((r) => r.disputeText === text && (r.expansionId || "") === expId);
      const hasRulings = entry && entry.rulings.length > 0;
      const rulingCount = hasRulings ? entry.rulings.length : 0;
      const lastRuling = hasRulings ? entry.rulings[entry.rulings.length - 1] : null;
      const unresolvedBadge = !hasRulings
        ? `<span class="dispute-unresolved-badge">未裁定</span>`
        : `<span class="dispute-resolved-badge">${rulingCount}次裁定</span>`;

      let rulingHistoryHtml = "";
      if (hasRulings) {
        rulingHistoryHtml = `
          <div class="dispute-ruling-history">
            ${entry.rulings.map((r) => `
              <div class="dispute-ruling-item" data-ruling-id="${r.id}" data-dispute-text="${escapeHtml(text)}" data-dispute-expansion="${expId}">
                <div class="dispute-ruling-header">
                  <span class="dispute-ruling-date">${formatDate(r.date)}</span>
                  <span class="dispute-ruling-participants">${r.participants}人参与</span>
                  <button type="button" class="dispute-ruling-delete" title="删除此裁定记录" data-ruling-id="${r.id}" data-dispute-text="${escapeHtml(text)}" data-dispute-expansion="${expId}">×</button>
                </div>
                <div class="dispute-ruling-decision">${escapeHtml(r.decision)}</div>
                ${r.notes ? `<div class="dispute-ruling-notes">备注：${escapeHtml(r.notes)}</div>` : ""}
              </div>
            `).join("")}
          </div>
        `;
      }

      return `
        <li class="dispute-item ${statusClass} ${hasRulings ? "has-rulings" : "no-rulings"}" data-dispute-index="${originalIndex}" data-dispute-text="${escapeHtml(text)}" data-dispute-expansion="${expansionId}">
          <div class="dispute-header">
            <div class="dispute-header-left">
              <button type="button" class="dispute-toggle-btn" data-dispute-index="${originalIndex}" data-dispute-expansion="${expansionId}" title="展开/收起">▶</button>
              <div class="rule-content">
                <span class="rule-text">${escapeHtml(text)}</span>
                <div class="dispute-badges">
                  ${unresolvedBadge}
                  ${status ? `<span class="rule-status-label">${REVIEW_STATUS_LABELS[status]}</span>` : ""}
                </div>
                ${renderTagChips(tags)}
              </div>
            </div>
            <div class="rule-actions">
              ${renderStatusButtons(state.selectedId, "disputes", originalIndex, status, expansionId)}
              <button type="button" class="add-ruling-btn" title="新增裁定" data-dispute-index="${originalIndex}" data-dispute-expansion="${expansionId}">⚖️</button>
              <button type="button" class="delete-btn" title="删除" data-rule-key="disputes" data-rule-index="${originalIndex}" data-rule-expansion="${expansionId}">×</button>
            </div>
          </div>
          ${lastRuling ? `
            <div class="dispute-latest-ruling">
              <span class="latest-ruling-label">最近裁定：</span>
              <span class="latest-ruling-text">${escapeHtml(lastRuling.decision)}</span>
              <span class="latest-ruling-date">（${formatDate(lastRuling.date)}）</span>
            </div>
          ` : ""}
          <div class="dispute-ruling-panel hidden" data-ruling-panel="${originalIndex}" data-ruling-expansion="${expansionId}">
            ${rulingHistoryHtml || `<p class="dispute-no-rulings">暂无裁定记录，点击 ⚖️ 新增裁定。</p>`}
          </div>
        </li>
      `;
    })
    .join("") || `<li><span>暂无内容。</span></li>`;

  return `
    <section class="rule-section dispute-section">
      <h3>常见争议 <span class="dispute-section-hint">点击 ▶ 展开裁定记录</span></h3>
      <ul class="rule-list dispute-list">
        ${disputeItems}
      </ul>
    </section>
  `;
}

function getChecklistFilteredGames() {
  const player = state.checklistPlayerFilter;
  return state.games.filter((game) => {
    if (player === "all") return true;
    if (player === "6") return game.maxPlayers >= 6;
    const p = Number(player);
    return p >= game.minPlayers && p <= game.maxPlayers;
  }).sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
}

function syncChecklistSelection() {
  const validIds = new Set(state.games.map((game) => game.id));
  state.selectedChecklistIds = state.selectedChecklistIds.filter((id) => validIds.has(id));
  const validExpansionIds = {};
  for (const game of state.games) {
    if (game.expansions && game.expansions.length > 0) {
      validExpansionIds[game.id] = new Set(game.expansions.map((e) => e.id));
    }
  }
  const cleanedExpansions = {};
  for (const gameId of state.selectedChecklistIds) {
    if (validExpansionIds[gameId]) {
      const selected = state.selectedChecklistExpansionIds[gameId] || [];
      cleanedExpansions[gameId] = selected.filter((id) => validExpansionIds[gameId].has(id));
    }
  }
  state.selectedChecklistExpansionIds = cleanedExpansions;
}

function renderChecklistGames() {
  syncChecklistSelection();
  const games = getChecklistFilteredGames();
  els.checklistSelectedCount.textContent = `已选 ${state.selectedChecklistIds.length} 个`;
  els.checklistPlayerFilter.value = state.checklistPlayerFilter;

  els.checklistGameList.innerHTML =
    games
      .map((game) => {
        const checked = state.selectedChecklistIds.includes(game.id) ? "checked" : "";
        const checkedClass = checked ? "checked" : "";
        const hasExpansions = game.expansions && game.expansions.length > 0;
        const selectedExpansionIds = state.selectedChecklistExpansionIds[game.id] || [];

        let expansionsHtml = "";
        if (hasExpansions && checked) {
          expansionsHtml = `
            <div class="checklist-expansions" data-checklist-game-expansions="${game.id}">
              <div class="checklist-expansions-label">包含扩展包：</div>
              <div class="checklist-expansions-list">
                ${game.expansions
                  .map((exp) => {
                    const expChecked = selectedExpansionIds.includes(exp.id) ? "checked" : "";
                    return `
                      <label class="checklist-expansion-item">
                        <input type="checkbox" data-checklist-expansion-game="${game.id}" data-checklist-expansion-id="${exp.id}" ${expChecked} />
                        <span>${escapeHtml(exp.name)}</span>
                      </label>
                    `;
                  })
                  .join("")}
              </div>
            </div>
          `;
        }

        return `
          <div class="checklist-game-wrapper">
            <label class="checklist-game-card ${checkedClass}">
              <input type="checkbox" data-checklist-id="${game.id}" ${checked} />
              <div class="checklist-game-info">
                <strong>${escapeHtml(game.name)}</strong>
                <span>${game.minPlayers}-${game.maxPlayers}人 · ${game.duration}分钟${hasExpansions ? ` · ${game.expansions.length}个扩展包` : ""}</span>
              </div>
            </label>
            ${expansionsHtml}
          </div>
        `;
      })
      .join("") || `<p class="checklist-empty">没有符合人数筛选的桌游。</p>`;
}

function renderChecklist() {
  syncChecklistSelection();
  const selectedGames = state.games.filter((g) => state.selectedChecklistIds.includes(g.id));

  if (selectedGames.length === 0) {
    els.checklistView.classList.add("hidden");
    els.checklistView.innerHTML = "";
    return;
  }

  const tagFilter = state.checklistTagFilter || "";
  const filterByTag = (rules) => {
    if (!tagFilter) return rules;
    return rules.filter((r) => ruleTags(r).includes(tagFilter));
  };

  function buildRuleGroups(source) {
    const filteredForges = filterByTag(source.forgets || []);
    const filteredSetup = filterByTag(source.setup || []);
    const filteredScoring = filterByTag(source.scoring || []);

    const forgetsHtml = filteredForges.length
      ? `<div class="checklist-rule-group"><h5>⚠️ 容易忘的规则</h5><ul>${filteredForges.map((f) => `<li>${escapeHtml(ruleText(f))}${renderTagChips(ruleTags(f))}</li>`).join("")}</ul></div>`
      : "";
    const setupHtml = filteredSetup.length
      ? `<div class="checklist-rule-group"><h5>📦 开局准备</h5><ul>${filteredSetup.map((s) => `<li>${escapeHtml(ruleText(s))}${renderTagChips(ruleTags(s))}</li>`).join("")}</ul></div>`
      : "";
    const scoringHtml = filteredScoring.length
      ? `<div class="checklist-rule-group"><h5>🏆 计分提醒</h5><ul>${filteredScoring.map((s) => `<li>${escapeHtml(ruleText(s))}${renderTagChips(ruleTags(s))}</li>`).join("")}</ul></div>`
      : "";
    return forgetsHtml + setupHtml + scoringHtml;
  }

  const sectionsHtml = selectedGames
    .map((game) => {
      const baseRuleHtml = buildRuleGroups(game);
      const selectedExpansionIds = state.selectedChecklistExpansionIds[game.id] || [];
      const selectedExpansions = (game.expansions || []).filter((e) => selectedExpansionIds.includes(e.id));

      let expansionsHtml = "";
      if (selectedExpansions.length > 0) {
        expansionsHtml = selectedExpansions
          .map((exp) => {
            const expRuleHtml = buildRuleGroups(exp);
            if (!expRuleHtml) return "";
            return `
              <div class="checklist-expansion-section">
                <div class="checklist-expansion-header">
                  <h5 class="checklist-expansion-title">🧩 ${escapeHtml(exp.name)}</h5>
                </div>
                ${expRuleHtml}
              </div>
            `;
          })
          .join("");
      }

      let baseSectionHtml = "";
      if (baseRuleHtml) {
        if (game.expansions && game.expansions.length > 0) {
          baseSectionHtml = `
            <div class="checklist-base-section">
              <div class="checklist-base-header">
                <h5 class="checklist-base-title">🎮 基础游戏</h5>
              </div>
              ${baseRuleHtml}
            </div>
          `;
        } else {
          baseSectionHtml = baseRuleHtml;
        }
      }

      const totalContent = baseSectionHtml + expansionsHtml;
      if (!totalContent) return "";

      return `
        <section class="checklist-game-section">
          <div class="checklist-game-header">
            <h4>${escapeHtml(game.name)}</h4>
            <span class="pill">${game.minPlayers}-${game.maxPlayers}人</span>
            <span class="pill">${game.duration}分钟</span>
          </div>
          ${totalContent}
        </section>
      `;
    })
    .join("");

  els.checklistView.innerHTML = `
    <h3>📋 今晚聚会复习清单 · ${selectedGames.length} 个游戏</h3>
    ${renderResumeBanner(null)}
    <div style="margin-bottom:16px;">
      <button type="button" class="review-start-btn" data-start-review="${REVIEW_SESSION_SOURCE.CHECKLIST}">🎴 开始卡片复习</button>
    </div>
    ${sectionsHtml}
  `;
  els.checklistView.classList.remove("hidden");
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function estimateDataUrlSize(dataUrl) {
  if (!dataUrl) return 0;
  const base64 = dataUrl.split(",")[1] || "";
  return Math.round((base64.length * 3) / 4);
}

const COMPRESS_CONFIG = {
  maxWidth: 500,
  maxHeight: 700,
  quality: 0.72,
  minQuality: 0.4,
  targetSizeKB: 120
};

function compressImage(file, config = {}) {
  return new Promise((resolve) => {
    const opts = { ...COMPRESS_CONFIG, ...config };
    const result = {
      originalSize: file ? file.size : 0,
      compressedSize: 0,
      dataUrl: "",
      ratio: 0
    };

    if (!file) {
      resolve(result);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;

        if (w > opts.maxWidth) {
          h = Math.round((h * opts.maxWidth) / w);
          w = opts.maxWidth;
        }
        if (h > opts.maxHeight) {
          w = Math.round((w * opts.maxHeight) / h);
          h = opts.maxHeight;
        }

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        let currentQuality = opts.quality;
        let dataUrl = canvas.toDataURL("image/jpeg", currentQuality);
        let sizeKB = estimateDataUrlSize(dataUrl) / 1024;

        while (sizeKB > opts.targetSizeKB && currentQuality > opts.minQuality) {
          currentQuality = Math.max(opts.minQuality, currentQuality - 0.1);
          dataUrl = canvas.toDataURL("image/jpeg", currentQuality);
          sizeKB = estimateDataUrlSize(dataUrl) / 1024;
        }

        result.dataUrl = dataUrl;
        result.compressedSize = estimateDataUrlSize(dataUrl);
        result.ratio = result.originalSize > 0 ? (1 - result.compressedSize / result.originalSize) : 0;
        resolve(result);
      };
      img.onerror = () => {
        result.dataUrl = reader.result;
        result.compressedSize = estimateDataUrlSize(reader.result);
        result.ratio = 0;
        resolve(result);
      };
      img.src = reader.result;
    };
    reader.onerror = () => resolve(result);
    reader.readAsDataURL(file);
  });
}

function getTotalStorageSize() {
  const total = state.games.reduce((sum, g) => sum + estimateDataUrlSize(g.cover || ""), 0);
  const allData = JSON.stringify(state);
  return {
    coversOnly: total,
    totalApprox: new Blob([allData]).size
  };
}

function renderCoverGallery() {
  const gamesWithCover = state.games.filter((g) => g.cover);
  const gamesWithoutCover = state.games.filter((g) => !g.cover);
  const storage = getTotalStorageSize();
  const lsLimit = 5 * 1024 * 1024;
  const usagePercent = Math.min(100, Math.round((storage.totalApprox / lsLimit) * 100));
  els.coverGalleryCount.textContent = `${gamesWithCover.length}/${state.games.length} 已设封面 · 封面共 ${formatSize(storage.coversOnly)}`;

  let html = `
    <div class="cover-storage-info">
      <div class="cover-storage-bar">
        <div class="cover-storage-fill" style="width: ${usagePercent}%"></div>
      </div>
      <div class="cover-storage-text">
        <span>本地存储占用约 ${formatSize(storage.totalApprox)}</span>
        <span>浏览器限制约 5MB（已用 ${usagePercent}%）</span>
      </div>
    </div>
  `;

  for (const game of gamesWithCover) {
    const sizeBytes = estimateDataUrlSize(game.cover);
    html += `
      <div class="cover-gallery-item" data-game-id="${game.id}">
        <div class="cover-gallery-thumb">
          <img src="${game.cover}" alt="${escapeHtml(game.name)}封面" />
        </div>
        <div class="cover-gallery-info">
          <strong>${escapeHtml(game.name)}</strong>
          <span class="cover-gallery-size">${formatSize(sizeBytes)}</span>
        </div>
        <div class="cover-gallery-actions">
          <button type="button" class="cover-gallery-replace" data-game-id="${game.id}" title="替换封面">替换</button>
          <button type="button" class="cover-gallery-remove danger" data-game-id="${game.id}" title="移除封面">移除</button>
        </div>
      </div>
    `;
  }

  for (const game of gamesWithoutCover) {
    html += `
      <div class="cover-gallery-item no-cover" data-game-id="${game.id}">
        <div class="cover-gallery-thumb cover-gallery-placeholder">
          <span>${escapeHtml(game.name.slice(0, 2))}</span>
        </div>
        <div class="cover-gallery-info">
          <strong>${escapeHtml(game.name)}</strong>
          <span class="cover-gallery-size">未设封面</span>
        </div>
        <div class="cover-gallery-actions">
          <button type="button" class="cover-gallery-replace primary" data-game-id="${game.id}" title="上传封面">上传</button>
        </div>
      </div>
    `;
  }

  if (!html) {
    html = `<p class="cover-gallery-empty">暂无桌游，先添加一个桌游吧。</p>`;
  }

  els.coverGalleryGrid.innerHTML = html;
}

function normalizeGameName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9]/g, "")
    .trim();
}

function extractNameFromFilename(filename) {
  const withoutExt = filename.replace(/\.[^/.]+$/, "");
  const cleaned = withoutExt
    .replace(/[_\-\.]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/封面|cover|box|盒|包装/gi, "")
    .trim();
  return normalizeGameName(cleaned);
}

function matchGameByFilename(filename) {
  const searchName = extractNameFromFilename(filename);
  if (!searchName) return null;

  let bestMatch = null;
  let bestScore = 0;

  for (const game of state.games) {
    const gameName = normalizeGameName(game.name);
    if (!gameName) continue;

    let score = 0;

    if (searchName === gameName) {
      score = 100;
    } else if (gameName.includes(searchName) || searchName.includes(gameName)) {
      score = 70 + Math.min(searchName.length, gameName.length) * 0.5;
    } else {
      let commonChars = 0;
      const searchChars = new Set(searchName);
      for (const ch of gameName) {
        if (searchChars.has(ch)) commonChars++;
      }
      const similarity = (commonChars * 2) / (searchName.length + gameName.length);
      if (similarity > 0.5) {
        score = similarity * 50;
      }
    }

    if (score > bestScore && score >= 30) {
      bestScore = score;
      bestMatch = game;
    }
  }

  return bestMatch;
}

let batchCoverState = {
  items: [],
  processing: false
};

function showBatchCoverStep(step) {
  document.querySelectorAll("[data-batch-step]").forEach((el) => {
    const s = Number(el.dataset.batchStep);
    el.classList.toggle("hidden", s !== step);
  });
}

function setBatchCoverActionsDisabled(disabled) {
  els.batchCoverConfirmBtn.disabled = disabled;
  els.batchCoverBackBtn.disabled = disabled;
}

function openBatchCoverDialog() {
  batchCoverState = { items: [], processing: false };
  els.batchCoverFileInput.value = "";
  setBatchCoverActionsDisabled(false);
  showBatchCoverStep(1);
  els.batchCoverDialog.classList.remove("hidden");
}

function closeBatchCoverDialog() {
  if (!batchCoverState.processing) {
    batchCoverState = { items: [], processing: false };
    els.batchCoverDialog.classList.add("hidden");
  }
}

function renderBatchCoverPreview() {
  const matched = batchCoverState.items.filter((item) => item.matchedGame);
  const unmatched = batchCoverState.items.filter((item) => !item.matchedGame);

  els.batchCoverTotal.textContent = batchCoverState.items.length;
  els.batchCoverMatched.textContent = matched.length;
  els.batchCoverUnmatched.textContent = unmatched.length;

  const totalNewSize = batchCoverState.items.reduce((sum, item) => sum + (item.compressResult?.compressedSize || 0), 0);
  const totalOldSize = batchCoverState.items.reduce((sum, item) => {
    if (item.matchedGame && item.matchedGame.cover) {
      return sum + estimateDataUrlSize(item.matchedGame.cover);
    }
    return sum;
  }, 0);
  const currentStorage = getTotalStorageSize();
  const projectedStorage = currentStorage.totalApprox - totalOldSize + totalNewSize;
  const lsLimit = 5 * 1024 * 1024;
  const usagePercent = Math.min(100, Math.round((projectedStorage / lsLimit) * 100));

  let storageHtml = "";
  if (totalNewSize > 0) {
    storageHtml = `
      <div class="batch-cover-storage-info">
        <div class="batch-cover-storage-bar">
          <div class="batch-cover-storage-fill" style="width: ${usagePercent}%"></div>
        </div>
        <div class="batch-cover-storage-text">
          <span>预计存储：${formatSize(projectedStorage)}（新增 ${formatSize(totalNewSize)}${totalOldSize > 0 ? `，替换节省 ${formatSize(totalOldSize)}` : ""}）</span>
          <span>浏览器限制约 5MB（预计 ${usagePercent}%）</span>
        </div>
      </div>
    `;
  }

  let matchedHtml = "";
  if (matched.length > 0) {
    const matchedItemsHtml = matched
      .map((item) => {
        const ratio = Math.round((item.compressResult?.ratio || 0) * 100);
        const compressInfo =
          ratio > 10
            ? `<span class="batch-cover-item-compress-info">压缩 ${ratio}% · ${formatSize(item.compressResult.originalSize)} → ${formatSize(item.compressResult.compressedSize)}</span>`
            : `<span class="batch-cover-item-size">${formatSize(item.compressResult?.compressedSize || item.file.size)}</span>`;

        return `
          <div class="batch-cover-item" data-batch-item-id="${item.id}">
            <div class="batch-cover-item-thumb">
              <img src="${item.compressResult?.dataUrl || item.previewUrl}" alt="${escapeHtml(item.file.name)}" />
            </div>
            <div class="batch-cover-item-info">
              <div class="batch-cover-item-filename">${escapeHtml(item.file.name)}</div>
              <div class="batch-cover-item-match">
                ✅ <span class="game-name">${escapeHtml(item.matchedGame.name)}</span>
              </div>
              ${compressInfo}
            </div>
            <button type="button" class="batch-cover-item-remove" data-batch-remove="${item.id}">移除</button>
          </div>
        `;
      })
      .join("");

    matchedHtml = `
      <div class="batch-cover-preview-section">
        <div class="batch-cover-preview-section-header matched">
          <div class="batch-cover-preview-section-title">
            <span class="icon">✅</span> 匹配成功
          </div>
          <span class="batch-cover-preview-section-count">${matched.length} 张</span>
        </div>
        <div class="batch-cover-preview-grid">
          ${matchedItemsHtml}
        </div>
      </div>
    `;
  }

  let unmatchedHtml = "";
  if (unmatched.length > 0) {
    const availableGames = state.games
      .filter((g) => !batchCoverState.items.some((item) => item.matchedGame?.id === g.id))
      .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));

    const gameOptions = availableGames
      .map((g) => `<option value="${g.id}">${escapeHtml(g.name)}</option>`)
      .join("");

    const unmatchedItemsHtml = unmatched
      .map((item) => {
        const ratio = Math.round((item.compressResult?.ratio || 0) * 100);
        const compressInfo =
          ratio > 10
            ? `<span class="batch-cover-item-compress-info">压缩 ${ratio}% · ${formatSize(item.compressResult.originalSize)} → ${formatSize(item.compressResult.compressedSize)}</span>`
            : `<span class="batch-cover-item-size">${formatSize(item.compressResult?.compressedSize || item.file.size)}</span>`;

        return `
          <div class="batch-cover-item" data-batch-item-id="${item.id}">
            <div class="batch-cover-item-thumb">
              <img src="${item.compressResult?.dataUrl || item.previewUrl}" alt="${escapeHtml(item.file.name)}" />
            </div>
            <div class="batch-cover-item-info">
              <div class="batch-cover-item-filename">${escapeHtml(item.file.name)}</div>
              <div class="batch-cover-item-unmatched">
                <label>指定目标桌游：
                  <select data-batch-assign="${item.id}">
                    <option value="">-- 请选择 --</option>
                    ${gameOptions}
                  </select>
                </label>
              </div>
              ${compressInfo}
            </div>
            <button type="button" class="batch-cover-item-remove" data-batch-remove="${item.id}">移除</button>
          </div>
        `;
      })
      .join("");

    unmatchedHtml = `
      <div class="batch-cover-preview-section">
        <div class="batch-cover-preview-section-header unmatched">
          <div class="batch-cover-preview-section-title">
            <span class="icon">⚠️</span> 待指定
          </div>
          <span class="batch-cover-preview-section-count">${unmatched.length} 张</span>
        </div>
        <div class="batch-cover-preview-grid">
          ${unmatchedItemsHtml}
        </div>
      </div>
    `;
  }

  els.batchCoverPreview.innerHTML = storageHtml + matchedHtml + unmatchedHtml;

  if (batchCoverState.items.length === 0) {
    els.batchCoverPreview.innerHTML = `<p class="checklist-empty">没有可处理的图片。</p>`;
  }
}

async function processBatchFiles(files) {
  const validFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
  if (validFiles.length === 0) {
    showBackupMessage("请选择有效的图片文件。", "error");
    return;
  }

  batchCoverState.items = [];
  batchCoverState.processing = true;

  for (const file of validFiles) {
    const item = {
      id: generateId(),
      file,
      previewUrl: "",
      compressResult: null,
      matchedGame: null
    };

    try {
      item.previewUrl = await readFileAsDataUrl(file);
      item.compressResult = await compressImage(file);
      item.matchedGame = matchGameByFilename(file.name);
    } catch {
    }

    batchCoverState.items.push(item);
  }

  batchCoverState.processing = false;
  renderBatchCoverPreview();
  showBatchCoverStep(2);
}

function removeBatchItem(itemId) {
  batchCoverState.items = batchCoverState.items.filter((item) => item.id !== itemId);
  renderBatchCoverPreview();
}

function assignBatchItemGame(itemId, gameId) {
  const item = batchCoverState.items.find((i) => i.id === itemId);
  if (!item) return;

  if (gameId) {
    const game = state.games.find((g) => g.id === gameId);
    item.matchedGame = game || null;
  } else {
    item.matchedGame = null;
  }

  renderBatchCoverPreview();
}

async function confirmBatchCovers() {
  const itemsToApply = batchCoverState.items.filter((item) => item.matchedGame && item.compressResult?.dataUrl);
  if (itemsToApply.length === 0) {
    showBackupMessage("没有可应用的封面，请先为图片指定目标桌游。", "error");
    return;
  }

  batchCoverState.processing = true;
  setBatchCoverActionsDisabled(true);

  let updatedCount = 0;
  let totalSaved = 0;

  for (const item of itemsToApply) {
    const game = state.games.find((g) => g.id === item.matchedGame.id);
    if (!game) continue;

    const oldSize = estimateDataUrlSize(game.cover || "");
    game.cover = item.compressResult.dataUrl;
    const newSize = item.compressResult.compressedSize;
    totalSaved += Math.max(0, oldSize - newSize);
    updatedCount++;
  }

  saveState();
  renderAll();

  batchCoverState.processing = false;

  const resultText = `成功为 ${updatedCount} 个桌游设置封面${totalSaved > 0 ? `，共节省存储空间 ${formatSize(totalSaved)}` : ""}。`;
  els.batchCoverResultText.textContent = resultText;
  showBatchCoverStep(3);
}

function resetBatchCover() {
  batchCoverState = { items: [], processing: false };
  els.batchCoverFileInput.value = "";
  setBatchCoverActionsDisabled(false);
  showBatchCoverStep(1);
}

function getCurrentFilterState() {
  return {
    keyword: els.searchInput.value.trim(),
    playerFilter: els.playerFilter.value,
    complexityFilter: els.complexityFilter.value,
    sortMode: els.sortMode.value,
    filterMustReview: els.filterMustReview ? els.filterMustReview.checked : false,
    listTagFilter: els.listTagFilter ? els.listTagFilter.value : ""
  };
}

function applyFilterState(filterState) {
  if (!filterState || typeof filterState !== "object") return;
  els.searchInput.value = filterState.keyword || "";
  els.playerFilter.value = filterState.playerFilter || "all";
  els.complexityFilter.value = filterState.complexityFilter || "all";
  els.sortMode.value = filterState.sortMode || "stale";
  if (els.filterMustReview) {
    els.filterMustReview.checked = !!filterState.filterMustReview;
    state.filterMustReview = !!filterState.filterMustReview;
  }
  if (els.listTagFilter) {
    els.listTagFilter.value = filterState.listTagFilter || "";
    state.listTagFilter = filterState.listTagFilter || "";
  }
}

function normalizeFilterView(view) {
  if (!view || typeof view !== "object") return null;
  const state = view.filterState || {};
  return {
    id: view.id || generateId(),
    name: String(view.name || "").trim().slice(0, 20),
    filterState: {
      keyword: String(state.keyword || ""),
      playerFilter: String(state.playerFilter || "all"),
      complexityFilter: String(state.complexityFilter || "all"),
      sortMode: String(state.sortMode || "stale"),
      filterMustReview: !!state.filterMustReview,
      listTagFilter: String(state.listTagFilter || "")
    },
    createdAt: view.createdAt || new Date().toISOString()
  };
}

function describeFilterState(filterState) {
  if (!filterState) return "";
  const parts = [];
  if (filterState.keyword) parts.push(`搜索"${filterState.keyword}"`);
  const playerLabels = { all: "全部人数", "2": "2人", "3": "3人", "4": "4人", "5": "5人" };
  parts.push(playerLabels[filterState.playerFilter] || filterState.playerFilter);
  const complexityLabels = { all: "全部复杂度", "轻": "轻", "中": "中", "重": "重" };
  parts.push(complexityLabels[filterState.complexityFilter] || filterState.complexityFilter);
  const sortLabels = { stale: "最近未玩排序", name: "名称排序", complexity: "复杂度排序" };
  parts.push(sortLabels[filterState.sortMode] || filterState.sortMode);
  if (filterState.filterMustReview) parts.push("只看必看");
  if (filterState.listTagFilter) parts.push(`标签:${filterState.listTagFilter}`);
  return parts.join(" · ");
}

function renderFilterViews() {
  const views = Array.isArray(state.filterViews) ? state.filterViews : [];
  const activeId = state.activeFilterViewId || "";
  const currentState = getCurrentFilterState();

  if (views.length === 0) {
    els.filterViewsList.innerHTML = `<p class="filter-views-empty">暂无保存的视图。调整筛选条件后，点击右上角"保存当前筛选为视图"。</p>`;
    return;
  }

  els.filterViewsList.innerHTML = views
    .map((view) => {
      const isActive = view.id === activeId;
      return `
        <div class="filter-view-chip ${isActive ? "active" : ""}" data-view-id="${view.id}">
          <button type="button" class="filter-view-apply" data-view-id="${view.id}" title="${escapeHtml(describeFilterState(view.filterState))}">
            <span class="filter-view-name">${escapeHtml(view.name)}</span>
            <span class="filter-view-desc">${escapeHtml(describeFilterState(view.filterState))}</span>
          </button>
          <button type="button" class="filter-view-delete" data-view-id="${view.id}" title="删除此视图">×</button>
        </div>
      `;
    })
    .join("");
}

function openSaveViewDialog() {
  const currentState = getCurrentFilterState();
  els.saveViewTitle.textContent = "保存筛选视图";
  els.saveViewHint.textContent = "为当前筛选条件命名，方便下次快速切换。";
  els.saveViewPreview.innerHTML = describeFilterState(currentState);
  els.saveViewNameInput.value = "";
  els.saveViewDialog.classList.remove("hidden");
  setTimeout(() => els.saveViewNameInput.focus(), 50);
}

function closeSaveViewDialog() {
  els.saveViewDialog.classList.add("hidden");
}

function saveCurrentFilterView() {
  const name = els.saveViewNameInput.value.trim();
  if (!name) {
    showBackupMessage("请输入视图名称。", "error");
    return;
  }
  if (!Array.isArray(state.filterViews)) state.filterViews = [];
  if (state.filterViews.some((v) => v.name === name)) {
    showBackupMessage("已存在同名视图，请换一个名称。", "error");
    return;
  }
  const newView = normalizeFilterView({
    id: generateId(),
    name,
    filterState: getCurrentFilterState(),
    createdAt: new Date().toISOString()
  });
  if (!newView) return;
  state.filterViews.push(newView);
  state.activeFilterViewId = newView.id;
  closeSaveViewDialog();
  saveState();
  renderFilterViews();
  renderAll();
  showBackupMessage(`已保存视图"${name}"。`, "success");
}

function applyFilterView(viewId) {
  if (!Array.isArray(state.filterViews)) return;
  const view = state.filterViews.find((v) => v.id === viewId);
  if (!view) return;
  applyFilterState(view.filterState);
  state.activeFilterViewId = viewId;
  saveState();
  renderFilterViews();
  renderAll();
}

function deleteFilterView(viewId) {
  if (!Array.isArray(state.filterViews)) return;
  const view = state.filterViews.find((v) => v.id === viewId);
  if (!view) return;
  showConfirm(
    "删除筛选视图",
    `确定要删除视图"${view.name}"吗？操作不可撤销。`,
    () => {
      state.filterViews = state.filterViews.filter((v) => v.id !== viewId);
      if (state.activeFilterViewId === viewId) {
        state.activeFilterViewId = "";
      }
      saveState();
      renderFilterViews();
      renderAll();
      showBackupMessage(`已删除视图"${view.name}"。`, "success");
    }
  );
}

function renderAll() {
  saveState();
  if (els.filterMustReview) {
    els.filterMustReview.checked = state.filterMustReview;
  }
  if (els.listTagFilter) {
    els.listTagFilter.value = state.listTagFilter || "";
  }
  if (els.checklistTagFilter) {
    els.checklistTagFilter.value = state.checklistTagFilter || "";
  }
  renderSummary();
  renderFilterViews();
  renderList();
  renderDetail();
  renderCoverGallery();
  renderChecklistGames();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

async function addGame(event) {
  event.preventDefault();
  const minPlayers = Number(els.minPlayersInput.value);
  const maxPlayers = Math.max(minPlayers, Number(els.maxPlayersInput.value));
  const compressResult = await compressImage(els.coverInput.files[0]);
  const cover = compressResult.dataUrl || "";
  const disputes = normalizeRuleArray([]);
  const game = {
    id: crypto.randomUUID(),
    name: els.nameInput.value.trim(),
    minPlayers,
    maxPlayers,
    duration: Number(els.durationInput.value),
    complexity: els.complexityInput.value,
    lastPlayed: els.lastPlayedInput.value,
    cover,
    forgets: normalizeRuleArray(["本局开始前先补充容易忘的规则。"]),
    disputes,
    setup: normalizeRuleArray(["整理组件并按人数调整初始设置。"]),
    scoring: normalizeRuleArray(["确认终局计分项和即时得分项。"]),
    loanRecords: [],
    expansions: [],
    disputeRulings: []
  };
  for (const d of disputes) {
    ensureDisputeRulingEntry(game, ruleText(d), "");
  }
  state.games.unshift(game);
  state.selectedId = game.id;
  state.selectedExpansionId = "";
  els.gameForm.reset();
  setDefaultDate();
  renderAll();
  if (compressResult.originalSize > 0) {
    const saved = formatSize(compressResult.originalSize - compressResult.compressedSize);
    const ratio = Math.round(compressResult.ratio * 100);
    if (ratio > 10) {
      showBackupMessage(`《${game.name}》已加入收藏，封面从 ${formatSize(compressResult.originalSize)} 压缩至 ${formatSize(compressResult.compressedSize)}，节省 ${saved}（${ratio}%）。`, "success");
    }
  }
}

function setDefaultDate() {
  const date = new Date();
  date.setMonth(date.getMonth() - 2);
  els.lastPlayedInput.value = date.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

els.searchInput.addEventListener("input", () => {
  state.activeFilterViewId = "";
  renderAll();
});
els.playerFilter.addEventListener("change", () => {
  state.activeFilterViewId = "";
  renderAll();
});
els.complexityFilter.addEventListener("change", () => {
  state.activeFilterViewId = "";
  renderAll();
});
els.sortMode.addEventListener("change", () => {
  state.activeFilterViewId = "";
  renderAll();
});
if (els.listTagFilter) {
  els.listTagFilter.addEventListener("change", () => {
    state.listTagFilter = els.listTagFilter.value;
    state.activeFilterViewId = "";
    renderAll();
  });
}
if (els.filterMustReview) {
  els.filterMustReview.addEventListener("change", () => {
    state.filterMustReview = els.filterMustReview.checked;
    state.activeFilterViewId = "";
    renderAll();
  });
}
if (els.saveViewBtn) {
  els.saveViewBtn.addEventListener("click", openSaveViewDialog);
}
if (els.saveViewCancelBtn) {
  els.saveViewCancelBtn.addEventListener("click", closeSaveViewDialog);
}
if (els.saveViewConfirmBtn) {
  els.saveViewConfirmBtn.addEventListener("click", saveCurrentFilterView);
}
if (els.saveViewDialog) {
  els.saveViewDialog.addEventListener("click", (e) => {
    if (e.target === els.saveViewDialog) closeSaveViewDialog();
  });
}
if (els.saveViewNameInput) {
  els.saveViewNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveCurrentFilterView();
    }
  });
}
if (els.filterViewsList) {
  els.filterViewsList.addEventListener("click", (e) => {
    const applyBtn = e.target.closest(".filter-view-apply");
    const deleteBtn = e.target.closest(".filter-view-delete");
    if (applyBtn) {
      applyFilterView(applyBtn.dataset.viewId);
      return;
    }
    if (deleteBtn) {
      deleteFilterView(deleteBtn.dataset.viewId);
      return;
    }
  });
}
els.gameForm.addEventListener("submit", addGame);

els.gameList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-game-id]");
  if (!card) return;
  state.selectedId = card.dataset.gameId;
  state.selectedExpansionId = "";
  renderAll();
});

els.detailView.addEventListener("submit", (event) => {
  if (event.target.id !== "ruleForm") return;
  event.preventDefault();
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;
  const key = document.querySelector("#ruleTypeInput").value;
  const text = document.querySelector("#ruleTextInput").value.trim();
  if (!text) return;
  const container = getCurrentRuleContainer(game);
  if (!container) return;
  const selectedTags = [];
  document.querySelectorAll('#ruleForm input[name="newRuleTags"]:checked').forEach((cb) => {
    if (RULE_TAGS.includes(cb.value)) selectedTags.push(cb.value);
  });
  const newRule = createRuleCard(text, REVIEW_STATUS.UNMARKED, null, selectedTags);
  container[key].push(newRule);
  if (key === "disputes") {
    ensureDisputeRulingEntry(game, text, state.selectedExpansionId || "");
  }
  renderAll();
});

els.detailView.addEventListener("click", (event) => {
  const tagFilterChip = event.target.closest("[data-tag-filter]");
  if (tagFilterChip) {
    state.tagFilter = tagFilterChip.dataset.tagFilter || "";
    renderDetail();
    return;
  }

  const statusButton = event.target.closest("[data-status]");
  const ruleButton = event.target.closest(".delete-btn[data-rule-key]");
  const playedButton = event.target.closest("#playedTodayBtn");
  const deleteButton = event.target.closest("#deleteGameBtn");
  const editButton = event.target.closest("#editGameBtn");
  const manageExpansionsBtn = event.target.closest("#manageExpansionsBtn");
  const expansionTab = event.target.closest("[data-expansion-id]");
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;

  if (expansionTab) {
    state.selectedExpansionId = expansionTab.dataset.expansionId || "";
    renderAll();
    return;
  }

  if (manageExpansionsBtn) {
    openExpansionDialog();
    return;
  }

  if (statusButton) {
    const gameId = statusButton.dataset.ruleGame;
    const key = statusButton.dataset.ruleKey;
    const index = Number(statusButton.dataset.ruleIndex);
    const status = statusButton.dataset.status;
    const expansionId = statusButton.dataset.ruleExpansion || "";
    setRuleStatus(gameId, key, index, status, expansionId);
    renderAll();
    return;
  }

  if (ruleButton) {
    const key = ruleButton.dataset.ruleKey;
    const index = Number(ruleButton.dataset.ruleIndex);
    const expansionId = ruleButton.dataset.ruleExpansion || "";
    const container = getRuleContainer(game, expansionId);
    if (container && container[key]) {
      if (key === "disputes") {
        const disputeText = ruleText(container.disputes[index]);
        if (disputeText && Array.isArray(game.disputeRulings)) {
          game.disputeRulings = game.disputeRulings.filter(
            (r) => !(r.disputeText === disputeText && (r.expansionId || "") === expansionId)
          );
        }
      }
      container[key].splice(index, 1);
    }
    renderAll();
  }

  if (playedButton) {
    game.lastPlayed = new Date().toISOString().slice(0, 10);
    renderAll();
  }

  if (deleteButton) {
    state.games = state.games.filter((item) => item.id !== game.id);
    state.selectedId = state.games[0]?.id || "";
    state.selectedExpansionId = "";
    syncChecklistSelection();
    if (!els.checklistView.classList.contains("hidden")) {
      renderChecklist();
    }
    renderAll();
  }

  if (editButton) {
    openEditDialog();
  }

  const toggleBtn = event.target.closest(".dispute-toggle-btn");
  if (toggleBtn) {
    const idx = toggleBtn.dataset.disputeIndex;
    const expId = toggleBtn.dataset.disputeExpansion || "";
    const panel = els.detailView.querySelector(`[data-ruling-panel="${idx}"][data-ruling-expansion="${expId}"]`);
    if (panel) {
      panel.classList.toggle("hidden");
      toggleBtn.textContent = panel.classList.contains("hidden") ? "▶" : "▼";
    }
    return;
  }

  const addRulingBtn = event.target.closest(".add-ruling-btn");
  if (addRulingBtn) {
    const idx = Number(addRulingBtn.dataset.disputeIndex);
    const expId = addRulingBtn.dataset.disputeExpansion || "";
    const container = getRuleContainer(game, expId);
    if (!container || !container.disputes[idx]) return;
    const disputeText = ruleText(container.disputes[idx]);
    openRulingDialog(game, disputeText, expId);
    return;
  }

  const deleteRulingBtn = event.target.closest(".dispute-ruling-delete");
  if (deleteRulingBtn) {
    const rulingId = deleteRulingBtn.dataset.rulingId;
    const disputeText = deleteRulingBtn.dataset.disputeText;
    const expId = deleteRulingBtn.dataset.disputeExpansion || "";
    if (!rulingId || !disputeText) return;
    showConfirm(
      "删除裁定记录",
      `确定要删除这条裁定记录吗？操作不可撤销。`,
      () => {
        const entry = getDisputeRulingEntry(game, disputeText, expId);
        if (entry && Array.isArray(entry.rulings)) {
          entry.rulings = entry.rulings.filter((r) => r.id !== rulingId);
        }
        renderAll();
        showBackupMessage("已删除裁定记录。", "success");
      }
    );
    return;
  }
});

setDefaultDate();

if (state.activeFilterViewId && state.filterViews.length > 0) {
  const activeView = state.filterViews.find((v) => v.id === state.activeFilterViewId);
  if (activeView) {
    applyFilterState(activeView.filterState);
  } else {
    state.activeFilterViewId = "";
    saveState();
  }
}

renderAll();

let coverGalleryReplaceGameId = "";

els.coverGalleryGrid.addEventListener("click", (event) => {
  const replaceBtn = event.target.closest(".cover-gallery-replace");
  const removeBtn = event.target.closest(".cover-gallery-remove");

  if (replaceBtn) {
    coverGalleryReplaceGameId = replaceBtn.dataset.gameId;
    els.coverGalleryFileInput.click();
    return;
  }

  if (removeBtn) {
    const gameId = removeBtn.dataset.gameId;
    const game = state.games.find((g) => g.id === gameId);
    if (!game) return;
    showConfirm(
      "移除封面",
      `确定要移除《${game.name}》的封面吗？`,
      () => {
        game.cover = "";
        saveState();
        renderAll();
        showBackupMessage(`已移除《${game.name}》的封面。`, "success");
      }
    );
  }
});

els.coverGalleryFileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file || !coverGalleryReplaceGameId) {
    coverGalleryReplaceGameId = "";
    els.coverGalleryFileInput.value = "";
    return;
  }
  const game = state.games.find((g) => g.id === coverGalleryReplaceGameId);
  coverGalleryReplaceGameId = "";
  if (!game) {
    els.coverGalleryFileInput.value = "";
    return;
  }
  try {
    const result = await compressImage(file);
    if (!result.dataUrl) {
      showBackupMessage("封面图片处理失败，请重试。", "error");
      return;
    }
    const oldCoverSize = estimateDataUrlSize(game.cover || "");
    game.cover = result.dataUrl;
    saveState();
    renderAll();
    const ratio = Math.round(result.ratio * 100);
    let msg = `《${game.name}》封面已更新。`;
    if (result.originalSize > 0) {
      msg += ` 原图 ${formatSize(result.originalSize)} → 压缩后 ${formatSize(result.compressedSize)}`;
      if (ratio > 10) {
        msg += `（节省 ${ratio}%）`;
      }
      if (oldCoverSize > 0) {
        const diff = oldCoverSize - result.compressedSize;
        if (diff > 0) {
          msg += `，比旧封面又小了 ${formatSize(diff)}`;
        }
      }
    }
    showBackupMessage(msg, "success");
  } catch {
    showBackupMessage("封面图片处理失败，请重试。", "error");
  } finally {
    els.coverGalleryFileInput.value = "";
  }
});

if (els.batchCoverBtn) {
  els.batchCoverBtn.addEventListener("click", openBatchCoverDialog);
}

if (els.batchCoverDialog) {
  els.batchCoverDialog.addEventListener("click", (e) => {
    if (e.target === els.batchCoverDialog) closeBatchCoverDialog();
  });
}

if (els.batchCoverFileInput) {
  els.batchCoverFileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      processBatchFiles(e.target.files);
    }
  });
}

if (els.batchCoverDropzone) {
  els.batchCoverDropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    els.batchCoverDropzone.classList.add("drag-over");
  });

  els.batchCoverDropzone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    els.batchCoverDropzone.classList.remove("drag-over");
  });

  els.batchCoverDropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    els.batchCoverDropzone.classList.remove("drag-over");
    if (e.dataTransfer.files.length > 0) {
      processBatchFiles(e.dataTransfer.files);
    }
  });
}

if (els.batchCoverBackBtn) {
  els.batchCoverBackBtn.addEventListener("click", resetBatchCover);
}

if (els.batchCoverConfirmBtn) {
  els.batchCoverConfirmBtn.addEventListener("click", confirmBatchCovers);
}

if (els.batchCoverCloseBtn) {
  els.batchCoverCloseBtn.addEventListener("click", () => {
    closeBatchCoverDialog();
    showBackupMessage("批量封面补全已完成。", "success");
  });
}

if (els.batchCoverPreview) {
  els.batchCoverPreview.addEventListener("click", (e) => {
    const removeBtn = e.target.closest("[data-batch-remove]");
    if (removeBtn) {
      const itemId = removeBtn.dataset.batchRemove;
      removeBatchItem(itemId);
      return;
    }
  });

  els.batchCoverPreview.addEventListener("change", (e) => {
    const assignSelect = e.target.closest("[data-batch-assign]");
    if (assignSelect) {
      const itemId = assignSelect.dataset.batchAssign;
      const gameId = assignSelect.value;
      assignBatchItemGame(itemId, gameId);
      return;
    }
  });
}

function showBackupMessage(message, type = "success") {
  els.backupMessage.textContent = message;
  els.backupMessage.className = `backup-message ${type}`;
  clearTimeout(showBackupMessage._timer);
  showBackupMessage._timer = setTimeout(() => {
    els.backupMessage.className = "backup-message hidden";
  }, 4000);
}

let confirmCallback = null;

function showConfirm(title, message, onConfirm) {
  els.confirmTitle.textContent = title;
  els.confirmMessage.textContent = message;
  confirmCallback = onConfirm;
  els.confirmDialog.classList.remove("hidden");
}

function hideConfirm() {
  els.confirmDialog.classList.add("hidden");
  confirmCallback = null;
}

els.confirmCancel.addEventListener("click", hideConfirm);
els.confirmOk.addEventListener("click", () => {
  if (confirmCallback) confirmCallback();
  hideConfirm();
});
els.confirmDialog.addEventListener("click", (e) => {
  if (e.target === els.confirmDialog) hideConfirm();
});

function exportData() {
  const exportObj = {
    version: 1,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    games: state.games,
    filterViews: Array.isArray(state.filterViews) ? state.filterViews : [],
    activeFilterViewId: state.activeFilterViewId || ""
  };
  const jsonStr = JSON.stringify(exportObj, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `boardgame-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showBackupMessage(`已成功导出 ${state.games.length} 个桌游数据。`, "success");
}

function validateImportData(data) {
  if (!data || typeof data !== "object") {
    throw new Error("文件格式无效，无法解析为 JSON 对象。");
  }
  const games = Array.isArray(data.games) ? data.games : (Array.isArray(data) ? data : null);
  if (!games) {
    throw new Error("数据格式错误：未找到 games 数组。");
  }
  for (const game of games) {
    if (!game || typeof game !== "object") {
      throw new Error("数据格式错误：存在无效的游戏条目。");
    }
    if (typeof game.name !== "string" || !game.name.trim()) {
      throw new Error("数据格式错误：游戏条目缺少名称字段。");
    }
  }
  return games;
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("读取文件失败。"));
    reader.readAsText(file, "utf-8");
  });
}

async function handleImportFile(file) {
  if (!file) return;
  try {
    const text = await readFileAsText(file);
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("JSON 解析失败，请检查文件格式。");
    }
    const importData = Array.isArray(parsed) ? { games: parsed } : parsed;
    const migrated = runMigrations(importData);
    const games = validateImportData(migrated);
    const importedFilterViews = Array.isArray(migrated.filterViews)
      ? migrated.filterViews.map(normalizeFilterView).filter(Boolean)
      : [];
    const importedActiveFilterViewId = typeof migrated.activeFilterViewId === "string"
      ? migrated.activeFilterViewId
      : "";
    const viewCountMsg = importedFilterViews.length > 0
      ? `，同时导入 ${importedFilterViews.length} 个筛选视图`
      : "";
    showConfirm(
      "确认导入数据",
      `即将导入 ${games.length} 个桌游${viewCountMsg}，这将覆盖当前的全部收藏数据，操作不可撤销。确定继续吗？`,
      () => {
        state.games = games.map((game) => {
          const normalized = {
            id: game.id || generateId(),
            name: String(game.name || ""),
            minPlayers: Math.max(1, Number(game.minPlayers) || 2),
            maxPlayers: Math.max(1, Number(game.maxPlayers) || 4),
            duration: Math.max(5, Number(game.duration) || 60),
            complexity: ["轻", "中", "重"].includes(game.complexity) ? game.complexity : "中",
            lastPlayed: normalizeLastPlayed(game.lastPlayed),
            cover: String(game.cover || ""),
            forgets: normalizeRuleArray(game.forgets),
            disputes: normalizeRuleArray(game.disputes),
            setup: normalizeRuleArray(game.setup),
            scoring: normalizeRuleArray(game.scoring),
            loanRecords: Array.isArray(game.loanRecords) ? game.loanRecords : [],
            expansions: normalizeExpansionArray(game.expansions),
            disputeRulings: normalizeDisputeRulings(game.disputeRulings)
          };
          if (normalized.minPlayers > normalized.maxPlayers) {
            normalized.maxPlayers = normalized.minPlayers;
          }
          const newContainers = [{ disputes: normalized.disputes, expansionId: "" }];
          for (const exp of normalized.expansions || []) {
            newContainers.push({ disputes: exp.disputes, expansionId: exp.id });
          }
          syncDisputeRulingsForGame(normalized, null, newContainers);
          return normalized;
        });
        state.selectedId = state.games[0]?.id || "";
        state.selectedExpansionId = "";
        state.filterViews = importedFilterViews;
        state.activeFilterViewId = importedActiveFilterViewId;
        if (state.activeFilterViewId && state.filterViews.length > 0) {
          const activeView = state.filterViews.find((v) => v.id === state.activeFilterViewId);
          if (activeView) {
            applyFilterState(activeView.filterState);
          } else {
            state.activeFilterViewId = "";
            applyFilterState({
              keyword: "",
              playerFilter: "all",
              complexityFilter: "all",
              sortMode: "stale",
              filterMustReview: false,
              listTagFilter: ""
            });
          }
        } else {
          applyFilterState({
            keyword: "",
            playerFilter: "all",
            complexityFilter: "all",
            sortMode: "stale",
            filterMustReview: false,
            listTagFilter: ""
          });
        }
        renderAll();
        const successMsg = importedFilterViews.length > 0
          ? `成功导入 ${state.games.length} 个桌游数据和 ${importedFilterViews.length} 个筛选视图。`
          : `成功导入 ${state.games.length} 个桌游数据。`;
        showBackupMessage(successMsg, "success");
      }
    );
  } catch (err) {
    showBackupMessage(`导入失败：${err.message}`, "error");
  } finally {
    els.importFile.value = "";
  }
}

function resetToDefault() {
  showConfirm(
    "恢复默认示例数据",
    "这将清除全部自定义数据并恢复到内置的三个示例桌游，操作不可撤销。确定继续吗？",
    () => {
      const fresh = structuredClone(defaultState);
      state.games = fresh.games;
      state.selectedId = state.games[0]?.id || "";
      state.selectedExpansionId = "";
      state.filterViews = fresh.filterViews;
      state.activeFilterViewId = "";
      if (els.searchInput) els.searchInput.value = "";
      if (els.playerFilter) els.playerFilter.value = "all";
      if (els.complexityFilter) els.complexityFilter.value = "all";
      if (els.sortMode) els.sortMode.value = "stale";
      if (els.filterMustReview) els.filterMustReview.checked = false;
      state.filterMustReview = false;
      state.tagFilter = "";
      state.listTagFilter = "";
      state.checklistTagFilter = "";
      state.partyTagFilter = "";
      if (els.listTagFilter) els.listTagFilter.value = "";
      if (els.checklistTagFilter) els.checklistTagFilter.value = "";
      saveState();
      renderAll();
      showBackupMessage("已恢复默认示例数据。", "success");
    }
  );
}

els.exportBtn.addEventListener("click", exportData);
els.importBtn.addEventListener("click", () => els.importFile.click());
els.importFile.addEventListener("change", (e) => handleImportFile(e.target.files[0]));
els.resetBtn.addEventListener("click", resetToDefault);

els.checklistPlayerFilter.addEventListener("change", () => {
  state.checklistPlayerFilter = els.checklistPlayerFilter.value;
  renderAll();
});

if (els.checklistTagFilter) {
  els.checklistTagFilter.addEventListener("change", () => {
    state.checklistTagFilter = els.checklistTagFilter.value;
    if (!els.checklistView.classList.contains("hidden")) {
      renderChecklist();
    }
    saveState();
  });
}

els.checklistGameList.addEventListener("change", (event) => {
  const gameCheckbox = event.target.closest("[data-checklist-id]");
  if (gameCheckbox) {
    const gameId = gameCheckbox.dataset.checklistId;
    if (gameCheckbox.checked) {
      if (!state.selectedChecklistIds.includes(gameId)) {
        state.selectedChecklistIds.push(gameId);
      }
    } else {
      state.selectedChecklistIds = state.selectedChecklistIds.filter((id) => id !== gameId);
      delete state.selectedChecklistExpansionIds[gameId];
    }
    renderChecklistGames();
    saveState();
    return;
  }

  const expansionCheckbox = event.target.closest("[data-checklist-expansion-game]");
  if (expansionCheckbox) {
    const gameId = expansionCheckbox.dataset.checklistExpansionGame;
    const expansionId = expansionCheckbox.dataset.checklistExpansionId;
    if (!state.selectedChecklistExpansionIds[gameId]) {
      state.selectedChecklistExpansionIds[gameId] = [];
    }
    if (expansionCheckbox.checked) {
      if (!state.selectedChecklistExpansionIds[gameId].includes(expansionId)) {
        state.selectedChecklistExpansionIds[gameId].push(expansionId);
      }
    } else {
      state.selectedChecklistExpansionIds[gameId] = state.selectedChecklistExpansionIds[gameId].filter(
        (id) => id !== expansionId
      );
    }
    saveState();
  }
});

els.clearChecklistBtn.addEventListener("click", () => {
  state.selectedChecklistIds = [];
  state.selectedChecklistExpansionIds = {};
  els.checklistView.classList.add("hidden");
  renderAll();
});

els.generateChecklistBtn.addEventListener("click", () => {
  if (state.selectedChecklistIds.length === 0) {
    showBackupMessage("请先选择至少一个桌游。", "error");
    return;
  }
  renderChecklist();
  els.checklistView.scrollIntoView({ behavior: "smooth", block: "start" });
});

function openLoanDialog() {
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;
  if (getCurrentLoan(game)) {
    showBackupMessage("该桌游当前已借出，请先标记归还。", "error");
    return;
  }
  els.loanDialogTitle.textContent = `借出：${game.name}`;
  els.loanBorrowerInput.value = "";
  els.loanBorrowedAtInput.value = new Date().toISOString().slice(0, 10);
  const expectedDate = new Date();
  expectedDate.setDate(expectedDate.getDate() + 14);
  els.loanExpectedReturnInput.value = expectedDate.toISOString().slice(0, 10);
  els.loanNotesInput.value = "";
  els.loanDialog.classList.remove("hidden");
}

function closeLoanDialog() {
  els.loanDialog.classList.add("hidden");
}

function submitLoan(event) {
  event.preventDefault();
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;
  const borrower = els.loanBorrowerInput.value.trim();
  const borrowedAt = els.loanBorrowedAtInput.value;
  const expectedReturnAt = els.loanExpectedReturnInput.value;
  const notes = els.loanNotesInput.value.trim();
  if (!borrower || !borrowedAt) return;
  game.loanRecords.push({
    id: crypto.randomUUID(),
    borrower,
    borrowedAt,
    expectedReturnAt,
    notes,
    returnedAt: null
  });
  closeLoanDialog();
  renderAll();
  showBackupMessage(`已将《${game.name}》借给 ${borrower}。`, "success");
}

function markReturned() {
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;
  const currentLoan = getCurrentLoan(game);
  if (!currentLoan) return;
  showConfirm(
    "标记归还",
    `确定要将《${game.name}》标记为已归还吗？`,
    () => {
      currentLoan.returnedAt = new Date().toISOString().slice(0, 10);
      renderAll();
      showBackupMessage(`《${game.name}》已标记归还。`, "success");
    }
  );
}

function renderLoanHistory() {
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;
  const records = getSortedLoanRecords(game);
  els.loanHistoryTitle.textContent = `《${game.name}》借出记录`;
  if (records.length === 0) {
    els.loanHistoryContent.innerHTML = `<p class="loan-history-empty">暂无借出记录。</p>`;
  } else {
    els.loanHistoryContent.innerHTML = records
      .map((record) => {
        const isActive = !record.returnedAt;
        const overdue = isActive && isOverdue(record);
        const borrowedDays = record.returnedAt
          ? daysBetween(record.borrowedAt, record.returnedAt)
          : daysBetween(record.borrowedAt, new Date().toISOString().slice(0, 10));
        return `
          <div class="loan-history-item ${isActive ? "active" : ""} ${overdue ? "overdue" : ""}">
            <div class="loan-history-header">
              <span class="loan-history-status ${isActive ? (overdue ? "overdue" : "active") : "returned"}">
                ${isActive ? (overdue ? "⚠️ 逾期未还" : "📤 借出中") : "✅ 已归还"}
              </span>
              ${record.borrower ? `<strong class="loan-history-borrower">${escapeHtml(record.borrower)}</strong>` : ""}
            </div>
            <div class="loan-history-dates">
              <span>借出：${formatDate(record.borrowedAt)}</span>
              ${record.expectedReturnAt ? `<span>预计归还：${formatDate(record.expectedReturnAt)}</span>` : ""}
              ${record.returnedAt ? `<span>实际归还：${formatDate(record.returnedAt)}</span>` : ""}
              <span>时长：${borrowedDays} 天</span>
            </div>
            ${record.notes ? `<div class="loan-history-notes">备注：${escapeHtml(record.notes)}</div>` : ""}
          </div>
        `;
      })
      .join("");
  }
  els.loanHistoryDialog.classList.remove("hidden");
}

function closeLoanHistoryDialog() {
  els.loanHistoryDialog.classList.add("hidden");
}

els.detailView.addEventListener("click", (event) => {
  const loanOutBtn = event.target.closest("#loanOutBtn");
  const returnBtn = event.target.closest("#returnBtn");
  const viewHistoryBtn = event.target.closest("#viewLoanHistoryBtn");
  if (loanOutBtn) {
    openLoanDialog();
  }
  if (returnBtn) {
    markReturned();
  }
  if (viewHistoryBtn) {
    renderLoanHistory();
  }
});

els.loanCancelBtn.addEventListener("click", closeLoanDialog);
els.loanForm.addEventListener("submit", submitLoan);
els.loanDialog.addEventListener("click", (e) => {
  if (e.target === els.loanDialog) closeLoanDialog();
});

els.loanHistoryCloseBtn.addEventListener("click", closeLoanHistoryDialog);
els.loanHistoryDialog.addEventListener("click", (e) => {
  if (e.target === els.loanHistoryDialog) closeLoanHistoryDialog();
});

if (els.loanActiveItem) {
  els.loanActiveItem.addEventListener("click", () => {
    const loanStats = getLoanStats();
    if (loanStats.activeLoans.length > 0 && els.loanStatsPanel) {
      els.loanStatsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      showBackupMessage("当前没有借出中的桌游。", "info");
    }
  });
}

if (els.loanOverdueItem) {
  els.loanOverdueItem.addEventListener("click", () => {
    const loanStats = getLoanStats();
    if (loanStats.overdueLoans.length > 0 && els.loanStatsPanel) {
      els.loanStatsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      const overdueBorrowers = loanStats.borrowers.filter((b) => b.overdue > 0);
      if (overdueBorrowers.length > 0) {
        openBorrowerDetail(overdueBorrowers[0].name);
      }
    } else {
      showBackupMessage("当前没有逾期未还的桌游 🎉", "info");
    }
  });
}

if (els.loanBorrowersList) {
  els.loanBorrowersList.addEventListener("click", (e) => {
    const card = e.target.closest(".borrower-card");
    if (!card) return;
    const borrowerName = card.dataset.borrower;
    if (borrowerName) {
      openBorrowerDetail(borrowerName);
    }
  });
}

if (els.borrowerDetailCloseBtn) {
  els.borrowerDetailCloseBtn.addEventListener("click", closeBorrowerDetail);
}

if (els.borrowerDetailDialog) {
  els.borrowerDetailDialog.addEventListener("click", (e) => {
    if (e.target === els.borrowerDetailDialog) closeBorrowerDetail();
  });
}

if (els.borrowerDetailActiveList) {
  els.borrowerDetailActiveList.addEventListener("click", (e) => {
    const item = e.target.closest("[data-game-id]");
    if (!item) return;
    const gameId = item.dataset.gameId;
    const game = state.games.find((g) => g.id === gameId);
    if (game) {
      state.selectedId = gameId;
      state.selectedExpansionId = "";
      closeBorrowerDetail();
      renderAll();
      els.detailView.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

if (els.borrowerDetailHistoryList) {
  els.borrowerDetailHistoryList.addEventListener("click", (e) => {
    const item = e.target.closest("[data-game-id]");
    if (!item) return;
    const gameId = item.dataset.gameId;
    const game = state.games.find((g) => g.id === gameId);
    if (game) {
      state.selectedId = gameId;
      state.selectedExpansionId = "";
      closeBorrowerDetail();
      renderAll();
      els.detailView.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

function openExpansionDialog() {
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;
  els.expansionDialogTitle.textContent = `《${game.name}》扩展包管理`;
  els.expansionNameInput.value = "";
  renderExpansionList();
  els.expansionDialog.classList.remove("hidden");
}

function closeExpansionDialog() {
  els.expansionDialog.classList.add("hidden");
}

function renderExpansionList() {
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;
  const expansions = game.expansions || [];
  if (expansions.length === 0) {
    els.expansionList.innerHTML = `<p class="expansion-empty">暂无扩展包，添加第一个扩展包开始管理吧。</p>`;
    return;
  }
  els.expansionList.innerHTML = expansions
    .map((exp) => {
      const ruleCount = getAllRules(game, exp.id).length;
      return `
        <div class="expansion-item" data-expansion-id="${exp.id}">
          <div class="expansion-item-info">
            <input type="text" class="expansion-name-input" value="${escapeHtml(exp.name)}" data-expansion-id="${exp.id}" />
            <span class="expansion-rule-count">${ruleCount} 条规则</span>
          </div>
          <div class="expansion-item-actions">
            <button type="button" class="expansion-delete-btn danger" data-expansion-id="${exp.id}" title="删除扩展包">删除</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function addExpansion() {
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;
  const name = els.expansionNameInput.value.trim();
  if (!name) {
    showBackupMessage("请输入扩展包名称。", "error");
    return;
  }
  const newExpansion = {
    id: crypto.randomUUID(),
    name,
    forgets: [],
    disputes: [],
    setup: [],
    scoring: []
  };
  if (!game.expansions) game.expansions = [];
  game.expansions.push(newExpansion);
  els.expansionNameInput.value = "";
  state.selectedExpansionId = newExpansion.id;
  renderExpansionList();
  renderAll();
  showBackupMessage(`已添加扩展包《${name}》。`, "success");
}

function deleteExpansion(expansionId) {
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game || !game.expansions) return;
  const expansion = game.expansions.find((e) => e.id === expansionId);
  if (!expansion) return;
  showConfirm(
    "删除扩展包",
    `确定要删除扩展包《${expansion.name}》吗？该扩展包的所有规则（包括争议裁定记录）都将被删除，操作不可撤销。`,
    () => {
      if (Array.isArray(game.disputeRulings)) {
        game.disputeRulings = game.disputeRulings.filter((r) => (r.expansionId || "") !== expansionId);
      }
      game.expansions = game.expansions.filter((e) => e.id !== expansionId);
      if (state.selectedExpansionId === expansionId) {
        state.selectedExpansionId = "";
      }
      renderExpansionList();
      renderAll();
      showBackupMessage(`已删除扩展包《${expansion.name}》。`, "success");
    }
  );
}

function renameExpansion(expansionId, newName) {
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game || !game.expansions) return;
  const expansion = game.expansions.find((e) => e.id === expansionId);
  if (!expansion) return;
  const trimmedName = newName.trim();
  if (!trimmedName) return;
  expansion.name = trimmedName;
  saveState();
  renderDetail();
}

els.expansionCancelBtn.addEventListener("click", closeExpansionDialog);
els.expansionAddBtn.addEventListener("click", addExpansion);
els.expansionDialog.addEventListener("click", (e) => {
  if (e.target === els.expansionDialog) closeExpansionDialog();
});

els.expansionList.addEventListener("click", (e) => {
  const deleteBtn = e.target.closest(".expansion-delete-btn");
  if (deleteBtn) {
    const id = deleteBtn.dataset.expansionId;
    deleteExpansion(id);
  }
});

els.expansionList.addEventListener("change", (e) => {
  const input = e.target.closest(".expansion-name-input");
  if (input) {
    const id = input.dataset.expansionId;
    renameExpansion(id, input.value);
  }
});

let currentRulingDisputeText = "";
let currentRulingExpansionId = "";

function openRulingDialog(game, disputeText, expansionId) {
  currentRulingDisputeText = disputeText;
  currentRulingExpansionId = expansionId || "";
  els.rulingDialogTitle.textContent = `新增裁定 · ${game.name}`;
  els.rulingDisputeLabel.textContent = `争议：${disputeText}`;
  els.rulingDecisionInput.value = "";
  els.rulingParticipantsInput.value = "";
  els.rulingDateInput.value = new Date().toISOString().slice(0, 10);
  els.rulingNotesInput.value = "";
  els.rulingDialog.classList.remove("hidden");
}

function closeRulingDialog() {
  els.rulingDialog.classList.add("hidden");
  currentRulingDisputeText = "";
  currentRulingExpansionId = "";
}

function submitRuling(event) {
  event.preventDefault();
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;
  const disputeText = currentRulingDisputeText;
  const decision = els.rulingDecisionInput.value.trim();
  const participants = Number(els.rulingParticipantsInput.value);
  const date = els.rulingDateInput.value;
  const notes = els.rulingNotesInput.value.trim();
  if (!disputeText || !decision || !participants || !date) return;

  if (!Array.isArray(game.disputeRulings)) {
    game.disputeRulings = [];
  }

  const expId = currentRulingExpansionId || "";
  let entry = game.disputeRulings.find(
    (r) => r.disputeText === disputeText && (r.expansionId || "") === expId
  );
  if (!entry) {
    entry = { disputeText, expansionId: expId, rulings: [] };
    game.disputeRulings.push(entry);
  }

  entry.rulings.push({
    id: crypto.randomUUID(),
    decision,
    participants,
    date,
    notes
  });

  closeRulingDialog();
  renderAll();
  showBackupMessage(`已为争议「${disputeText}」新增裁定。`, "success");
}

els.rulingCancelBtn.addEventListener("click", closeRulingDialog);
els.rulingForm.addEventListener("submit", submitRuling);
els.rulingDialog.addEventListener("click", (e) => {
  if (e.target === els.rulingDialog) closeRulingDialog();
});

let editSnapshot = null;
let editExpansionId = "";

const RULE_CONTAINER_MAP = {
  forgets: "editForgesContainer",
  disputes: "editDisputesContainer",
  setup: "editSetupContainer",
  scoring: "editScoringContainer"
};

function renderEditRuleItem(ruleKey, originalIndex, ruleText, tags) {
  const ruleTagsList = Array.isArray(tags) ? tags : [];
  return `
    <div class="edit-rule-item" data-rule-key="${ruleKey}" data-rule-index="${originalIndex}">
      <div class="edit-rule-content">
        <textarea class="edit-rule-textarea" placeholder="请输入规则内容" rows="2">${escapeHtml(ruleText)}</textarea>
        ${renderTagSelector(ruleTagsList, `editTag_${ruleKey}_${originalIndex}`)}
      </div>
      <button type="button" class="edit-remove-rule-btn" title="删除此条">×</button>
    </div>
  `;
}

function renderEditRules(ruleKey, rules) {
  const containerKey = RULE_CONTAINER_MAP[ruleKey];
  const container = els[containerKey];
  if (!container) return;
  container.innerHTML = rules
    .map((rule, index) => renderEditRuleItem(ruleKey, index, ruleText(rule), ruleTags(rule)))
    .join("");
}

function renderEditExpansionSelect() {
  if (!editSnapshot || !els.editExpansionSelect) return;
  const expansions = editSnapshot.expansions || [];
  els.editExpansionSelect.innerHTML = `
    <option value="">基础游戏</option>
    ${expansions.map((exp) => `<option value="${exp.id}">${escapeHtml(exp.name)}</option>`).join("")}
  `;
  els.editExpansionSelect.value = editExpansionId;
}

function collectEditRulesFromUI() {
  const result = { forgets: [], disputes: [], setup: [], scoring: [] };
  for (const ruleKey of Object.keys(RULE_CONTAINER_MAP)) {
    const containerKey = RULE_CONTAINER_MAP[ruleKey];
    const container = els[containerKey];
    if (!container) continue;
    const items = container.querySelectorAll(".edit-rule-item");
    items.forEach((item) => {
      const ta = item.querySelector(".edit-rule-textarea");
      if (!ta) return;
      const text = ta.value.trim();
      if (text) {
        const originalIndex = Number(item.dataset.ruleIndex);
        const ruleContainer = getRuleContainer(editSnapshot, editExpansionId);
        const originalRule = Number.isInteger(originalIndex) && ruleContainer ? ruleContainer[ruleKey]?.[originalIndex] : undefined;
        const selectedTags = [];
        item.querySelectorAll('input[name^="editTag_"]:checked').forEach((cb) => {
          if (RULE_TAGS.includes(cb.value)) selectedTags.push(cb.value);
        });
        const nextRule = originalRule === undefined
          ? { ...normalizeRule(text), tags: selectedTags }
          : { ...normalizeRule(originalRule), text, tags: selectedTags };
        result[ruleKey].push(nextRule);
      }
    });
  }
  return result;
}

function saveCurrentEditRulesToSnapshot() {
  if (!editSnapshot) return;
  const collected = collectEditRulesFromUI();
  const container = getRuleContainer(editSnapshot, editExpansionId);
  if (container) {
    container.forgets = collected.forgets;
    container.disputes = collected.disputes;
    container.setup = collected.setup;
    container.scoring = collected.scoring;
  }
}

function loadEditRulesFromSnapshot() {
  if (!editSnapshot) return;
  const container = getRuleContainer(editSnapshot, editExpansionId);
  if (!container) return;
  renderEditRules("forgets", container.forgets || []);
  renderEditRules("disputes", container.disputes || []);
  renderEditRules("setup", container.setup || []);
  renderEditRules("scoring", container.scoring || []);
}

function switchEditExpansion(expansionId) {
  saveCurrentEditRulesToSnapshot();
  editExpansionId = expansionId;
  loadEditRulesFromSnapshot();
  renderEditExpansionSelect();
}

function collectEditRules() {
  const result = { forgets: [], disputes: [], setup: [], scoring: [] };
  for (const ruleKey of Object.keys(RULE_CONTAINER_MAP)) {
    const containerKey = RULE_CONTAINER_MAP[ruleKey];
    const container = els[containerKey];
    if (!container) continue;
    const items = container.querySelectorAll(".edit-rule-item");
    items.forEach((item) => {
      const ta = item.querySelector(".edit-rule-textarea");
      if (!ta) return;
      const text = ta.value.trim();
      if (text) {
        const originalIndex = Number(item.dataset.ruleIndex);
        const originalRule = Number.isInteger(originalIndex) ? editSnapshot?.[ruleKey]?.[originalIndex] : undefined;
        const nextRule = originalRule === undefined ? normalizeRule(text) : { ...normalizeRule(originalRule), text };
        result[ruleKey].push(nextRule);
      }
    });
  }
  return result;
}

function showEditErrorMessage(message) {
  els.editErrorMessage.textContent = message;
  els.editErrorMessage.classList.remove("hidden");
}

function hideEditErrorMessage() {
  els.editErrorMessage.classList.add("hidden");
}

function openEditDialog() {
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;

  editSnapshot = structuredClone(game);
  editExpansionId = state.selectedExpansionId || "";

  els.editDialogTitle.textContent = `编辑：${game.name}`;
  els.editNameInput.value = game.name;
  els.editMinPlayersInput.value = game.minPlayers;
  els.editMaxPlayersInput.value = game.maxPlayers;
  els.editDurationInput.value = game.duration;
  els.editComplexityInput.value = game.complexity;
  els.editLastPlayedInput.value = game.lastPlayed;
  els.editCoverInput.value = "";
  editSnapshot._pendingCover = "";
  editSnapshot._pendingCompressResult = null;

  if (game.cover) {
    els.editCoverPreviewImg.src = game.cover;
    els.editCoverPreview.classList.remove("hidden");
    const size = estimateDataUrlSize(game.cover);
    els.editCoverCompressInfo.textContent = `当前封面：${formatSize(size)}`;
  } else {
    els.editCoverPreview.classList.add("hidden");
    els.editCoverCompressInfo.textContent = "";
  }

  renderEditExpansionSelect();
  loadEditRulesFromSnapshot();

  hideEditErrorMessage();
  els.editDialog.classList.remove("hidden");
}

function closeEditDialog() {
  editSnapshot = null;
  editExpansionId = "";
  els.editDialog.classList.add("hidden");
}

els.editCoverInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) {
    if (editSnapshot && editSnapshot.cover) {
      els.editCoverPreviewImg.src = editSnapshot.cover;
      els.editCoverPreview.classList.remove("hidden");
      const size = estimateDataUrlSize(editSnapshot.cover);
      els.editCoverCompressInfo.textContent = `当前封面：${formatSize(size)}`;
    } else {
      els.editCoverPreview.classList.add("hidden");
      els.editCoverCompressInfo.textContent = "";
    }
    if (editSnapshot) {
      editSnapshot._pendingCover = "";
      editSnapshot._pendingCompressResult = null;
    }
    return;
  }
  els.editCoverCompressInfo.textContent = "正在压缩处理...";
  const result = await compressImage(file);
  if (!result.dataUrl) {
    els.editCoverCompressInfo.textContent = "图片处理失败，请更换图片。";
    if (editSnapshot) {
      editSnapshot._pendingCover = "";
      editSnapshot._pendingCompressResult = null;
    }
    return;
  }
  els.editCoverPreviewImg.src = result.dataUrl;
  els.editCoverPreview.classList.remove("hidden");
  const ratio = Math.round(result.ratio * 100);
  let info = `原图 ${formatSize(result.originalSize)} → 压缩后 ${formatSize(result.compressedSize)}`;
  if (ratio > 10) {
    info += `（节省 ${ratio}%，约 ${formatSize(result.originalSize - result.compressedSize)}）`;
  }
  if (editSnapshot && editSnapshot.cover) {
    const oldSize = estimateDataUrlSize(editSnapshot.cover);
    const diff = oldSize - result.compressedSize;
    if (diff > 0) {
      info += ` · 比旧封面小 ${formatSize(diff)}`;
    } else if (diff < 0) {
      info += ` · 比旧封面大 ${formatSize(-diff)}`;
    }
  }
  els.editCoverCompressInfo.textContent = info;
  if (editSnapshot) {
    editSnapshot._pendingCover = result.dataUrl;
    editSnapshot._pendingCompressResult = result;
  }
});

els.editForm.addEventListener("click", (e) => {
  const addBtn = e.target.closest(".add-rule-btn");
  const removeBtn = e.target.closest(".edit-remove-rule-btn");

  if (addBtn) {
    const ruleKey = addBtn.dataset.ruleKey;
    const containerKey = RULE_CONTAINER_MAP[ruleKey];
    const container = els[containerKey];
    if (!container) return;
    const newItem = document.createElement("div");
    newItem.innerHTML = renderEditRuleItem(ruleKey, "", "");
    container.appendChild(newItem.firstElementChild);
    return;
  }

  if (removeBtn) {
    const item = removeBtn.closest(".edit-rule-item");
    if (item) {
      item.remove();
    }
    return;
  }
});

els.editCancelBtn.addEventListener("click", closeEditDialog);
els.editDialog.addEventListener("click", (e) => {
  if (e.target === els.editDialog) closeEditDialog();
});

if (els.editExpansionSelect) {
  els.editExpansionSelect.addEventListener("change", (e) => {
    switchEditExpansion(e.target.value);
  });
}

els.editForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideEditErrorMessage();

  const name = els.editNameInput.value.trim();
  const minPlayers = Number(els.editMinPlayersInput.value);
  const maxPlayers = Number(els.editMaxPlayersInput.value);
  const duration = Number(els.editDurationInput.value);
  const complexity = els.editComplexityInput.value;
  const lastPlayed = els.editLastPlayedInput.value;

  if (!name) {
    showEditErrorMessage("请输入桌游名称。");
    return;
  }
  if (!minPlayers || minPlayers < 1) {
    showEditErrorMessage("最少人数必须至少为 1 人。");
    return;
  }
  if (!maxPlayers || maxPlayers < 1) {
    showEditErrorMessage("最多人数必须至少为 1 人。");
    return;
  }
  if (minPlayers > maxPlayers) {
    showEditErrorMessage("最少人数不能大于最多人数。");
    return;
  }
  if (!duration || duration < 5) {
    showEditErrorMessage("时长必须至少为 5 分钟。");
    return;
  }
  if (!lastPlayed) {
    showEditErrorMessage("请选择上次游玩日期。");
    return;
  }

  saveCurrentEditRulesToSnapshot();

  let cover = editSnapshot ? editSnapshot.cover : "";
  let compressResult = editSnapshot ? editSnapshot._pendingCompressResult : null;
  if (editSnapshot && editSnapshot._pendingCover) {
    cover = editSnapshot._pendingCover;
  } else {
    const coverFile = els.editCoverInput.files[0];
    if (coverFile) {
      compressResult = await compressImage(coverFile);
      cover = compressResult.dataUrl;
    }
  }

  const gameIndex = state.games.findIndex((g) => g.id === (editSnapshot ? editSnapshot.id : state.selectedId));
  if (gameIndex === -1) {
    closeEditDialog();
    return;
  }

  const updatedGame = {
    ...state.games[gameIndex],
    name,
    minPlayers,
    maxPlayers,
    duration,
    complexity,
    lastPlayed,
    cover,
    forgets: editSnapshot.forgets,
    disputes: editSnapshot.disputes,
    setup: editSnapshot.setup,
    scoring: editSnapshot.scoring,
    expansions: structuredClone(editSnapshot.expansions || [])
  };

  const newContainers = [{ disputes: updatedGame.disputes, expansionId: "" }];
  for (const exp of updatedGame.expansions || []) {
    newContainers.push({ disputes: exp.disputes, expansionId: exp.id });
  }
  syncDisputeRulingsForGame(updatedGame, null, newContainers);
  state.games[gameIndex] = updatedGame;

  closeEditDialog();
  renderAll();
  let msg = `《${name}》已更新。`;
  if (compressResult && compressResult.originalSize > 0) {
    const ratio = Math.round(compressResult.ratio * 100);
    msg += ` 封面从 ${formatSize(compressResult.originalSize)} 压缩至 ${formatSize(compressResult.compressedSize)}`;
    if (ratio > 10) {
      msg += `（节省 ${ratio}%）`;
    }
  }
  showBackupMessage(msg, "success");
});

els.detailView.addEventListener("click", (event) => {
  const editButton = event.target.closest("#editGameBtn");
  if (editButton) {
    openEditDialog();
  }
});

const PARTY_COMPLEXITY = ["轻", "中", "重"];
const PARTY_DEFAULT_PLAYER_NAMES = ["玩家一", "玩家二", "玩家三", "玩家四", "玩家五", "玩家六", "玩家七", "玩家八"];

let partyState = null;

function createEmptyPartyState() {
  return {
    step: 1,
    name: "",
    playerCount: 4,
    candidateIds: [],
    players: []
  };
}

function createEmptyPlayer(index) {
  return {
    id: generateId(),
    index,
    name: PARTY_DEFAULT_PLAYER_NAMES[index] || `玩家${index + 1}`,
    dislikedComplexity: [],
    familiarGameIds: []
  };
}

function updatePartyStatusLabel(text) {
  if (els.partyStatusLabel) {
    els.partyStatusLabel.textContent = text;
  }
}

function showPartyStep(step) {
  if (!partyState) return;
  partyState.step = step;

  document.querySelectorAll(".party-step").forEach((el) => {
    const s = Number(el.dataset.partyStep);
    el.classList.toggle("active", s <= step);
  });

  document.querySelectorAll("[data-party-step-content]").forEach((el) => {
    const s = Number(el.dataset.partyStepContent);
    el.classList.toggle("hidden", s !== step);
  });

  if (step === 2) {
    renderPartyCandidates();
  } else if (step === 3) {
    renderPartyPlayers();
  }
}

function startPartyConfig() {
  partyState = createEmptyPartyState();
  partyState.players = Array.from({ length: partyState.playerCount }, (_, i) => createEmptyPlayer(i));

  els.partyIntro.classList.add("hidden");
  els.partyConfigView.classList.remove("hidden");
  els.partyResultView.classList.add("hidden");
  updatePartyStatusLabel("配置中");

  showPartyStep(1);
}

function cancelPartyConfig() {
  partyState = null;
  state.partyTagFilter = "";
  els.partyIntro.classList.remove("hidden");
  els.partyConfigView.classList.add("hidden");
  els.partyResultView.classList.add("hidden");
  if (els.partyTagFilterContainer) {
    els.partyTagFilterContainer.classList.add("hidden");
  }
  updatePartyStatusLabel("未启动");
  saveState();
}

function renderPartyCandidates() {
  if (!partyState || !els.partyCandidateList) return;
  const selectedSet = new Set(partyState.candidateIds);

  els.partyCandidateList.innerHTML =
    state.games
      .map((game) => {
        const checked = selectedSet.has(game.id) ? "checked" : "";
        const checkedClass = checked ? "checked" : "";
        return `
          <label class="party-candidate-card ${checkedClass}">
            <input type="checkbox" data-party-candidate="${game.id}" ${checked} />
            <div class="party-candidate-info">
              <strong>${escapeHtml(game.name)}</strong>
              <span>${game.minPlayers}-${game.maxPlayers}人 · ${game.duration}分钟 · ${escapeHtml(game.complexity)}</span>
            </div>
          </label>
        `;
      })
      .join("") || `<p class="checklist-empty">暂无收藏的桌游，先添加一些桌游吧。</p>`;
}

function syncPartyPlayersCount() {
  if (!partyState) return;
  const count = partyState.playerCount;
  while (partyState.players.length < count) {
    partyState.players.push(createEmptyPlayer(partyState.players.length));
  }
  while (partyState.players.length > count) {
    partyState.players.pop();
  }
}

function renderPartyPlayers() {
  if (!partyState || !els.partyPlayersContainer) return;
  syncPartyPlayersCount();

  const selectedCandidateGames = state.games.filter((g) => partyState.candidateIds.includes(g.id));

  els.partyPlayersContainer.innerHTML = partyState.players
    .map((player, pIdx) => {
      const dislikedSet = new Set(player.dislikedComplexity);
      const familiarSet = new Set(player.familiarGameIds);

      const complexityChips = PARTY_COMPLEXITY.map((c) => {
        const active = dislikedSet.has(c) ? "active" : "";
        return `<button type="button" class="party-complexity-chip ${active}" data-player-idx="${pIdx}" data-complexity="${c}">不玩${c}度</button>`;
      }).join("");

      const familiarGames =
        selectedCandidateGames.length > 0
          ? selectedCandidateGames
              .map((game) => {
                const checked = familiarSet.has(game.id) ? "checked" : "";
                const checkedClass = checked ? "checked" : "";
                return `
                  <label class="party-familiar-game ${checkedClass}">
                    <input type="checkbox" data-player-idx="${pIdx}" data-familiar-game="${game.id}" ${checked} />
                    <span>${escapeHtml(game.name)}</span>
                  </label>
                `;
              })
              .join("")
          : `<span class="party-prep-empty">请先在上一步选择候选桌游</span>`;

      return `
        <div class="party-player-card">
          <div class="party-player-header">
            <span class="party-player-icon">${pIdx + 1}</span>
            <input type="text" class="party-player-name-input" data-player-idx="${pIdx}" value="${escapeHtml(player.name)}" placeholder="玩家姓名" />
          </div>
          <div class="party-player-section">
            <div class="party-player-section-label">🙅 不想玩的复杂度（可多选）</div>
            <div class="party-complexity-chips">${complexityChips}</div>
          </div>
          <div class="party-player-section">
            <div class="party-player-section-label">✅ 已熟悉的游戏（无需讲解规则）</div>
            <div class="party-familiar-games">${familiarGames}</div>
          </div>
        </div>
      `;
    })
    .join("");
}

function calculateGameScore(game, players) {
  const reasons = [];
  const warnings = [];
  let score = 0;

  if (!partyState) return { score: 0, reasons, warnings };

  const totalPlayers = partyState.playerCount;
  if (totalPlayers >= game.minPlayers && totalPlayers <= game.maxPlayers) {
    score += 30;
    reasons.push(`人数匹配：支持 ${game.minPlayers}-${game.maxPlayers} 人，本次 ${totalPlayers} 人刚好合适`);
  } else if (totalPlayers < game.minPlayers) {
    warnings.push(`人数不足：游戏至少需要 ${game.minPlayers} 人，当前只有 ${totalPlayers} 人`);
    score -= 30;
  } else {
    warnings.push(`人数超限：游戏最多支持 ${game.maxPlayers} 人，当前有 ${totalPlayers} 人，可能需要分桌或扩展规则`);
    score -= 20;
  }

  const dislikedByCount = players.filter((p) => p.dislikedComplexity.includes(game.complexity)).length;
  if (dislikedByCount === 0) {
    score += 20;
    reasons.push(`复杂度合适：没有玩家不喜欢 ${game.complexity} 度游戏`);
  } else {
    const dislikedNames = players.filter((p) => p.dislikedComplexity.includes(game.complexity)).map((p) => p.name).join("、");
    warnings.push(`复杂度有争议：${dislikedNames} 不喜欢 ${game.complexity} 度游戏`);
    score -= dislikedByCount * 10;
  }

  const familiarCount = players.filter((p) => p.familiarGameIds.includes(game.id)).length;
  if (familiarCount === players.length) {
    score += 15;
    reasons.push(`全员熟悉：所有人都玩过，开局即可开玩，无需讲解`);
  } else if (familiarCount > 0) {
    score += familiarCount * 3;
    const familiarNames = players.filter((p) => p.familiarGameIds.includes(game.id)).map((p) => p.name).join("、");
    reasons.push(`${familiarCount}/${players.length} 人熟悉：${familiarNames} 已掌握，可以带着其他人玩`);
  } else {
    warnings.push(`全员陌生：没有人玩过这个游戏，需要完整讲解规则，预留约 15-20 分钟教学时间`);
  }

  const totalRules = getAllRulesIncludingExpansions(game).length;
  if (totalRules === 0) {
    score += 5;
    reasons.push(`规则准备：暂无记录的遗忘点，大家都记得很牢`);
  } else if (totalRules <= 3) {
    score += 3;
    reasons.push(`规则准备简单：仅 ${totalRules} 条规则需要复习`);
  } else {
    score -= Math.min(10, totalRules - 3);
    warnings.push(`规则较多：共 ${totalRules} 条规则/争议需要提前复习`);
  }

  const mustReviewCount = getAllRulesIncludingExpansions(game).filter((r) => ruleStatus(r) === REVIEW_STATUS.MUST_REVIEW).length;
  if (mustReviewCount > 0) {
    warnings.push(`有 ${mustReviewCount} 条规则标记为「下次必看」，务必提前过一遍`);
    score -= mustReviewCount * 2;
  }

  const staleDays = daysSince(game.lastPlayed);
  if (staleDays <= 30) {
    score += 8;
    reasons.push(`最近玩过：${staleDays} 天前刚玩过，大家印象还比较深`);
  } else if (staleDays <= 90) {
    score += 3;
    reasons.push(`不算太久：${staleDays} 天前玩过，稍微复习应该能回忆起来`);
  } else {
    warnings.push(`间隔较久：${staleDays} 天没玩了，很多细节可能遗忘，建议重点复习`);
  }

  if (hasUnresolvedDisputes(game)) {
    warnings.push(`存在未裁定争议，建议开局前先统一规则口径`);
    score -= 5;
  }

  return { score, reasons, warnings };
}

function needsSplitTable(candidateGames, totalPlayers) {
  return candidateGames.some((g) => totalPlayers > g.maxPlayers);
}

function getPlayerSubsets(players, tableCount) {
  const subsets = [];
  const n = players.length;
  const baseSize = Math.floor(n / tableCount);
  const remainder = n % tableCount;

  let startIndex = 0;
  for (let i = 0; i < tableCount; i++) {
    const size = baseSize + (i < remainder ? 1 : 0);
    subsets.push(players.slice(startIndex, startIndex + size));
    startIndex += size;
  }
  return subsets;
}

function getAllPlayerPermutations(players) {
  if (players.length <= 1) return [players];
  const result = [];
  for (let i = 0; i < players.length; i++) {
    const rest = [...players.slice(0, i), ...players.slice(i + 1)];
    const perms = getAllPlayerPermutations(rest);
    for (const perm of perms) {
      result.push([players[i], ...perm]);
    }
  }
  return result;
}

function calculateTableScore(game, tablePlayers) {
  const reasons = [];
  const warnings = [];
  let score = 0;

  const tablePlayerCount = tablePlayers.length;

  if (tablePlayerCount >= game.minPlayers && tablePlayerCount <= game.maxPlayers) {
    score += 35;
    reasons.push(`人数完美匹配：本桌 ${tablePlayerCount} 人，游戏支持 ${game.minPlayers}-${game.maxPlayers} 人`);
  } else if (tablePlayerCount < game.minPlayers) {
    warnings.push(`人数略少：本桌 ${tablePlayerCount} 人，游戏最少需要 ${game.minPlayers} 人，可考虑合并或调整`);
    score -= 25;
  } else {
    warnings.push(`人数略多：本桌 ${tablePlayerCount} 人，游戏最多支持 ${game.maxPlayers} 人，可能需要轮替或旁观`);
    score -= 15;
  }

  const dislikedByCount = tablePlayers.filter((p) => p.dislikedComplexity.includes(game.complexity)).length;
  if (dislikedByCount === 0) {
    score += 20;
    reasons.push(`复杂度适配：本桌玩家都能接受 ${game.complexity} 度游戏`);
  } else {
    const dislikedNames = tablePlayers.filter((p) => p.dislikedComplexity.includes(game.complexity)).map((p) => p.name).join("、");
    warnings.push(`复杂度偏好：${dislikedNames} 不太喜欢 ${game.complexity} 度游戏`);
    score -= dislikedByCount * 10;
  }

  const familiarCount = tablePlayers.filter((p) => p.familiarGameIds.includes(game.id)).length;
  if (familiarCount === tablePlayers.length) {
    score += 18;
    reasons.push(`全员熟练：本桌所有人都玩过，开局流畅`);
  } else if (familiarCount > 0) {
    score += familiarCount * 4;
    const familiarNames = tablePlayers.filter((p) => p.familiarGameIds.includes(game.id)).map((p) => p.name).join("、");
    reasons.push(`${familiarCount}/${tablePlayerCount} 人熟悉：${familiarNames} 可以带领新玩家`);
  } else {
    warnings.push(`全员陌生：本桌没有人玩过，需要预留 15-20 分钟教学时间`);
    score -= 5;
  }

  if (familiarCount > 0 && familiarCount < tablePlayers.length) {
    score += 5;
    reasons.push(`有老手带新手，适合边玩边学`);
  }

  const totalRules = getAllRulesIncludingExpansions(game).length;
  if (totalRules === 0) {
    score += 5;
    reasons.push(`规则简单：暂无需要复习的遗忘点`);
  } else if (totalRules <= 3) {
    score += 3;
    reasons.push(`规则轻量：仅 ${totalRules} 条规则需要复习`);
  } else {
    score -= Math.min(8, totalRules - 3);
    warnings.push(`规则较多：共 ${totalRules} 条规则/争议需要提前复习`);
  }

  const mustReviewCount = getAllRulesIncludingExpansions(game).filter((r) => ruleStatus(r) === REVIEW_STATUS.MUST_REVIEW).length;
  if (mustReviewCount > 0) {
    warnings.push(`有 ${mustReviewCount} 条规则标记为「下次必看」，务必提前过一遍`);
    score -= mustReviewCount * 3;
  }

  const staleDays = daysSince(game.lastPlayed);
  if (staleDays <= 30) {
    score += 8;
    reasons.push(`热度保持：${staleDays} 天前刚玩过，印象深刻`);
  } else if (staleDays <= 90) {
    score += 3;
    reasons.push(`记忆尚可：${staleDays} 天前玩过，复习一下就能回忆起来`);
  } else {
    warnings.push(`间隔较久：${staleDays} 天没玩了，很多细节可能遗忘，建议重点复习`);
    score -= 3;
  }

  if (hasUnresolvedDisputes(game)) {
    warnings.push(`存在未裁定争议，建议开局前先统一规则口径`);
    score -= 5;
  }

  return { score, reasons, warnings };
}

function generateTableAssignments(candidateGames, players, tableCount) {
  const minPlayersPerGame = Math.min(...candidateGames.map((g) => g.minPlayers));
  const maxPlayersPerGame = Math.max(...candidateGames.map((g) => g.maxPlayers));
  const totalPlayers = players.length;
  const avgPlayers = totalPlayers / tableCount;

  if (avgPlayers < minPlayersPerGame) {
    return [];
  }

  const tableSizes = [];
  const baseSize = Math.floor(avgPlayers);
  const remainder = totalPlayers % tableCount;

  for (let i = 0; i < tableCount; i++) {
    const size = baseSize + (i < remainder ? 1 : 0);
    if (size > maxPlayersPerGame || size < minPlayersPerGame) {
      return [];
    }
    tableSizes.push(size);
  }

  const validGamesPerTable = tableSizes.map((size) =>
    candidateGames.filter((g) => size >= g.minPlayers && size <= g.maxPlayers)
  );

  if (validGamesPerTable.some((games) => games.length === 0)) {
    return [];
  }

  const plans = [];
  const maxPlans = 5;

  function generateCombinations(tableIndex, usedGameIds, currentPlan) {
    if (plans.length >= maxPlans) return;

    if (tableIndex === tableCount) {
      plans.push([...currentPlan]);
      return;
    }

    const validGames = validGamesPerTable[tableIndex];
    const unusedGames = validGames.filter((g) => !usedGameIds.has(g.id));

    for (const game of unusedGames) {
      usedGameIds.add(game.id);
      currentPlan.push({ tableIndex, game, playerCount: tableSizes[tableIndex] });
      generateCombinations(tableIndex + 1, usedGameIds, currentPlan);
      currentPlan.pop();
      usedGameIds.delete(game.id);
    }

    if (unusedGames.length === 0 || plans.length === 0) {
      for (const game of validGames) {
        currentPlan.push({ tableIndex, game, playerCount: tableSizes[tableIndex] });
        generateCombinations(tableIndex + 1, usedGameIds, currentPlan);
        currentPlan.pop();
      }
    }
  }

  generateCombinations(0, new Set(), []);
  return plans;
}

function scoreSplitTablePlan(plan, players) {
  const tableCount = plan.length;
  const permutations = getAllPlayerPermutations(players);
  const limitedPermutations = permutations.slice(0, Math.min(permutations.length, 24));

  let bestScore = -Infinity;
  let bestAssignment = null;

  for (const perm of limitedPermutations) {
    const subsets = getPlayerSubsets(perm, tableCount);
    let totalScore = 0;
    const tableResults = [];
    const seenGameIds = new Set();
    let duplicatePenalty = 0;

    for (let i = 0; i < plan.length; i++) {
      const { game } = plan[i];
      const tablePlayers = subsets[i];

      if (seenGameIds.has(game.id)) {
        duplicatePenalty += 15;
      }
      seenGameIds.add(game.id);

      const { score, reasons, warnings } = calculateTableScore(game, tablePlayers);
      totalScore += score;
      tableResults.push({
        tableNumber: i + 1,
        game,
        players: tablePlayers,
        score,
        reasons,
        warnings
      });
    }

    totalScore -= duplicatePenalty;

    const complexityBalance = calculateComplexityBalance(tableResults);
    totalScore += complexityBalance;

    const familiarityBalance = calculateFamiliarityBalance(tableResults);
    totalScore += familiarityBalance;

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestAssignment = {
        plan,
        tables: tableResults,
        totalScore,
        complexityScore: complexityBalance,
        familiarityScore: familiarityBalance
      };
    }
  }

  return bestAssignment;
}

function calculateComplexityBalance(tableResults) {
  const complexityRank = { "轻": 1, "中": 2, "重": 3 };
  const complexities = tableResults.map((t) => complexityRank[t.game.complexity]);
  const avg = complexities.reduce((a, b) => a + b, 0) / complexities.length;
  const variance = complexities.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / complexities.length;

  if (variance === 0) return 10;
  if (variance <= 0.5) return 5;
  if (variance <= 1) return 0;
  return -5;
}

function calculateFamiliarityBalance(tableResults) {
  const familiarRatios = tableResults.map((t) => {
    const familiarCount = t.players.filter((p) => p.familiarGameIds.includes(t.game.id)).length;
    return familiarCount / t.players.length;
  });
  const avg = familiarRatios.reduce((a, b) => a + b, 0) / familiarRatios.length;
  const variance = familiarRatios.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / familiarRatios.length;

  if (variance <= 0.1) return 10;
  if (variance <= 0.2) return 5;
  if (variance <= 0.3) return 0;
  return -5;
}

function generateSplitTableRecommendations() {
  if (!partyState) return [];

  const candidateGames = state.games.filter((g) => partyState.candidateIds.includes(g.id));
  const players = partyState.players;
  const totalPlayers = players.length;
  const tagFilter = state.partyTagFilter || "";

  const filteredCandidates = tagFilter
    ? candidateGames.filter((game) =>
        getAllRulesIncludingExpansions(game).some((rule) => ruleTags(rule).includes(tagFilter))
      )
    : candidateGames;

  if (filteredCandidates.length === 0) return [];

  const maxTableCount = Math.min(filteredCandidates.length, Math.floor(totalPlayers / 2));
  const allScoredPlans = [];

  for (let tableCount = 2; tableCount <= maxTableCount; tableCount++) {
    const gamePlans = generateTableAssignments(filteredCandidates, players, tableCount);
    for (const plan of gamePlans) {
      const scored = scoreSplitTablePlan(plan, players);
      if (scored) {
        allScoredPlans.push(scored);
      }
    }
  }

  allScoredPlans.sort((a, b) => b.totalScore - a.totalScore);

  return allScoredPlans.slice(0, 3).map((plan, idx) => {
    const reasons = [];
    const warnings = [];

    reasons.push(`分为 ${plan.tables.length} 桌同时进行，总人数 ${totalPlayers} 人全部参与`);

    const avgTableSize = totalPlayers / plan.tables.length;
    if (Math.abs(avgTableSize - Math.round(avgTableSize)) < 0.5) {
      reasons.push(`人数分配均匀，每桌约 ${Math.round(avgTableSize)} 人`);
    } else {
      warnings.push(`人数分配略有不均，各桌人数差 1 人`);
    }

    if (plan.complexityScore >= 10) {
      reasons.push(`复杂度搭配均衡，各桌体验一致`);
    } else if (plan.complexityScore < 0) {
      warnings.push(`各桌复杂度差异较大，注意照顾不同玩家偏好`);
    }

    if (plan.familiarityScore >= 10) {
      reasons.push(`新老手搭配均衡，每桌都有合适的带领者`);
    } else if (plan.familiarityScore < 0) {
      warnings.push(`各桌熟练度差异较大，可能需要调整人员`);
    }

    const uniqueGames = new Set(plan.tables.map((t) => t.game.id));
    if (uniqueGames.size === plan.tables.length) {
      reasons.push(`每桌游戏不同，玩法丰富多样`);
    } else {
      warnings.push(`有重复游戏，可考虑调整增加多样性`);
    }

    return {
      id: `plan-${idx}`,
      tables: plan.tables,
      totalScore: plan.totalScore,
      reasons,
      warnings,
      rank: idx
    };
  });
}

function generatePartyRecommendations() {
  if (!partyState) return { type: "single", recommendations: [] };

  const candidateGames = state.games.filter((g) => partyState.candidateIds.includes(g.id));
  const totalPlayers = partyState.playerCount;
  const tagFilter = state.partyTagFilter || "";

  if (candidateGames.length === 0) {
    return { type: "single", recommendations: [] };
  }

  if (needsSplitTable(candidateGames, totalPlayers)) {
    const splitPlans = generateSplitTableRecommendations();
    if (splitPlans.length > 0) {
      return { type: "split", plans: splitPlans };
    }
  }

  const scored = candidateGames.map((game) => {
    const { score, reasons, warnings } = calculateGameScore(game, partyState.players);
    return { game, score, reasons, warnings };
  }).filter((item) => {
    if (!tagFilter) return true;
    return getAllRulesIncludingExpansions(item.game).some((rule) => ruleTags(rule).includes(tagFilter));
  });

  scored.sort((a, b) => b.score - a.score);
  return { type: "single", recommendations: scored };
}

function renderSplitTableCard(plan, rank) {
  const { tables, totalScore, reasons, warnings } = plan;
  const isTop = rank === 0;
  const cardClass = isTop ? "recommended" : "alternative";
  const badge = isTop
    ? `<span class="party-rec-badge top">⭐ 首推方案</span>`
    : `<span class="party-rec-badge alt">备选方案</span>`;

  const reasonsHtml =
    reasons.length > 0
      ? `<div class="party-reasons"><h5>✅ 方案优势</h5><ul>${reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul></div>`
      : "";

  const warningsHtml =
    warnings.length > 0
      ? `<div class="party-warnings"><h5>⚠️ 注意事项</h5><ul>${warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join("")}</ul></div>`
      : "";

  const tablesHtml = tables.map((table) => {
    const playerNames = table.players.map((p) => escapeHtml(p.name || `玩家${p.index + 1}`)).join("、");
    const tableReasonsHtml =
      table.reasons.length > 0
        ? `<div class="party-reasons"><h5>推荐理由</h5><ul>${table.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul></div>`
        : "";
    const tableWarningsHtml =
      table.warnings.length > 0
        ? `<div class="party-warnings"><h5>风险提示</h5><ul>${table.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join("")}</ul></div>`
        : "";

    return `
      <div class="split-table-card" data-table-game="${table.game.id}">
        <div class="split-table-header">
          <div class="split-table-title">
            <span class="split-table-number">第${table.tableNumber}桌</span>
            <span class="split-table-game">${escapeHtml(table.game.name)}</span>
          </div>
          <div class="split-table-score">
            评分 <strong>${table.score}</strong>
          </div>
        </div>
        <div class="split-table-body">
          <div class="party-rec-meta">
            <span class="pill">${table.players.length}人</span>
            <span class="pill">${table.game.minPlayers}-${table.game.maxPlayers}人上限</span>
            <span class="pill">${table.game.duration}分钟</span>
            <span class="pill heavy">${escapeHtml(table.game.complexity)}</span>
          </div>
          <div class="split-table-players">
            <span class="split-table-players-label">👥 玩家：</span>
            <span class="split-table-players-names">${playerNames}</span>
          </div>
          ${tableReasonsHtml}
          ${tableWarningsHtml}
          <div style="margin-top:8px;">
            <button type="button" class="party-jump-to-detail text-btn" data-game-id="${table.game.id}">📖 查看《${escapeHtml(table.game.name)}》详情 & 规则 →</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="party-rec-card party-split-card ${cardClass}" data-party-plan="${plan.id}">
      <div class="party-rec-header">
        <div class="party-rec-title-row">
          ${badge}
          <span class="party-rec-title">${tables.length}桌分桌方案</span>
        </div>
        <div class="party-rec-score">
          综合评分 <strong>${totalScore}</strong>
        </div>
      </div>
      <div class="party-rec-body">
        ${reasonsHtml}
        ${warningsHtml}
        <div class="split-tables-container">
          ${tablesHtml}
        </div>
      </div>
    </div>
  `;
}

function renderPartyRecCard(item, rank) {
  const { game, score, reasons, warnings } = item;
  const tagFilter = state.partyTagFilter || "";
  const matchingRules = tagFilter
    ? getAllRulesIncludingExpansions(game).filter((rule) => ruleTags(rule).includes(tagFilter))
    : [];
  const isTop = rank === 0;
  const cardClass = isTop ? "recommended" : "alternative";
  const badge = isTop
    ? `<span class="party-rec-badge top">⭐ 首推</span>`
    : `<span class="party-rec-badge alt">备选</span>`;
  const tagMatchHtml = tagFilter
    ? `<div class="party-rec-tag-match">${renderTagChips([tagFilter])}<span>${matchingRules.length} 条匹配规则</span></div>`
    : "";

  const reasonsHtml =
    reasons.length > 0
      ? `<div class="party-reasons"><h5>✅ 推荐理由</h5><ul>${reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul></div>`
      : "";

  const warningsHtml =
    warnings.length > 0
      ? `<div class="party-warnings"><h5>⚠️ 注意事项</h5><ul>${warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join("")}</ul></div>`
      : "";

  return `
    <div class="party-rec-card ${cardClass}" data-party-rec-game="${game.id}">
      <div class="party-rec-header">
        <div class="party-rec-title-row">
          ${badge}
          <span class="party-rec-title">${escapeHtml(game.name)}</span>
        </div>
        <div class="party-rec-score">
          综合评分 <strong>${score}</strong>
        </div>
      </div>
      <div class="party-rec-body">
        <div class="party-rec-meta">
          <span class="pill">${game.minPlayers}-${game.maxPlayers}人</span>
          <span class="pill">${game.duration}分钟</span>
          <span class="pill heavy">${escapeHtml(game.complexity)}</span>
          <span class="pill">${daysSince(game.lastPlayed)}天未玩</span>
        </div>
        ${tagMatchHtml}
        ${reasonsHtml}
        ${warningsHtml}
        <div style="margin-top:8px;">
          <button type="button" class="party-jump-to-detail text-btn" data-game-id="${game.id}">📖 查看详情 & 规则 →</button>
        </div>
      </div>
    </div>
  `;
}

function renderPartyRecommendations(result) {
  if (!els.partyRecommendations) return;

  if (result.type === "split" && result.plans && result.plans.length > 0) {
    const tagFilter = state.partyTagFilter || "";
    els.partyRecommendations.innerHTML = `
      <h4>🎯 分桌方案推荐（${result.plans.length} 个方案）</h4>
      <p class="party-hint">
        总人数 ${partyState.playerCount} 人超过部分候选游戏的单桌上限，智能推荐以下分桌方案。
        ${tagFilter ? `当前筛选标签：${renderTagChips([tagFilter])}` : ""}
      </p>
      ${result.plans.map((plan, idx) => renderSplitTableCard(plan, idx)).join("")}
    `;
    return;
  }

  const recommendations = result.recommendations || [];
  if (recommendations.length === 0) {
    const tagFilter = state.partyTagFilter || "";
    const emptyText = tagFilter
      ? `没有包含「${escapeHtml(tagFilter)}」标签的候选游戏。`
      : "没有候选游戏可推荐，请回到上一步选择至少一个桌游。";
    els.partyRecommendations.innerHTML = `<p class="checklist-empty">${emptyText}</p>`;
    return;
  }

  const candidateGames = state.games.filter((g) => partyState.candidateIds.includes(g.id));
  const totalPlayers = partyState.playerCount;
  const hasOverLimitCandidate = candidateGames.some((g) => totalPlayers > g.maxPlayers);
  const hintText = !hasOverLimitCandidate
    ? `总人数 ${totalPlayers} 人，可单桌进行，以下为推荐排序。`
    : `总人数 ${totalPlayers} 人，但未找到合适的分桌组合，以下为单桌推荐（可能需要调整人数或候选桌游）。`;

  els.partyRecommendations.innerHTML = `
    <h4>🎯 推荐桌游（${recommendations.length} 个候选）</h4>
    <p class="party-hint">${hintText}</p>
    ${recommendations.map((item, idx) => renderPartyRecCard(item, idx)).join("")}
  `;
}

function renderPartyPreparationSection(title, icon, items, className, tagFilter = "") {
  const filteredItems = tagFilter
    ? items.filter((r) => ruleTags(r).includes(tagFilter))
    : items;
  if (!filteredItems || filteredItems.length === 0) {
    return `<div class="party-prep-section"><div class="party-prep-section-label ${className}">${icon} ${title}</div><span class="party-prep-empty">${tagFilter ? "该标签下暂无记录" : "暂无记录"}</span></div>`;
  }
  return `
    <div class="party-prep-section">
      <div class="party-prep-section-label ${className}">${icon} ${title}（${filteredItems.length} 条）</div>
      <ul>${filteredItems.map((t) => `<li>${escapeHtml(ruleText(t))}${renderTagChips(ruleTags(t))}</li>`).join("")}</ul>
    </div>
  `;
}

function renderSplitTablePreparation(plans) {
  if (!els.partyPreparation) return;

  const topPlan = plans[0];
  if (!topPlan) {
    els.partyPreparation.innerHTML = "";
    if (els.partyTagFilterContainer) {
      els.partyTagFilterContainer.classList.add("hidden");
    }
    return;
  }

  const tagFilter = state.partyTagFilter || "";

  if (els.partyTagFilterContainer) {
    els.partyTagFilterContainer.innerHTML = renderTagFilterBar(tagFilter);
    els.partyTagFilterContainer.classList.remove("hidden");
  }

  const html = topPlan.tables
    .map((table, idx) => {
      const game = table.game;
      const openClass = idx === 0 ? "open" : "";
      const allForges = game.forgets || [];
      const allDisputes = game.disputes || [];
      const allSetup = game.setup || [];

      const mustReviewRules = getAllRulesIncludingExpansions(game).filter((r) => ruleStatus(r) === REVIEW_STATUS.MUST_REVIEW);
      const stillForgetRules = getAllRulesIncludingExpansions(game).filter((r) => ruleStatus(r) === REVIEW_STATUS.STILL_FORGET);

      const combinedForges = [...allForges, ...mustReviewRules, ...stillForgetRules];
      const uniqueForges = [];
      const seenForget = new Set();
      for (const r of combinedForges) {
        const t = ruleText(r);
        if (!seenForget.has(t)) {
          seenForget.add(t);
          uniqueForges.push(r);
        }
      }

      const playerNames = table.players.map((p) => escapeHtml(p.name || `玩家${p.index + 1}`)).join("、");

      return `
        <div class="party-prep-game-group ${openClass}" data-prep-game="${game.id}-${table.tableNumber}">
          <div class="party-prep-game-header" data-prep-toggle="${game.id}-${table.tableNumber}">
            <span class="party-prep-toggle">▶</span>
            <span class="party-prep-game-title">
              <span class="split-table-number">第${table.tableNumber}桌</span>
              ${escapeHtml(game.name)}
            </span>
            <span class="pill">${table.players.length}人</span>
            <span class="pill">${game.duration}分钟</span>
          </div>
          <div class="party-prep-game-body">
            <div class="split-table-prep-players">
              <span class="split-table-players-label">👥 本桌玩家：</span>
              <span class="split-table-players-names">${playerNames}</span>
            </div>
            <div class="split-table-review-focus">
              <h5>📝 本桌复习重点</h5>
              ${renderPartyPreparationSection("开局准备", "📦", allSetup, "setup", tagFilter)}
              ${renderPartyPreparationSection("容易忘的规则", "⚠️", uniqueForges, "forget", tagFilter)}
              ${renderPartyPreparationSection("争议提醒", "⚖️", allDisputes, "dispute", tagFilter)}
            </div>
            <div style="margin-top:10px;">
              <button type="button" class="party-jump-to-detail text-btn" data-game-id="${game.id}">📖 打开《${escapeHtml(game.name)}》完整详情页 →</button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  els.partyPreparation.innerHTML = `
    <h4>📋 分桌复习清单（首推方案 · 共 ${topPlan.tables.length} 桌）</h4>
    ${renderResumeBanner(null)}
    <div style="margin:12px 0 16px;">
      <button type="button" class="review-start-btn" data-start-review="${REVIEW_SESSION_SOURCE.PARTY}">🎴 开始卡片复习</button>
    </div>
    <p class="party-hint">以下为推荐方案的每桌复习重点，可根据实际人员调整灵活变动。</p>
    ${html}
  `;
}

function renderPartyPreparation(result) {
  if (!els.partyPreparation) return;

  if (result.type === "split" && result.plans && result.plans.length > 0) {
    renderSplitTablePreparation(result.plans);
    return;
  }

  const recommendations = result.recommendations || [];
  const relevantGames = recommendations.slice(0, Math.min(3, recommendations.length)).map((r) => r.game);

  if (relevantGames.length === 0) {
    els.partyPreparation.innerHTML = "";
    if (els.partyTagFilterContainer) {
      els.partyTagFilterContainer.classList.add("hidden");
    }
    return;
  }

  const tagFilter = state.partyTagFilter || "";

  if (els.partyTagFilterContainer) {
    els.partyTagFilterContainer.innerHTML = renderTagFilterBar(tagFilter);
    els.partyTagFilterContainer.classList.remove("hidden");
  }

  const html = relevantGames
    .map((game, idx) => {
      const openClass = idx === 0 ? "open" : "";
      const allForges = game.forgets || [];
      const allDisputes = game.disputes || [];
      const allSetup = game.setup || [];

      const mustReviewRules = getAllRulesIncludingExpansions(game).filter((r) => ruleStatus(r) === REVIEW_STATUS.MUST_REVIEW);
      const stillForgetRules = getAllRulesIncludingExpansions(game).filter((r) => ruleStatus(r) === REVIEW_STATUS.STILL_FORGET);

      const combinedForges = [...allForges, ...mustReviewRules, ...stillForgetRules];
      const uniqueForges = [];
      const seenForget = new Set();
      for (const r of combinedForges) {
        const t = ruleText(r);
        if (!seenForget.has(t)) {
          seenForget.add(t);
          uniqueForges.push(r);
        }
      }

      return `
        <div class="party-prep-game-group ${openClass}" data-prep-game="${game.id}">
          <div class="party-prep-game-header" data-prep-toggle="${game.id}">
            <span class="party-prep-toggle">▶</span>
            <span class="party-prep-game-title">${escapeHtml(game.name)}</span>
            <span class="pill">${game.minPlayers}-${game.maxPlayers}人</span>
            <span class="pill">${game.duration}分钟</span>
          </div>
          <div class="party-prep-game-body">
            ${renderPartyPreparationSection("开局准备", "📦", allSetup, "setup", tagFilter)}
            ${renderPartyPreparationSection("容易忘的规则", "⚠️", uniqueForges, "forget", tagFilter)}
            ${renderPartyPreparationSection("争议提醒", "⚖️", allDisputes, "dispute", tagFilter)}
            <div style="margin-top:10px;">
              <button type="button" class="party-jump-to-detail text-btn" data-game-id="${game.id}">📖 打开完整详情页 →</button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  els.partyPreparation.innerHTML = `
    <h4>📋 开局准备与复习清单（前 ${relevantGames.length} 个推荐游戏）</h4>
    ${renderResumeBanner(null)}
    <div style="margin:12px 0 16px;">
      <button type="button" class="review-start-btn" data-start-review="${REVIEW_SESSION_SOURCE.PARTY}">🎴 开始卡片复习</button>
    </div>
    ${html}
  `;
}

function renderPartyResult() {
  if (!partyState || !els.partyResultView) return;

  const result = generatePartyRecommendations();

  els.partyResultTitle.textContent = partyState.name ? `${partyState.name} · 准备方案` : "聚会准备方案";

  renderPartyRecommendations(result);
  renderPartyPreparation(result);
}

function generatePartyResult() {
  if (!partyState) return;

  if (partyState.candidateIds.length === 0) {
    showBackupMessage("请先选择至少一个候选桌游。", "error");
    showPartyStep(2);
    return;
  }

  els.partyConfigView.classList.add("hidden");
  els.partyResultView.classList.remove("hidden");
  updatePartyStatusLabel("方案已生成");
  renderPartyResult();
  els.partyResultView.scrollIntoView({ behavior: "smooth", block: "start" });
}

els.startPartyBtn?.addEventListener("click", startPartyConfig);

els.partyConfigView?.addEventListener("click", (e) => {
  const nextBtn = e.target.closest(".party-next-btn");
  const prevBtn = e.target.closest(".party-prev-btn");
  const cancelBtn = e.target.closest(".party-cancel-btn");
  const candidateCard = e.target.closest(".party-candidate-card");
  const complexityChip = e.target.closest(".party-complexity-chip");
  const familiarGame = e.target.closest(".party-familiar-game");
  const jumpBtn = e.target.closest(".party-jump-to-detail");

  if (nextBtn && partyState) {
    const nextStep = Number(nextBtn.dataset.nextStep);
    if (nextStep === 2) {
      partyState.name = els.partyNameInput.value.trim();
      partyState.playerCount = Number(els.partyPlayerCountInput.value);
      syncPartyPlayersCount();
    }
    if (nextStep === 3 && partyState.candidateIds.length === 0) {
      showBackupMessage("请先选择至少一个候选桌游。", "error");
      return;
    }
    showPartyStep(nextStep);
    return;
  }

  if (prevBtn && partyState) {
    const prevStep = Number(prevBtn.dataset.prevStep);
    showPartyStep(prevStep);
    return;
  }

  if (cancelBtn) {
    cancelPartyConfig();
    return;
  }

  if (candidateCard && partyState) {
    const checkbox = candidateCard.querySelector('input[type="checkbox"]');
    const gameId = checkbox?.dataset.partyCandidate;
    if (!gameId) return;
    if (checkbox.checked) {
      if (!partyState.candidateIds.includes(gameId)) {
        partyState.candidateIds.push(gameId);
      }
      candidateCard.classList.add("checked");
    } else {
      partyState.candidateIds = partyState.candidateIds.filter((id) => id !== gameId);
      candidateCard.classList.remove("checked");
    }
    return;
  }

  if (complexityChip && partyState) {
    const pIdx = Number(complexityChip.dataset.playerIdx);
    const c = complexityChip.dataset.complexity;
    const player = partyState.players[pIdx];
    if (!player) return;
    const set = new Set(player.dislikedComplexity);
    if (set.has(c)) {
      set.delete(c);
      complexityChip.classList.remove("active");
    } else {
      set.add(c);
      complexityChip.classList.add("active");
    }
    player.dislikedComplexity = [...set];
    return;
  }

  if (familiarGame && partyState) {
    const checkbox = familiarGame.querySelector('input[type="checkbox"]');
    const pIdx = Number(familiarGame.querySelector("[data-player-idx]")?.dataset.playerIdx || checkbox?.dataset.playerIdx);
    const gameId = checkbox?.dataset.familiarGame;
    if (!gameId || !Number.isInteger(pIdx)) return;
    const player = partyState.players[pIdx];
    if (!player) return;
    if (checkbox.checked) {
      if (!player.familiarGameIds.includes(gameId)) {
        player.familiarGameIds.push(gameId);
      }
      familiarGame.classList.add("checked");
    } else {
      player.familiarGameIds = player.familiarGameIds.filter((id) => id !== gameId);
      familiarGame.classList.remove("checked");
    }
    return;
  }

  if (jumpBtn) {
    const gameId = jumpBtn.dataset.gameId;
    if (gameId) {
      state.selectedId = gameId;
      state.selectedExpansionId = "";
      renderAll();
      document.querySelector(".detail-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    return;
  }
});

els.partyConfigView?.addEventListener("change", (e) => {
  const nameInput = e.target.closest(".party-player-name-input");
  if (nameInput && partyState) {
    const pIdx = Number(nameInput.dataset.playerIdx);
    if (Number.isInteger(pIdx) && partyState.players[pIdx]) {
      partyState.players[pIdx].name = nameInput.value.trim();
    }
  }
});

els.partyPlayerCountInput?.addEventListener("change", () => {
  if (partyState) {
    partyState.playerCount = Number(els.partyPlayerCountInput.value);
  }
});

els.partyGenerateBtn?.addEventListener("click", generatePartyResult);

els.partyBackToConfigBtn?.addEventListener("click", () => {
  if (!partyState) return;
  els.partyResultView.classList.add("hidden");
  els.partyConfigView.classList.remove("hidden");
  updatePartyStatusLabel("配置中");
  showPartyStep(partyState.step || 1);
});

els.partyResetBtn?.addEventListener("click", () => {
  showConfirm(
    "重新开始",
    "确定要放弃当前配置并重新开始吗？",
    () => {
      cancelPartyConfig();
    }
  );
});

els.partyResultView?.addEventListener("click", (e) => {
  const tagFilterChip = e.target.closest("[data-tag-filter]");
  const toggleHeader = e.target.closest("[data-prep-toggle]");
  const jumpBtn = e.target.closest(".party-jump-to-detail");

  if (tagFilterChip) {
    state.partyTagFilter = tagFilterChip.dataset.tagFilter || "";
    saveState();
    if (partyState) {
      const result = generatePartyRecommendations();
      renderPartyRecommendations(result);
      renderPartyPreparation(result);
    }
    return;
  }

  if (toggleHeader) {
    const gameId = toggleHeader.dataset.prepToggle;
    const group = document.querySelector(`.party-prep-game-group[data-prep-game="${gameId}"]`);
    if (group) {
      group.classList.toggle("open");
    }
    return;
  }

  if (jumpBtn) {
    const gameId = jumpBtn.dataset.gameId;
    if (gameId) {
      state.selectedId = gameId;
      state.selectedExpansionId = "";
      renderAll();
      document.querySelector(".detail-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    return;
  }
});

updatePartyStatusLabel("未启动");

function collectRulesWithMeta(filterFn, sourceLabel) {
  const collected = [];
  for (const game of state.games) {
    const containers = [{ container: game, expansionId: "", expansionName: "" }];
    for (const exp of game.expansions || []) {
      containers.push({ container: exp, expansionId: exp.id, expansionName: exp.name });
    }
    for (const { container, expansionId, expansionName } of containers) {
      const ruleKeys = ["forgets", "disputes", "setup", "scoring"];
      for (const ruleKey of ruleKeys) {
        const rules = container[ruleKey] || [];
        for (let idx = 0; idx < rules.length; idx++) {
          const rule = rules[idx];
          if (filterFn && !filterFn(rule, ruleKey, game, container, expansionId)) continue;
          collected.push({
            ruleId: rule.id || `${game.id}-${expansionId}-${ruleKey}-${idx}`,
            gameId: game.id,
            gameName: game.name,
            expansionId,
            expansionName,
            ruleKey,
            ruleIndex: idx,
            text: ruleText(rule),
            tags: ruleTags(rule),
            prevStatus: ruleStatus(rule),
            sourceLabel: sourceLabel || ""
          });
        }
      }
    }
  }
  return collected;
}

function collectMustReviewRules() {
  return collectRulesWithMeta(
    (rule) => ruleStatus(rule) === REVIEW_STATUS.MUST_REVIEW,
    "下次必看"
  );
}

function collectStillForgetRules() {
  return collectRulesWithMeta(
    (rule) => ruleStatus(rule) === REVIEW_STATUS.STILL_FORGET,
    "还会忘"
  );
}

function collectUnresolvedDisputeRules() {
  return collectRulesWithMeta(
    (rule, ruleKey, game, container, expansionId) => {
      if (ruleKey !== "disputes") return false;
      const rulings = Array.isArray(game.disputeRulings) ? game.disputeRulings : [];
      const expId = expansionId || "";
      const text = ruleText(rule);
      const entry = rulings.find((r) => r.disputeText === text && (r.expansionId || "") === expId);
      return !entry || entry.rulings.length === 0;
    },
    "未裁定争议"
  );
}

function collectChecklistRules() {
  syncChecklistSelection();
  const selectedGameIds = new Set(state.selectedChecklistIds);
  const selectedExpansionIdsByGame = state.selectedChecklistExpansionIds || {};
  return collectRulesWithMeta(
    (rule, ruleKey, game, container, expansionId) => {
      if (!selectedGameIds.has(game.id)) return false;
      if (expansionId) {
        const allowed = selectedExpansionIdsByGame[game.id] || [];
        if (!allowed.includes(expansionId)) return false;
      }
      return true;
    },
    "聚会清单"
  );
}

function collectPartyRules() {
  if (!partyState || !partyState.candidateIds || partyState.candidateIds.length === 0) {
    return [];
  }
  const candidateIds = new Set(partyState.candidateIds);
  return collectRulesWithMeta(
    (rule, ruleKey, game) => candidateIds.has(game.id),
    "聚会准备"
  );
}

function collectAllPendingRules() {
  return collectRulesWithMeta(
    (rule) => {
      const s = ruleStatus(rule);
      return s === REVIEW_STATUS.UNMARKED || s === REVIEW_STATUS.STILL_FORGET || s === REVIEW_STATUS.MUST_REVIEW;
    },
    "待复习"
  );
}

function collectRulesBySource(source, extraData) {
  switch (source) {
    case REVIEW_SESSION_SOURCE.MUST_REVIEW:
      return collectMustReviewRules();
    case REVIEW_SESSION_SOURCE.STILL_FORGET:
      return collectStillForgetRules();
    case REVIEW_SESSION_SOURCE.UNRESOLVED_DISPUTES:
      return collectUnresolvedDisputeRules();
    case REVIEW_SESSION_SOURCE.CHECKLIST:
      return collectChecklistRules();
    case REVIEW_SESSION_SOURCE.PARTY:
      return collectPartyRules();
    case REVIEW_SESSION_SOURCE.ALL_PENDING:
      return collectAllPendingRules();
    default:
      return [];
  }
}

function saveReviewSession() {
  if (!reviewSession) {
    localStorage.removeItem(REVIEW_SESSION_KEY);
    return;
  }
  try {
    localStorage.setItem(REVIEW_SESSION_KEY, JSON.stringify(reviewSession));
  } catch (e) {
    console.warn("Failed to save review session:", e);
  }
}

function loadReviewSession() {
  try {
    const raw = localStorage.getItem(REVIEW_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.cards)) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function clearReviewSessionStorage() {
  localStorage.removeItem(REVIEW_SESSION_KEY);
}

function startReviewSession(source, extraData) {
  const cards = collectRulesBySource(source, extraData);
  if (cards.length === 0) {
    showBackupMessage("当前来源没有可复习的规则卡片。", "error");
    return;
  }

  reviewSession = {
    id: generateId(),
    source,
    sourceLabel: REVIEW_SESSION_SOURCE_LABELS[source] || "复习会话",
    startedAt: new Date().toISOString(),
    cards,
    currentIndex: 0,
    marks: cards.map(() => null)
  };
  saveReviewSession();
  openReviewSessionDialog();
  renderReviewSession();
}

function resumeReviewSession() {
  const saved = loadReviewSession();
  if (!saved) return;
  reviewSession = saved;
  openReviewSessionDialog();
  renderReviewSession();
}

function openReviewSessionDialog() {
  if (!els.reviewSessionDialog) return;
  els.reviewSessionDialog.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeReviewSessionDialog() {
  if (!els.reviewSessionDialog) return;
  els.reviewSessionDialog.classList.add("hidden");
  document.body.style.overflow = "";
}

function exitReviewSession() {
  if (!reviewSession) {
    closeReviewSessionDialog();
    return;
  }
  const allMarked = reviewSession.marks.every((m) => m !== null);
  if (allMarked) {
    reviewSession = null;
    clearReviewSessionStorage();
    closeReviewSessionDialog();
    renderAll();
    return;
  }
  showConfirm(
    "退出复习会话",
    "还有未标记的卡片，进度已保存，下次可以继续。确定要退出吗？",
    () => {
      saveReviewSession();
      closeReviewSessionDialog();
    }
  );
}

function getSessionStats() {
  if (!reviewSession) return null;
  const marks = reviewSession.marks;
  return {
    total: marks.length,
    mastered: marks.filter((m) => m === REVIEW_MARK_ACTION.MASTERED).length,
    stillForget: marks.filter((m) => m === REVIEW_MARK_ACTION.STILL_FORGET).length,
    mustReview: marks.filter((m) => m === REVIEW_MARK_ACTION.MUST_REVIEW).length,
    skipped: marks.filter((m) => m === REVIEW_MARK_ACTION.SKIP).length,
    done: marks.filter((m) => m !== null).length
  };
}

function applyMarkToRule(card, mark) {
  if (mark === REVIEW_MARK_ACTION.SKIP) return;
  const game = state.games.find((g) => g.id === card.gameId);
  if (!game) return;
  const container = getRuleContainer(game, card.expansionId);
  if (!container) return;
  const rules = container[card.ruleKey];
  if (!rules || card.ruleIndex < 0 || card.ruleIndex >= rules.length) return;
  rules[card.ruleIndex].status = mark;
}

function markCurrentCard(mark) {
  if (!reviewSession) return;
  const idx = reviewSession.currentIndex;
  if (idx < 0 || idx >= reviewSession.cards.length) return;

  const card = reviewSession.cards[idx];
  reviewSession.marks[idx] = mark;

  applyMarkToRule(card, mark);
  saveState();
  saveReviewSession();

  if (idx < reviewSession.cards.length - 1) {
    reviewSession.currentIndex = idx + 1;
    saveReviewSession();
    renderReviewSession();
  } else {
    renderReviewSession();
    setTimeout(() => finishReviewSession(), 400);
  }
}

function goToCard(index) {
  if (!reviewSession) return;
  if (index < 0 || index >= reviewSession.cards.length) return;
  reviewSession.currentIndex = index;
  saveReviewSession();
  renderReviewSession();
}

function finishReviewSession() {
  if (!reviewSession) return;
  saveState();
  renderReviewSessionSummary();
}

function finalizeReviewSession() {
  reviewSession = null;
  clearReviewSessionStorage();
  closeReviewSessionDialog();
  renderAll();
}

function renderReviewSession() {
  if (!reviewSession) return;

  const stats = getSessionStats();
  const total = stats.total;
  const done = stats.done;
  const progress = total > 0 ? (done / total) * 100 : 0;

  els.reviewSessionTitle.textContent = reviewSession.sourceLabel;
  els.reviewSessionProgress.textContent = `${Math.min(done + 1, total)} / ${total}`;
  els.reviewSessionProgressFill.style.width = `${progress}%`;

  if (done >= total) {
    renderReviewSessionSummary();
    return;
  }

  const idx = reviewSession.currentIndex;
  const card = reviewSession.cards[idx];
  const prevStatus = card.prevStatus;
  const prevStatusHtml = prevStatus
    ? `<span class="review-card-prev-status ${prevStatus}">原状态：${REVIEW_STATUS_LABELS[prevStatus]}</span>`
    : `<span class="review-card-prev-status">未标记</span>`;

  const expansionHtml = card.expansionName
    ? `<span class="review-card-expansion">🧩 ${escapeHtml(card.expansionName)}</span>`
    : "";

  const statsBarHtml = `
    <div class="review-session-stats-bar">
      <div class="review-session-stat mastered"><strong>${stats.mastered}</strong> 已掌握</div>
      <div class="review-session-stat still_forget"><strong>${stats.stillForget}</strong> 还会忘</div>
      <div class="review-session-stat must_review"><strong>${stats.mustReview}</strong> 下次必看</div>
      <div class="review-session-stat skipped"><strong>${stats.skipped}</strong> 跳过</div>
    </div>
  `;

  els.reviewSessionContent.innerHTML = `
    <div class="review-card">
      <div class="review-card-meta">
        <span class="review-card-game">🎮 ${escapeHtml(card.gameName)}</span>
        ${expansionHtml}
        <span class="review-card-category">${RULE_CATEGORY_LABELS[card.ruleKey] || card.ruleKey}</span>
        ${prevStatusHtml}
      </div>
      ${renderTagChips(card.tags)}
      <div class="review-card-text">${escapeHtml(card.text)}</div>
      <div class="review-card-actions">
        <button type="button" class="review-action-btn mastered" data-review-mark="${REVIEW_MARK_ACTION.MASTERED}">
          <span class="icon">✅</span>
          <span>已掌握</span>
        </button>
        <button type="button" class="review-action-btn still_forget" data-review-mark="${REVIEW_MARK_ACTION.STILL_FORGET}">
          <span class="icon">💭</span>
          <span>还会忘</span>
        </button>
        <button type="button" class="review-action-btn must_review" data-review-mark="${REVIEW_MARK_ACTION.MUST_REVIEW}">
          <span class="icon">🔔</span>
          <span>下次必看</span>
        </button>
        <button type="button" class="review-action-btn skip" data-review-mark="${REVIEW_MARK_ACTION.SKIP}">
          <span class="icon">⏭️</span>
          <span>跳过</span>
        </button>
      </div>
    </div>
    ${statsBarHtml}
  `;
}

function renderReviewSessionSummary() {
  if (!reviewSession) return;

  const stats = getSessionStats();
  const markedCards = reviewSession.cards
    .map((card, idx) => ({ card, mark: reviewSession.marks[idx] }))
    .filter((item) => item.mark !== null);

  const detailsHtml = markedCards.length > 0
    ? `
      <div class="review-summary-details">
        <h4>本次标记明细</h4>
        <ul class="review-summary-list">
          ${markedCards.map(({ card, mark }) => {
            const markLabel = mark === REVIEW_MARK_ACTION.MASTERED ? "已掌握"
              : mark === REVIEW_MARK_ACTION.STILL_FORGET ? "还会忘"
              : mark === REVIEW_MARK_ACTION.MUST_REVIEW ? "下次必看"
              : "跳过";
            const location = card.expansionName
              ? `${card.gameName} · ${card.expansionName}`
              : card.gameName;
            return `
              <li>
                <span class="status-tag ${mark}">${markLabel}</span>
                <div class="item-text">
                  ${escapeHtml(card.text)}
                  <span class="item-game">${escapeHtml(location)} · ${RULE_CATEGORY_LABELS[card.ruleKey] || card.ruleKey}</span>
                </div>
              </li>
            `;
          }).join("")}
        </ul>
      </div>
    `
    : "";

  els.reviewSessionTitle.textContent = `${reviewSession.sourceLabel} · 完成`;
  els.reviewSessionProgress.textContent = `${stats.total} / ${stats.total}`;
  els.reviewSessionProgressFill.style.width = "100%";

  els.reviewSessionContent.innerHTML = `
    <div class="review-summary-card">
      <h3 class="review-summary-title">🎉 本次复习完成</h3>
      <div class="review-summary-stats">
        <div class="review-summary-stat mastered">
          <span class="value">${stats.mastered}</span>
          <span class="label">✅ 已掌握</span>
        </div>
        <div class="review-summary-stat still_forget">
          <span class="value">${stats.stillForget}</span>
          <span class="label">💭 还会忘</span>
        </div>
        <div class="review-summary-stat must_review">
          <span class="value">${stats.mustReview}</span>
          <span class="label">🔔 下次必看</span>
        </div>
        <div class="review-summary-stat skipped">
          <span class="value">${stats.skipped}</span>
          <span class="label">⏭️ 跳过</span>
        </div>
      </div>
      ${detailsHtml}
      <div class="review-summary-actions">
        <button type="button" id="reviewFinalizeBtn" class="primary">完成并返回</button>
      </div>
    </div>
  `;
}

function renderResumeBanner(_container, title) {
  const saved = loadReviewSession();
  if (!saved) return "";
  const stats = {
    total: saved.marks.length,
    done: saved.marks.filter((m) => m !== null).length
  };
  const remaining = stats.total - stats.done;
  if (remaining <= 0) return "";
  const titleText = title || saved.sourceLabel || "未完成的复习";
  return `
    <div class="resume-session-banner" data-resume-banner>
      <div class="info">
        ${escapeHtml(titleText)}<span>已完成 ${stats.done}/${stats.total}，还剩 ${remaining} 条</span>
      </div>
      <div class="actions">
        <button type="button" class="review-start-btn" data-resume-session>继续复习</button>
        <button type="button" class="review-start-btn secondary" data-discard-session>放弃</button>
      </div>
    </div>
  `;
}

els.reviewSessionCloseBtn?.addEventListener("click", exitReviewSession);

els.reviewSessionDialog?.addEventListener("click", (e) => {
  const markBtn = e.target.closest("[data-review-mark]");
  if (markBtn) {
    const mark = markBtn.dataset.reviewMark;
    if (mark) markCurrentCard(mark);
    return;
  }
  const finalizeBtn = e.target.closest("#reviewFinalizeBtn");
  if (finalizeBtn) {
    finalizeReviewSession();
    return;
  }
  if (e.target === els.reviewSessionDialog) {
    exitReviewSession();
  }
});

document.addEventListener("click", (e) => {
  const startBtn = e.target.closest("[data-start-review]");
  if (startBtn) {
    const source = startBtn.dataset.startReview;
    if (source) startReviewSession(source);
    return;
  }
  const resumeBtn = e.target.closest("[data-resume-session]");
  if (resumeBtn) {
    resumeReviewSession();
    return;
  }
  const discardBtn = e.target.closest("[data-discard-session]");
  if (discardBtn) {
    showConfirm(
      "放弃未完成复习",
      "确定要放弃当前未完成的复习会话吗？已标记的规则状态会保留。",
      () => {
        reviewSession = null;
        clearReviewSessionStorage();
        renderAll();
      }
    );
    return;
  }
});

document.addEventListener("keydown", (e) => {
  if (!reviewSession || els.reviewSessionDialog?.classList.contains("hidden")) return;
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;

  if (e.key === "Escape") {
    exitReviewSession();
    return;
  }
  if (e.key === "1") markCurrentCard(REVIEW_MARK_ACTION.MASTERED);
  else if (e.key === "2") markCurrentCard(REVIEW_MARK_ACTION.STILL_FORGET);
  else if (e.key === "3") markCurrentCard(REVIEW_MARK_ACTION.MUST_REVIEW);
  else if (e.key === "4" || e.key === "ArrowRight" || e.key === " ") {
    e.preventDefault();
    markCurrentCard(REVIEW_MARK_ACTION.SKIP);
  } else if (e.key === "ArrowLeft") {
    if (reviewSession.currentIndex > 0) goToCard(reviewSession.currentIndex - 1);
  }
});

(function checkPendingReviewSession() {
  const saved = loadReviewSession();
  if (!saved) return;
  const remaining = saved.marks.filter((m) => m === null).length;
  if (remaining <= 0) {
    clearReviewSessionStorage();
  }
})();
