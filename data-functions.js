const SCHEMA_VERSION = 5;

const RULE_TAGS = ["易错结算", "开局流程", "新人教学", "扩展专属", "计分终局"];

const REVIEW_STATUS = {
  UNMARKED: null,
  MASTERED: "mastered",
  STILL_FORGET: "still_forget",
  MUST_REVIEW: "must_review"
};

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

function generateId() {
  if (typeof globalThis !== "undefined" && globalThis.crypto && globalThis.crypto.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "id-" + Date.now() + "-" + Math.random().toString(36).slice(2, 11);
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

function ruleTags(rule) {
  if (!rule || typeof rule !== "object") return [];
  return Array.isArray(rule.tags) ? rule.tags : [];
}

function normalizeExpansion(exp) {
  if (!exp || typeof exp !== "object") return null;
  return {
    id: exp.id || generateId(),
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
          id: r.id || generateId(),
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

function getAllRules(game, expansionId) {
  let container = null;
  if (!game) return [];
  if (!expansionId) {
    container = game;
  } else {
    container = (game.expansions || []).find((e) => e.id === expansionId) || null;
  }
  if (!container) return [];
  return [...(container.forgets || []), ...(container.disputes || []), ...(container.setup || []), ...(container.scoring || [])];
}

function getAllRulesIncludingExpansions(game) {
  if (!game) return [];
  const rules = [...getAllRules(game, "")];
  for (const exp of game.expansions || []) {
    rules.push(...getAllRules(game, exp.id));
  }
  return rules;
}

function migrateRuleArrayV0ToV1(rules, defaultDate = null) {
  if (!Array.isArray(rules)) return [];
  const baseDate = defaultDate || new Date().toISOString();
  return rules.map((rule) => {
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

function analyzeImportData(localGames, importGames) {
  const items = [];
  const localGamesMap = new Map();
  for (const g of localGames) {
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

function executeImport(localGames, importItems, globalStrategy, individualStrategies) {
  const processedGames = [];
  const localGamesMap = new Map();
  const idMappings = {
    gameIdMap: {},
    expansionIdMap: {}
  };
  for (const g of localGames) {
    localGamesMap.set(g.name.trim().toLowerCase(), g);
  }
  const processedNames = new Set();
  for (const item of importItems) {
    const strategy = individualStrategies[item.id] || globalStrategy;
    const key = item.name.trim().toLowerCase();
    processedNames.add(key);
    if (item.status === IMPORT_ITEM_STATUS.SKIP) {
      processedGames.push({ ...item.localGame });
      idMappings.gameIdMap[item.importGame.id] = item.localGame.id;
      for (const exp of (item.localGame.expansions || [])) {
        const importExp = (item.importGame.expansions || []).find((ie) => ie.name.trim().toLowerCase() === exp.name.trim().toLowerCase());
        if (importExp) {
          idMappings.expansionIdMap[importExp.id] = exp.id;
        }
      }
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
  for (const g of localGames) {
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

function validateImportData(parsed) {
  const games = Array.isArray(parsed) ? parsed : (parsed.games || []);
  if (!Array.isArray(games)) {
    throw new Error("数据格式错误：games 字段必须是数组。");
  }
  for (const game of games) {
    if (!game || typeof game !== "object") {
      throw new Error("数据格式错误：游戏条目必须是对象。");
    }
    if (!game.name || typeof game.name !== "string" || !game.name.trim()) {
      throw new Error("数据格式错误：游戏条目缺少名称字段。");
    }
  }
  return games;
}

const moduleExports = {
  SCHEMA_VERSION,
  RULE_TAGS,
  REVIEW_STATUS,
  IMPORT_ITEM_STATUS,
  MERGE_STRATEGY,
  generateId,
  isValidDateString,
  normalizeLastPlayed,
  getDefaultLastPlayed,
  createRuleCard,
  isRuleCardV1,
  isRuleCardV2,
  normalizeRule,
  normalizeRuleArray,
  ruleText,
  ruleStatus,
  ruleTags,
  normalizeExpansion,
  normalizeDisputeRulings,
  normalizeExpansionArray,
  ensureDisputeRulingEntry,
  syncDisputeRulingsForGame,
  getAllRules,
  getAllRulesIncludingExpansions,
  migrateRuleArrayV0ToV1,
  migrateGameV0ToV1,
  migrateV0ToV1,
  migrateV1ToV2,
  migrateV2ToV3,
  migrateV3ToV4,
  migrateV4ToV5,
  runMigrations,
  normalizePartyArchive,
  normalizePartyArchiveArray,
  normalizeImportGame,
  isSameGame,
  areGamesIdentical,
  hasConflict,
  detectDifferences,
  analyzeImportData,
  mergeRuleArrays,
  mergeExpansions,
  mergeDisputeRulings,
  mergeLoanRecords,
  mergeGames,
  executeImport,
  getImportStats,
  validateImportData
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = moduleExports;
}

if (typeof window !== "undefined") {
  window.BoardGameData = moduleExports;
}
