const assert = require("assert");
const path = require("path");
const F = require(path.join(__dirname, "data-functions.js"));

const {
  SCHEMA_VERSION,
  RULE_TAGS,
  REVIEW_STATUS,
  IMPORT_ITEM_STATUS,
  MERGE_STRATEGY
} = F;

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    failures.push({ name, error: e });
    console.log(`  ✗ ${name}`);
    console.log(`      ${e.message}`);
  }
}

function suite(name, fn) {
  console.log(`\n▶ ${name}`);
  fn();
}

function deepEqual(actual, expected, msg) {
  assert.deepStrictEqual(actual, expected, msg || `期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`);
}

function equal(actual, expected, msg) {
  assert.strictEqual(actual, expected, msg || `期望 ${expected}，实际 ${actual}`);
}

function ok(value, msg) {
  assert.ok(value, msg || `期望真值，实际 ${value}`);
}

function notOk(value, msg) {
  assert.ok(!value, msg || `期望假值，实际 ${value}`);
}

function match(str, regex, msg) {
  if (!regex.test(str)) {
    throw new Error(msg || `期望 "${str}" 匹配正则 ${regex}`);
  }
}

// ============================================================
// Suite 1: 规则标签归一化 normalizeRule / normalizeRuleArray
// ============================================================
suite("1. 规则标签归一化", () => {
  test("字符串规则应转换为完整对象并补全默认字段", () => {
    const result = F.normalizeRule("商站建造前先确认道路");
    equal(typeof result.id, "string");
    equal(result.text, "商站建造前先确认道路");
    equal(result.status, REVIEW_STATUS.UNMARKED);
    equal(typeof result.createdAt, "string");
    deepEqual(result.tags, []);
  });

  test("字符串规则非空值处理：空字符串 → text 为空", () => {
    const result = F.normalizeRule("");
    equal(result.text, "");
    ok(Array.isArray(result.tags));
  });

  test("V1 规则对象（无 tags）→ 补 tags 为 []", () => {
    const input = {
      id: "old-id",
      text: "旧版规则",
      status: REVIEW_STATUS.MASTERED,
      createdAt: "2025-01-01T00:00:00.000Z"
    };
    const result = F.normalizeRule(input);
    equal(result.id, "old-id");
    equal(result.text, "旧版规则");
    equal(result.status, REVIEW_STATUS.MASTERED);
    equal(result.createdAt, "2025-01-01T00:00:00.000Z");
    deepEqual(result.tags, []);
  });

  test("规则对象含非法标签 → 过滤，只保留白名单标签", () => {
    const input = {
      id: "id-tags",
      text: "带标签的规则",
      createdAt: "2025-01-01T00:00:00.000Z",
      tags: ["易错结算", "非法标签1", "新人教学", "未知标签"]
    };
    const result = F.normalizeRule(input);
    deepEqual(result.tags.sort(), ["新人教学", "易错结算"]);
    RULE_TAGS.forEach(t => {
      const onlyInWhiteList = result.tags.every(tag => RULE_TAGS.includes(tag));
      ok(onlyInWhiteList, "过滤后的标签应全部在白名单中");
    });
  });

  test("所有白名单标签都能正常通过", () => {
    const input = {
      id: "x",
      text: "t",
      createdAt: "2025-01-01T00:00:00.000Z",
      tags: [...RULE_TAGS]
    };
    const result = F.normalizeRule(input);
    deepEqual(result.tags.sort(), [...RULE_TAGS].sort());
  });

  test("V2 规则对象（有 tags）→ 保留原样", () => {
    const input = {
      id: "v2-id",
      text: "V2 规则",
      status: REVIEW_STATUS.MUST_REVIEW,
      createdAt: "2025-01-01T00:00:00.000Z",
      tags: ["开局流程", "计分终局"]
    };
    const result = F.normalizeRule(input);
    deepEqual(result, {
      id: "v2-id",
      text: "V2 规则",
      status: REVIEW_STATUS.MUST_REVIEW,
      createdAt: "2025-01-01T00:00:00.000Z",
      tags: ["开局流程", "计分终局"]
    });
  });

  test("normalizeRuleArray 非数组输入返回空数组", () => {
    deepEqual(F.normalizeRuleArray(null), []);
    deepEqual(F.normalizeRuleArray(undefined), []);
    deepEqual(F.normalizeRuleArray("abc"), []);
    deepEqual(F.normalizeRuleArray(123), []);
    deepEqual(F.normalizeRuleArray({}), []);
  });

  test("normalizeRuleArray 混合字符串和对象数组", () => {
    const result = F.normalizeRuleArray([
      "字符串规则A",
      { id: "obj1", text: "对象规则B", status: REVIEW_STATUS.STILL_FORGET, createdAt: "2025-02-01T00:00:00.000Z" },
      "字符串规则C"
    ]);
    equal(result.length, 3);
    equal(result[0].text, "字符串规则A");
    equal(result[1].id, "obj1");
    equal(result[1].status, REVIEW_STATUS.STILL_FORGET);
    equal(result[2].text, "字符串规则C");
  });

  test("规则 status 为 null/undefined 时规范化为 UNMARKED (null)", () => {
    const r1 = F.normalizeRule({ id: "1", text: "t", createdAt: "2025-01-01T00:00:00.000Z", status: null });
    const r2 = F.normalizeRule({ id: "2", text: "t", createdAt: "2025-01-01T00:00:00.000Z", status: undefined });
    equal(r1.status, null);
    equal(r2.status, null);
  });
});

// ============================================================
// Suite 2: 旧 schema 数据迁移到当前 SCHEMA_VERSION
// ============================================================
suite("2. 旧 Schema 数据迁移 (runMigrations)", () => {
  test("runMigrations 空/非法输入返回默认结构", () => {
    const r1 = F.runMigrations(null);
    deepEqual(r1.schemaVersion, SCHEMA_VERSION);
    deepEqual(r1.games, []);

    const r2 = F.runMigrations("not object");
    deepEqual(r2.schemaVersion, SCHEMA_VERSION);

    const r3 = F.runMigrations(123);
    deepEqual(r3.schemaVersion, SCHEMA_VERSION);
  });

  test("V0 (无 schemaVersion) → V5: 字符串规则转换为卡片，lastPlayed 规范化", () => {
    const v0Data = {
      games: [
        {
          name: "奥尔良",
          minPlayers: 2,
          maxPlayers: 4,
          duration: 90,
          complexity: "中",
          lastPlayed: "2025-11-20",
          forgets: ["商站建造前先确认道路", "袋中随从抽完后继续抽"],
          disputes: ["事件顺序和玩家动作结算先后"],
          setup: ["按人数放置货物板块"],
          scoring: ["货物分数", "商站加分"],
          expansions: [
            {
              name: "贸易与阴谋",
              forgets: ["阴谋卡使用后立即结算"],
              disputes: ["贸易卡能否在他人回合使用"],
              setup: [],
              scoring: []
            }
          ]
        }
      ]
    };
    const migrated = F.runMigrations(v0Data);

    equal(migrated.schemaVersion, SCHEMA_VERSION);
    equal(migrated.games.length, 1);

    const game = migrated.games[0];
    equal(typeof game.id, "string");
    equal(game.name, "奥尔良");
    equal(game.lastPlayed, "2025-11-20");

    equal(game.forgets.length, 2);
    equal(typeof game.forgets[0].id, "string");
    equal(game.forgets[0].text, "商站建造前先确认道路");
    equal(game.forgets[0].status, null);
    equal(typeof game.forgets[0].createdAt, "string");
    deepEqual(game.forgets[0].tags, []);

    equal(game.disputes.length, 1);
    equal(game.disputes[0].text, "事件顺序和玩家动作结算先后");

    equal(game.expansions.length, 1);
    equal(game.expansions[0].name, "贸易与阴谋");
    equal(game.expansions[0].forgets.length, 1);
    equal(game.expansions[0].forgets[0].text, "阴谋卡使用后立即结算");

    equal(typeof game.expansions[0].id, "string");

    ok(Array.isArray(game.loanRecords), "V0→V3 应补 loanRecords");
    ok(Array.isArray(game.changeHistory), "V0→V4 应补 changeHistory");
    ok(Array.isArray(game.coverHistory), "V0→V4 应补 coverHistory");
    ok(Array.isArray(migrated.partyArchives), "V0→V5 应补 partyArchives");
  });

  test("V0 规则混合字符串和部分结构化对象 → 都能正确迁移", () => {
    const v0Data = {
      schemaVersion: 0,
      games: [{
        name: "混合规则游戏",
        forgets: [
          "纯字符串规则1",
          { text: "只有 text", status: REVIEW_STATUS.MASTERED },
          { id: "pre-id", text: "有 id 和 text", createdAt: "2025-03-01T00:00:00.000Z", tags: ["非法标签"] }
        ],
        disputes: [],
        setup: [],
        scoring: []
      }]
    };
    const migrated = F.runMigrations(v0Data);
    equal(migrated.schemaVersion, SCHEMA_VERSION);
    const rules = migrated.games[0].forgets;
    equal(rules.length, 3);

    equal(rules[0].text, "纯字符串规则1");
    ok(typeof rules[0].id === "string");

    equal(rules[1].text, "只有 text");
    equal(rules[1].status, REVIEW_STATUS.MASTERED);

    equal(rules[2].id, "pre-id");
    equal(rules[2].text, "有 id 和 text");
    equal(rules[2].createdAt, "2025-03-01T00:00:00.000Z");
    deepEqual(rules[2].tags, []);
  });

  test("V1 (schemaVersion=1) → V5: 所有规则应补 tags: []", () => {
    const v1Data = {
      schemaVersion: 1,
      games: [{
        name: "盖亚计划",
        forgets: [
          { id: "r1", text: "联邦连接", status: REVIEW_STATUS.STILL_FORGET, createdAt: "2025-01-01T00:00:00.000Z" }
        ],
        disputes: [
          { id: "r2", text: "被动充能", status: REVIEW_STATUS.UNMARKED, createdAt: "2025-01-01T00:00:00.000Z" }
        ],
        setup: [],
        scoring: [],
        expansions: [{
          name: "失落的种族",
          forgets: [{ id: "r3", text: "扩展规则1", status: REVIEW_STATUS.UNMARKED, createdAt: "2025-01-01T00:00:00.000Z" }],
          disputes: [],
          setup: [],
          scoring: []
        }]
      }]
    };
    const migrated = F.runMigrations(v1Data);
    equal(migrated.schemaVersion, SCHEMA_VERSION);

    const g = migrated.games[0];
    deepEqual(g.forgets[0].tags, [], "基础游戏 forgets 应有 tags");
    deepEqual(g.disputes[0].tags, [], "基础游戏 disputes 应有 tags");
    deepEqual(g.expansions[0].forgets[0].tags, [], "扩展包 rules 应有 tags");

    ok(Array.isArray(g.loanRecords), "V1→V3 应补 loanRecords");
    ok(Array.isArray(migrated.partyArchives), "V1→V5 应补 partyArchives");
  });

  test("V2 (schemaVersion=2) → V5: 借阅记录补字段", () => {
    const v2Data = {
      schemaVersion: 2,
      games: [{
        name: "花砖物语",
        forgets: [],
        disputes: [],
        setup: [],
        scoring: [],
        loanRecords: [
          { borrower: "张三", borrowedAt: "2025-09-01" },
          { id: "l2", borrower: "李四", borrowedAt: "2025-10-01", expectedReturnAt: "2025-10-15", notes: "完好无损", returnedAt: "2025-10-14" },
          {},
          "not object"
        ]
      }]
    };
    const migrated = F.runMigrations(v2Data);
    equal(migrated.schemaVersion, SCHEMA_VERSION);

    const loans = migrated.games[0].loanRecords;
    ok(Array.isArray(loans));
    equal(loans.length, 4);

    const l1 = loans[0];
    ok(typeof l1.id === "string", "缺 id 应补生成 id");
    equal(l1.borrower, "张三");
    equal(l1.borrowedAt, "2025-09-01");
    equal(l1.expectedReturnAt, "", "缺 expectedReturnAt 应补空串");
    equal(l1.notes, "", "缺 notes 应补空串");
    equal(l1.returnedAt, null, "缺 returnedAt 应补 null");

    const l2 = loans[1];
    equal(l2.id, "l2", "已有 id 不应改变");
    equal(l2.borrower, "李四");
    equal(l2.notes, "完好无损");
    equal(l2.returnedAt, "2025-10-14");

    const l3 = loans[2];
    ok(typeof l3.id === "string");
    equal(l3.borrower, "", "空对象 borrower 应为空串");
    equal(typeof l3.borrowedAt, "string", "缺 borrowedAt 应补日期串");
    equal(l3.returnedAt, null);

    const l4 = loans[3];
    equal(l4, "not object", "非 object 元素保持原样");

    ok(Array.isArray(migrated.partyArchives), "V2→V5 应补 partyArchives");
  });

  test("V3 (schemaVersion=3) → V5: changeHistory, coverHistory, globalUndoStack 默认值", () => {
    const v3Data = {
      schemaVersion: 3,
      games: [{
        name: "大西铁路",
        forgets: [],
        disputes: [],
        setup: [],
        scoring: [],
        cover: "data:image/png;base64,FAKECOVER",
        loanRecords: []
      }, {
        name: "另一个游戏",
        forgets: [],
        disputes: [],
        setup: [],
        scoring: [],
        changeHistory: [{ action: "manual" }],
        coverHistory: [{ id: "ch1" }]
      }]
    };
    const migrated = F.runMigrations(v3Data);
    equal(migrated.schemaVersion, SCHEMA_VERSION);

    const g1 = migrated.games[0];
    deepEqual(g1.changeHistory, [], "缺 changeHistory 应补空数组");
    ok(Array.isArray(g1.coverHistory));
    equal(g1.coverHistory.length, 1, "有 cover 应自动记录初始封面");
    equal(g1.coverHistory[0].cover, "data:image/png;base64,FAKECOVER");
    match(g1.coverHistory[0].note || "", /迁移/);

    const g2 = migrated.games[1];
    deepEqual(g2.changeHistory, [{ action: "manual" }], "已有 changeHistory 不变");
    deepEqual(g2.coverHistory, [{ id: "ch1" }], "已有 coverHistory 不变，不补初始封面");

    deepEqual(migrated.globalUndoStack, [], "根级 globalUndoStack 缺省补空数组");
    ok(Array.isArray(migrated.partyArchives), "V3→V5 应补 partyArchives");
  });

  test("V4 (schemaVersion=4) → V5: partyArchives 默认值", () => {
    const v4Without = {
      schemaVersion: 4,
      games: []
    };
    const m1 = F.runMigrations(v4Without);
    equal(m1.schemaVersion, SCHEMA_VERSION);
    deepEqual(m1.partyArchives, [], "缺 partyArchives 应补空数组");

    const archive = {
      id: "a1",
      name: "周五桌游夜",
      createdAt: "2025-11-01T20:00:00.000Z",
      playerCount: 4
    };
    const v4With = {
      schemaVersion: 4,
      games: [],
      partyArchives: [archive]
    };
    const m2 = F.runMigrations(v4With);
    equal(m2.partyArchives.length, 1);
    equal(m2.partyArchives[0].name, "周五桌游夜");
  });

  test("已是当前 SCHEMA_VERSION 应原样返回（无重复迁移）", () => {
    const current = {
      schemaVersion: SCHEMA_VERSION,
      games: [{ id: "g1", name: "测试游戏" }],
      partyArchives: [{ id: "a1", name: "方案" }],
      globalUndoStack: [{ action: "x" }],
      customField: "保留"
    };
    const result = F.runMigrations(current);
    equal(result.schemaVersion, SCHEMA_VERSION);
    equal(result.games[0].id, "g1");
    equal(result.partyArchives.length, 1);
    equal(result.globalUndoStack.length, 1);
    equal(result.customField, "保留");
  });

  test("migrateRuleArrayV0ToV1: 规则对象缺 createdAt 使用传入的默认日期", () => {
    const defaultDate = "2025-06-01T00:00:00.000Z";
    const rules = [
      "字符串规则",
      { id: "r1", text: "对象规则" }
    ];
    const result = F.migrateRuleArrayV0ToV1(rules, defaultDate);
    equal(result[0].createdAt, defaultDate);
    equal(result[1].createdAt, defaultDate);
  });
});

// ============================================================
// Suite 3: 借阅记录补字段 (V2→V3 细节)
// ============================================================
suite("3. 借阅记录补字段 (migrateV2ToV3)", () => {
  test("非 object / falsy record 不做修改，数组被当作 object 补字段", () => {
    const data = {
      schemaVersion: 2,
      games: [{
        name: "G",
        forgets: [], disputes: [], setup: [], scoring: [],
        loanRecords: [null, undefined, 123, "string", true, false]
      }]
    };
    const migrated = F.migrateV2ToV3(data);
    const loans = migrated.games[0].loanRecords;
    equal(loans[0], null, "null 保持");
    equal(loans[1], undefined, "undefined 保持");
    equal(loans[2], 123, "number 保持");
    equal(loans[3], "string", "string 保持");
    equal(loans[4], true, "true 保持（truthy 但 typeof 是 boolean）");
    equal(loans[5], false, "false 保持（falsy）");
  });

  test("record.borrowedAt 非字符串 → 补默认 YYYY-MM-DD", () => {
    const data = {
      schemaVersion: 2,
      games: [{
        name: "G",
        forgets: [], disputes: [], setup: [], scoring: [],
        loanRecords: [
          { borrower: "A", borrowedAt: 12345 },
          { borrower: "B", borrowedAt: null }
        ]
      }]
    };
    const migrated = F.migrateV2ToV3(data);
    const l1 = migrated.games[0].loanRecords[0];
    const l2 = migrated.games[0].loanRecords[1];
    match(l1.borrowedAt, /^\d{4}-\d{2}-\d{2}$/);
    match(l2.borrowedAt, /^\d{4}-\d{2}-\d{2}$/);
  });

  test("record.returnedAt 显式设为 '' → 默认 null", () => {
    const data = {
      schemaVersion: 2,
      games: [{
        name: "G",
        forgets: [], disputes: [], setup: [], scoring: [],
        loanRecords: [{ borrower: "A", borrowedAt: "2025-01-01", returnedAt: "" }]
      }]
    };
    const migrated = F.migrateV2ToV3(data);
    equal(migrated.games[0].loanRecords[0].returnedAt, null);
  });

  test("缺 loanRecords 字段 → 补空数组", () => {
    const data = {
      schemaVersion: 2,
      games: [{
        name: "G",
        forgets: [], disputes: [], setup: [], scoring: []
      }]
    };
    const migrated = F.migrateV2ToV3(data);
    deepEqual(migrated.games[0].loanRecords, []);
  });
});

// ============================================================
// Suite 4: partyArchives 默认值 (V4→V5)
// ============================================================
suite("4. partyArchives 默认值 (migrateV4ToV5)", () => {
  test("partyArchives 为 null / 非数组 → 重置为空数组", () => {
    deepEqual(F.migrateV4ToV5({ schemaVersion: 4, partyArchives: null }).partyArchives, []);
    deepEqual(F.migrateV4ToV5({ schemaVersion: 4, partyArchives: "abc" }).partyArchives, []);
    deepEqual(F.migrateV4ToV5({ schemaVersion: 4, partyArchives: 123 }).partyArchives, []);
    deepEqual(F.migrateV4ToV5({ schemaVersion: 4 }).partyArchives, []);
  });

  test("已有的 partyArchives 数组原样保留 + schemaVersion 升级", () => {
    const archives = [{ id: "a", name: "N" }, { id: "b", name: "M" }];
    const result = F.migrateV4ToV5({ schemaVersion: 4, partyArchives: archives });
    deepEqual(result.partyArchives, archives);
    equal(result.schemaVersion, SCHEMA_VERSION);
  });

  test("normalizePartyArchiveArray: 缺字段补默认值", () => {
    const archives = [
      null,
      "not object",
      {},
      { name: "方案A", players: [{ name: "P1" }] },
      { name: "方案B", candidateGameRefs: [{ gameId: "g1", expansions: null }] }
    ];
    const result = F.normalizePartyArchiveArray(archives);
    equal(result.length, 3, "null/字符串被过滤，三个对象正常");
    equal(typeof result[0].id, "string");
    equal(result[0].name, "");
    equal(result[0].playerCount, 4);
    deepEqual(result[0].players, []);
    deepEqual(result[0].finalSelections, []);

    equal(result[1].name, "方案A");
    equal(result[1].players.length, 1);
    equal(result[1].players[0].name, "P1");
    equal(typeof result[1].players[0].id, "string");

    equal(result[2].candidateGameRefs.length, 1);
    deepEqual(result[2].candidateGameRefs[0].expansions, []);
  });
});

// ============================================================
// Suite 5: 导入时同名桌游分支 (analyzeImportData)
// ============================================================
suite("5. 导入同名桌游：状态识别 (analyzeImportData)", () => {
  const makeSimpleGame = (name, overrides = {}) => F.normalizeImportGame({
    name,
    minPlayers: 2,
    maxPlayers: 4,
    duration: 60,
    complexity: "中",
    lastPlayed: "2025-01-01",
    forgets: [],
    disputes: [],
    setup: [],
    scoring: [],
    loanRecords: [],
    expansions: [],
    disputeRulings: [],
    ...overrides
  });

  test("NEW：本地无同名游戏 → 状态 NEW", () => {
    const local = [makeSimpleGame("奥尔良")];
    const imported = [makeSimpleGame("盖亚计划")];
    const items = F.analyzeImportData(local, imported);
    equal(items.length, 1);
    equal(items[0].status, IMPORT_ITEM_STATUS.NEW);
    equal(items[0].name, "盖亚计划");
    equal(items[0].localGame, null);
  });

  test("SKIP：本地与导入数据完全一致（areGamesIdentical）→ SKIP", () => {
    const g = makeSimpleGame("花砖物语", {
      forgets: ["每轮先铺墙"],
      disputes: [{ id: "d1", text: "同色砖限制", status: REVIEW_STATUS.UNMARKED, createdAt: "2025-01-01T00:00:00.000Z", tags: [] }]
    });
    const local = [g];
    const imported = [JSON.parse(JSON.stringify(g))];
    imported[0].id = "different-id-but-same-content";
    const items = F.analyzeImportData(local, imported);
    equal(items.length, 1);
    equal(items[0].status, IMPORT_ITEM_STATUS.SKIP, "内容完全相同应 SKIP");
    ok(items[0].localGame !== null);
  });

  test("OVERWRITE：有差异但无冲突（仅一方有内容）→ OVERWRITE", () => {
    const local = [makeSimpleGame("大西铁路", { forgets: ["本地独有规则"] })];
    const imported = [makeSimpleGame("大西铁路", { forgets: ["本地独有规则"] })];
    imported[0].duration = 120;
    const items = F.analyzeImportData(local, imported);
    equal(items.length, 1);
    equal(items[0].status, IMPORT_ITEM_STATUS.OVERWRITE,
      "仅元数据不同且规则无冲突应为 OVERWRITE");
  });

  test("CONFLICT：双方都有各自独有的规则 → CONFLICT", () => {
    const local = [makeSimpleGame("冷战热斗", {
      forgets: ["本地独有规则A", "共享规则X"]
    })];
    const imported = [makeSimpleGame("冷战热斗", {
      forgets: ["导入独有规则B", "共享规则X"]
    })];
    const items = F.analyzeImportData(local, imported);
    equal(items.length, 1);
    equal(items[0].status, IMPORT_ITEM_STATUS.CONFLICT,
      "双方都有独有规则应为 CONFLICT");
  });

  test("CONFLICT：双方都有各自独有的扩展包 → CONFLICT", () => {
    const local = [makeSimpleGame("殖民火星", {
      expansions: [{ name: "金星下一期", forgets: [], disputes: [], setup: [], scoring: [] }]
    })];
    const imported = [makeSimpleGame("殖民火星", {
      expansions: [{ name: "殖民地", forgets: [], disputes: [], setup: [], scoring: [] }]
    })];
    const items = F.analyzeImportData(local, imported);
    equal(items[0].status, IMPORT_ITEM_STATUS.CONFLICT,
      "双方都有独有扩展应为 CONFLICT");
  });

  test("CONFLICT：双方都有各自独有的借阅记录 → CONFLICT", () => {
    const local = [makeSimpleGame("富饶之城", {
      loanRecords: [{ id: "l1", borrower: "甲", borrowedAt: "2025-01-01", expectedReturnAt: "", notes: "", returnedAt: null }]
    })];
    const imported = [makeSimpleGame("富饶之城", {
      loanRecords: [{ id: "l2", borrower: "乙", borrowedAt: "2025-02-01", expectedReturnAt: "", notes: "", returnedAt: null }]
    })];
    const items = F.analyzeImportData(local, imported);
    equal(items[0].status, IMPORT_ITEM_STATUS.CONFLICT,
      "双方都有独有借阅记录应为 CONFLICT");
  });

  test("CONFLICT：封面都存在且不同 → CONFLICT", () => {
    const local = [makeSimpleGame("星域奇航", { cover: "cover-local-xxxx" })];
    const imported = [makeSimpleGame("星域奇航", { cover: "cover-imported-yyyy" })];
    const items = F.analyzeImportData(local, imported);
    equal(items[0].status, IMPORT_ITEM_STATUS.CONFLICT,
      "都有封面且不同应为 CONFLICT");
  });

  test("OVERWRITE：仅一方有封面 → 非冲突", () => {
    const local = [makeSimpleGame("璀璨宝石", { cover: "cover" })];
    const imported = [makeSimpleGame("璀璨宝石", { cover: "" })];
    const items = F.analyzeImportData(local, imported);
    equal(items[0].status, IMPORT_ITEM_STATUS.OVERWRITE);
  });

  test("同名判断大小写不敏感、忽略前后空白", () => {
    const local = [makeSimpleGame("  Orléans  ")];
    const imported = [makeSimpleGame("orléans")];
    const items = F.analyzeImportData(local, imported);
    equal(items[0].status, IMPORT_ITEM_STATUS.SKIP, "大小写+空格归一化相同应为 SKIP");
  });

  test("getImportStats 应正确统计四类数量", () => {
    const local = [
      makeSimpleGame("游戏A"),
      makeSimpleGame("游戏B", { forgets: ["本地规则"] })
    ];
    const imported = [
      makeSimpleGame("新游戏C"),
      JSON.parse(JSON.stringify(local[0])),
      makeSimpleGame("游戏B", { duration: 90 }),
      makeSimpleGame("游戏B", { forgets: ["导入独有"] })
    ];
    imported[1].id = "skip-game-diff-id";
    const items = F.analyzeImportData(local, imported);
    const stats = F.getImportStats(items);
    equal(stats.new, 1, "1 个新游戏");
    equal(stats.skip, 1, "1 个完全相同");
    ok(stats.overwrite >= 1, "至少 1 个可覆盖");
    ok(stats.conflict >= 1, "至少 1 个冲突");
    equal(stats.new + stats.skip + stats.overwrite + stats.conflict, items.length);
  });
});

// ============================================================
// Suite 6: 导入同名桌游：策略执行 (executeImport)
// ============================================================
suite("6. 导入同名桌游：策略执行 (KEEP / OVERWRITE / MERGE)", () => {
  const makeGame = (name, extra = {}) => F.normalizeImportGame({
    name, minPlayers: 2, maxPlayers: 4, duration: 60, complexity: "中",
    lastPlayed: "2025-01-01", forgets: [], disputes: [], setup: [], scoring: [],
    loanRecords: [], expansions: [], disputeRulings: [], ...extra
  });

  const toImportItem = (status, localGame, importGame, strategy) => ({
    id: importGame.id,
    name: importGame.name,
    status,
    localGame,
    importGame,
    strategy
  });

  test("KEEP：保留本地，导入内容不进入结果", () => {
    const local = [makeGame("保留游戏", { forgets: ["本地规则"], duration: 60 })];
    const importGame = makeGame("保留游戏", { forgets: ["导入规则"], duration: 120 });
    const items = [
      toImportItem(IMPORT_ITEM_STATUS.OVERWRITE, local[0], importGame, MERGE_STRATEGY.KEEP)
    ];
    const { processedGames } = F.executeImport(local, items, MERGE_STRATEGY.KEEP, {});
    equal(processedGames.length, 1);
    equal(processedGames[0].duration, 60, "保留本地时长");
    equal(processedGames[0].forgets[0].text, "本地规则", "保留本地规则");
    equal(processedGames[0].id, local[0].id, "保留本地 id");
  });

  test("OVERWRITE：导入内容完全替换（保留本地 id）", () => {
    const local = [makeGame("覆盖游戏", { forgets: ["本地规则"], duration: 60, id: "local-game-id" })];
    const importGame = makeGame("覆盖游戏", { forgets: ["导入规则"], duration: 120, id: "import-game-id" });
    const items = [
      toImportItem(IMPORT_ITEM_STATUS.OVERWRITE, local[0], importGame, MERGE_STRATEGY.OVERWRITE)
    ];
    const individualStrategies = { [importGame.id]: MERGE_STRATEGY.OVERWRITE };
    const { processedGames, idMappings } = F.executeImport(local, items, MERGE_STRATEGY.KEEP, individualStrategies);
    equal(processedGames.length, 1);
    equal(processedGames[0].id, "local-game-id", "OVERWRITE 保留本地游戏 id");
    equal(processedGames[0].duration, 120, "使用导入时长");
    equal(processedGames[0].forgets[0].text, "导入规则", "使用导入规则");
    equal(idMappings.gameIdMap["import-game-id"], "local-game-id", "id 映射应指向本地 id");
  });

  test("MERGE：元数据取并集规则（人数取最小/最大，lastPlayed 取新，cover 取较长）", () => {
    const local = makeGame("合并游戏", {
      minPlayers: 3, maxPlayers: 5, duration: 60, complexity: "中",
      lastPlayed: "2025-01-01", cover: "short"
    });
    const importGame = makeGame("合并游戏", {
      minPlayers: 2, maxPlayers: 6, duration: 90, complexity: "重",
      lastPlayed: "2025-06-01", cover: "much-longer-cover-data"
    });
    const merged = F.mergeGames(local, importGame);

    equal(merged.minPlayers, 2, "minPlayers 取较小值");
    equal(merged.maxPlayers, 6, "maxPlayers 取较大值");
    equal(merged.duration, 90, "duration 取导入值");
    equal(merged.complexity, "重", "complexity 不同取导入");
    equal(merged.lastPlayed, "2025-06-01", "lastPlayed 取较新");
    equal(merged.cover, "much-longer-cover-data", "cover 取较长");
  });

  test("MERGE：mergeRuleArrays - 并集、状态优先级、标签合并", () => {
    const localRules = [
      { id: "r1", text: "共享规则", status: REVIEW_STATUS.STILL_FORGET, createdAt: "2025-01-01T00:00:00.000Z", tags: ["新人教学"] },
      { id: "r2", text: "仅本地规则", status: REVIEW_STATUS.MASTERED, createdAt: "2025-01-01T00:00:00.000Z", tags: [] }
    ];
    const importRules = [
      { id: "r3", text: "共享规则", status: REVIEW_STATUS.MUST_REVIEW, createdAt: "2025-02-01T00:00:00.000Z", tags: ["开局流程"] },
      { id: "r4", text: "仅导入规则", status: REVIEW_STATUS.UNMARKED, createdAt: "2025-02-01T00:00:00.000Z", tags: [] }
    ];
    const merged = F.mergeRuleArrays(localRules, importRules);
    const texts = merged.map(r => r.text);

    ok(texts.includes("共享规则"));
    ok(texts.includes("仅本地规则"));
    ok(texts.includes("仅导入规则"));
    equal(merged.length, 3, "去重后共 3 条");

    const shared = merged.find(r => r.text === "共享规则");
    equal(shared.status, REVIEW_STATUS.MUST_REVIEW, "MUST_REVIEW(4) > STILL_FORGET(3)，取优先级高者");
    ok(shared.tags.includes("新人教学") && shared.tags.includes("开局流程"), "标签合并取并集");
    equal(shared.id, "r1", "保留本地 id");
  });

  test("MERGE：mergeExpansions - 同名扩展合并规则，异名扩展均保留", () => {
    const local = makeGame("火星殖民", {
      expansions: [
        { name: "金星下一期", forgets: [{ id: "x1", text: "本地金星规则", status: null, createdAt: "2025-01-01T00:00:00.000Z", tags: [] }], disputes: [], setup: [], scoring: [] },
        { name: "本地独有扩展", forgets: [], disputes: [], setup: [], scoring: [] }
      ]
    });
    const importGame = makeGame("火星殖民", {
      expansions: [
        { name: "金星下一期", forgets: [{ id: "y1", text: "导入金星规则", status: null, createdAt: "2025-02-01T00:00:00.000Z", tags: [] }], disputes: [], setup: [], scoring: [] },
        { name: "导入独有扩展", forgets: [], disputes: [], setup: [], scoring: [] }
      ]
    });
    const merged = F.mergeGames(local, importGame);
    const expNames = merged.expansions.map(e => e.name);
    ok(expNames.includes("金星下一期"));
    ok(expNames.includes("本地独有扩展"));
    ok(expNames.includes("导入独有扩展"));
    equal(merged.expansions.length, 3);

    const venus = merged.expansions.find(e => e.name === "金星下一期");
    equal(venus.forgets.length, 2, "金星扩展的规则应合并为 2 条");
  });

  test("MERGE：mergeLoanRecords - 并集去重，按 borrowedAt 倒序", () => {
    const local = makeGame("富饶之城", {
      loanRecords: [
        { id: "l1", borrower: "甲", borrowedAt: "2025-01-15", expectedReturnAt: "", notes: "", returnedAt: null },
        { id: "l2", borrower: "乙", borrowedAt: "2025-03-01", expectedReturnAt: "", notes: "", returnedAt: "2025-03-15" }
      ]
    });
    const importGame = makeGame("富饶之城", {
      loanRecords: [
        { id: "l2", borrower: "乙", borrowedAt: "2025-03-01", expectedReturnAt: "", notes: "", returnedAt: "2025-03-15" },
        { id: "l3", borrower: "丙", borrowedAt: "2025-05-01", expectedReturnAt: "", notes: "", returnedAt: null }
      ]
    });
    const merged = F.mergeGames(local, importGame);
    equal(merged.loanRecords.length, 3, "l2 去重，共 3 条");
    const dates = merged.loanRecords.map(l => l.borrowedAt);
    deepEqual(dates, ["2025-05-01", "2025-03-01", "2025-01-15"], "按 borrowedAt 倒序排列");
  });

  test("MERGE：策略通过 executeImport 生效", () => {
    const local = [makeGame("合并测试", { forgets: ["本地独有规则"] })];
    const importGame = makeGame("合并测试", { forgets: ["导入独有规则"] });
    const items = [
      toImportItem(IMPORT_ITEM_STATUS.CONFLICT, local[0], importGame, MERGE_STRATEGY.MERGE)
    ];
    const { processedGames } = F.executeImport(local, items, MERGE_STRATEGY.MERGE, {});
    equal(processedGames.length, 1);
    const texts = processedGames[0].forgets.map(r => r.text);
    ok(texts.includes("本地独有规则") && texts.includes("导入独有规则"));
  });

  test("NEW 策略下新增游戏进入结果，且本地未提及的游戏保留", () => {
    const local = [makeGame("本地游戏A"), makeGame("本地游戏B")];
    const newGame = makeGame("全新游戏C");
    const items = [toImportItem(IMPORT_ITEM_STATUS.NEW, null, newGame, MERGE_STRATEGY.MERGE)];
    const { processedGames } = F.executeImport(local, items, MERGE_STRATEGY.KEEP, {});
    equal(processedGames.length, 3);
    const names = processedGames.map(g => g.name).sort();
    deepEqual(names, ["全新游戏C", "本地游戏A", "本地游戏B"].sort());
  });

  test("个体策略优先级高于全局策略", () => {
    const local = [makeGame("游戏X", { duration: 60 })];
    const importGame = makeGame("游戏X", { duration: 120 });
    const items = [toImportItem(IMPORT_ITEM_STATUS.OVERWRITE, local[0], importGame, MERGE_STRATEGY.OVERWRITE)];
    const { processedGames } = F.executeImport(local, items, MERGE_STRATEGY.KEEP, {
      [importGame.id]: MERGE_STRATEGY.OVERWRITE
    });
    equal(processedGames[0].duration, 120, "个体 OVERWRITE 覆盖全局 KEEP");
  });

  test("默认策略（unknown）→ 回退到 KEEP 保留本地", () => {
    const local = [makeGame("游戏Y", { duration: 45 })];
    const importGame = makeGame("游戏Y", { duration: 999 });
    const items = [{
      id: importGame.id, name: importGame.name,
      status: IMPORT_ITEM_STATUS.OVERWRITE,
      localGame: local[0], importGame, strategy: "unknown-bad-strategy"
    }];
    const { processedGames } = F.executeImport(local, items, "also-bad", {});
    equal(processedGames[0].duration, 45, "未知策略应回退到 KEEP 语义");
  });

  test("executeImport: idMappings 保留扩展包 id 映射（MERGE 场景）", () => {
    const localExp = { id: "exp-local-1", name: "基础扩展", forgets: [], disputes: [], setup: [], scoring: [] };
    const importExp = { id: "exp-import-1", name: "基础扩展", forgets: [], disputes: [], setup: [], scoring: [] };
    const local = [makeGame("ID 映射测试", { expansions: [localExp] })];
    const importGame = makeGame("ID 映射测试", { expansions: [importExp] });
    const items = [toImportItem(IMPORT_ITEM_STATUS.OVERWRITE, local[0], importGame, MERGE_STRATEGY.MERGE)];
    const { idMappings } = F.executeImport(local, items, MERGE_STRATEGY.MERGE, {});
    equal(idMappings.expansionIdMap["exp-import-1"], "exp-local-1",
      "同名扩展包 id 应映射为本地 id");
  });
});

// ============================================================
// Suite 7: validateImportData 数据校验
// ============================================================
suite("7. validateImportData 数据校验", () => {
  test("顶层为数组时，当作 games 数组处理", () => {
    const arr = [{ name: "游戏1" }, { name: "游戏2" }];
    const r = F.validateImportData(arr);
    deepEqual(r, arr);
  });

  test("顶层为对象时，读取 games 字段", () => {
    const obj = { games: [{ name: "游戏1" }] };
    const r = F.validateImportData(obj);
    equal(r.length, 1);
    equal(r[0].name, "游戏1");
  });

  test("games 非数组 → 抛错", () => {
    assert.throws(() => F.validateImportData({ games: "not array" }), /games.*必须是数组/);
  });

  test("游戏条目非对象 → 抛错", () => {
    assert.throws(() => F.validateImportData({ games: ["string-game"] }), /游戏条目必须是对象/);
  });

  test("游戏条目缺 name → 抛错", () => {
    assert.throws(() => F.validateImportData({ games: [{ duration: 60 }] }), /缺少名称字段/);
  });

  test("游戏条目 name 为空白字符串 → 抛错", () => {
    assert.throws(() => F.validateImportData({ games: [{ name: "   " }] }), /缺少名称字段/);
  });
});

// ============================================================
// Suite 8: normalizeImportGame 完整性校验
// ============================================================
suite("8. normalizeImportGame 完整性校验", () => {
  test("缺字段全补默认值", () => {
    const g = F.normalizeImportGame({ name: "  最小游戏  " });
    equal(g.name.trim(), "最小游戏");
    ok(typeof g.id === "string" && g.id.length > 0);
    equal(g.minPlayers, 2);
    equal(g.maxPlayers, 4);
    equal(g.duration, 60);
    equal(g.complexity, "中");
    ok(Array.isArray(g.forgets));
    ok(Array.isArray(g.disputes));
    ok(Array.isArray(g.setup));
    ok(Array.isArray(g.scoring));
    ok(Array.isArray(g.loanRecords));
    ok(Array.isArray(g.expansions));
    ok(Array.isArray(g.disputeRulings));
  });

  test("minPlayers > maxPlayers 时自动修正 maxPlayers", () => {
    const g = F.normalizeImportGame({ name: "颠倒人数", minPlayers: 5, maxPlayers: 2 });
    equal(g.minPlayers, 5);
    equal(g.maxPlayers, 5, "max 应修正为与 min 相同");
  });

  test("非法复杂度值 → 回退为 '中'", () => {
    equal(F.normalizeImportGame({ name: "G", complexity: "超轻" }).complexity, "中");
    equal(F.normalizeImportGame({ name: "G", complexity: "" }).complexity, "中");
    equal(F.normalizeImportGame({ name: "G", complexity: null }).complexity, "中");
  });

  test("人数和时长边界值处理：负数取最小正下限，0 因 falsy 回退默认值", () => {
    const g = F.normalizeImportGame({ name: "G", minPlayers: -5, maxPlayers: -3, duration: -10 });
    equal(g.minPlayers, 1, "负数 minPlayers 修正为最小 1");
    equal(g.maxPlayers, 1, "负数 maxPlayers 修正为最小 1");
    equal(g.duration, 5, "负数 duration 修正为最小 5");

    const g2 = F.normalizeImportGame({ name: "G2", minPlayers: 0, maxPlayers: 0, duration: 0 });
    equal(g2.minPlayers, 2, "0 是 falsy，minPlayers 回退为默认 2");
    equal(g2.maxPlayers, 4, "0 是 falsy，maxPlayers 回退为默认 4（2<=4，无需修正）");
    equal(g2.duration, 60, "0 是 falsy，duration 回退为默认 60");

    const g3 = F.normalizeImportGame({ name: "G3", minPlayers: 5, maxPlayers: 0 });
    equal(g3.minPlayers, 5);
    equal(g3.maxPlayers, 5, "maxPlayers(4) < minPlayers(5)，自动修正 max 与 min 同步");
  });

  test("disputeRulings 与 disputes 容器同步", () => {
    const g = F.normalizeImportGame({
      name: "裁定同步测试",
      disputes: ["争议规则A", "争议规则B"],
      expansions: [{
        name: "扩展1",
        forgets: [], disputes: ["扩展争议C"], setup: [], scoring: []
      }]
    });
    const rulingTexts = g.disputeRulings.map(r => r.disputeText).sort();
    ok(rulingTexts.includes("争议规则A"));
    ok(rulingTexts.includes("争议规则B"));
    ok(rulingTexts.includes("扩展争议C"));
    equal(g.disputeRulings.length, 3);
  });
});

// ============================================================
// 汇总
// ============================================================
console.log("\n" + "=".repeat(60));
console.log(`测试完成：通过 ${passed}，失败 ${failed}`);
if (failed > 0) {
  console.log("\n失败详情：");
  for (const f of failures) {
    console.log(`  ✗ ${f.name}`);
    console.log(`    ${f.error.stack || f.error.message}`);
  }
  process.exit(1);
} else {
  console.log("🎉 全部通过！");
  process.exit(0);
}
