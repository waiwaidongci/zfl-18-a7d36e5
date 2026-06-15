const storageKey = "zfl18-boardgame-rule-cards";
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

function normalizeRule(rule) {
  if (typeof rule === "string") {
    return { text: rule, status: REVIEW_STATUS.UNMARKED };
  }
  return {
    text: rule?.text ?? "",
    status: rule?.status ?? REVIEW_STATUS.UNMARKED
  };
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

const defaultState = {
  selectedId: "",
  selectedExpansionId: "",
  selectedChecklistIds: [],
  checklistPlayerFilter: "all",
  filterMustReview: false,
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
      expansions: [],
      disputeRulings: normalizeDisputeRulings([
        { disputeText: "事件顺序和玩家动作结算先后", expansionId: "", rulings: [] },
        { disputeText: "科技板是否能替代所有同类随从", expansionId: "", rulings: [] }
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
  coverGalleryFileInput: document.querySelector("#coverGalleryFileInput")
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(defaultState);
  try {
    const parsed = JSON.parse(saved);
    const games = Array.isArray(parsed.games)
      ? parsed.games.map((game) => {
          const normalized = {
            ...game,
            loanRecords: Array.isArray(game.loanRecords) ? game.loanRecords : [],
            forgets: normalizeRuleArray(game.forgets),
            disputes: normalizeRuleArray(game.disputes),
            setup: normalizeRuleArray(game.setup),
            scoring: normalizeRuleArray(game.scoring),
            expansions: normalizeExpansionArray(game.expansions),
            disputeRulings: normalizeDisputeRulings(game.disputeRulings)
          };
          const newContainers = [{ disputes: normalized.disputes, expansionId: "" }];
          for (const exp of normalized.expansions || []) {
            newContainers.push({ disputes: exp.disputes, expansionId: exp.id });
          }
          syncDisputeRulingsForGame(normalized, null, newContainers);
          return normalized;
        })
      : structuredClone(defaultState).games;
    return {
      ...structuredClone(defaultState),
      ...parsed,
      games,
      selectedExpansionId: parsed.selectedExpansionId || "",
      selectedChecklistIds: Array.isArray(parsed.selectedChecklistIds) ? parsed.selectedChecklistIds : [],
      checklistPlayerFilter: parsed.checklistPlayerFilter || "all",
      filterMustReview: parsed.filterMustReview || false
    };
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

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(fromStr, toStr) {
  const from = new Date(`${fromStr}T00:00:00`);
  const to = new Date(`${toStr}T00:00:00`);
  return Math.floor((to - from) / 86400000);
}

function isOverdue(loan) {
  if (!loan || !loan.expectedReturnAt || loan.returnedAt) return false;
  return daysBetween(loan.expectedReturnAt, new Date().toISOString().slice(0, 10)) > 0;
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function daysSince(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return Math.max(0, Math.floor((today - date) / 86400000));
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
  const games = state.games.filter((game) => {
    const allRulesText = getAllRulesIncludingExpansions(game).map(ruleText).join("");
    const expansionNames = (game.expansions || []).map((e) => e.name).join("");
    const text = `${game.name}${expansionNames}${allRulesText}`;
    const matchesKeyword = !keyword || text.includes(keyword);
    const matchesPlayer = player === "all" || (Number(player) >= game.minPlayers && Number(player) <= game.maxPlayers);
    const matchesComplexity = complexity === "all" || game.complexity === complexity;
    const matchesMustReview = !mustReviewOnly || hasMustReviewRule(game);
    return matchesKeyword && matchesPlayer && matchesComplexity && matchesMustReview;
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
  return `
    <section class="review-summary">
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
  return `
    <section class="rule-section">
      <h3>${title}</h3>
      <ul class="rule-list">
        ${
          items
            .map(
              (item, index) => {
                const text = ruleText(item);
                const status = ruleStatus(item);
                const statusClass = status ? `status-${status}` : "";
                return `
                <li class="${statusClass}">
                  <div class="rule-content">
                    <span class="rule-text">${escapeHtml(text)}</span>
                    ${status ? `<span class="rule-status-label">${REVIEW_STATUS_LABELS[status]}</span>` : ""}
                  </div>
                  <div class="rule-actions">
                    ${renderStatusButtons(state.selectedId, key, index, status, expansionId)}
                    <button type="button" class="delete-btn" title="删除" data-rule-key="${key}" data-rule-index="${index}" data-rule-expansion="${expansionId}">×</button>
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
  const disputeItems = items
    .map((item, index) => {
      const text = ruleText(item);
      const status = ruleStatus(item);
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
        <li class="dispute-item ${statusClass} ${hasRulings ? "has-rulings" : "no-rulings"}" data-dispute-index="${index}" data-dispute-text="${escapeHtml(text)}" data-dispute-expansion="${expansionId}">
          <div class="dispute-header">
            <div class="dispute-header-left">
              <button type="button" class="dispute-toggle-btn" data-dispute-index="${index}" data-dispute-expansion="${expansionId}" title="展开/收起">▶</button>
              <div class="rule-content">
                <span class="rule-text">${escapeHtml(text)}</span>
                <div class="dispute-badges">
                  ${unresolvedBadge}
                  ${status ? `<span class="rule-status-label">${REVIEW_STATUS_LABELS[status]}</span>` : ""}
                </div>
              </div>
            </div>
            <div class="rule-actions">
              ${renderStatusButtons(state.selectedId, "disputes", index, status, expansionId)}
              <button type="button" class="add-ruling-btn" title="新增裁定" data-dispute-index="${index}" data-dispute-expansion="${expansionId}">⚖️</button>
              <button type="button" class="delete-btn" title="删除" data-rule-key="disputes" data-rule-index="${index}" data-rule-expansion="${expansionId}">×</button>
            </div>
          </div>
          ${lastRuling ? `
            <div class="dispute-latest-ruling">
              <span class="latest-ruling-label">最近裁定：</span>
              <span class="latest-ruling-text">${escapeHtml(lastRuling.decision)}</span>
              <span class="latest-ruling-date">（${formatDate(lastRuling.date)}）</span>
            </div>
          ` : ""}
          <div class="dispute-ruling-panel hidden" data-ruling-panel="${index}" data-ruling-expansion="${expansionId}">
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
        return `
          <label class="checklist-game-card ${checkedClass}">
            <input type="checkbox" data-checklist-id="${game.id}" ${checked} />
            <div class="checklist-game-info">
              <strong>${escapeHtml(game.name)}</strong>
              <span>${game.minPlayers}-${game.maxPlayers}人 · ${game.duration}分钟</span>
            </div>
          </label>
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

  const sectionsHtml = selectedGames
    .map((game) => {
      const forgetsHtml = game.forgets.length
        ? `<div class="checklist-rule-group"><h5>⚠️ 容易忘的规则</h5><ul>${game.forgets.map((f) => `<li>${escapeHtml(ruleText(f))}</li>`).join("")}</ul></div>`
        : "";
      const setupHtml = game.setup.length
        ? `<div class="checklist-rule-group"><h5>📦 开局准备</h5><ul>${game.setup.map((s) => `<li>${escapeHtml(ruleText(s))}</li>`).join("")}</ul></div>`
        : "";
      const scoringHtml = game.scoring.length
        ? `<div class="checklist-rule-group"><h5>🏆 计分提醒</h5><ul>${game.scoring.map((s) => `<li>${escapeHtml(ruleText(s))}</li>`).join("")}</ul></div>`
        : "";

      return `
        <section class="checklist-game-section">
          <div class="checklist-game-header">
            <h4>${escapeHtml(game.name)}</h4>
            <span class="pill">${game.minPlayers}-${game.maxPlayers}人</span>
            <span class="pill">${game.duration}分钟</span>
          </div>
          ${forgetsHtml}
          ${setupHtml}
          ${scoringHtml}
        </section>
      `;
    })
    .join("");

  els.checklistView.innerHTML = `
    <h3>📋 今晚聚会复习清单 · ${selectedGames.length} 个游戏</h3>
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

function renderAll() {
  saveState();
  if (els.filterMustReview) {
    els.filterMustReview.checked = state.filterMustReview;
  }
  renderSummary();
  renderList();
  renderDetail();
  renderCoverGallery();
  renderChecklistGames();
}

function compressImage(file, maxWidth = 400, quality = 0.7) {
  return new Promise((resolve) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(reader.result);
      img.src = reader.result;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
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

els.searchInput.addEventListener("input", renderAll);
els.playerFilter.addEventListener("change", renderAll);
els.complexityFilter.addEventListener("change", renderAll);
els.sortMode.addEventListener("change", renderAll);
if (els.filterMustReview) {
  els.filterMustReview.addEventListener("change", () => {
    state.filterMustReview = els.filterMustReview.checked;
    renderAll();
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
  container[key].push(normalizeRule(text));
  if (key === "disputes") {
    ensureDisputeRulingEntry(game, text, state.selectedExpansionId || "");
  }
  renderAll();
});

els.detailView.addEventListener("click", (event) => {
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
    exportedAt: new Date().toISOString(),
    games: state.games
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
    const games = validateImportData(parsed);
    showConfirm(
      "确认导入数据",
      `即将导入 ${games.length} 个桌游，这将覆盖当前的全部收藏数据，操作不可撤销。确定继续吗？`,
      () => {
        state.games = games.map((game) => {
          const normalized = {
            id: game.id || crypto.randomUUID(),
            name: String(game.name || ""),
            minPlayers: Number(game.minPlayers) || 2,
            maxPlayers: Number(game.maxPlayers) || 4,
            duration: Number(game.duration) || 60,
            complexity: ["轻", "中", "重"].includes(game.complexity) ? game.complexity : "中",
            lastPlayed: String(game.lastPlayed || new Date().toISOString().slice(0, 10)),
            cover: String(game.cover || ""),
            forgets: normalizeRuleArray(game.forgets),
            disputes: normalizeRuleArray(game.disputes),
            setup: normalizeRuleArray(game.setup),
            scoring: normalizeRuleArray(game.scoring),
            loanRecords: Array.isArray(game.loanRecords) ? game.loanRecords : [],
            expansions: normalizeExpansionArray(game.expansions),
            disputeRulings: normalizeDisputeRulings(game.disputeRulings)
          };
          const newContainers = [{ disputes: normalized.disputes, expansionId: "" }];
          for (const exp of normalized.expansions || []) {
            newContainers.push({ disputes: exp.disputes, expansionId: exp.id });
          }
          syncDisputeRulingsForGame(normalized, null, newContainers);
          return normalized;
        });
        state.selectedId = state.games[0]?.id || "";
        state.selectedExpansionId = "";
        renderAll();
        showBackupMessage(`成功导入 ${state.games.length} 个桌游数据。`, "success");
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

els.checklistGameList.addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-checklist-id]");
  if (!checkbox) return;
  const gameId = checkbox.dataset.checklistId;
  if (checkbox.checked) {
    if (!state.selectedChecklistIds.includes(gameId)) {
      state.selectedChecklistIds.push(gameId);
    }
  } else {
    state.selectedChecklistIds = state.selectedChecklistIds.filter((id) => id !== gameId);
  }
  renderChecklistGames();
  saveState();
});

els.clearChecklistBtn.addEventListener("click", () => {
  state.selectedChecklistIds = [];
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

function renderEditRuleItem(ruleKey, originalIndex, ruleText) {
  return `
    <div class="edit-rule-item" data-rule-key="${ruleKey}" data-rule-index="${originalIndex}">
      <textarea class="edit-rule-textarea" placeholder="请输入规则内容" rows="2">${escapeHtml(ruleText)}</textarea>
      <button type="button" class="edit-remove-rule-btn" title="删除此条">×</button>
    </div>
  `;
}

function renderEditRules(ruleKey, rules) {
  const containerKey = RULE_CONTAINER_MAP[ruleKey];
  const container = els[containerKey];
  if (!container) return;
  container.innerHTML = rules
    .map((rule, index) => renderEditRuleItem(ruleKey, index, ruleText(rule)))
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
        const container = getRuleContainer(editSnapshot, editExpansionId);
        const originalRule = Number.isInteger(originalIndex) && container ? container[ruleKey]?.[originalIndex] : undefined;
        const nextRule = originalRule === undefined ? normalizeRule(text) : { ...normalizeRule(originalRule), text };
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
