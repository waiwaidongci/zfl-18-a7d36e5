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

const defaultState = {
  selectedId: "",
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
      loanRecords: []
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
      loanRecords: []
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
      loanRecords: []
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
  editForgesContainer: document.querySelector("#editForgesContainer"),
  editDisputesContainer: document.querySelector("#editDisputesContainer"),
  editSetupContainer: document.querySelector("#editSetupContainer"),
  editScoringContainer: document.querySelector("#editScoringContainer"),
  editErrorMessage: document.querySelector("#editErrorMessage"),
  editCancelBtn: document.querySelector("#editCancelBtn")
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(defaultState);
  try {
    const parsed = JSON.parse(saved);
    const games = Array.isArray(parsed.games)
      ? parsed.games.map((game) => ({
          ...game,
          loanRecords: Array.isArray(game.loanRecords) ? game.loanRecords : [],
          forgets: normalizeRuleArray(game.forgets),
          disputes: normalizeRuleArray(game.disputes),
          setup: normalizeRuleArray(game.setup),
          scoring: normalizeRuleArray(game.scoring)
        }))
      : structuredClone(defaultState).games;
    return {
      ...structuredClone(defaultState),
      ...parsed,
      games,
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

function getAllRules(game) {
  return [...game.forgets, ...game.disputes, ...game.setup, ...game.scoring];
}

function getAllRuleObjects() {
  return state.games.flatMap((game) => getAllRules(game));
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
  return getAllRules(game).some((rule) => ruleStatus(rule) === REVIEW_STATUS.MUST_REVIEW);
}

function setRuleStatus(gameId, ruleKey, ruleIndex, status) {
  const game = state.games.find((g) => g.id === gameId);
  if (!game) return;
  const rules = game[ruleKey];
  if (!rules || ruleIndex < 0 || ruleIndex >= rules.length) return;
  const currentStatus = ruleStatus(rules[ruleIndex]);
  if (currentStatus === status) {
    rules[ruleIndex].status = REVIEW_STATUS.UNMARKED;
  } else {
    rules[ruleIndex].status = status;
  }
  saveState();
}

function getReviewProgress(game) {
  const all = getAllRules(game);
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

function getFilteredGames() {
  const keyword = els.searchInput.value.trim();
  const player = els.playerFilter.value;
  const complexity = els.complexityFilter.value;
  const mustReviewOnly = els.filterMustReview && els.filterMustReview.checked;
  const games = state.games.filter((game) => {
    const text = `${game.name}${getAllRules(game).map(ruleText).join("")}`;
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

function renderSummary() {
  const allRuleCount = state.games.reduce((sum, game) => sum + getAllRules(game).length, 0);
  const stale = [...state.games].sort((a, b) => daysSince(b.lastPlayed) - daysSince(a.lastPlayed))[0];
  els.gameCount.textContent = state.games.length;
  els.ruleCount.textContent = allRuleCount;
  els.staleGame.textContent = stale ? `${daysSince(stale.lastPlayed)}天` : "-";
  if (els.reviewPendingCount) {
    els.reviewPendingCount.textContent = getReviewPendingCount();
  }
}

function renderReviewProgressBadges(game) {
  const progress = getReviewProgress(game);
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

function renderReviewSummary(game) {
  const progress = getReviewProgress(game);
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

function renderDetail() {
  const game = state.games.find((item) => item.id === state.selectedId) || state.games[0];
  if (!game) {
    els.detailView.innerHTML = `<p class="empty">先添加一个桌游。</p>`;
    return;
  }
  state.selectedId = game.id;
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
      ${renderReviewSummary(game)}
      ${renderLoanStatus(game)}
      ${renderRuleSection("容易忘的规则", "forgets", game.forgets)}
      ${renderRuleSection("常见争议", "disputes", game.disputes)}
      ${renderRuleSection("开局准备", "setup", game.setup)}
      ${renderRuleSection("计分提醒", "scoring", game.scoring)}
      <form class="add-rule" id="ruleForm">
        <select id="ruleTypeInput">
          <option value="forgets">容易忘的规则</option>
          <option value="disputes">常见争议</option>
          <option value="setup">开局准备</option>
          <option value="scoring">计分提醒</option>
        </select>
        <textarea id="ruleTextInput" rows="3" placeholder="补充一条聚会前要看的提醒" required></textarea>
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

function renderStatusButtons(gameId, ruleKey, ruleIndex, currentStatus) {
  const statuses = [
    { value: REVIEW_STATUS.MASTERED, label: "已掌握", icon: "✅" },
    { value: REVIEW_STATUS.STILL_FORGET, label: "还会忘", icon: "💭" },
    { value: REVIEW_STATUS.MUST_REVIEW, label: "下次必看", icon: "🔔" }
  ];
  return statuses
    .map((s) => {
      const active = currentStatus === s.value ? "active" : "";
      return `<button type="button" class="status-btn ${active} ${s.value}" title="${s.label}" 
        data-status="${s.value}" data-rule-game="${gameId}" data-rule-key="${ruleKey}" data-rule-index="${ruleIndex}">${s.icon}</button>`;
    })
    .join("");
}

function renderRuleSection(title, key, items) {
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
                    ${renderStatusButtons(state.selectedId, key, index, status)}
                    <button type="button" class="delete-btn" title="删除" data-rule-key="${key}" data-rule-index="${index}">×</button>
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

function renderAll() {
  saveState();
  if (els.filterMustReview) {
    els.filterMustReview.checked = state.filterMustReview;
  }
  renderSummary();
  renderList();
  renderDetail();
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
  const cover = await readFileAsDataUrl(els.coverInput.files[0]);
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
    disputes: normalizeRuleArray([]),
    setup: normalizeRuleArray(["整理组件并按人数调整初始设置。"]),
    scoring: normalizeRuleArray(["确认终局计分项和即时得分项。"]),
    loanRecords: []
  };
  state.games.unshift(game);
  state.selectedId = game.id;
  els.gameForm.reset();
  setDefaultDate();
  renderAll();
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
  game[key].push(normalizeRule(text));
  renderAll();
});

els.detailView.addEventListener("click", (event) => {
  const statusButton = event.target.closest("[data-status]");
  const ruleButton = event.target.closest(".delete-btn[data-rule-key]");
  const playedButton = event.target.closest("#playedTodayBtn");
  const deleteButton = event.target.closest("#deleteGameBtn");
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;

  if (statusButton) {
    const gameId = statusButton.dataset.ruleGame;
    const key = statusButton.dataset.ruleKey;
    const index = Number(statusButton.dataset.ruleIndex);
    const status = statusButton.dataset.status;
    setRuleStatus(gameId, key, index, status);
    renderAll();
    return;
  }

  if (ruleButton) {
    const key = ruleButton.dataset.ruleKey;
    const index = Number(ruleButton.dataset.ruleIndex);
    game[key].splice(index, 1);
    renderAll();
  }

  if (playedButton) {
    game.lastPlayed = new Date().toISOString().slice(0, 10);
    renderAll();
  }

  if (deleteButton) {
    state.games = state.games.filter((item) => item.id !== game.id);
    state.selectedId = state.games[0]?.id || "";
    syncChecklistSelection();
    if (!els.checklistView.classList.contains("hidden")) {
      renderChecklist();
    }
    renderAll();
  }
});

setDefaultDate();
renderAll();

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
        state.games = games.map((game) => ({
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
          loanRecords: Array.isArray(game.loanRecords) ? game.loanRecords : []
        }));
        state.selectedId = state.games[0]?.id || "";
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

let editSnapshot = null;

const RULE_CONTAINER_MAP = {
  forgets: "editForgesContainer",
  disputes: "editDisputesContainer",
  setup: "editSetupContainer",
  scoring: "editScoringContainer"
};

function renderEditRuleItem(ruleKey, index, ruleText) {
  return `
    <div class="edit-rule-item" data-rule-key="${ruleKey}" data-rule-index="${index}">
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

function collectEditRules() {
  const result = { forgets: [], disputes: [], setup: [], scoring: [] };
  for (const ruleKey of Object.keys(RULE_CONTAINER_MAP)) {
    const containerKey = RULE_CONTAINER_MAP[ruleKey];
    const container = els[containerKey];
    if (!container) continue;
    const textareas = container.querySelectorAll(".edit-rule-textarea");
    textareas.forEach((ta) => {
      const text = ta.value.trim();
      if (text) {
        result[ruleKey].push(normalizeRule(text));
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

  els.editDialogTitle.textContent = `编辑：${game.name}`;
  els.editNameInput.value = game.name;
  els.editMinPlayersInput.value = game.minPlayers;
  els.editMaxPlayersInput.value = game.maxPlayers;
  els.editDurationInput.value = game.duration;
  els.editComplexityInput.value = game.complexity;
  els.editLastPlayedInput.value = game.lastPlayed;
  els.editCoverInput.value = "";

  if (game.cover) {
    els.editCoverPreviewImg.src = game.cover;
    els.editCoverPreview.classList.remove("hidden");
  } else {
    els.editCoverPreview.classList.add("hidden");
  }

  renderEditRules("forgets", game.forgets);
  renderEditRules("disputes", game.disputes);
  renderEditRules("setup", game.setup);
  renderEditRules("scoring", game.scoring);

  hideEditErrorMessage();
  els.editDialog.classList.remove("hidden");
}

function closeEditDialog() {
  editSnapshot = null;
  els.editDialog.classList.add("hidden");
}

els.editCoverInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) {
    if (editSnapshot && editSnapshot.cover) {
      els.editCoverPreviewImg.src = editSnapshot.cover;
      els.editCoverPreview.classList.remove("hidden");
    } else {
      els.editCoverPreview.classList.add("hidden");
    }
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    els.editCoverPreviewImg.src = reader.result;
    els.editCoverPreview.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
});

els.editForm.addEventListener("click", (e) => {
  const addBtn = e.target.closest(".add-rule-btn");
  const removeBtn = e.target.closest(".edit-remove-rule-btn");

  if (addBtn) {
    const ruleKey = addBtn.dataset.ruleKey;
    const containerKey = RULE_CONTAINER_MAP[ruleKey];
    const container = els[containerKey];
    if (!container) return;
    const currentCount = container.querySelectorAll(".edit-rule-item").length;
    const newItem = document.createElement("div");
    newItem.innerHTML = renderEditRuleItem(ruleKey, currentCount, "");
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

  let cover = editSnapshot ? editSnapshot.cover : "";
  const coverFile = els.editCoverInput.files[0];
  if (coverFile) {
    cover = await readFileAsDataUrl(coverFile);
  }

  const collectedRules = collectEditRules();

  const gameIndex = state.games.findIndex((g) => g.id === (editSnapshot ? editSnapshot.id : state.selectedId));
  if (gameIndex === -1) {
    closeEditDialog();
    return;
  }

  state.games[gameIndex] = {
    ...state.games[gameIndex],
    name,
    minPlayers,
    maxPlayers,
    duration,
    complexity,
    lastPlayed,
    cover,
    forgets: collectedRules.forgets,
    disputes: collectedRules.disputes,
    setup: collectedRules.setup,
    scoring: collectedRules.scoring
  };

  closeEditDialog();
  renderAll();
  showBackupMessage(`《${name}》已更新。`, "success");
});

els.detailView.addEventListener("click", (event) => {
  const editButton = event.target.closest("#editGameBtn");
  if (editButton) {
    openEditDialog();
  }
});
