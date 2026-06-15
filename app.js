const storageKey = "zfl18-boardgame-rule-cards";
const today = new Date();

const defaultState = {
  selectedId: "",
  selectedChecklistIds: [],
  checklistPlayerFilter: "all",
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
      forgets: ["商站建造前先确认道路或水路连接", "袋中随从抽完后不是重洗弃堆，而是从已回袋内容继续抽"],
      disputes: ["事件顺序和玩家动作结算先后", "科技板是否能替代所有同类随从"],
      setup: ["按人数放置货物板块", "每位玩家拿起始随从、商人和个人板"],
      scoring: ["货物分数", "商站和市民乘区块", "金币和建筑剩余加分"]
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
      forgets: ["联邦连接时卫星数量和能量消耗要一起核对", "研究升到顶必须拿对应科技板限制"],
      disputes: ["被动充能是否能拒绝", "星球改造费用受哪些能力影响"],
      setup: ["随机终局计分板和回合得分板", "按种族设置起始资源和母星"],
      scoring: ["终局计分板", "科技轨排名", "联邦和建筑分"]
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
      forgets: ["每轮结束先铺墙再补工厂展示区", "地板线扣分后清空对应砖"],
      disputes: ["同色砖放置限制是否看整面墙", "中央区起始玩家标记是否必须拿"],
      setup: ["按人数放工厂圆盘", "每个圆盘补4块砖"],
      scoring: ["横竖相邻即时分", "完整行列和颜色终局加分"]
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
  generateChecklistBtn: document.querySelector("#generateChecklistBtn")
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(defaultState);
  try {
    const parsed = JSON.parse(saved);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      selectedChecklistIds: Array.isArray(parsed.selectedChecklistIds) ? parsed.selectedChecklistIds : [],
      checklistPlayerFilter: parsed.checklistPlayerFilter || "all"
    };
  } catch {
    return structuredClone(defaultState);
  }
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

function getFilteredGames() {
  const keyword = els.searchInput.value.trim();
  const player = els.playerFilter.value;
  const complexity = els.complexityFilter.value;
  const games = state.games.filter((game) => {
    const text = `${game.name}${getAllRules(game).join("")}`;
    const matchesKeyword = !keyword || text.includes(keyword);
    const matchesPlayer = player === "all" || (Number(player) >= game.minPlayers && Number(player) <= game.maxPlayers);
    const matchesComplexity = complexity === "all" || game.complexity === complexity;
    return matchesKeyword && matchesPlayer && matchesComplexity;
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
}

function renderList() {
  const games = getFilteredGames();
  els.visibleCount.textContent = `${games.length}个匹配`;
  els.gameList.innerHTML =
    games
      .map((game) => {
        const selected = game.id === state.selectedId ? "selected" : "";
        return `
          <article class="game-card ${selected}" data-game-id="${game.id}">
            <div class="cover">
              ${
                game.cover
                  ? `<img src="${game.cover}" alt="${escapeHtml(game.name)}封面" />`
                  : `<span>${escapeHtml(game.name.slice(0, 2))}</span>`
              }
              <span class="stale-ribbon">${daysSince(game.lastPlayed)}天未玩</span>
            </div>
            <div class="game-body">
              <h3>${escapeHtml(game.name)}</h3>
              <div class="game-meta">
                <span class="pill">${game.minPlayers}-${game.maxPlayers}人</span>
                <span class="pill">${game.duration}分钟</span>
                <span class="pill heavy">${escapeHtml(game.complexity)}</span>
              </div>
            </div>
          </article>
        `;
      })
      .join("") || `<p class="empty">没有符合筛选的桌游。</p>`;
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
        <button id="playedTodayBtn" type="button">标记今天玩过</button>
        <button id="deleteGameBtn" type="button">删除桌游</button>
      </div>
    </div>
  `;
}

function renderRuleSection(title, key, items) {
  return `
    <section class="rule-section">
      <h3>${title}</h3>
      <ul class="rule-list">
        ${
          items
            .map(
              (item, index) => `
                <li>
                  <span>${escapeHtml(item)}</span>
                  <button type="button" title="删除" data-rule-key="${key}" data-rule-index="${index}">×</button>
                </li>
              `
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
        ? `<div class="checklist-rule-group"><h5>⚠️ 容易忘的规则</h5><ul>${game.forgets.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul></div>`
        : "";
      const setupHtml = game.setup.length
        ? `<div class="checklist-rule-group"><h5>📦 开局准备</h5><ul>${game.setup.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul></div>`
        : "";
      const scoringHtml = game.scoring.length
        ? `<div class="checklist-rule-group"><h5>🏆 计分提醒</h5><ul>${game.scoring.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul></div>`
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
    forgets: ["本局开始前先补充容易忘的规则。"],
    disputes: [],
    setup: ["整理组件并按人数调整初始设置。"],
    scoring: ["确认终局计分项和即时得分项。"]
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
  game[key].push(text);
  renderAll();
});

els.detailView.addEventListener("click", (event) => {
  const ruleButton = event.target.closest("[data-rule-key]");
  const playedButton = event.target.closest("#playedTodayBtn");
  const deleteButton = event.target.closest("#deleteGameBtn");
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;

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
          forgets: Array.isArray(game.forgets) ? game.forgets.map(String) : [],
          disputes: Array.isArray(game.disputes) ? game.disputes.map(String) : [],
          setup: Array.isArray(game.setup) ? game.setup.map(String) : [],
          scoring: Array.isArray(game.scoring) ? game.scoring.map(String) : []
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
