const storageKey = "zfl18-boardgame-rule-cards";
const SCHEMA_VERSION = 5;
const today = new Date();

const HISTORY_LIMIT_PER_GAME = 50;
const GLOBAL_UNDO_LIMIT = 100;

const HISTORY_ACTION = {
  GAME_CREATE: "game_create",
  GAME_DELETE: "game_delete",
  GAME_UPDATE: "game_update",
  GAME_LAST_PLAYED: "game_last_played",
  RULE_ADD: "rule_add",
  RULE_DELETE: "rule_delete",
  RULE_UPDATE: "rule_update",
  RULE_STATUS: "rule_status",
  EXPANSION_ADD: "expansion_add",
  EXPANSION_DELETE: "expansion_delete",
  EXPANSION_RENAME: "expansion_rename",
  RULING_ADD: "ruling_add",
  RULING_DELETE: "ruling_delete",
  LOAN_CREATE: "loan_create",
  LOAN_RETURN: "loan_return",
  COVER_CHANGE: "cover_change",
  COVER_REMOVE: "cover_remove",
  BATCH_EDIT: "batch_edit",
  ARCHIVE_SAVE: "archive_save",
  ARCHIVE_DELETE: "archive_delete",
  ARCHIVE_UPDATE: "archive_update"
};

const HISTORY_ACTION_LABELS = {
  [HISTORY_ACTION.GAME_CREATE]: { emoji: "🎮", label: "新增桌游", cssClass: "game_create" },
  [HISTORY_ACTION.GAME_DELETE]: { emoji: "🗑️", label: "删除桌游", cssClass: "game_delete" },
  [HISTORY_ACTION.GAME_UPDATE]: { emoji: "✏️", label: "修改桌游信息", cssClass: "game_update" },
  [HISTORY_ACTION.GAME_LAST_PLAYED]: { emoji: "🎲", label: "标记玩过", cssClass: "game_last_played" },
  [HISTORY_ACTION.RULE_ADD]: { emoji: "➕", label: "新增规则", cssClass: "rule_add" },
  [HISTORY_ACTION.RULE_DELETE]: { emoji: "➖", label: "删除规则", cssClass: "rule_delete" },
  [HISTORY_ACTION.RULE_UPDATE]: { emoji: "📝", label: "修改规则", cssClass: "rule_update" },
  [HISTORY_ACTION.RULE_STATUS]: { emoji: "🏷️", label: "更新复习状态", cssClass: "rule_status" },
  [HISTORY_ACTION.EXPANSION_ADD]: { emoji: "🧩", label: "新增扩展包", cssClass: "expansion_add" },
  [HISTORY_ACTION.EXPANSION_DELETE]: { emoji: "🧹", label: "删除扩展包", cssClass: "expansion_delete" },
  [HISTORY_ACTION.EXPANSION_RENAME]: { emoji: "✏️", label: "重命名扩展包", cssClass: "expansion_rename" },
  [HISTORY_ACTION.RULING_ADD]: { emoji: "⚖️", label: "新增裁定", cssClass: "ruling_add" },
  [HISTORY_ACTION.RULING_DELETE]: { emoji: "❌", label: "删除裁定", cssClass: "ruling_delete" },
  [HISTORY_ACTION.LOAN_CREATE]: { emoji: "📤", label: "借出桌游", cssClass: "loan_create" },
  [HISTORY_ACTION.LOAN_RETURN]: { emoji: "📥", label: "归还桌游", cssClass: "loan_return" },
  [HISTORY_ACTION.COVER_CHANGE]: { emoji: "🖼️", label: "更新封面", cssClass: "cover_change" },
  [HISTORY_ACTION.COVER_REMOVE]: { emoji: "🏞️", label: "移除封面", cssClass: "cover_remove" },
  [HISTORY_ACTION.BATCH_EDIT]: { emoji: "📦", label: "批量编辑保存", cssClass: "batch_edit" },
  [HISTORY_ACTION.ARCHIVE_SAVE]: { emoji: "📁", label: "保存聚会方案", cssClass: "archive_save" },
  [HISTORY_ACTION.ARCHIVE_DELETE]: { emoji: "🗑️", label: "删除聚会方案", cssClass: "archive_delete" },
  [HISTORY_ACTION.ARCHIVE_UPDATE]: { emoji: "✏️", label: "更新聚会方案", cssClass: "archive_update" }
};

const RULE_CATEGORY_DISPLAY = {
  forgets: "容易忘的规则",
  disputes: "常见争议",
  setup: "开局准备",
  scoring: "计分提醒"
};

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

function migrateV3ToV4(parsed) {
  const result = { ...parsed };
  if (Array.isArray(result.games)) {
    result.games = result.games.map((game) => {
      if (!game || typeof game !== "object") return game;
      const migrated = { ...game };
      if (!Array.isArray(migrated.changeHistory)) {
        migrated.changeHistory = [];
      }
      if (!Array.isArray(migrated.coverHistory)) {
        migrated.coverHistory = [];
      }
      if (migrated.cover && migrated.coverHistory.length === 0) {
        migrated.coverHistory.push({
          id: generateId(),
          cover: migrated.cover,
          changedAt: new Date().toISOString(),
          note: "迁移时自动记录的初始封面"
        });
      }
      return migrated;
    });
  }
  if (!Array.isArray(result.globalUndoStack)) {
    result.globalUndoStack = [];
  }
  result.schemaVersion = SCHEMA_VERSION;
  return result;
}

function migrateV4ToV5(parsed) {
  const result = { ...parsed };
  if (!Array.isArray(result.partyArchives)) {
    result.partyArchives = [];
  }
  result.schemaVersion = SCHEMA_VERSION;
  return result;
}

function normalizePartyArchive(archive) {
  if (!archive || typeof archive !== "object") return null;
  return {
    id: archive.id || generateId(),
    name: String(archive.name || ""),
    createdAt: archive.createdAt || new Date().toISOString(),
    playerCount: Number(archive.playerCount) || 4,
    players: Array.isArray(archive.players)
      ? archive.players.map((p) => ({
          id: p.id || generateId(),
          name: String(p.name || ""),
          dislikedComplexity: Array.isArray(p.dislikedComplexity) ? p.dislikedComplexity : [],
          familiarGameIds: Array.isArray(p.familiarGameIds) ? p.familiarGameIds : []
        }))
      : [],
    candidateGameRefs: Array.isArray(archive.candidateGameRefs)
      ? archive.candidateGameRefs.map((ref) => ({
          gameId: String(ref.gameId || ""),
          gameName: String(ref.gameName || "未知桌游"),
          expansions: Array.isArray(ref.expansions)
            ? ref.expansions.map((e) => ({
                expansionId: String(e.expansionId || ""),
                expansionName: String(e.expansionName || "未知扩展包")
              }))
            : []
        }))
      : [],
    recommendationSnapshot: archive.recommendationSnapshot
      ? {
          type: archive.recommendationSnapshot.type || "single",
          summary: String(archive.recommendationSnapshot.summary || ""),
          totalScore: archive.recommendationSnapshot.totalScore ? Number(archive.recommendationSnapshot.totalScore) : null
        }
      : null,
    finalSelections: Array.isArray(archive.finalSelections)
      ? archive.finalSelections.map((s) => ({
          gameId: String(s.gameId || ""),
          gameName: String(s.gameName || "未知桌游"),
          expansionIds: Array.isArray(s.expansionIds) ? s.expansionIds : [],
          expansionNames: Array.isArray(s.expansionNames) ? s.expansionNames : [],
          tableNumber: s.tableNumber ? Number(s.tableNumber) : null,
          tablePlayerCount: s.tablePlayerCount ? Number(s.tablePlayerCount) : null,
          tablePlayers: Array.isArray(s.tablePlayers) ? s.tablePlayers : [],
          score: s.score !== undefined ? Number(s.score) : null,
          reasons: Array.isArray(s.reasons) ? s.reasons : [],
          warnings: Array.isArray(s.warnings) ? s.warnings : [],
          planId: String(s.planId || "")
        }))
      : [],
    selectedPlanId: String(archive.selectedPlanId || ""),
    reviewHighlights: Array.isArray(archive.reviewHighlights)
      ? archive.reviewHighlights.map((r) => ({
          gameId: String(r.gameId || ""),
          gameName: String(r.gameName || "未知桌游"),
          expansionId: String(r.expansionId || ""),
          expansionName: String(r.expansionName || ""),
          ruleKey: String(r.ruleKey || ""),
          ruleText: String(r.ruleText || "")
        }))
      : [],
    disputeRulings: Array.isArray(archive.disputeRulings)
      ? archive.disputeRulings.map((d) => ({
          gameId: String(d.gameId || ""),
          gameName: String(d.gameName || "未知桌游"),
          expansionId: String(d.expansionId || ""),
          disputeText: String(d.disputeText || ""),
          rulingDecision: String(d.rulingDecision || ""),
          rulingDate: String(d.rulingDate || ""),
          rulingParticipants: Number(d.rulingParticipants) || 0
        }))
      : [],
    actualResults: archive.actualResults
      ? {
          playedAt: String(archive.actualResults.playedAt || ""),
          gamesPlayed: Array.isArray(archive.actualResults.gamesPlayed)
            ? archive.actualResults.gamesPlayed.map((g) => ({
                gameId: String(g.gameId || ""),
                gameName: String(g.gameName || "未知桌游"),
                notes: String(g.notes || "")
              }))
            : [],
          overallNotes: String(archive.actualResults.overallNotes || "")
        }
      : null,
    sourceArchiveId: String(archive.sourceArchiveId || ""),
    sourceArchiveName: String(archive.sourceArchiveName || "")
  };
}

function normalizePartyArchiveArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(normalizePartyArchive).filter(Boolean);
}

function createHistoryEntry(options) {
  const {
    action,
    gameId,
    description = "",
    targetType = "",
    targetId = "",
    expansionId = "",
    ruleKey = "",
    before = null,
    after = null,
    metadata = null
  } = options;
  return {
    id: generateId(),
    action,
    gameId: String(gameId || ""),
    timestamp: new Date().toISOString(),
    description: String(description || ""),
    targetType: String(targetType || ""),
    targetId: String(targetId || ""),
    expansionId: String(expansionId || ""),
    ruleKey: String(ruleKey || ""),
    before: before === undefined ? null : structuredClone(before),
    after: after === undefined ? null : structuredClone(after),
    metadata: metadata === undefined ? null : structuredClone(metadata)
  };
}

function pushHistoryEntry(gameId, entry) {
  const game = state.games.find((g) => g.id === gameId);
  if (!game) return;
  if (!Array.isArray(game.changeHistory)) {
    game.changeHistory = [];
  }
  game.changeHistory.unshift(entry);
  if (game.changeHistory.length > HISTORY_LIMIT_PER_GAME) {
    game.changeHistory.length = HISTORY_LIMIT_PER_GAME;
  }
  if (!Array.isArray(state.globalUndoStack)) {
    state.globalUndoStack = [];
  }
  state.globalUndoStack.unshift(entry);
  if (state.globalUndoStack.length > GLOBAL_UNDO_LIMIT) {
    state.globalUndoStack.length = GLOBAL_UNDO_LIMIT;
  }
}

function getGameHistory(gameId) {
  const game = state.games.find((g) => g.id === gameId);
  if (!game) return [];
  return game.changeHistory || [];
}

function formatHistoryTimestamp(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  const isYesterday = d.toDateString() === yest.toDateString();
  const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (sameDay) return `今天 ${timeStr}`;
  if (isYesterday) return `昨天 ${timeStr}`;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${timeStr}`;
}

function canUndoEntry(entry) {
  if (!entry) return false;
  const undoable = [
    HISTORY_ACTION.GAME_UPDATE,
    HISTORY_ACTION.GAME_LAST_PLAYED,
    HISTORY_ACTION.RULE_ADD,
    HISTORY_ACTION.RULE_DELETE,
    HISTORY_ACTION.RULE_UPDATE,
    HISTORY_ACTION.RULE_STATUS,
    HISTORY_ACTION.EXPANSION_ADD,
    HISTORY_ACTION.EXPANSION_DELETE,
    HISTORY_ACTION.EXPANSION_RENAME,
    HISTORY_ACTION.RULING_ADD,
    HISTORY_ACTION.RULING_DELETE,
    HISTORY_ACTION.LOAN_CREATE,
    HISTORY_ACTION.LOAN_RETURN,
    HISTORY_ACTION.COVER_CHANGE,
    HISTORY_ACTION.COVER_REMOVE,
    HISTORY_ACTION.BATCH_EDIT
  ];
  return undoable.includes(entry.action);
}

function undoHistoryEntry(entry) {
  if (!entry || !canUndoEntry(entry)) return false;
  const { action, gameId, expansionId, ruleKey, targetId, before, metadata } = entry;
  const gameIndex = state.games.findIndex((g) => g.id === gameId);
  if (gameIndex === -1 && action !== HISTORY_ACTION.GAME_DELETE) return false;
  let game = state.games[gameIndex];

  switch (action) {
    case HISTORY_ACTION.GAME_UPDATE:
    case HISTORY_ACTION.BATCH_EDIT:
      if (game && before) {
        state.games[gameIndex] = {
          ...game,
          name: before.name ?? game.name,
          minPlayers: before.minPlayers ?? game.minPlayers,
          maxPlayers: before.maxPlayers ?? game.maxPlayers,
          duration: before.duration ?? game.duration,
          complexity: before.complexity ?? game.complexity,
          lastPlayed: before.lastPlayed ?? game.lastPlayed,
          cover: before.cover ?? game.cover,
          forgets: before.forgets ?? game.forgets,
          disputes: before.disputes ?? game.disputes,
          setup: before.setup ?? game.setup,
          scoring: before.scoring ?? game.scoring,
          expansions: before.expansions ?? game.expansions,
          disputeRulings: before.disputeRulings ?? game.disputeRulings
        };
        return true;
      }
      return false;

    case HISTORY_ACTION.GAME_LAST_PLAYED:
      if (game && before) {
        game.lastPlayed = before.lastPlayed ?? game.lastPlayed;
        return true;
      }
      return false;

    case HISTORY_ACTION.RULE_ADD: {
      if (!game) return false;
      const container = getRuleContainer(game, expansionId);
      if (!container || !Array.isArray(container[ruleKey])) return false;
      const idx = container[ruleKey].findIndex((r) => r.id === targetId);
      if (idx !== -1) {
        container[ruleKey].splice(idx, 1);
        if (ruleKey === "disputes" && metadata?.disputeText) {
          game.disputeRulings = (game.disputeRulings || []).filter(
            (r) => !(r.disputeText === metadata.disputeText && (r.expansionId || "") === (expansionId || ""))
          );
        }
        return true;
      }
      return false;
    }

    case HISTORY_ACTION.RULE_DELETE: {
      if (!game) return false;
      const container = getRuleContainer(game, expansionId);
      if (!container || !Array.isArray(container[ruleKey])) return false;
      if (before && typeof before === "object") {
        const insertIndex = metadata?.index ?? 0;
        container[ruleKey].splice(insertIndex, 0, structuredClone(before));
        if (ruleKey === "disputes") {
          ensureDisputeRulingEntry(game, ruleText(before), expansionId || "");
        }
        return true;
      }
      return false;
    }

    case HISTORY_ACTION.RULE_UPDATE: {
      if (!game) return false;
      const container = getRuleContainer(game, expansionId);
      if (!container || !Array.isArray(container[ruleKey])) return false;
      const idx = container[ruleKey].findIndex((r) => r.id === targetId);
      if (idx !== -1 && before) {
        container[ruleKey][idx] = structuredClone(before);
        return true;
      }
      return false;
    }

    case HISTORY_ACTION.RULE_STATUS: {
      if (!game) return false;
      const container = getRuleContainer(game, expansionId);
      if (!container || !Array.isArray(container[ruleKey])) return false;
      const idx = container[ruleKey].findIndex((r) => r.id === targetId);
      if (idx !== -1 && before) {
        container[ruleKey][idx].status = before.status ?? REVIEW_STATUS.UNMARKED;
        return true;
      }
      return false;
    }

    case HISTORY_ACTION.EXPANSION_ADD: {
      if (!game || !Array.isArray(game.expansions)) return false;
      const idx = game.expansions.findIndex((e) => e.id === targetId);
      if (idx !== -1) {
        game.expansions.splice(idx, 1);
        game.disputeRulings = (game.disputeRulings || []).filter(
          (r) => (r.expansionId || "") !== targetId
        );
        return true;
      }
      return false;
    }

    case HISTORY_ACTION.EXPANSION_DELETE: {
      if (!game || !Array.isArray(game.expansions)) return false;
      if (before && typeof before === "object") {
        const insertIndex = metadata?.index ?? 0;
        game.expansions.splice(insertIndex, 0, structuredClone(before));
        if (metadata?.deletedRulings && Array.isArray(metadata.deletedRulings)) {
          game.disputeRulings = [...(game.disputeRulings || []), ...structuredClone(metadata.deletedRulings)];
        }
        return true;
      }
      return false;
    }

    case HISTORY_ACTION.EXPANSION_RENAME: {
      if (!game || !Array.isArray(game.expansions)) return false;
      const exp = game.expansions.find((e) => e.id === targetId);
      if (exp && before) {
        exp.name = before.name ?? exp.name;
        return true;
      }
      return false;
    }

    case HISTORY_ACTION.RULING_ADD: {
      if (!game || !Array.isArray(game.disputeRulings)) return false;
      const disputeKey = `${expansionId || ""}::${metadata?.disputeText || ""}`;
      for (const entry of game.disputeRulings) {
        const key = `${entry.expansionId || ""}::${entry.disputeText}`;
        if (key === disputeKey) {
          const ridx = entry.rulings.findIndex((r) => r.id === targetId);
          if (ridx !== -1) {
            entry.rulings.splice(ridx, 1);
            return true;
          }
        }
      }
      return false;
    }

    case HISTORY_ACTION.RULING_DELETE: {
      if (!game || !Array.isArray(game.disputeRulings)) return false;
      const disputeKey = `${expansionId || ""}::${metadata?.disputeText || ""}`;
      for (const entry of game.disputeRulings) {
        const key = `${entry.expansionId || ""}::${entry.disputeText}`;
        if (key === disputeKey && before) {
          entry.rulings.push(structuredClone(before));
          return true;
        }
      }
      return false;
    }

    case HISTORY_ACTION.LOAN_CREATE: {
      if (!game || !Array.isArray(game.loanRecords)) return false;
      const idx = game.loanRecords.findIndex((r) => r.id === targetId);
      if (idx !== -1) {
        game.loanRecords.splice(idx, 1);
        return true;
      }
      return false;
    }

    case HISTORY_ACTION.LOAN_RETURN: {
      if (!game || !Array.isArray(game.loanRecords)) return false;
      const record = game.loanRecords.find((r) => r.id === targetId);
      if (record) {
        record.returnedAt = null;
        return true;
      }
      return false;
    }

    case HISTORY_ACTION.COVER_CHANGE:
    case HISTORY_ACTION.COVER_REMOVE: {
      if (!game) return false;
      if (before) {
        game.cover = before.cover ?? "";
        return true;
      } else if (action === HISTORY_ACTION.COVER_REMOVE) {
        game.cover = metadata?.previousCover ?? "";
        return true;
      }
      return false;
    }
  }
  return false;
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
  if (currentVersion < 4) {
    migrated = migrateV3ToV4(migrated);
  }
  if (currentVersion < 5) {
    migrated = migrateV4ToV5(migrated);
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
  globalUndoStack: [],
  partyArchives: [],
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
      ]),
      changeHistory: [],
      coverHistory: []
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
      ]),
      changeHistory: [],
      coverHistory: []
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
      ]),
      changeHistory: [],
      coverHistory: []
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
  reviewSessionCloseBtn: document.querySelector("#reviewSessionCloseBtn"),
  importPreviewDialog: document.querySelector("#importPreviewDialog"),
  importPreviewCloseBtn: document.querySelector("#importPreviewCloseBtn"),
  importPreviewCancelBtn: document.querySelector("#importPreviewCancelBtn"),
  importPreviewConfirmBtn: document.querySelector("#importPreviewConfirmBtn"),
  importStatNew: document.querySelector("#importStatNew"),
  importStatOverwrite: document.querySelector("#importStatOverwrite"),
  importStatSkip: document.querySelector("#importStatSkip"),
  importStatConflict: document.querySelector("#importStatConflict"),
  importPreviewList: document.querySelector("#importPreviewList"),
  importPreviewSummaryText: document.querySelector("#importPreviewSummaryText"),
  importFilterTabs: document.querySelectorAll(".import-filter-tab"),
  undoBtn: document.querySelector("#undoBtn"),
  undoDialog: document.querySelector("#undoDialog"),
  undoDialogCloseBtn: document.querySelector("#undoDialogCloseBtn"),
  undoDialogCancelBtn: document.querySelector("#undoDialogCancelBtn"),
  undoDialogConfirmBtn: document.querySelector("#undoDialogConfirmBtn"),
  undoList: document.querySelector("#undoList"),
  undoSelectedEntryId: null,
  historyTimelineDialog: document.querySelector("#historyTimelineDialog"),
  historyTimelineCloseBtn: document.querySelector("#historyTimelineCloseBtn"),
  historyTimelineTitle: document.querySelector("#historyTimelineTitle"),
  historyTimelineList: document.querySelector("#historyTimelineList"),
  historyTimelineEmpty: document.querySelector("#historyTimelineEmpty"),
  historyRestoreDialog: document.querySelector("#historyRestoreDialog"),
  historyRestoreDialogTitle: document.querySelector("#historyRestoreDialogTitle"),
  historyRestoreContent: document.querySelector("#historyRestoreContent"),
  historyRestoreDialogCloseBtn: document.querySelector("#historyRestoreDialogCloseBtn"),
  historyRestoreDialogCancelBtn: document.querySelector("#historyRestoreDialogCancelBtn"),
  historyRestoreDialogConfirmBtn: document.querySelector("#historyRestoreDialogConfirmBtn"),
  pendingRestoreEntry: null,
  viewHistoryBtn: document.querySelector("#viewHistoryBtn")
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
            disputeRulings: normalizeDisputeRulings(game.disputeRulings),
            changeHistory: Array.isArray(game.changeHistory) ? game.changeHistory : [],
            coverHistory: Array.isArray(game.coverHistory) ? game.coverHistory : []
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
    partyTagFilter: typeof migrated.partyTagFilter === "string" ? migrated.partyTagFilter : "",
    globalUndoStack: Array.isArray(migrated.globalUndoStack) ? migrated.globalUndoStack : [],
    partyArchives: normalizePartyArchiveArray(migrated.partyArchives)
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
  const rule = rules[ruleIndex];
  const beforeStatus = ruleStatus(rule);
  const currentStatus = ruleStatus(rules[ruleIndex]);
  let newStatus;
  if (currentStatus === status) {
    newStatus = REVIEW_STATUS.UNMARKED;
  } else {
    newStatus = status;
  }
  if (beforeStatus === newStatus) return;
  rules[ruleIndex].status = newStatus;
  const expLabel = expansionId ? (getExpansionById(game, expansionId)?.name || "") : "基础游戏";
  const entry = createHistoryEntry({
    action: HISTORY_ACTION.RULE_STATUS,
    gameId,
    description: `${expLabel} · ${RULE_CATEGORY_DISPLAY[ruleKey] || ruleKey}「${ruleText(rule).slice(0, 20)}${ruleText(rule).length > 20 ? "…" : ""}」状态：${REVIEW_STATUS_LABELS[beforeStatus] || "未标记"} → ${REVIEW_STATUS_LABELS[newStatus] || "未标记"}`,
    targetType: "rule",
    targetId: rule.id || "",
    expansionId,
    ruleKey,
    before: { status: beforeStatus },
    after: { status: newStatus }
  });
  pushHistoryEntry(gameId, entry);
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
  const scopeAttrs = `data-game-id="${game.id}" data-expansion-id="${expansionId}"`;
  if (mustReviewCount > 0) {
    actionBtns.push(`<button type="button" class="review-start-btn" data-start-review="${REVIEW_SESSION_SOURCE.MUST_REVIEW}" ${scopeAttrs}>🔔 复习下次必看 (${mustReviewCount})</button>`);
  }
  if (stillForgetCount > 0) {
    actionBtns.push(`<button type="button" class="review-start-btn secondary" data-start-review="${REVIEW_SESSION_SOURCE.STILL_FORGET}" ${scopeAttrs}>💭 复习还会忘 (${stillForgetCount})</button>`);
  }
  if (unresolvedDisputes > 0) {
    actionBtns.push(`<button type="button" class="review-start-btn secondary" data-start-review="${REVIEW_SESSION_SOURCE.UNRESOLVED_DISPUTES}" ${scopeAttrs}>⚖️ 复习未裁定 (${unresolvedDisputes})</button>`);
  }
  if (pendingCount > 0) {
    actionBtns.push(`<button type="button" class="review-start-btn secondary" data-start-review="${REVIEW_SESSION_SOURCE.ALL_PENDING}" ${scopeAttrs}>📖 全部待复习 (${pendingCount})</button>`);
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
        <button id="viewHistoryBtn" type="button">📜 变更历史</button>
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
    const oldCover = game.cover;
    game.cover = item.compressResult.dataUrl;
    game.coverHistory = Array.isArray(game.coverHistory) ? game.coverHistory : [];
    game.coverHistory.push({
      id: generateId(),
      cover: item.compressResult.dataUrl,
      changedAt: new Date().toISOString(),
      note: "批量设置封面"
    });
    const entry = createHistoryEntry({
      action: HISTORY_ACTION.COVER_CHANGE,
      gameId: game.id,
      description: `批量更换《${game.name}》的封面`,
      targetType: "cover",
      targetId: "",
      before: { cover: oldCover },
      after: { cover: item.compressResult.dataUrl }
    });
    pushHistoryEntry(game.id, entry);
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
  renderArchiveList();
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
    disputeRulings: [],
    changeHistory: [],
    coverHistory: []
  };
  for (const d of disputes) {
    ensureDisputeRulingEntry(game, ruleText(d), "");
  }
  if (cover) {
    game.coverHistory.push({
      id: generateId(),
      cover,
      changedAt: new Date().toISOString(),
      note: "创建桌游时上传的封面"
    });
  }
  state.games.unshift(game);
  const createEntry = createHistoryEntry({
    action: HISTORY_ACTION.GAME_CREATE,
    gameId: game.id,
    description: `新增桌游《${game.name}》`,
    targetType: "game",
    targetId: game.id,
    after: { name: game.name, minPlayers, maxPlayers, duration: game.duration, complexity: game.complexity }
  });
  pushHistoryEntry(game.id, createEntry);
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
  const expLabel = state.selectedExpansionId ? (getExpansionById(game, state.selectedExpansionId)?.name || "") : "基础游戏";
  const entry = createHistoryEntry({
    action: HISTORY_ACTION.RULE_ADD,
    gameId: game.id,
    description: `${expLabel} · 新增${RULE_CATEGORY_DISPLAY[key] || key}：${text.slice(0, 30)}${text.length > 30 ? "…" : ""}`,
    targetType: "rule",
    targetId: newRule.id,
    expansionId: state.selectedExpansionId || "",
    ruleKey: key,
    after: structuredClone(newRule),
    metadata: { disputeText: key === "disputes" ? text : "" }
  });
  pushHistoryEntry(game.id, entry);
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
      const deletedRule = container[key][index];
      let deletedRulingsRef = null;
      if (key === "disputes") {
        const disputeText = ruleText(deletedRule);
        if (disputeText && Array.isArray(game.disputeRulings)) {
          deletedRulingsRef = game.disputeRulings.filter(
            (r) => r.disputeText === disputeText && (r.expansionId || "") === expansionId
          );
          game.disputeRulings = game.disputeRulings.filter(
            (r) => !(r.disputeText === disputeText && (r.expansionId || "") === expansionId)
          );
        }
      }
      container[key].splice(index, 1);
      const expLabel = expansionId ? (getExpansionById(game, expansionId)?.name || "") : "基础游戏";
      const entry = createHistoryEntry({
        action: HISTORY_ACTION.RULE_DELETE,
        gameId: game.id,
        description: `${expLabel} · 删除${RULE_CATEGORY_DISPLAY[key] || key}：${ruleText(deletedRule).slice(0, 30)}${ruleText(deletedRule).length > 30 ? "…" : ""}`,
        targetType: "rule",
        targetId: deletedRule?.id || "",
        expansionId,
        ruleKey: key,
        before: structuredClone(deletedRule),
        metadata: { index, deletedRulings: deletedRulingsRef, disputeText: key === "disputes" ? ruleText(deletedRule) : "" }
      });
      pushHistoryEntry(game.id, entry);
    }
    renderAll();
  }

  if (playedButton) {
    const oldLastPlayed = game.lastPlayed;
    game.lastPlayed = new Date().toISOString().slice(0, 10);
    const entry = createHistoryEntry({
      action: HISTORY_ACTION.GAME_LAST_PLAYED,
      gameId: game.id,
      description: `标记今日玩过（${oldLastPlayed || "无记录"} → ${game.lastPlayed}）`,
      targetType: "game",
      targetId: game.id,
      before: { lastPlayed: oldLastPlayed },
      after: { lastPlayed: game.lastPlayed }
    });
    pushHistoryEntry(game.id, entry);
    renderAll();
  }

  if (deleteButton) {
    const archiveRefs = getArchivesReferencingGame(game.id);
    const archiveWarning = archiveRefs.length > 0
      ? `\n\n⚠️ 该桌游被 ${archiveRefs.length} 个归档方案引用：${archiveRefs.map(a => `「${a.name}」`).join("、")}。删除后归档中仍保留历史名称，但会标记为「已删除」。`
      : "";
    showConfirm(
      "删除桌游",
      `确定要删除桌游《${game.name}》吗？此操作不可撤销。${archiveWarning}`,
      () => {
        const deletedGame = structuredClone(game);
        const deleteEntry = createHistoryEntry({
          action: HISTORY_ACTION.GAME_DELETE,
          gameId: game.id,
          description: `删除桌游《${game.name}》`,
          targetType: "game",
          targetId: game.id,
          before: deletedGame
        });
        pushHistoryEntry(game.id, deleteEntry);
        state.games = state.games.filter((item) => item.id !== game.id);
        state.selectedId = state.games[0]?.id || "";
        state.selectedExpansionId = "";
        syncChecklistSelection();
        if (!els.checklistView.classList.contains("hidden")) {
          renderChecklist();
        }
        renderArchiveList();
        renderAll();
      }
    );
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
      "确定要删除这条裁定记录吗？可通过撤销功能恢复。",
      () => {
        const rulingGroup = getDisputeRulingEntry(game, disputeText, expId);
        let deletedRuling = null;
        let deletedGroupEmpty = false;
        if (rulingGroup && Array.isArray(rulingGroup.rulings)) {
          deletedRuling = rulingGroup.rulings.find((r) => r.id === rulingId);
          const beforeCount = rulingGroup.rulings.length;
          rulingGroup.rulings = rulingGroup.rulings.filter((r) => r.id !== rulingId);
          deletedGroupEmpty = beforeCount > 0 && rulingGroup.rulings.length === 0;
        }
        if (deletedRuling) {
          const expLabel = expId ? (getExpansionById(game, expId)?.name || "") : "基础游戏";
          const entry = createHistoryEntry({
            action: HISTORY_ACTION.RULING_DELETE,
            gameId: game.id,
            description: `${expLabel} · 删除争议「${disputeText.slice(0, 20)}${disputeText.length > 20 ? "…" : ""}」的裁定：${deletedRuling.decision.slice(0, 20)}${deletedRuling.decision.length > 20 ? "…" : ""}`,
            targetType: "ruling",
            targetId: deletedRuling.id,
            expansionId: expId,
            before: { disputeText, ruling: structuredClone(deletedRuling), wasLastInGroup: deletedGroupEmpty }
          });
          pushHistoryEntry(game.id, entry);
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
      `确定要移除《${game.name}》的封面吗？可通过撤销功能恢复。`,
      () => {
        const oldCover = game.cover;
        game.cover = "";
        game.coverHistory = Array.isArray(game.coverHistory) ? game.coverHistory : [];
        game.coverHistory.push({
          id: generateId(),
          cover: "",
          changedAt: new Date().toISOString(),
          note: "移除封面"
        });
        const entry = createHistoryEntry({
          action: HISTORY_ACTION.COVER_REMOVE,
          gameId: game.id,
          description: `移除《${game.name}》的封面`,
          targetType: "cover",
          targetId: "",
          before: { cover: oldCover }
        });
        pushHistoryEntry(game.id, entry);
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
    const oldCover = game.cover;
    game.cover = result.dataUrl;
    game.coverHistory = Array.isArray(game.coverHistory) ? game.coverHistory : [];
    game.coverHistory.push({
      id: generateId(),
      cover: result.dataUrl,
      changedAt: new Date().toISOString(),
      note: "更换封面"
    });
    const entry = createHistoryEntry({
      action: HISTORY_ACTION.COVER_CHANGE,
      gameId: game.id,
      description: `更换《${game.name}》的封面`,
      targetType: "cover",
      targetId: "",
      before: { cover: oldCover },
      after: { cover: result.dataUrl }
    });
    pushHistoryEntry(game.id, entry);
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
    activeFilterViewId: state.activeFilterViewId || "",
    partyArchives: Array.isArray(state.partyArchives) ? state.partyArchives : []
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

const IMPORT_ITEM_STATUS = {
  NEW: "new",
  OVERWRITE: "overwrite",
  SKIP: "skip",
  CONFLICT: "conflict"
};

const MERGE_STRATEGY = {
  OVERWRITE: "overwrite",
  KEEP: "keep",
  MERGE: "merge"
};

let importPreviewState = {
  importItems: [],
  globalStrategy: MERGE_STRATEGY.KEEP,
  individualStrategies: {},
  filter: "all",
  importData: null,
  importedFilterViews: [],
  importedActiveFilterViewId: ""
};

function normalizeImportGame(game) {
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
}

function isSameGame(a, b) {
  if (!a || !b) return false;
  const aName = a.name?.trim().toLowerCase() || "";
  const bName = b.name?.trim().toLowerCase() || "";
  return aName === bName;
}

function areGamesIdentical(a, b) {
  if (!isSameGame(a, b)) return false;
  const aSimple = {
    minPlayers: a.minPlayers,
    maxPlayers: a.maxPlayers,
    duration: a.duration,
    complexity: a.complexity,
    lastPlayed: a.lastPlayed,
    cover: a.cover ? a.cover.substring(0, 100) : ""
  };
  const bSimple = {
    minPlayers: b.minPlayers,
    maxPlayers: b.maxPlayers,
    duration: b.duration,
    complexity: b.complexity,
    lastPlayed: b.lastPlayed,
    cover: b.cover ? b.cover.substring(0, 100) : ""
  };
  if (JSON.stringify(aSimple) !== JSON.stringify(bSimple)) return false;
  const ruleToKey = (r) => `${r.text.toLowerCase()}::${r.status || ""}::${(r.tags || []).sort().join(",")}`;
  const aRules = [...(a.forgets || []), ...(a.disputes || []), ...(a.setup || []), ...(a.scoring || [])].map(ruleToKey).sort().join("||");
  const bRules = [...(b.forgets || []), ...(b.disputes || []), ...(b.setup || []), ...(b.scoring || [])].map(ruleToKey).sort().join("||");
  if (aRules !== bRules) return false;
  const aExp = (a.expansions || []).map(e => `${e.name.trim().toLowerCase()}::${[...(e.forgets || []), ...(e.disputes || []), ...(e.setup || []), ...(e.scoring || [])].map(ruleToKey).sort().join(",")}`).sort().join("||");
  const bExp = (b.expansions || []).map(e => `${e.name.trim().toLowerCase()}::${[...(e.forgets || []), ...(e.disputes || []), ...(e.setup || []), ...(e.scoring || [])].map(ruleToKey).sort().join(",")}`).sort().join("||");
  if (aExp !== bExp) return false;
  const aLoanKeys = (a.loanRecords || []).map(l => `${l.borrower}::${l.borrowedAt}::${l.expectedReturnAt || ""}::${l.returnedAt || ""}::${l.id || ""}`).sort().join("||");
  const bLoanKeys = (b.loanRecords || []).map(l => `${l.borrower}::${l.borrowedAt}::${l.expectedReturnAt || ""}::${l.returnedAt || ""}::${l.id || ""}`).sort().join("||");
  if (aLoanKeys !== bLoanKeys) return false;
  const aRulingKeys = (a.disputeRulings || []).map(r => `${r.expansionId || ""}::${r.disputeText.toLowerCase()}::${(r.rulings || []).map(rr => `${rr.date}::${rr.decision.toLowerCase()}`).sort().join(",")}`).sort().join("||");
  const bRulingKeys = (b.disputeRulings || []).map(r => `${r.expansionId || ""}::${r.disputeText.toLowerCase()}::${(r.rulings || []).map(rr => `${rr.date}::${rr.decision.toLowerCase()}`).sort().join(",")}`).sort().join("||");
  if (aRulingKeys !== bRulingKeys) return false;
  return true;
}

function hasConflict(localGame, importGame) {
  if (!localGame || !importGame) return false;
  if (areGamesIdentical(localGame, importGame)) return false;
  const localHasRules = getAllRulesIncludingExpansions(localGame).length > 0;
  const importHasRules = getAllRulesIncludingExpansions(importGame).length > 0;
  const localHasLoans = (localGame.loanRecords || []).length > 0;
  const importHasLoans = (importGame.loanRecords || []).length > 0;
  const localHasCover = !!localGame.cover;
  const importHasCover = !!importGame.cover;
  if (localHasRules && importHasRules) {
    const localTexts = new Set(getAllRulesIncludingExpansions(localGame).map(r => r.text));
    const importTexts = new Set(getAllRulesIncludingExpansions(importGame).map(r => r.text));
    let hasUniqueLocal = false;
    let hasUniqueImport = false;
    for (const t of localTexts) if (!importTexts.has(t)) { hasUniqueLocal = true; break; }
    for (const t of importTexts) if (!localTexts.has(t)) { hasUniqueImport = true; break; }
    if (hasUniqueLocal && hasUniqueImport) return true;
  }
  const localExpNames = new Set((localGame.expansions || []).map(e => e.name));
  const importExpNames = new Set((importGame.expansions || []).map(e => e.name));
  let hasUniqueLocalExp = false;
  let hasUniqueImportExp = false;
  for (const n of localExpNames) if (!importExpNames.has(n)) { hasUniqueLocalExp = true; break; }
  for (const n of importExpNames) if (!localExpNames.has(n)) { hasUniqueImportExp = true; break; }
  if (hasUniqueLocalExp && hasUniqueImportExp) return true;
  if (localHasLoans && importHasLoans) {
    const localLoanKeys = new Set((localGame.loanRecords || []).map(l => `${l.borrower}::${l.borrowedAt}::${l.expectedReturnAt || ""}`));
    const importLoanKeys = new Set((importGame.loanRecords || []).map(l => `${l.borrower}::${l.borrowedAt}::${l.expectedReturnAt || ""}`));
    let hasUniqueLocalLoan = false;
    let hasUniqueImportLoan = false;
    for (const k of localLoanKeys) if (!importLoanKeys.has(k)) { hasUniqueLocalLoan = true; break; }
    for (const k of importLoanKeys) if (!localLoanKeys.has(k)) { hasUniqueImportLoan = true; break; }
    if (hasUniqueLocalLoan && hasUniqueImportLoan) return true;
  }
  const localRulings = localGame.disputeRulings || [];
  const importRulings = importGame.disputeRulings || [];
  if (localRulings.length > 0 && importRulings.length > 0) {
    const localRulingKeys = new Set(localRulings.map(r => `${r.expansionId || ""}::${r.disputeText.toLowerCase()}`));
    const importRulingKeys = new Set(importRulings.map(r => `${r.expansionId || ""}::${r.disputeText.toLowerCase()}`));
    let hasUniqueLocalRuling = false;
    let hasUniqueImportRuling = false;
    for (const k of localRulingKeys) if (!importRulingKeys.has(k)) { hasUniqueLocalRuling = true; break; }
    for (const k of importRulingKeys) if (!localRulingKeys.has(k)) { hasUniqueImportRuling = true; break; }
    if (hasUniqueLocalRuling && hasUniqueImportRuling) return true;
  }
  if (localHasCover && importHasCover && localGame.cover !== importGame.cover) return true;
  return false;
}

function detectDifferences(localGame, importGame) {
  const diffs = [];
  if (!localGame) return diffs;
  if (localGame.minPlayers !== importGame.minPlayers || localGame.maxPlayers !== importGame.maxPlayers) {
    diffs.push({ type: "meta", field: "人数", local: `${localGame.minPlayers}-${localGame.maxPlayers}人`, imported: `${importGame.minPlayers}-${importGame.maxPlayers}人` });
  }
  if (localGame.duration !== importGame.duration) {
    diffs.push({ type: "meta", field: "时长", local: `${localGame.duration}分钟`, imported: `${importGame.duration}分钟` });
  }
  if (localGame.complexity !== importGame.complexity) {
    diffs.push({ type: "meta", field: "复杂度", local: localGame.complexity, imported: importGame.complexity });
  }
  if (localGame.lastPlayed !== importGame.lastPlayed) {
    diffs.push({ type: "meta", field: "上次游玩", local: localGame.lastPlayed, imported: importGame.lastPlayed });
  }
  const localRules = getAllRulesIncludingExpansions(localGame);
  const importRules = getAllRulesIncludingExpansions(importGame);
  const localTexts = new Set(localRules.map(r => r.text));
  const importTexts = new Set(importRules.map(r => r.text));
  const onlyLocal = [...localTexts].filter(t => !importTexts.has(t)).length;
  const onlyImport = [...importTexts].filter(t => !localTexts.has(t)).length;
  if (onlyLocal > 0 || onlyImport > 0) {
    diffs.push({ type: "rules", field: "规则", local: `${onlyLocal} 条本地独有`, imported: `${onlyImport} 条导入独有` });
  }
  const localExpNames = new Set((localGame.expansions || []).map(e => e.name));
  const importExpNames = new Set((importGame.expansions || []).map(e => e.name));
  const onlyLocalExp = [...localExpNames].filter(n => !importExpNames.has(n)).length;
  const onlyImportExp = [...importExpNames].filter(n => !localExpNames.has(n)).length;
  if (onlyLocalExp > 0 || onlyImportExp > 0) {
    diffs.push({ type: "expansions", field: "扩展包", local: `${onlyLocalExp} 个本地独有`, imported: `${onlyImportExp} 个导入独有` });
  }
  const localLoans = (localGame.loanRecords || []).length;
  const importLoans = (importGame.loanRecords || []).length;
  if (localLoans > 0 || importLoans > 0) {
    diffs.push({ type: "loans", field: "借出记录", local: `${localLoans} 条`, imported: `${importLoans} 条` });
  }
  if (!!localGame.cover !== !!importGame.cover || (localGame.cover && importGame.cover && localGame.cover !== importGame.cover)) {
    diffs.push({ type: "cover", field: "封面", local: localGame.cover ? "有封面" : "无封面", imported: importGame.cover ? "有封面" : "无封面" });
  }
  const localRulings = localGame.disputeRulings || [];
  const importRulings = importGame.disputeRulings || [];
  const localRulingMap = new Map();
  for (const r of localRulings) {
    localRulingMap.set(`${r.expansionId || ""}::${r.disputeText.toLowerCase()}`, r);
  }
  const importRulingMap = new Map();
  for (const r of importRulings) {
    importRulingMap.set(`${r.expansionId || ""}::${r.disputeText.toLowerCase()}`, r);
  }
  let onlyLocalRulings = 0;
  let onlyImportRulings = 0;
  let hasRulingContentDiff = false;
  for (const [key, r] of localRulingMap) {
    if (!importRulingMap.has(key)) {
      onlyLocalRulings++;
    } else {
      const importR = importRulingMap.get(key);
      const localCount = (r.rulings || []).length;
      const importCount = (importR.rulings || []).length;
      if (localCount !== importCount) {
        hasRulingContentDiff = true;
      }
    }
  }
  for (const [key] of importRulingMap) {
    if (!localRulingMap.has(key)) {
      onlyImportRulings++;
    }
  }
  if (onlyLocalRulings > 0 || onlyImportRulings > 0 || hasRulingContentDiff) {
    const localDesc = onlyLocalRulings > 0 ? `${onlyLocalRulings} 条本地独有` : `${localRulings.length} 条`;
    const importDesc = onlyImportRulings > 0 ? `${onlyImportRulings} 条导入独有` : `${importRulings.length} 条`;
    diffs.push({ type: "rulings", field: "争议裁定", local: localDesc, imported: importDesc });
  }
  return diffs;
}

function analyzeImportData(importGames) {
  const items = [];
  const localGamesMap = new Map();
  for (const g of state.games) {
    localGamesMap.set(g.name.trim().toLowerCase(), g);
  }
  for (const importGame of importGames) {
    const normalized = normalizeImportGame(importGame);
    const key = normalized.name.trim().toLowerCase();
    const localGame = localGamesMap.get(key);
    let status;
    let localMatch = null;
    if (!localGame) {
      status = IMPORT_ITEM_STATUS.NEW;
    } else if (areGamesIdentical(localGame, normalized)) {
      status = IMPORT_ITEM_STATUS.SKIP;
      localMatch = localGame;
    } else if (hasConflict(localGame, normalized)) {
      status = IMPORT_ITEM_STATUS.CONFLICT;
      localMatch = localGame;
    } else {
      status = IMPORT_ITEM_STATUS.OVERWRITE;
      localMatch = localGame;
    }
    items.push({
      id: normalized.id,
      name: normalized.name,
      status,
      importGame: normalized,
      localGame: localMatch,
      differences: detectDifferences(localMatch, normalized),
      strategy: status === IMPORT_ITEM_STATUS.NEW ? MERGE_STRATEGY.MERGE : MERGE_STRATEGY.KEEP
    });
  }
  return items;
}

function mergeRuleArrays(localRules, importRules) {
  const localMap = new Map();
  for (const r of localRules) {
    localMap.set(r.text.toLowerCase(), r);
  }
  const importMap = new Map();
  for (const r of importRules) {
    importMap.set(r.text.toLowerCase(), r);
  }
  const merged = [];
  const seen = new Set();
  for (const r of localRules) {
    const key = r.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const importRule = importMap.get(key);
    if (importRule) {
      const statusPriority = {
        [REVIEW_STATUS.MUST_REVIEW]: 4,
        [REVIEW_STATUS.STILL_FORGET]: 3,
        [REVIEW_STATUS.UNMARKED]: 2,
        [REVIEW_STATUS.MASTERED]: 1,
        null: 0
      };
      const localPriority = statusPriority[r.status] || 0;
      const importPriority = statusPriority[importRule.status] || 0;
      const mergedRule = {
        ...r,
        status: localPriority >= importPriority ? r.status : importRule.status,
        tags: [...new Set([...(r.tags || []), ...(importRule.tags || [])])]
      };
      merged.push(mergedRule);
    } else {
      merged.push({ ...r });
    }
  }
  for (const r of importRules) {
    const key = r.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ ...r });
  }
  return merged;
}

function mergeExpansions(localGame, importGame) {
  const localMap = new Map();
  for (const e of localGame.expansions || []) {
    localMap.set(e.name.trim().toLowerCase(), e);
  }
  const importMap = new Map();
  for (const e of importGame.expansions || []) {
    importMap.set(e.name.trim().toLowerCase(), e);
  }
  const merged = [];
  const seen = new Set();
  for (const e of localGame.expansions || []) {
    const key = e.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const importExp = importMap.get(key);
    if (importExp) {
      const mergedExp = {
        ...e,
        forgets: mergeRuleArrays(e.forgets || [], importExp.forgets || []),
        disputes: mergeRuleArrays(e.disputes || [], importExp.disputes || []),
        setup: mergeRuleArrays(e.setup || [], importExp.setup || []),
        scoring: mergeRuleArrays(e.scoring || [], importExp.scoring || [])
      };
      merged.push(mergedExp);
    } else {
      merged.push({ ...e });
    }
  }
  for (const e of importGame.expansions || []) {
    const key = e.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ ...e });
  }
  return merged;
}

function mergeDisputeRulings(localGame, importGame, mergedExpansions) {
  const localRulings = localGame.disputeRulings || [];
  const importRulings = importGame.disputeRulings || [];
  const expNameToId = new Map();
  for (const e of mergedExpansions || []) {
    expNameToId.set(e.name.trim().toLowerCase(), e.id);
  }
  const normalizeImportRuling = (entry) => {
    let expId = entry.expansionId || "";
    if (expId) {
      const importExp = (importGame.expansions || []).find(e => e.id === expId);
      if (importExp) {
        const mergedExpId = expNameToId.get(importExp.name.trim().toLowerCase());
        if (mergedExpId) expId = mergedExpId;
      }
    }
    return { ...entry, expansionId: expId };
  };
  const importMap = new Map();
  for (const r of importRulings.map(normalizeImportRuling)) {
    const key = `${r.expansionId || ""}::${r.disputeText.toLowerCase()}`;
    importMap.set(key, r);
  }
  const mergedEntries = [];
  const seen = new Set();
  for (const r of localRulings) {
    const key = `${r.expansionId || ""}::${r.disputeText.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const importEntry = importMap.get(key);
    if (importEntry) {
      const allRulings = [...(r.rulings || []), ...(importEntry.rulings || [])];
      const rulingMap = new Map();
      for (const ruling of allRulings) {
        const rulingKey = `${ruling.date}::${ruling.decision.toLowerCase()}`;
        if (!rulingMap.has(rulingKey)) {
          rulingMap.set(rulingKey, ruling);
        }
      }
      mergedEntries.push({
        ...r,
        rulings: [...rulingMap.values()].sort((a, b) => new Date(b.date) - new Date(a.date))
      });
    } else {
      mergedEntries.push({ ...r });
    }
  }
  for (const r of importMap.values()) {
    const key = `${r.expansionId || ""}::${r.disputeText.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    mergedEntries.push({ ...r });
  }
  return mergedEntries;
}

function mergeLoanRecords(localGame, importGame) {
  const localRecords = localGame.loanRecords || [];
  const importRecords = importGame.loanRecords || [];
  const seen = new Set();
  const merged = [];
  for (const record of [...localRecords, ...importRecords]) {
    let key;
    if (record.id) {
      key = record.id;
    } else {
      key = `${record.borrower}::${record.borrowedAt}::${record.expectedReturnAt || ""}::${record.returnedAt || ""}`;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ ...record, id: record.id || generateId() });
  }
  return merged.sort((a, b) => new Date(b.borrowedAt) - new Date(a.borrowedAt));
}

function mergeGames(localGame, importGame) {
  if (!localGame) {
    return { ...importGame };
  }
  const mergedExpansions = mergeExpansions(localGame, importGame);
  const merged = {
    ...localGame,
    minPlayers: importGame.minPlayers < localGame.minPlayers ? importGame.minPlayers : localGame.minPlayers,
    maxPlayers: importGame.maxPlayers > localGame.maxPlayers ? importGame.maxPlayers : localGame.maxPlayers,
    duration: importGame.duration !== localGame.duration ? importGame.duration : localGame.duration,
    complexity: importGame.complexity !== localGame.complexity ? importGame.complexity : localGame.complexity,
    lastPlayed: new Date(importGame.lastPlayed) > new Date(localGame.lastPlayed) ? importGame.lastPlayed : localGame.lastPlayed,
    cover: importGame.cover && importGame.cover.length > (localGame.cover || "").length ? importGame.cover : localGame.cover,
    forgets: mergeRuleArrays(localGame.forgets || [], importGame.forgets || []),
    disputes: mergeRuleArrays(localGame.disputes || [], importGame.disputes || []),
    setup: mergeRuleArrays(localGame.setup || [], importGame.setup || []),
    scoring: mergeRuleArrays(localGame.scoring || [], importGame.scoring || []),
    expansions: mergedExpansions,
    disputeRulings: mergeDisputeRulings(localGame, importGame, mergedExpansions),
    loanRecords: mergeLoanRecords(localGame, importGame)
  };
  const newContainers = [{ disputes: merged.disputes, expansionId: "" }];
  for (const exp of merged.expansions || []) {
    newContainers.push({ disputes: exp.disputes, expansionId: exp.id });
  }
  syncDisputeRulingsForGame(merged, null, newContainers);
  return merged;
}

function executeImport(importItems, globalStrategy, individualStrategies) {
  const processedGames = [];
  const localGamesMap = new Map();
  const idMappings = {
    gameIdMap: {},
    expansionIdMap: {}
  };
  for (const g of state.games) {
    localGamesMap.set(g.name.trim().toLowerCase(), g);
  }
  const processedNames = new Set();
  for (const item of importItems) {
    const strategy = individualStrategies[item.id] || globalStrategy;
    const key = item.name.trim().toLowerCase();
    processedNames.add(key);
    if (item.status === IMPORT_ITEM_STATUS.SKIP) {
      processedGames.push({ ...item.localGame });
      continue;
    }
    if (item.status === IMPORT_ITEM_STATUS.NEW) {
      processedGames.push({ ...item.importGame });
      idMappings.gameIdMap[item.importGame.id] = item.importGame.id;
      for (const exp of (item.importGame.expansions || [])) {
        idMappings.expansionIdMap[exp.id] = exp.id;
      }
      continue;
    }
    const localGame = item.localGame;
    const importGame = item.importGame;
    switch (strategy) {
      case MERGE_STRATEGY.OVERWRITE:
        processedGames.push({ ...importGame, id: localGame.id });
        idMappings.gameIdMap[importGame.id] = localGame.id;
        for (const exp of (localGame.expansions || [])) {
          const importExp = (importGame.expansions || []).find((ie) => ie.name.trim().toLowerCase() === exp.name.trim().toLowerCase());
          if (importExp) {
            idMappings.expansionIdMap[importExp.id] = exp.id;
          }
        }
        for (const exp of (importGame.expansions || [])) {
          if (!idMappings.expansionIdMap[exp.id]) {
            idMappings.expansionIdMap[exp.id] = exp.id;
          }
        }
        break;
      case MERGE_STRATEGY.KEEP:
        processedGames.push({ ...localGame });
        idMappings.gameIdMap[importGame.id] = localGame.id;
        for (const exp of (localGame.expansions || [])) {
          const importExp = (importGame.expansions || []).find((ie) => ie.name.trim().toLowerCase() === exp.name.trim().toLowerCase());
          if (importExp) {
            idMappings.expansionIdMap[importExp.id] = exp.id;
          }
        }
        break;
      case MERGE_STRATEGY.MERGE:
        const merged = mergeGames(localGame, importGame);
        processedGames.push({ ...merged, id: localGame.id });
        idMappings.gameIdMap[importGame.id] = localGame.id;
        for (const exp of (localGame.expansions || [])) {
          const importExp = (importGame.expansions || []).find((ie) => ie.name.trim().toLowerCase() === exp.name.trim().toLowerCase());
          if (importExp) {
            idMappings.expansionIdMap[importExp.id] = exp.id;
          }
        }
        for (const exp of (merged.expansions || [])) {
          const importExp = (importGame.expansions || []).find((ie) => ie.name.trim().toLowerCase() === exp.name.trim().toLowerCase());
          if (importExp && !idMappings.expansionIdMap[importExp.id]) {
            idMappings.expansionIdMap[importExp.id] = exp.id;
          }
        }
        break;
      default:
        processedGames.push({ ...localGame });
        idMappings.gameIdMap[importGame.id] = localGame.id;
    }
  }
  for (const g of state.games) {
    const key = g.name.trim().toLowerCase();
    if (!processedNames.has(key)) {
      processedGames.push({ ...g });
    }
  }
  return { processedGames, idMappings };
}

function getImportStats(items) {
  return {
    new: items.filter(i => i.status === IMPORT_ITEM_STATUS.NEW).length,
    overwrite: items.filter(i => i.status === IMPORT_ITEM_STATUS.OVERWRITE).length,
    skip: items.filter(i => i.status === IMPORT_ITEM_STATUS.SKIP).length,
    conflict: items.filter(i => i.status === IMPORT_ITEM_STATUS.CONFLICT).length
  };
}

function renderImportPreview() {
  const { importItems, globalStrategy, individualStrategies, filter } = importPreviewState;
  const stats = getImportStats(importItems);
  els.importStatNew.textContent = stats.new;
  els.importStatOverwrite.textContent = stats.overwrite;
  els.importStatSkip.textContent = stats.skip;
  els.importStatConflict.textContent = stats.conflict;
  const filteredItems = importItems.filter(item => {
    if (filter === "all") return true;
    if (filter === "new") return item.status === IMPORT_ITEM_STATUS.NEW;
    if (filter === "conflict") return item.status === IMPORT_ITEM_STATUS.CONFLICT;
    return true;
  });
  const statusLabels = {
    [IMPORT_ITEM_STATUS.NEW]: { label: "新增", class: "new", icon: "➕" },
    [IMPORT_ITEM_STATUS.OVERWRITE]: { label: "可覆盖", class: "overwrite", icon: "🔄" },
    [IMPORT_ITEM_STATUS.SKIP]: { label: "跳过", class: "skip", icon: "⏭️" },
    [IMPORT_ITEM_STATUS.CONFLICT]: { label: "冲突", class: "conflict", icon: "⚠️" }
  };
  els.importPreviewList.innerHTML = filteredItems.map(item => {
    const status = statusLabels[item.status];
    const currentStrategy = individualStrategies[item.id] || globalStrategy;
    const isNewOrSkip = item.status === IMPORT_ITEM_STATUS.NEW || item.status === IMPORT_ITEM_STATUS.SKIP;
    const diffHtml = item.differences && item.differences.length > 0 ? `
      <div class="import-item-diffs">
        ${item.differences.map(d => `
          <div class="import-item-diff">
            <span class="import-diff-field">${d.field}:</span>
            <span class="import-diff-local">本地: ${d.local}</span>
            <span class="import-diff-arrow">→</span>
            <span class="import-diff-imported">导入: ${d.imported}</span>
          </div>
        `).join("")}
      </div>
    ` : "";
    const strategyOptions = isNewOrSkip ? "" : `
      <div class="import-item-strategy">
        <label>
          <input type="radio" name="strategy-${item.id}" value="${MERGE_STRATEGY.OVERWRITE}" ${currentStrategy === MERGE_STRATEGY.OVERWRITE ? "checked" : ""} data-import-item="${item.id}" />
          <span>覆盖</span>
        </label>
        <label>
          <input type="radio" name="strategy-${item.id}" value="${MERGE_STRATEGY.KEEP}" ${currentStrategy === MERGE_STRATEGY.KEEP ? "checked" : ""} data-import-item="${item.id}" />
          <span>保留</span>
        </label>
        <label>
          <input type="radio" name="strategy-${item.id}" value="${MERGE_STRATEGY.MERGE}" ${currentStrategy === MERGE_STRATEGY.MERGE ? "checked" : ""} data-import-item="${item.id}" />
          <span>合并</span>
        </label>
      </div>
    `;
    return `
      <div class="import-preview-item import-status-${status.class}">
        <div class="import-item-header">
          <div class="import-item-status-badge ${status.class}">${status.icon} ${status.label}</div>
          <div class="import-item-name">${escapeHtml(item.name)}</div>
        </div>
        ${diffHtml}
        ${strategyOptions}
      </div>
    `;
  }).join("") || `<div class="import-preview-empty">没有符合筛选条件的桌游</div>`;
  const toProcess = importItems.filter(i => {
    if (i.status === IMPORT_ITEM_STATUS.SKIP) return false;
    const strategy = individualStrategies[i.id] || globalStrategy;
    return strategy !== MERGE_STRATEGY.KEEP || i.status === IMPORT_ITEM_STATUS.NEW;
  }).length;
  els.importPreviewSummaryText.textContent = `共 ${toProcess} 个桌游将被处理`;
}

function openImportPreview(importData, importedFilterViews, importedActiveFilterViewId, importedPartyArchives) {
  const importItems = analyzeImportData(importData);
  const existingArchiveKeys = new Set((state.partyArchives || []).map(a => `${a.name}::${a.createdAt}`));
  const newArchiveCount = (importedPartyArchives || []).filter(a => !existingArchiveKeys.has(`${a.name}::${a.createdAt}`)).length;
  importPreviewState = {
    importItems,
    globalStrategy: MERGE_STRATEGY.KEEP,
    individualStrategies: {},
    filter: "all",
    importData,
    importedFilterViews,
    importedActiveFilterViewId,
    importedPartyArchives: importedPartyArchives || [],
    _existingArchiveKeysBefore: existingArchiveKeys,
    _newArchiveCount: newArchiveCount
  };
  const strategyRadios = document.querySelectorAll('input[name="importGlobalStrategy"]');
  for (const radio of strategyRadios) {
    radio.checked = radio.value === MERGE_STRATEGY.KEEP;
  }
  for (const tab of els.importFilterTabs) {
    tab.classList.toggle("active", tab.dataset.importFilter === "all");
  }
  renderImportPreview();
  els.importPreviewDialog.classList.remove("hidden");
}

function closeImportPreview() {
  els.importPreviewDialog.classList.add("hidden");
  importPreviewState = {
    importItems: [],
    globalStrategy: MERGE_STRATEGY.KEEP,
    individualStrategies: {},
    filter: "all",
    importData: null,
    importedFilterViews: [],
    importedActiveFilterViewId: "",
    importedPartyArchives: [],
    _existingArchiveKeysBefore: new Set(),
    _newArchiveCount: 0
  };
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
    const importedPartyArchives = normalizePartyArchiveArray(migrated.partyArchives);
    openImportPreview(games, importedFilterViews, importedActiveFilterViewId, importedPartyArchives);
  } catch (err) {
    showBackupMessage(`导入失败：${err.message}`, "error");
  } finally {
    els.importFile.value = "";
  }
}

function remapPartyArchiveIds(archive, idMappings) {
  const { gameIdMap, expansionIdMap, archiveIdMap } = idMappings;
  const remapped = structuredClone(archive);
  if (archiveIdMap && archiveIdMap[remapped.id]) {
    remapped.id = archiveIdMap[remapped.id];
  }
  for (const ref of (remapped.candidateGameRefs || [])) {
    if (gameIdMap[ref.gameId]) {
      ref.gameId = gameIdMap[ref.gameId];
    }
    for (const exp of (ref.expansions || [])) {
      if (expansionIdMap[exp.expansionId]) {
        exp.expansionId = expansionIdMap[exp.expansionId];
      }
    }
  }
  for (const s of (remapped.finalSelections || [])) {
    if (gameIdMap[s.gameId]) {
      s.gameId = gameIdMap[s.gameId];
    }
    s.expansionIds = (s.expansionIds || []).map((id) => expansionIdMap[id] || id);
    if (s.tablePlayers && Array.isArray(s.tablePlayers)) {
      for (const p of s.tablePlayers) {
        p.id = p.id || generateId();
      }
    }
  }
  for (const h of (remapped.reviewHighlights || [])) {
    if (gameIdMap[h.gameId]) {
      h.gameId = gameIdMap[h.gameId];
    }
    if (h.expansionId && expansionIdMap[h.expansionId]) {
      h.expansionId = expansionIdMap[h.expansionId];
    }
  }
  for (const d of (remapped.disputeRulings || [])) {
    if (gameIdMap[d.gameId]) {
      d.gameId = gameIdMap[d.gameId];
    }
    if (d.expansionId && expansionIdMap[d.expansionId]) {
      d.expansionId = expansionIdMap[d.expansionId];
    }
  }
  if (remapped.actualResults && remapped.actualResults.gamesPlayed) {
    for (const g of remapped.actualResults.gamesPlayed) {
      if (gameIdMap[g.gameId]) {
        g.gameId = gameIdMap[g.gameId];
      }
    }
  }
  for (const p of (remapped.players || [])) {
    p.familiarGameIds = (p.familiarGameIds || []).map((id) => gameIdMap[id] || id);
  }
  if (remapped.sourceArchiveId && archiveIdMap && archiveIdMap[remapped.sourceArchiveId]) {
    remapped.sourceArchiveId = archiveIdMap[remapped.sourceArchiveId];
  }
  return remapped;
}

function confirmAndExecuteImport() {
  const { importItems, globalStrategy, individualStrategies, importedFilterViews, importedActiveFilterViewId, importedPartyArchives } = importPreviewState;
  const { processedGames, idMappings } = executeImport(importItems, globalStrategy, individualStrategies);
  const newCount = importItems.filter(i => i.status === IMPORT_ITEM_STATUS.NEW).length;
  const mergedCount = importItems.filter(i => {
    if (i.status === IMPORT_ITEM_STATUS.NEW || i.status === IMPORT_ITEM_STATUS.SKIP) return false;
    const strategy = individualStrategies[i.id] || globalStrategy;
    return strategy === MERGE_STRATEGY.MERGE;
  }).length;
  const overwrittenCount = importItems.filter(i => {
    if (i.status === IMPORT_ITEM_STATUS.NEW || i.status === IMPORT_ITEM_STATUS.SKIP) return false;
    const strategy = individualStrategies[i.id] || globalStrategy;
    return strategy === MERGE_STRATEGY.OVERWRITE;
  }).length;
  const skippedCount = importItems.filter(i => i.status === IMPORT_ITEM_STATUS.SKIP).length;
  state.games = processedGames;
  state.selectedId = state.games[0]?.id || "";
  state.selectedExpansionId = "";
  if (importedFilterViews.length > 0) {
    const existingViewNames = new Set((state.filterViews || []).map(v => v.name.trim().toLowerCase()));
    for (const view of importedFilterViews) {
      const key = view.name.trim().toLowerCase();
      if (!existingViewNames.has(key)) {
        state.filterViews.push(view);
        existingViewNames.add(key);
      }
    }
    if (importedActiveFilterViewId && !state.activeFilterViewId) {
      const activeView = state.filterViews.find((v) => v.id === importedActiveFilterViewId);
      if (activeView) {
        state.activeFilterViewId = importedActiveFilterViewId;
        applyFilterState(activeView.filterState);
      } else {
        state.activeFilterViewId = "";
      }
    }
  }
  if (importedPartyArchives && importedPartyArchives.length > 0) {
    const existingArchiveKeys = new Set((state.partyArchives || []).map(a => `${a.name}::${a.createdAt}`));
    const archiveIdMap = {};
    const newArchives = [];
    for (const archive of importedPartyArchives) {
      const key = `${archive.name}::${archive.createdAt}`;
      if (!existingArchiveKeys.has(key)) {
        const newId = generateId();
        archiveIdMap[archive.id] = newId;
        newArchives.push({ ...archive, _newId: newId });
        existingArchiveKeys.add(key);
      }
    }
    const fullIdMappings = { ...idMappings, archiveIdMap };
    for (const archive of newArchives) {
      const remappedArchive = remapPartyArchiveIds(archive, fullIdMappings);
      remappedArchive.id = archive._newId;
      state.partyArchives.push(remappedArchive);
    }
    if (newArchives.length > 0) {
      state.partyArchives.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  }
  saveState();
  renderAll();
  closeImportPreview();
  let successMsg = `导入完成：`;
  const parts = [];
  if (newCount > 0) parts.push(`新增 ${newCount} 个桌游`);
  if (mergedCount > 0) parts.push(`合并 ${mergedCount} 个桌游`);
  if (overwrittenCount > 0) parts.push(`覆盖 ${overwrittenCount} 个桌游`);
  if (skippedCount > 0) parts.push(`跳过 ${skippedCount} 个相同桌游`);
  if (importedFilterViews.length > 0) parts.push(`导入 ${importedFilterViews.length} 个筛选视图`);
  if (importedPartyArchives && importedPartyArchives.length > 0) {
    const newArchiveCount = importedPartyArchives.filter(a => {
      const key = `${a.name}::${a.createdAt}`;
      return !(importPreviewState._existingArchiveKeysBefore || []).has(key);
    }).length;
    if (newArchiveCount > 0) parts.push(`导入 ${newArchiveCount} 个聚会方案`);
  }
  successMsg += parts.join("，") + "。";
  showBackupMessage(successMsg, "success");
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

if (els.importPreviewCloseBtn) {
  els.importPreviewCloseBtn.addEventListener("click", closeImportPreview);
}
if (els.importPreviewCancelBtn) {
  els.importPreviewCancelBtn.addEventListener("click", closeImportPreview);
}
if (els.importPreviewConfirmBtn) {
  els.importPreviewConfirmBtn.addEventListener("click", confirmAndExecuteImport);
}
if (els.importPreviewDialog) {
  els.importPreviewDialog.addEventListener("click", (e) => {
    if (e.target === els.importPreviewDialog) closeImportPreview();
  });
}

document.addEventListener("change", (e) => {
  const globalStrategyRadio = e.target.closest('input[name="importGlobalStrategy"]');
  if (globalStrategyRadio) {
    importPreviewState.globalStrategy = globalStrategyRadio.value;
    importPreviewState.individualStrategies = {};
    renderImportPreview();
    return;
  }
  const itemStrategyRadio = e.target.closest('input[data-import-item]');
  if (itemStrategyRadio) {
    const itemId = itemStrategyRadio.dataset.importItem;
    importPreviewState.individualStrategies[itemId] = itemStrategyRadio.value;
    renderImportPreview();
    return;
  }
});

els.importFilterTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    const filter = tab.dataset.importFilter;
    importPreviewState.filter = filter;
    els.importFilterTabs.forEach(t => t.classList.toggle("active", t === tab));
    renderImportPreview();
  });
});

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
  const newLoan = {
    id: crypto.randomUUID(),
    borrower,
    borrowedAt,
    expectedReturnAt,
    notes,
    returnedAt: null
  };
  game.loanRecords.push(newLoan);
  const entry = createHistoryEntry({
    action: HISTORY_ACTION.LOAN_CREATE,
    gameId: game.id,
    description: `借出《${game.name}》给 ${borrower}（${borrowedAt}${expectedReturnAt ? `，预计归还：${expectedReturnAt}` : ""}）`,
    targetType: "loan",
    targetId: newLoan.id,
    after: structuredClone(newLoan)
  });
  pushHistoryEntry(game.id, entry);
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
      const oldReturnedAt = currentLoan.returnedAt;
      const newReturnedAt = new Date().toISOString().slice(0, 10);
      currentLoan.returnedAt = newReturnedAt;
      const entry = createHistoryEntry({
        action: HISTORY_ACTION.LOAN_RETURN,
        gameId: game.id,
        description: `《${game.name}》归还（${currentLoan.borrower} · ${newReturnedAt}）`,
        targetType: "loan",
        targetId: currentLoan.id,
        before: { returnedAt: oldReturnedAt },
        after: { returnedAt: newReturnedAt }
      });
      pushHistoryEntry(game.id, entry);
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
  const entry = createHistoryEntry({
    action: HISTORY_ACTION.EXPANSION_ADD,
    gameId: game.id,
    description: `新增扩展包《${name}》`,
    targetType: "expansion",
    targetId: newExpansion.id,
    expansionId: newExpansion.id,
    after: structuredClone(newExpansion)
  });
  pushHistoryEntry(game.id, entry);
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
  const archiveRefs = getArchivesReferencingExpansion(expansionId);
  const archiveWarning = archiveRefs.length > 0
    ? `\n\n⚠️ 该扩展包被 ${archiveRefs.length} 个归档方案引用：${archiveRefs.map(a => `「${a.name}」`).join("、")}。删除后归档中仍保留历史名称，但会标记为「已删除」。`
    : "";
  showConfirm(
    "删除扩展包",
    `确定要删除扩展包《${expansion.name}》吗？该扩展包的所有规则（包括争议裁定记录）都将被删除。可通过撤销功能恢复。${archiveWarning}`,
    () => {
      const expansionSnapshot = structuredClone(expansion);
      let deletedRulings = null;
      if (Array.isArray(game.disputeRulings)) {
        deletedRulings = game.disputeRulings.filter((r) => (r.expansionId || "") === expansionId);
        game.disputeRulings = game.disputeRulings.filter((r) => (r.expansionId || "") !== expansionId);
      }
      game.expansions = game.expansions.filter((e) => e.id !== expansionId);
      const entry = createHistoryEntry({
        action: HISTORY_ACTION.EXPANSION_DELETE,
        gameId: game.id,
        description: `删除扩展包《${expansionSnapshot.name}》`,
        targetType: "expansion",
        targetId: expansionSnapshot.id,
        expansionId: expansionSnapshot.id,
        before: expansionSnapshot,
        metadata: { deletedRulings }
      });
      pushHistoryEntry(game.id, entry);
      if (state.selectedExpansionId === expansionId) {
        state.selectedExpansionId = "";
      }
      renderExpansionList();
      renderArchiveList();
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
  const oldName = expansion.name;
  if (oldName === trimmedName) return;
  const beforeExpansion = structuredClone(expansion);
  expansion.name = trimmedName;
  const afterExpansion = structuredClone(expansion);
  const entry = createHistoryEntry({
    action: HISTORY_ACTION.EXPANSION_RENAME,
    gameId: game.id,
    description: `扩展包重命名：《${oldName}》→《${trimmedName}》`,
    targetType: "expansion",
    targetId: expansionId,
    expansionId,
    before: beforeExpansion,
    after: afterExpansion
  });
  pushHistoryEntry(game.id, entry);
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
  let rulingEntry = game.disputeRulings.find(
    (r) => r.disputeText === disputeText && (r.expansionId || "") === expId
  );
  if (!rulingEntry) {
    rulingEntry = { disputeText, expansionId: expId, rulings: [] };
    game.disputeRulings.push(rulingEntry);
  }

  const newRuling = {
    id: crypto.randomUUID(),
    decision,
    participants,
    date,
    notes
  };
  rulingEntry.rulings.push(newRuling);

  const expLabel = expId ? (getExpansionById(game, expId)?.name || "") : "基础游戏";
  const entry = createHistoryEntry({
    action: HISTORY_ACTION.RULING_ADD,
    gameId: game.id,
    description: `${expLabel} · 为争议「${disputeText.slice(0, 20)}${disputeText.length > 20 ? "…" : ""}」新增裁定：${decision.slice(0, 20)}${decision.length > 20 ? "…" : ""}`,
    targetType: "ruling",
    targetId: newRuling.id,
    expansionId: expId,
    after: { disputeText, ruling: structuredClone(newRuling) },
    metadata: { isNewGroup: !rulingEntry.rulings || rulingEntry.rulings.length === 1 }
  });
  pushHistoryEntry(game.id, entry);

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

  const beforeGame = structuredClone(state.games[gameIndex]);
  const coverChanged = cover !== beforeGame.cover;

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

  if (coverChanged) {
    updatedGame.coverHistory = Array.isArray(updatedGame.coverHistory) ? [...updatedGame.coverHistory] : [];
    updatedGame.coverHistory.push({
      id: generateId(),
      cover,
      changedAt: new Date().toISOString(),
      note: cover ? "更换封面" : "移除封面"
    });
  }

  state.games[gameIndex] = updatedGame;

  const changedFields = [];
  if (beforeGame.name !== name) changedFields.push("名称");
  if (beforeGame.minPlayers !== minPlayers || beforeGame.maxPlayers !== maxPlayers) changedFields.push("人数");
  if (beforeGame.duration !== duration) changedFields.push("时长");
  if (beforeGame.complexity !== complexity) changedFields.push("复杂度");
  if (beforeGame.lastPlayed !== lastPlayed) changedFields.push("游玩日期");
  if (coverChanged) changedFields.push("封面");
  if (JSON.stringify(beforeGame.forgets) !== JSON.stringify(editSnapshot.forgets)) changedFields.push("容易忘的规则");
  if (JSON.stringify(beforeGame.disputes) !== JSON.stringify(editSnapshot.disputes)) changedFields.push("常见争议");
  if (JSON.stringify(beforeGame.setup) !== JSON.stringify(editSnapshot.setup)) changedFields.push("开局准备");
  if (JSON.stringify(beforeGame.scoring) !== JSON.stringify(editSnapshot.scoring)) changedFields.push("计分提醒");
  if (JSON.stringify(beforeGame.expansions) !== JSON.stringify(editSnapshot.expansions)) changedFields.push("扩展包");

  if (changedFields.length > 0) {
    const batchEntry = createHistoryEntry({
      action: HISTORY_ACTION.BATCH_EDIT,
      gameId: beforeGame.id,
      description: `批量编辑：${changedFields.join("、")}`,
      targetType: "game",
      targetId: beforeGame.id,
      before: beforeGame,
      after: structuredClone(updatedGame)
    });
    pushHistoryEntry(beforeGame.id, batchEntry);
  }

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
  const historyButton = event.target.closest("#viewHistoryBtn");
  if (historyButton) {
    openTimelineDialog();
  }
});

function openUndoDialog() {
  if (!els.undoDialog) return;
  if (!Array.isArray(state.globalUndoStack) || state.globalUndoStack.length === 0) {
    showBackupMessage("暂无最近操作可撤销。", "error");
    return;
  }
  els.undoSelectedEntryId = null;
  renderUndoList();
  els.undoDialogConfirmBtn.disabled = true;
  els.undoDialog.classList.remove("hidden");
}

function closeUndoDialog() {
  if (!els.undoDialog) return;
  els.undoDialog.classList.add("hidden");
  els.undoSelectedEntryId = null;
}

function renderUndoList() {
  if (!els.undoList) return;
  const stack = Array.isArray(state.globalUndoStack) ? [...state.globalUndoStack] : [];
  if (stack.length === 0) {
    els.undoList.innerHTML = `<p class="undo-empty">暂无最近操作记录。</p>`;
    return;
  }
  els.undoList.innerHTML = stack.map((entry, idx) => {
    const game = state.games.find((g) => g.id === entry.gameId);
    const gameName = game ? game.name : "(已删除)";
    const isLatest = idx === 0;
    const undoable = isLatest && canUndoEntry(entry);
    const selected = els.undoSelectedEntryId === entry.id ? "selected" : "";
    return `
      <div class="undo-item ${selected} ${!undoable ? "disabled" : ""}"
           data-entry-id="${entry.id}" data-undoable="${undoable ? "1" : "0"}">
        <div class="undo-item-head">
          <span class="undo-action-icon">${HISTORY_ACTION_LABELS[entry.action]?.emoji || "📝"}</span>
          <span class="undo-action-name">${HISTORY_ACTION_LABELS[entry.action]?.label || entry.action}</span>
          ${isLatest ? `<span class="undo-latest-badge">最新</span>` : ""}
          ${!undoable ? `<span class="undo-no-badge" title="${isLatest ? "此操作不支持撤销" : "只能撤销最新操作"}">${isLatest ? "不可撤销" : "非最新"}</span>` : ""}
        </div>
        <div class="undo-item-desc">${escapeHtml(entry.description || "")}</div>
        <div class="undo-item-meta">
          <span>🎮 ${escapeHtml(gameName)}</span>
          <span>🕒 ${formatHistoryTimestamp(entry.timestamp)}</span>
        </div>
      </div>
    `;
  }).join("");
  if (els.undoList) {
    els.undoList.querySelectorAll(".undo-item").forEach((el) => {
      el.addEventListener("click", () => {
        const eid = el.dataset.entryId;
        const undoable = el.dataset.undoable === "1";
        if (!undoable) return;
        els.undoSelectedEntryId = eid;
        els.undoList.querySelectorAll(".undo-item").forEach((it) => it.classList.remove("selected"));
        el.classList.add("selected");
        els.undoDialogConfirmBtn.disabled = false;
      });
    });
  }
}

function executeSelectedUndo() {
  if (!els.undoSelectedEntryId) return;
  const entry = state.globalUndoStack.find((e) => e.id === els.undoSelectedEntryId);
  if (!entry) return;
  const idx = state.globalUndoStack.indexOf(entry);
  if (idx !== 0) {
    showBackupMessage("只能撤销最近一次操作，请先处理更新的记录。", "error");
    return;
  }
  const doUndo = () => {
    try {
      const success = undoHistoryEntry(entry);
      if (success) {
        state.globalUndoStack = state.globalUndoStack.filter((e) => e.id !== entry.id);
        saveState();
        closeUndoDialog();
        renderAll();
        showBackupMessage(`已撤销操作：${entry.description}`, "success");
      } else {
        showBackupMessage("撤销操作失败，请检查数据状态。", "error");
      }
    } catch (err) {
      console.error("撤销错误:", err);
      showBackupMessage(`撤销失败：${err.message || "未知错误"}`, "error");
    }
  };
  doUndo();
}

function openTimelineDialog() {
  if (!els.historyTimelineDialog) return;
  const game = state.games.find((g) => g.id === state.selectedId);
  if (!game) return;
  els.historyTimelineTitle.textContent = `📜 《${game.name}》变更时间线`;
  renderTimeline(game.id);
  els.historyTimelineDialog.classList.remove("hidden");
}

function closeTimelineDialog() {
  if (!els.historyTimelineDialog) return;
  els.historyTimelineDialog.classList.add("hidden");
}

function renderTimeline(gameId) {
  if (!els.historyTimelineList || !els.historyTimelineEmpty) return;
  const history = getGameHistory(gameId);
  if (!history || history.length === 0) {
    els.historyTimelineEmpty.classList.remove("hidden");
    els.historyTimelineList.innerHTML = "";
    return;
  }
  els.historyTimelineEmpty.classList.add("hidden");
  const sorted = [...history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  els.historyTimelineList.innerHTML = sorted.map((entry) => {
    const undoable = canUndoEntry(entry);
    const isRule = entry.targetType === "rule";
    const isExp = entry.targetType === "expansion";
    const canRestoreRule = isRule && (entry.action === HISTORY_ACTION.RULE_DELETE ||
      entry.action === HISTORY_ACTION.RULE_UPDATE);
    const canRestoreExp = isExp && (entry.action === HISTORY_ACTION.EXPANSION_DELETE ||
      entry.action === HISTORY_ACTION.EXPANSION_ADD ||
      entry.action === HISTORY_ACTION.EXPANSION_RENAME);
    return `
      <div class="timeline-item ${HISTORY_ACTION_LABELS[entry.action]?.cssClass || ""}">
        <div class="timeline-dot" title="${HISTORY_ACTION_LABELS[entry.action]?.label || entry.action}">
          ${HISTORY_ACTION_LABELS[entry.action]?.emoji || "📝"}
        </div>
        <div class="timeline-content">
          <div class="timeline-head">
            <strong class="timeline-action">${HISTORY_ACTION_LABELS[entry.action]?.label || entry.action}</strong>
            <span class="timeline-time">${formatHistoryTimestamp(entry.timestamp)}</span>
          </div>
          <div class="timeline-desc">${escapeHtml(entry.description || "")}</div>
          <div class="timeline-actions">
            ${undoable && state.globalUndoStack.some((e) => e.id === entry.id) ? `<button type="button" class="timeline-btn secondary timeline-undo" data-entry-id="${entry.id}">↩️ 撤销</button>` : ""}
            ${canRestoreRule ? `<button type="button" class="timeline-btn primary timeline-restore-rule" data-entry-id="${entry.id}" title="从历史版本恢复这条规则">恢复规则</button>` : ""}
            ${canRestoreExp ? `<button type="button" class="timeline-btn primary timeline-restore-exp" data-entry-id="${entry.id}" title="从历史版本恢复这个扩展包">恢复扩展包</button>` : ""}
          </div>
        </div>
      </div>
    `;
  }).join("");
  if (els.historyTimelineList) {
    els.historyTimelineList.querySelectorAll(".timeline-undo").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.entryId;
        const entry = state.globalUndoStack.find((e) => e.id === id);
        if (!entry) {
          showBackupMessage("此操作已不在撤销栈中，无法撤销。", "error");
          return;
        }
        els.undoSelectedEntryId = id;
        closeTimelineDialog();
        executeSelectedUndo();
      });
    });
    els.historyTimelineList.querySelectorAll(".timeline-restore-rule").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.entryId;
        const history = getGameHistory(gameId);
        const entry = history.find((e) => e.id === id);
        if (!entry) return;
        openRestoreRuleDialog(entry);
      });
    });
    els.historyTimelineList.querySelectorAll(".timeline-restore-exp").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.entryId;
        const history = getGameHistory(gameId);
        const entry = history.find((e) => e.id === id);
        if (!entry) return;
        openRestoreExpansionDialog(entry);
      });
    });
  }
}

function openRestoreRuleDialog(entry) {
  if (!els.historyRestoreDialog) return;
  const rule = entry.action === HISTORY_ACTION.RULE_DELETE ? entry.before : (entry.before || entry.after);
  const ruleKey = entry.ruleKey;
  const category = RULE_CATEGORY_DISPLAY[ruleKey] || ruleKey;
  const expId = entry.expansionId || "";
  const game = state.games.find((g) => g.id === entry.gameId);
  const expLabel = expId ? (getExpansionById(game, expId)?.name || "未知扩展包") : "基础游戏";
  els.pendingRestoreEntry = { type: "rule", entry };
  els.historyRestoreDialogTitle.textContent = `📜 恢复${category}确认`;
  els.historyRestoreContent.innerHTML = `
    <div class="restore-info">
      <p><strong>所属位置：</strong>${escapeHtml(expLabel)}</p>
      <p><strong>规则分类：</strong>${category}</p>
      <p><strong>操作时间：</strong>${formatHistoryTimestamp(entry.timestamp)}</p>
    </div>
    <div class="restore-preview">
      <h4>规则内容预览：</h4>
      <div class="restore-rule-preview">
        <div class="rule-text">${escapeHtml(rule?.text || ruleText(rule || {}))}</div>
        ${rule?.tags?.length ? renderTagChips(rule.tags) : ""}
        ${rule?.status && rule.status !== "unmarked" ? `<div class="rule-status-preview">状态：${REVIEW_STATUS_LABELS[rule.status] || rule.status}</div>` : ""}
      </div>
    </div>
    <div class="restore-warning">⚠️ 恢复后将添加为一条新规则，现有规则不会被覆盖。</div>
  `;
  els.historyRestoreDialog.classList.remove("hidden");
}

function openRestoreExpansionDialog(entry) {
  if (!els.historyRestoreDialog) return;
  const expansion = entry.action === HISTORY_ACTION.EXPANSION_DELETE ? entry.before :
    (entry.action === HISTORY_ACTION.EXPANSION_RENAME ? (entry.after || entry.before) :
      (entry.before || entry.after));
  const game = state.games.find((g) => g.id === entry.gameId);
  const exists = game && game.expansions?.some((e) => e.id === expansion?.id);
  els.pendingRestoreEntry = { type: "expansion", entry };
  els.historyRestoreDialogTitle.textContent = `📜 恢复扩展包确认`;
  const ruleCount = expansion ? (
    (expansion.forgets?.length || 0) + (expansion.disputes?.length || 0) +
    (expansion.setup?.length || 0) + (expansion.scoring?.length || 0)
  ) : 0;
  els.historyRestoreContent.innerHTML = `
    <div class="restore-info">
      <p><strong>扩展包名称：</strong>${escapeHtml(expansion?.name || "(无)")}</p>
      <p><strong>操作时间：</strong>${formatHistoryTimestamp(entry.timestamp)}</p>
      <p><strong>规则总数：</strong>${ruleCount} 条</p>
      ${exists ? '<p class="restore-warn">⚠️ 检测到同名扩展包 ID 已存在，将重命名恢复的扩展包。</p>' : ""}
    </div>
    <div class="restore-preview">
      <h4>扩展包结构预览：</h4>
      <ul class="restore-exp-list">
        <li>容易忘的规则：${expansion?.forgets?.length || 0} 条</li>
        <li>常见争议：${expansion?.disputes?.length || 0} 条</li>
        <li>开局准备：${expansion?.setup?.length || 0} 条</li>
        <li>计分提醒：${expansion?.scoring?.length || 0} 条</li>
      </ul>
    </div>
    <div class="restore-warning">⚠️ 恢复后将作为独立扩展包添加，不会覆盖现有扩展包。</div>
  `;
  els.historyRestoreDialog.classList.remove("hidden");
}

function closeRestoreDialog() {
  if (!els.historyRestoreDialog) return;
  els.historyRestoreDialog.classList.add("hidden");
  els.pendingRestoreEntry = null;
}

function executeRestore() {
  const pending = els.pendingRestoreEntry;
  if (!pending) return;
  const entry = pending.entry;
  const game = state.games.find((g) => g.id === entry.gameId);
  if (!game) {
    showBackupMessage("所属桌游不存在，无法恢复。", "error");
    closeRestoreDialog();
    return;
  }
  if (pending.type === "rule") {
    const rule = entry.action === HISTORY_ACTION.RULE_DELETE ? structuredClone(entry.before) :
      structuredClone(entry.before || entry.after);
    const ruleKey = entry.ruleKey;
    const expId = entry.expansionId || "";
    const container = getRuleContainer(game, expId);
    if (!container || !container[ruleKey]) {
      showBackupMessage("规则容器不存在，无法恢复。", "error");
      closeRestoreDialog();
      return;
    }
    if (rule && !rule.id) rule.id = generateId();
    if (rule) rule.status = rule.status || REVIEW_STATUS.UNMARKED;
    container[ruleKey].push(rule);
    if (ruleKey === "disputes") {
      const text = ruleText(rule);
      if (text) ensureDisputeRulingEntry(game, text, expId);
    }
    saveState();
    closeRestoreDialog();
    renderAll();
    renderTimeline(game.id);
    showBackupMessage(`已恢复规则：${ruleText(rule).slice(0, 30)}`, "success");
  } else if (pending.type === "expansion") {
    let expansion = entry.action === HISTORY_ACTION.EXPANSION_DELETE ? structuredClone(entry.before) :
      (entry.action === HISTORY_ACTION.EXPANSION_RENAME ? structuredClone(entry.after || entry.before) :
        structuredClone(entry.before || entry.after));
    if (!expansion) {
      showBackupMessage("扩展包数据损坏，无法恢复。", "error");
      closeRestoreDialog();
      return;
    }
    expansion.id = generateId();
    const baseName = expansion.name || "未命名扩展包";
    const existingNames = game.expansions?.map((e) => e.name) || [];
    let finalName = baseName;
    let idx = 2;
    while (existingNames.includes(finalName)) {
      finalName = `${baseName}（已恢复${idx}）`;
      idx++;
    }
    expansion.name = finalName;
    if (!Array.isArray(game.expansions)) game.expansions = [];
    game.expansions.push(expansion);
    if (entry.metadata?.deletedRulings && Array.isArray(entry.metadata.deletedRulings) && Array.isArray(game.disputeRulings)) {
      game.disputeRulings.push(...structuredClone(entry.metadata.deletedRulings));
    }
    saveState();
    closeRestoreDialog();
    renderAll();
    renderTimeline(game.id);
    showBackupMessage(`已恢复扩展包《${finalName}》`, "success");
  }
}

if (els.undoBtn) {
  els.undoBtn.addEventListener("click", openUndoDialog);
}
if (els.undoDialogCloseBtn) {
  els.undoDialogCloseBtn.addEventListener("click", closeUndoDialog);
}
if (els.undoDialogCancelBtn) {
  els.undoDialogCancelBtn.addEventListener("click", closeUndoDialog);
}
if (els.undoDialog) {
  els.undoDialog.addEventListener("click", (e) => {
    if (e.target === els.undoDialog) closeUndoDialog();
  });
}
if (els.undoDialogConfirmBtn) {
  els.undoDialogConfirmBtn.addEventListener("click", executeSelectedUndo);
}
if (els.historyTimelineCloseBtn) {
  els.historyTimelineCloseBtn.addEventListener("click", closeTimelineDialog);
}
if (els.historyTimelineDialog) {
  els.historyTimelineDialog.addEventListener("click", (e) => {
    if (e.target === els.historyTimelineDialog) closeTimelineDialog();
  });
}
if (els.historyRestoreDialogCancelBtn) {
  els.historyRestoreDialogCancelBtn.addEventListener("click", closeRestoreDialog);
}
if (els.historyRestoreDialogConfirmBtn) {
  els.historyRestoreDialogConfirmBtn.addEventListener("click", executeRestore);
}
if (els.historyRestoreDialogCloseBtn) {
  els.historyRestoreDialogCloseBtn.addEventListener("click", closeRestoreDialog);
}
if (els.historyRestoreDialog) {
  els.historyRestoreDialog.addEventListener("click", (e) => {
    if (e.target === els.historyRestoreDialog) closeRestoreDialog();
  });
}

const PARTY_COMPLEXITY = ["轻", "中", "重"];
const PARTY_DEFAULT_PLAYER_NAMES = ["玩家一", "玩家二", "玩家三", "玩家四", "玩家五", "玩家六", "玩家七", "玩家八"];

let partyState = null;

function createEmptyPartyState() {
  return {
    step: 1,
    name: "",
    playerCount: 4,
    candidateIds: [],
    players: [],
    finalSelectionIds: [],
    sourceArchiveId: ""
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
  const { tables, totalScore, reasons, warnings, id } = plan;
  const isTop = rank === 0;
  const cardClass = isTop ? "recommended" : "alternative";
  const planSelected = Array.isArray(partyState.finalSelectionIds) && partyState.finalSelectionIds.includes(`plan:${id}`);
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
    <div class="party-rec-card party-split-card ${cardClass} ${planSelected ? "final-selected" : ""}" data-party-plan="${plan.id}">
      <div class="party-rec-header">
        <div class="party-rec-title-row">
          <label class="party-final-check">
            <input type="checkbox" data-party-final-select-plan="${plan.id}" ${planSelected ? "checked" : ""} />
            <span>选用此分桌方案</span>
          </label>
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
  const isSelected = Array.isArray(partyState.finalSelectionIds) && partyState.finalSelectionIds.includes(game.id);

  const reasonsHtml =
    reasons.length > 0
      ? `<div class="party-reasons"><h5>✅ 推荐理由</h5><ul>${reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul></div>`
      : "";

  const warningsHtml =
    warnings.length > 0
      ? `<div class="party-warnings"><h5>⚠️ 注意事项</h5><ul>${warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join("")}</ul></div>`
      : "";

  return `
    <div class="party-rec-card ${cardClass} ${isSelected ? "final-selected" : ""}" data-party-rec-game="${game.id}">
      <div class="party-rec-header">
        <div class="party-rec-title-row">
          <label class="party-final-check">
            <input type="checkbox" data-party-final-select="${game.id}" ${isSelected ? "checked" : ""} />
            <span>选为最终游玩</span>
          </label>
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
  const finalSelect = e.target.closest('[data-party-final-select]');
  const finalSelectPlan = e.target.closest('[data-party-final-select-plan]');

  if (finalSelect) {
    const gameId = finalSelect.dataset.partyFinalSelect;
    if (!Array.isArray(partyState.finalSelectionIds)) partyState.finalSelectionIds = [];
    partyState.finalSelectionIds = partyState.finalSelectionIds.filter((id) => !id.startsWith("plan:"));
    if (finalSelect.checked) {
      if (!partyState.finalSelectionIds.includes(gameId)) partyState.finalSelectionIds.push(gameId);
    } else {
      partyState.finalSelectionIds = partyState.finalSelectionIds.filter((id) => id !== gameId);
    }
    if (partyState) {
      const result = generatePartyRecommendations();
      renderPartyRecommendations(result);
    }
    return;
  }

  if (finalSelectPlan) {
    const planId = finalSelectPlan.dataset.partyFinalSelectPlan;
    if (!Array.isArray(partyState.finalSelectionIds)) partyState.finalSelectionIds = [];
    partyState.finalSelectionIds = partyState.finalSelectionIds.filter((id) => !id.startsWith("plan:"));
    if (finalSelectPlan.checked) {
      partyState.finalSelectionIds = [`plan:${planId}`];
    }
    if (partyState) {
      const result = generatePartyRecommendations();
      renderPartyRecommendations(result);
    }
    return;
  }

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

function collectRulesWithMeta(filterFn, sourceLabel, scope) {
  const collected = [];
  const scopeGameId = scope?.gameId || null;
  const scopeExpansionId = scope?.expansionId !== undefined ? scope.expansionId : null;
  for (const game of state.games) {
    if (scopeGameId && game.id !== scopeGameId) continue;
    const containers = [{ container: game, expansionId: "", expansionName: "" }];
    for (const exp of game.expansions || []) {
      containers.push({ container: exp, expansionId: exp.id, expansionName: exp.name });
    }
    for (const { container, expansionId, expansionName } of containers) {
      if (scopeExpansionId !== null && (scopeExpansionId || "") !== expansionId) continue;
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

function collectMustReviewRules(scope) {
  return collectRulesWithMeta(
    (rule) => ruleStatus(rule) === REVIEW_STATUS.MUST_REVIEW,
    "下次必看",
    scope
  );
}

function collectStillForgetRules(scope) {
  return collectRulesWithMeta(
    (rule) => ruleStatus(rule) === REVIEW_STATUS.STILL_FORGET,
    "还会忘",
    scope
  );
}

function collectUnresolvedDisputeRules(scope) {
  return collectRulesWithMeta(
    (rule, ruleKey, game, container, expansionId) => {
      if (ruleKey !== "disputes") return false;
      const rulings = Array.isArray(game.disputeRulings) ? game.disputeRulings : [];
      const expId = expansionId || "";
      const text = ruleText(rule);
      const entry = rulings.find((r) => r.disputeText === text && (r.expansionId || "") === expId);
      return !entry || entry.rulings.length === 0;
    },
    "未裁定争议",
    scope
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

function collectAllPendingRules(scope) {
  return collectRulesWithMeta(
    (rule) => {
      const s = ruleStatus(rule);
      return s === REVIEW_STATUS.UNMARKED || s === REVIEW_STATUS.STILL_FORGET || s === REVIEW_STATUS.MUST_REVIEW;
    },
    "待复习",
    scope
  );
}

function collectRulesBySource(source, extraData) {
  const scope = extraData?.scope || null;
  switch (source) {
    case REVIEW_SESSION_SOURCE.MUST_REVIEW:
      return collectMustReviewRules(scope);
    case REVIEW_SESSION_SOURCE.STILL_FORGET:
      return collectStillForgetRules(scope);
    case REVIEW_SESSION_SOURCE.UNRESOLVED_DISPUTES:
      return collectUnresolvedDisputeRules(scope);
    case REVIEW_SESSION_SOURCE.CHECKLIST:
      return collectChecklistRules();
    case REVIEW_SESSION_SOURCE.PARTY:
      return collectPartyRules();
    case REVIEW_SESSION_SOURCE.ALL_PENDING:
      return collectAllPendingRules(scope);
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
    if (!source) return;
    const extraData = {};
    const gameId = startBtn.dataset.gameId;
    const expansionId = startBtn.dataset.expansionId;
    if (gameId) {
      extraData.scope = { gameId, expansionId: expansionId !== undefined ? expansionId : "" };
    }
    startReviewSession(source, extraData);
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

let viewingArchiveId = null;
let recordingArchiveId = null;

function savePartyArchive() {
  if (!partyState) return;
  const candidateGames = state.games.filter((g) => partyState.candidateIds.includes(g.id));
  const candidateGameRefs = candidateGames.map((g) => ({
    gameId: g.id,
    gameName: g.name,
    expansions: (g.expansions || []).map((e) => ({
      expansionId: e.id,
      expansionName: e.name
    }))
  }));
  const reviewHighlights = [];
  for (const game of candidateGames) {
    const mustReview = getAllRulesIncludingExpansions(game).filter((r) => ruleStatus(r) === REVIEW_STATUS.MUST_REVIEW);
    const stillForget = getAllRulesIncludingExpansions(game).filter((r) => ruleStatus(r) === REVIEW_STATUS.STILL_FORGET);
    for (const r of mustReview) {
      reviewHighlights.push({
        gameId: game.id,
        gameName: game.name,
        expansionId: "",
        expansionName: "",
        ruleKey: "must_review",
        ruleText: ruleText(r)
      });
    }
    for (const r of stillForget) {
      reviewHighlights.push({
        gameId: game.id,
        gameName: game.name,
        expansionId: "",
        expansionName: "",
        ruleKey: "still_forget",
        ruleText: ruleText(r)
      });
    }
  }
  const disputeRulings = [];
  for (const game of candidateGames) {
    for (const entry of game.disputeRulings || []) {
      if (entry.rulings && entry.rulings.length > 0) {
        const latest = entry.rulings[entry.rulings.length - 1];
        disputeRulings.push({
          gameId: game.id,
          gameName: game.name,
          expansionId: entry.expansionId || "",
          disputeText: entry.disputeText,
          rulingDecision: latest.decision,
          rulingDate: latest.date,
          rulingParticipants: latest.participants
        });
      }
    }
  }
  const result = generatePartyRecommendations();
  const finalSelections = [];
  let selectedPlanId = "";
  let selectedPlanTotalScore = null;
  const selectedIds = partyState.finalSelectionIds || [];
  const planSelection = selectedIds.find((id) => id.startsWith("plan:"));
  if (planSelection) {
    const planId = planSelection.replace("plan:", "");
    const selectedPlan = (result.plans || []).find((p) => p.id === planId);
    if (selectedPlan) {
      selectedPlanId = planId;
      selectedPlanTotalScore = selectedPlan.totalScore;
      for (const table of selectedPlan.tables) {
        const expNames = (table.game.expansions || []).map((e) => e.name);
        finalSelections.push({
          gameId: table.game.id,
          gameName: table.game.name,
          expansionIds: [],
          expansionNames: expNames,
          tableNumber: table.tableNumber,
          tablePlayerCount: table.players.length,
          tablePlayers: table.players.map((p) => ({
            id: p.id,
            name: p.name
          })),
          score: table.score,
          reasons: table.reasons || [],
          warnings: table.warnings || [],
          planId
        });
      }
    }
  } else if (selectedIds.length > 0) {
    for (const gameId of selectedIds) {
      if (gameId.startsWith("plan:")) continue;
      const game = state.games.find((g) => g.id === gameId);
      const rec = (result.recommendations || []).find((r) => r.game.id === gameId);
      if (game) {
        const expNames = (game.expansions || []).map((e) => e.name);
        finalSelections.push({
          gameId: game.id,
          gameName: game.name,
          expansionIds: [],
          expansionNames: expNames,
          score: rec ? rec.score : null,
          reasons: rec ? rec.reasons || [] : [],
          warnings: rec ? rec.warnings || [] : [],
          planId: ""
        });
      }
    }
  }
  if (finalSelections.length === 0) {
    if (result.type === "single" && result.recommendations) {
      const topRecs = result.recommendations.slice(0, 3);
      for (const rec of topRecs) {
        const expNames = (rec.game.expansions || []).map((e) => e.name);
        finalSelections.push({
          gameId: rec.game.id,
          gameName: rec.game.name,
          expansionIds: [],
          expansionNames: expNames,
          score: rec.score,
          reasons: rec.reasons || [],
          warnings: rec.warnings || [],
          planId: ""
        });
      }
    } else if (result.type === "split" && result.plans && result.plans.length > 0) {
      const topPlan = result.plans[0];
      selectedPlanId = topPlan.id;
      selectedPlanTotalScore = topPlan.totalScore;
      for (const table of topPlan.tables) {
        const expNames = (table.game.expansions || []).map((e) => e.name);
        finalSelections.push({
          gameId: table.game.id,
          gameName: table.game.name,
          expansionIds: [],
          expansionNames: expNames,
          tableNumber: table.tableNumber,
          tablePlayerCount: table.players.length,
          tablePlayers: table.players.map((p) => ({
            id: p.id,
            name: p.name
          })),
          score: table.score,
          reasons: table.reasons || [],
          warnings: table.warnings || [],
          planId: topPlan.id
        });
      }
    }
  }
  const sourceArchive = partyState.sourceArchiveId
    ? (state.partyArchives || []).find((a) => a.id === partyState.sourceArchiveId)
    : null;
  const archive = normalizePartyArchive({
    id: generateId(),
    name: partyState.name || `聚会 ${formatDate(new Date().toISOString())}`,
    createdAt: new Date().toISOString(),
    playerCount: partyState.playerCount,
    players: partyState.players.map((p) => ({
      id: p.id,
      name: p.name,
      dislikedComplexity: [...p.dislikedComplexity],
      familiarGameIds: [...p.familiarGameIds]
    })),
    candidateGameRefs,
    recommendationSnapshot: {
      type: result.type,
      summary: result.type === "single"
        ? `${(result.recommendations || []).length} 个推荐`
        : `${(result.plans || []).length} 个分桌方案`,
      totalScore: selectedPlanTotalScore
    },
    finalSelections,
    selectedPlanId,
    reviewHighlights,
    disputeRulings,
    actualResults: null,
    sourceArchiveId: partyState.sourceArchiveId || "",
    sourceArchiveName: sourceArchive ? sourceArchive.name : ""
  });
  if (!Array.isArray(state.partyArchives)) {
    state.partyArchives = [];
  }
  state.partyArchives.unshift(archive);
  state.partyArchives.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  saveState();
  renderArchiveList();
  showBackupMessage("聚会方案已保存到归档。", "success");
}

function renderArchiveList() {
  const archiveListEl = document.querySelector("#archiveList");
  const archiveCountEl = document.querySelector("#archiveCount");
  if (!archiveListEl) return;
  const archives = state.partyArchives || [];
  if (archiveCountEl) {
    archiveCountEl.textContent = `${archives.length} 个方案`;
  }
  if (archives.length === 0) {
    archiveListEl.innerHTML = `<div class="archive-empty">暂无归档方案。在多人聚会准备模式生成推荐后，点击「保存方案」即可归档。</div>`;
    return;
  }
  archiveListEl.innerHTML = archives.map((archive) => {
    const hasResults = !!archive.actualResults;
    const cardClass = hasResults ? "has-results" : "no-results";
    const iconEmoji = hasResults ? "✅" : "📁";
    const resultBadge = hasResults
      ? `<span class="archive-badge recorded">已记录结果</span>`
      : `<span class="archive-badge pending">待记录结果</span>`;
    const sourceBadge = archive.sourceArchiveId
      ? `<span class="archive-badge from-archive">基于历史方案</span>`
      : "";
    const playerCount = archive.playerCount || 0;
    const playerNames = (archive.players || []).map((p) => p.name).join("、");
    const gameCount = (archive.candidateGameRefs || []).length;
    const dateStr = formatDate(archive.createdAt);
    return `
      <div class="archive-card ${cardClass}" data-archive-id="${archive.id}">
        <div class="archive-icon">${iconEmoji}</div>
        <div class="archive-info">
          <div class="archive-name">${escapeHtml(archive.name)}</div>
          <div class="archive-meta">
            <span>${dateStr}</span>
            <span>${playerCount}人</span>
            <span>${gameCount}个桌游</span>
            ${playerNames ? `<span>👥 ${escapeHtml(playerNames)}</span>` : ""}
            ${resultBadge}
            ${sourceBadge}
          </div>
        </div>
        <button type="button" class="archive-delete-btn" data-archive-delete="${archive.id}" title="删除方案">×</button>
      </div>
    `;
  }).join("");
}

function getGameRefStatus(gameId) {
  const game = state.games.find((g) => g.id === gameId);
  if (!game) return { exists: false, name: "已删除", onLoan: false, deleted: true };
  const currentLoan = getCurrentLoan(game);
  return {
    exists: true,
    name: game.name,
    onLoan: !!currentLoan,
    loanBorrower: currentLoan?.borrower || "",
    deleted: false
  };
}

function computeArchiveRiskWarnings(archive) {
  const warnings = [];
  for (const ref of archive.candidateGameRefs || []) {
    const status = getGameRefStatus(ref.gameId);
    if (status.deleted) {
      warnings.push(`桌游「${ref.gameName || "未知"}」已被删除，无法基于此方案复用`);
      continue;
    }
    if (status.onLoan) {
      warnings.push(`桌游「${status.name}」当前借出中（借给 ${status.loanBorrower}），聚会时可能不在馆`);
    }
    const game = state.games.find((g) => g.id === ref.gameId);
    if (game) {
      const mustReview = getAllRulesIncludingExpansions(game).filter((r) => ruleStatus(r) === REVIEW_STATUS.MUST_REVIEW);
      if (mustReview.length > 0) {
        warnings.push(`桌游「${status.name}」有 ${mustReview.length} 条规则标记为「下次必看」，上次方案保存后可能有新增`);
      }
      const newExpansions = (game.expansions || []).filter(
        (e) => !(ref.expansions || []).some((re) => re.expansionId === e.id)
      );
      if (newExpansions.length > 0) {
        warnings.push(`桌游「${status.name}」新增了 ${newExpansions.length} 个扩展包（${newExpansions.map((e) => e.name).join("、")}），可能影响推荐`);
      }
    }
  }
  for (const ref of archive.candidateGameRefs || []) {
    for (const expRef of ref.expansions || []) {
      const game = state.games.find((g) => g.id === ref.gameId);
      if (!game) continue;
      const expExists = (game.expansions || []).some((e) => e.id === expRef.expansionId);
      if (!expExists) {
        warnings.push(`桌游「${ref.gameName}」的扩展包「${expRef.expansionName}」已被删除`);
      }
    }
  }
  return warnings;
}

function renderArchiveDetail(archiveId) {
  const archive = (state.partyArchives || []).find((a) => a.id === archiveId);
  if (!archive) return;
  viewingArchiveId = archiveId;
  const titleEl = document.querySelector("#archiveDetailTitle");
  const contentEl = document.querySelector("#archiveDetailContent");
  if (titleEl) titleEl.textContent = archive.name || "方案详情";
  let html = "";
  html += `<div class="archive-detail-section">
    <h4>📋 基本信息</h4>
    <div class="archive-meta" style="margin-top:4px;">
      <span>创建于 ${formatDate(archive.createdAt)}</span>
      <span>${archive.playerCount} 人聚会</span>
      <span>${(archive.candidateGameRefs || []).length} 个候选桌游</span>
    </div>
    ${archive.sourceArchiveId ? `
      <div class="archive-source-info" style="margin-top:8px;padding:8px 12px;background:var(--bg-soft);border-radius:8px;font-size:13px;">
        <span style="color:var(--muted);">📌 来源：</span>
        <span style="color:var(--lavender);font-weight:600;">${escapeHtml(archive.sourceArchiveName || "历史方案")}</span>
        <span style="color:var(--muted);font-size:12px;">（${archive.sourceArchiveId.slice(0, 8)}...）</span>
      </div>
    ` : ""}
  </div>`;
  const playerNames = (archive.players || []).map((p) => p.name).join("、");
  if (playerNames) {
    html += `<div class="archive-detail-section">
      <h4>👥 参与玩家</h4>
      <div class="archive-detail-players">
        ${(archive.players || []).map((p) => {
          const disliked = p.dislikedComplexity || [];
          const dislikedLabel = disliked.length > 0 ? `（不玩${disliked.join("/")}度）` : "";
          return `<span class="archive-detail-player-chip">${escapeHtml(p.name)}${dislikedLabel}</span>`;
        }).join("")}
      </div>
    </div>`;
  }
  html += `<div class="archive-detail-section">
    <h4>🎮 候选桌游</h4>
    <div class="archive-detail-games">
      ${(archive.candidateGameRefs || []).map((ref) => {
        const status = getGameRefStatus(ref.gameId);
        const deletedClass = status.deleted ? "deleted" : "";
        const loanStatus = status.deleted
          ? `<span class="archive-game-status deleted">已删除</span>`
          : status.onLoan
            ? `<span class="archive-game-status on-loan">借出中</span>`
            : `<span class="archive-game-status available">在馆</span>`;
        const expansions = (ref.expansions || []).map((e) => {
          const game = state.games.find((g) => g.id === ref.gameId);
          const expExists = game && (game.expansions || []).some((ex) => ex.id === e.expansionId);
          return `<span style="font-size:11px;color:var(--lavender);margin-left:12px;${expExists ? "" : "text-decoration:line-through;color:var(--muted);"}">🧩 ${escapeHtml(e.expansionName)}${expExists ? "" : "（已删除）"}</span>`;
        }).join("");
        return `<div class="archive-detail-game-item ${deletedClass}">
          <span>${escapeHtml(ref.gameName)}</span>
          ${expansions}
          ${loanStatus}
        </div>`;
      }).join("")}
    </div>
  </div>`;
  if (archive.finalSelections && archive.finalSelections.length > 0) {
    const hasTables = archive.finalSelections.some((s) => s.tableNumber);
    const selectionsByPlan = {};
    for (const s of archive.finalSelections) {
      const key = s.planId || "single";
      if (!selectionsByPlan[key]) selectionsByPlan[key] = [];
      selectionsByPlan[key].push(s);
    }
    html += `<div class="archive-detail-section">
      <h4>🎯 最终选择</h4>
      <div class="archive-detail-final-selections">`;
    if (hasTables) {
      for (const planId of Object.keys(selectionsByPlan)) {
        const selections = selectionsByPlan[planId];
        const planTotalScore = selections.reduce((sum, s) => sum + (s.score || 0), 0);
        html += `<div class="archive-final-plan">
          <div class="archive-final-plan-head">
            <span class="archive-final-plan-title">${selections.length} 桌分桌方案</span>
            <span class="archive-final-plan-score">总分 ${planTotalScore}</span>
          </div>
          <div class="archive-final-tables">`;
        for (const s of selections) {
          const status = getGameRefStatus(s.gameId);
          const playerNames = (s.tablePlayers || []).map((p) => escapeHtml(p.name)).join("、");
          const expansions = (s.expansionNames || []).length > 0
            ? `<div class="archive-selection-exps">🧩 ${s.expansionNames.map((n) => escapeHtml(n)).join("、")}</div>`
            : "";
          const reasonsHtml = (s.reasons || []).length > 0
            ? `<div class="archive-selection-reasons"><span>推荐理由：</span>${s.reasons.slice(0, 2).map((r) => `<span>• ${escapeHtml(r)}</span>`).join("")}</div>`
            : "";
          html += `
            <div class="archive-final-table ${status.deleted ? "deleted" : ""}">
              <div class="archive-final-table-head">
                <span class="archive-table-number">第${s.tableNumber}桌</span>
                <span class="archive-table-game">${escapeHtml(s.gameName)}</span>
                <span class="archive-table-score">${s.score !== null ? s.score : "—"}分</span>
                ${status.deleted ? `<span class="archive-game-status deleted">已删除</span>` : ""}
              </div>
              ${expansions}
              <div class="archive-table-players">👥 ${s.tablePlayerCount || s.tablePlayers?.length || 0}人：${playerNames || "—"}</div>
              ${reasonsHtml}
            </div>
          `;
        }
        html += `</div></div>`;
      }
    } else {
      for (const s of archive.finalSelections) {
        const status = getGameRefStatus(s.gameId);
        const expansions = (s.expansionNames || []).length > 0
          ? `<span class="archive-selection-exps-inline" style="font-size:11px;color:var(--lavender);margin-left:8px;">🧩 ${s.expansionNames.map((n) => escapeHtml(n)).join("、")}</span>`
          : "";
        const scoreBadge = s.score !== null
          ? `<span class="archive-selection-score" style="margin-left:auto;font-weight:700;color:var(--green);">${s.score}分</span>`
          : "";
        const reasonsHtml = (s.reasons || []).length > 0
          ? `<div class="archive-selection-reasons-single" style="font-size:11px;color:var(--muted);margin-top:4px;">${s.reasons.slice(0, 2).map((r) => escapeHtml(r)).join(" · ")}</div>`
          : "";
        html += `
          <div class="archive-detail-game-item ${status.deleted ? "deleted" : ""}" style="flex-direction:column;align-items:flex-start;gap:4px;">
            <div style="display:flex;align-items:center;width:100%;">
              <span style="font-weight:600;">${escapeHtml(s.gameName)}</span>
              ${expansions}
              ${scoreBadge}
              ${status.deleted ? `<span class="archive-game-status deleted">已删除</span>` : ""}
            </div>
            ${reasonsHtml}
          </div>
        `;
      }
    }
    html += `</div></div>`;
  }
  if (archive.reviewHighlights && archive.reviewHighlights.length > 0) {
    html += `<div class="archive-detail-section">
      <h4>📝 复习重点</h4>
      <div class="archive-detail-highlights">
        ${archive.reviewHighlights.slice(0, 10).map((r) => `
          <div class="archive-detail-highlight-item">
            <strong>${escapeHtml(r.gameName)}</strong>${r.expansionName ? ` · ${escapeHtml(r.expansionName)}` : ""}：
            ${escapeHtml(r.ruleText)}
          </div>
        `).join("")}
        ${archive.reviewHighlights.length > 10 ? `<div style="font-size:11px;color:var(--muted);">... 还有 ${archive.reviewHighlights.length - 10} 条</div>` : ""}
      </div>
    </div>`;
  }
  if (archive.disputeRulings && archive.disputeRulings.length > 0) {
    html += `<div class="archive-detail-section">
      <h4>⚖️ 争议裁定</h4>
      ${archive.disputeRulings.map((d) => `
        <div class="archive-detail-ruling-item">
          <div class="archive-detail-ruling-dispute">争议：${escapeHtml(d.disputeText)}</div>
          <div class="archive-detail-ruling-decision">裁定：${escapeHtml(d.rulingDecision)}</div>
          <div class="archive-detail-ruling-meta">${formatDate(d.rulingDate)} · ${d.rulingParticipants}人参与 · ${escapeHtml(d.gameName)}</div>
        </div>
      `).join("")}
    </div>`;
  }
  if (archive.actualResults) {
    html += `<div class="archive-detail-section">
      <h4>✅ 实际游玩结果</h4>
      <div class="archive-detail-results">
        <div class="archive-detail-results-date">📅 游玩日期：${formatDate(archive.actualResults.playedAt)}</div>
        <div class="archive-detail-results-games">
          ${(archive.actualResults.gamesPlayed || []).map((g) => `
            <div class="archive-detail-results-game">🎮 ${escapeHtml(g.gameName)}${g.notes ? ` <span style="color:var(--muted);font-weight:400;font-size:11px;">— ${escapeHtml(g.notes)}</span>` : ""}</div>
          `).join("")}
        </div>
        ${archive.actualResults.overallNotes ? `<div class="archive-detail-results-notes">${escapeHtml(archive.actualResults.overallNotes)}</div>` : ""}
      </div>
    </div>`;
  }
  const riskWarnings = computeArchiveRiskWarnings(archive);
  if (riskWarnings.length > 0) {
    html += `<div class="archive-detail-section">
      <div class="archive-detail-risk-warnings">
        <h5>⚠️ 当前风险提醒（基于最新数据）</h5>
        <ul>${riskWarnings.map((w) => `<li>${escapeHtml(w)}</li>`).join("")}</ul>
      </div>
    </div>`;
  }
  contentEl.innerHTML = html;
  document.querySelector("#archiveDetailDialog").classList.remove("hidden");
}

function closeArchiveDetail() {
  viewingArchiveId = null;
  document.querySelector("#archiveDetailDialog")?.classList.add("hidden");
}

function deleteArchive(archiveId) {
  showConfirm(
    "删除归档方案",
    "确定要删除这个聚会方案归档吗？此操作不可撤销。",
    () => {
      state.partyArchives = (state.partyArchives || []).filter((a) => a.id !== archiveId);
      saveState();
      renderArchiveList();
      closeArchiveDetail();
      showBackupMessage("归档方案已删除。", "success");
    }
  );
}

function copyFromArchive(archiveId) {
  const archive = (state.partyArchives || []).find((a) => a.id === archiveId);
  if (!archive) return;
  const validCandidateIds = (archive.candidateGameRefs || [])
    .filter((ref) => state.games.some((g) => g.id === ref.gameId))
    .map((ref) => ref.gameId);
  if (validCandidateIds.length === 0) {
    showBackupMessage("无法复制：方案中的候选桌游已全部被删除。", "error");
    return;
  }
  partyState = createEmptyPartyState();
  partyState.name = `${archive.name}（复制）`;
  partyState.playerCount = archive.playerCount;
  partyState.candidateIds = validCandidateIds;
  partyState.sourceArchiveId = archiveId;
  partyState.finalSelectionIds = [];
  partyState.players = (archive.players || []).map((p, i) => {
    const familiarIds = (p.familiarGameIds || []).filter((id) => state.games.some((g) => g.id === id));
    return {
      id: generateId(),
      index: i,
      name: p.name,
      dislikedComplexity: [...(p.dislikedComplexity || [])],
      familiarGameIds: familiarIds
    };
  });
  syncPartyPlayersCount();
  els.partyIntro.classList.add("hidden");
  els.partyConfigView.classList.remove("hidden");
  els.partyResultView.classList.add("hidden");
  updatePartyStatusLabel("配置中（基于归档）");
  showPartyStep(3);
  closeArchiveDetail();
  els.partyNameInput.value = partyState.name;
  els.partyPlayerCountInput.value = partyState.playerCount;
  const riskWarnings = computeArchiveRiskWarnings(archive);
  if (riskWarnings.length > 0) {
    showBackupMessage(`已基于归档创建新聚会配置。注意：${riskWarnings.length} 条风险提醒，请在方案详情中查看。`, "error");
  } else {
    showBackupMessage("已基于归档创建新聚会配置，请确认并生成推荐。", "success");
  }
}

function openActualResultDialog(archiveId) {
  const archive = (state.partyArchives || []).find((a) => a.id === archiveId);
  if (!archive) return;
  recordingArchiveId = archiveId;
  const dateInput = document.querySelector("#actualResultDateInput");
  const notesInput = document.querySelector("#actualResultNotesInput");
  const gamesListEl = document.querySelector("#actualResultGamesList");
  if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
  if (notesInput) notesInput.value = archive.actualResults?.overallNotes || "";
  const games = (archive.candidateGameRefs || []).map((ref) => {
    const status = getGameRefStatus(ref.gameId);
    return {
      gameId: ref.gameId,
      gameName: ref.gameName,
      deleted: status.deleted,
      wasPlayed: archive.actualResults?.gamesPlayed?.some((g) => g.gameId === ref.gameId) || false,
      notes: archive.actualResults?.gamesPlayed?.find((g) => g.gameId === ref.gameId)?.notes || ""
    };
  });
  if (gamesListEl) {
    gamesListEl.innerHTML = games.map((g) => `
      <label class="actual-result-game-item ${g.wasPlayed ? "checked" : ""}" data-actual-game="${g.gameId}">
        <input type="checkbox" data-actual-game-check="${g.gameId}" ${g.wasPlayed ? "checked" : ""} ${g.deleted ? "disabled" : ""} />
        <span class="actual-result-game-name" style="${g.deleted ? "text-decoration:line-through;color:var(--muted);" : ""}">${escapeHtml(g.gameName)}${g.deleted ? "（已删除）" : ""}</span>
        <input type="text" class="actual-result-game-notes" data-actual-game-notes="${g.gameId}" placeholder="备注" value="${escapeHtml(g.notes)}" />
      </label>
    `).join("");
  }
  closeArchiveDetail();
  document.querySelector("#archiveActualResultDialog")?.classList.remove("hidden");
}

function closeActualResultDialog() {
  recordingArchiveId = null;
  document.querySelector("#archiveActualResultDialog")?.classList.add("hidden");
}

function handleActualResultSubmit(e) {
  e.preventDefault();
  if (!recordingArchiveId) return;
  const archive = (state.partyArchives || []).find((a) => a.id === recordingArchiveId);
  if (!archive) return;
  const dateInput = document.querySelector("#actualResultDateInput");
  const notesInput = document.querySelector("#actualResultNotesInput");
  const playedAt = dateInput?.value || new Date().toISOString().slice(0, 10);
  const overallNotes = notesInput?.value || "";
  const gamesPlayed = [];
  document.querySelectorAll("[data-actual-game-check]").forEach((cb) => {
    if (cb.checked) {
      const gameId = cb.dataset.actualGameCheck;
      const gameName = archive.candidateGameRefs?.find((r) => r.gameId === gameId)?.gameName || "未知桌游";
      const notesEl = document.querySelector(`[data-actual-game-notes="${gameId}"]`);
      gamesPlayed.push({
        gameId,
        gameName,
        notes: notesEl?.value || ""
      });
    }
  });
  archive.actualResults = {
    playedAt,
    gamesPlayed,
    overallNotes
  };
  saveState();
  closeActualResultDialog();
  renderArchiveList();
  showBackupMessage("实际游玩结果已保存。", "success");
}

function getArchivesReferencingGame(gameId) {
  return (state.partyArchives || []).filter((a) =>
    (a.candidateGameRefs || []).some((r) => r.gameId === gameId) ||
    (a.finalSelections || []).some((s) => s.gameId === gameId) ||
    (a.reviewHighlights || []).some((h) => h.gameId === gameId) ||
    (a.disputeRulings || []).some((d) => d.gameId === gameId)
  );
}

function getArchivesReferencingExpansion(expansionId) {
  return (state.partyArchives || []).filter((a) =>
    (a.candidateGameRefs || []).some((r) =>
      (r.expansions || []).some((e) => e.expansionId === expansionId)
    )
  );
}

document.querySelector("#archiveList")?.addEventListener("click", (e) => {
  const deleteBtn = e.target.closest("[data-archive-delete]");
  if (deleteBtn) {
    e.stopPropagation();
    deleteArchive(deleteBtn.dataset.archiveDelete);
    return;
  }
  const card = e.target.closest("[data-archive-id]");
  if (card) {
    renderArchiveDetail(card.dataset.archiveId);
    return;
  }
});

document.querySelector("#archiveDetailCloseBtn")?.addEventListener("click", closeArchiveDetail);
document.querySelector("#archiveDetailCancelBtn")?.addEventListener("click", closeArchiveDetail);

document.querySelector("#archiveDetailCopyBtn")?.addEventListener("click", () => {
  if (viewingArchiveId) copyFromArchive(viewingArchiveId);
});

document.querySelector("#archiveDetailRecordBtn")?.addEventListener("click", () => {
  if (viewingArchiveId) openActualResultDialog(viewingArchiveId);
});

document.querySelector("#archiveDetailDeleteBtn")?.addEventListener("click", () => {
  if (viewingArchiveId) deleteArchive(viewingArchiveId);
});

document.querySelector("#archiveActualResultCloseBtn")?.addEventListener("click", closeActualResultDialog);
document.querySelector("#actualResultCancelBtn")?.addEventListener("click", closeActualResultDialog);
document.querySelector("#archiveActualResultForm")?.addEventListener("submit", handleActualResultSubmit);

document.querySelector("#archiveActualResultDialog")?.addEventListener("click", (e) => {
  const gameItem = e.target.closest(".actual-result-game-item");
  if (gameItem) {
    const cb = gameItem.querySelector('input[type="checkbox"]');
    if (cb && !cb.disabled && e.target !== cb) {
      cb.checked = !cb.checked;
      gameItem.classList.toggle("checked", cb.checked);
    }
  }
});

document.querySelector("#archiveActualResultDialog")?.addEventListener("change", (e) => {
  const cb = e.target.closest('[data-actual-game-check]');
  if (cb) {
    const item = cb.closest('.actual-result-game-item');
    if (item) item.classList.toggle("checked", cb.checked);
  }
});

document.querySelector("#partySaveArchiveBtn")?.addEventListener("click", () => {
  if (partyState) {
    savePartyArchive();
  }
});

function renderArchivePanel() {
  renderArchiveList();
}

renderArchivePanel();
