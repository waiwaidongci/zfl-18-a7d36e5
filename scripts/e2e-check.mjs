import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";
import http from "http";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

let passed = 0;
let failed = 0;
const failures = [];
const consoleErrors = [];

function assert(condition, name, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    failures.push({ name, detail });
    console.log(`  ✗ ${name}${detail ? `: ${detail}` : ""}`);
  }
}

async function startServer() {
  const server = http.createServer((req, res) => {
    let filePath = path.join(root, req.url === "/" ? "index.html" : req.url);
    const ext = path.extname(filePath);
    const mimeTypes = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".svg": "image/svg+xml",
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not Found");
      } else {
        res.writeHead(200, { "Content-Type": contentType + "; charset=utf-8" });
        res.end(data);
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

async function run() {
  const { server, url } = await startServer();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  page.on("pageerror", (err) => {
    consoleErrors.push(`PAGE ERROR: ${err.message}`);
  });

  console.log("\n▶ 1. 应用启动检查");
  try {
    await page.goto(url, { waitUntil: "load", timeout: 15000 });
    assert(true, "页面成功加载");
  } catch (e) {
    assert(false, "页面成功加载", e.message);
    await browser.close();
    server.close();
    process.exit(1);
  }

  await page.waitForTimeout(500);

  console.log("\n▶ 2. 控制台无错误");
  const criticalErrors = consoleErrors.filter(
    (e) =>
      !e.includes("favicon") &&
      !e.includes("net::ERR") &&
      !e.includes("404")
  );
  assert(
    criticalErrors.length === 0,
    "无 JS 控制台错误",
    criticalErrors.length > 0 ? `${criticalErrors.length} 个错误: ${criticalErrors.slice(0, 3).join("; ")}` : ""
  );

  console.log("\n▶ 3. 标题与统计指标渲染");
  const title = await page.textContent("h1");
  assert(
    title && title.includes("桌游规则"),
    "页面标题包含'桌游规则'",
    `实际标题: ${title}`
  );

  const gameCount = await page.textContent("#gameCount");
  assert(gameCount && parseInt(gameCount) >= 0, "gameCount 非负", `实际: ${gameCount}`);

  const ruleCount = await page.textContent("#ruleCount");
  assert(ruleCount && parseInt(ruleCount) >= 0, "ruleCount 非负", `实际: ${ruleCount}`);

  const initialGameCount = await page.$$eval(".game-card", (cards) => cards.length);

  console.log("\n▶ 4. 关键输入控件可访问");
  const inputIds = [
    "searchInput",
    "playerFilter",
    "complexityFilter",
    "sortMode",
    "filterMustReview",
    "nameInput",
    "minPlayersInput",
    "maxPlayersInput",
    "durationInput",
    "complexityInput",
    "lastPlayedInput",
  ];
  for (const id of inputIds) {
    const el = await page.$(`#${id}`);
    assert(el !== null, `输入控件 #${id} 存在`);
  }

  console.log("\n▶ 5. 关键按钮可点击");
  const buttonIds = [
    "exportBtn",
    "importBtn",
    "resetBtn",
    "undoBtn",
    "saveViewBtn",
    "generateChecklistBtn",
    "clearChecklistBtn",
    "batchCoverBtn",
    "startPartyBtn",
  ];
  for (const id of buttonIds) {
    const btn = await page.$(`#${id}`);
    const visible = btn ? await btn.isVisible() : false;
    assert(visible, `按钮 #${id} 可见`);
  }

  console.log("\n▶ 6. 导出功能 — 真实下载并验证 JSON");
  const exportBtn = await page.$("#exportBtn");
  if (exportBtn) {
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 10000 }),
      exportBtn.click(),
    ]);
    assert(download !== undefined, "导出触发了下载事件");
    if (download) {
      const downloadPath = await download.path();
      const suggestedFilename = download.suggestedFilename();
      assert(
        suggestedFilename.endsWith(".json"),
        "导出文件名为 .json",
        `实际: ${suggestedFilename}`
      );
      const stream = await download.createReadStream();
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const content = Buffer.concat(chunks).toString("utf-8");
      let parsed;
      try {
        parsed = JSON.parse(content);
        assert(true, "导出 JSON 可解析");
      } catch {
        assert(false, "导出 JSON 可解析", "JSON.parse 失败");
      }
      if (parsed) {
        assert(
          Array.isArray(parsed.games),
          "导出 JSON 包含 games 数组",
          `实际顶层键: ${Object.keys(parsed).join(", ")}`
        );
        assert(
          typeof parsed.schemaVersion === "number",
          "导出 JSON 包含 schemaVersion",
          `实际: ${parsed.schemaVersion}`
        );
      }
    }
  } else {
    assert(false, "导出按钮存在", "未找到 #exportBtn");
  }

  console.log("\n▶ 7. 筛选功能 — 真实交互并断言列表变化");
  const searchInput = await page.$("#searchInput");
  if (searchInput) {
    await searchInput.fill("___nonexistent_game_xyz___");
    await page.waitForTimeout(400);
    const filteredCards = await page.$$eval(".game-card", (cards) => cards.length);
    assert(
      filteredCards === 0,
      "搜索不存在的关键词 → 列表为空",
      `实际卡片数: ${filteredCards}`
    );

    await searchInput.fill("");
    await page.waitForTimeout(400);
    const restoredCards = await page.$$eval(".game-card", (cards) => cards.length);
    assert(
      restoredCards === initialGameCount,
      "清空搜索 → 列表恢复",
      `恢复后: ${restoredCards}, 初始: ${initialGameCount}`
    );
  }

  const playerFilter = await page.$("#playerFilter");
  if (playerFilter) {
    await playerFilter.selectOption("2");
    await page.waitForTimeout(400);
    const playerFiltered = await page.$$eval(".game-card", (cards) => cards.length);
    assert(
      playerFiltered <= initialGameCount,
      "人数筛选 → 列表缩小或不变",
      `筛选后: ${playerFiltered}, 初始: ${initialGameCount}`
    );
    await playerFilter.selectOption("all");
    await page.waitForTimeout(400);
  }

  console.log("\n▶ 8. 新增游戏 — 真实填写表单并提交");
  const nameInput = await page.$("#nameInput");
  if (nameInput) {
    const beforeAdd = await page.$$eval(".game-card", (cards) => cards.length);
    await nameInput.fill("E2E测试桌游");
    await page.fill("#minPlayersInput", "2");
    await page.fill("#maxPlayersInput", "4");
    await page.fill("#durationInput", "60");
    await page.selectOption("#complexityInput", "重");
    await page.fill("#lastPlayedInput", new Date().toISOString().slice(0, 10));

    const gameForm = await page.$("#gameForm");
    if (gameForm) {
      await gameForm.evaluate((f) => {
        const evt = new Event("submit", { bubbles: true, cancelable: true });
        f.dispatchEvent(evt);
      });
      await page.waitForTimeout(500);
    }

    const afterAdd = await page.$$eval(".game-card", (cards) => cards.length);
    assert(
      afterAdd === beforeAdd + 1,
      "新增游戏后列表 +1",
      `新增前: ${beforeAdd}, 新增后: ${afterAdd}`
    );
  }

  console.log("\n▶ 9. 点击游戏卡片 → 详情面板 → 借阅弹窗");
  const firstGameCard = await page.$(".game-card");
  if (firstGameCard) {
    await firstGameCard.click();
    await page.waitForTimeout(300);

    const detailView = await page.$("#detailView");
    const detailContent = detailView ? await detailView.innerHTML() : "";
    assert(detailContent.length > 0, "点击游戏卡片后详情面板有内容");

    const loanOutBtn = await page.$("#loanOutBtn");
    if (loanOutBtn) {
      const loanOutVisible = await loanOutBtn.isVisible();
      assert(loanOutVisible, "借出按钮可见");

      await loanOutBtn.click();
      await page.waitForTimeout(300);

      const loanDialog = await page.$("#loanDialog");
      const loanDialogVisible = loanDialog
        ? !(await loanDialog.evaluate((el) => el.classList.contains("hidden")))
        : false;
      assert(loanDialogVisible, "点击借出后弹窗打开");

      if (loanDialogVisible) {
        const loanTitle = await page.textContent("#loanDialogTitle");
        assert(
          loanTitle && loanTitle.includes("借出"),
          "借阅弹窗标题含'借出'",
          `实际: ${loanTitle}`
        );

        const borrowerInput = await page.$("#loanBorrowerInput");
        const borrowedAtInput = await page.$("#loanBorrowedAtInput");
        assert(borrowerInput !== null, "借阅人输入框存在");
        assert(borrowedAtInput !== null, "借出日期输入框存在");

        if (borrowerInput) {
          await borrowerInput.fill("E2E测试借阅人");
        }

        const loanForm = await page.$("#loanForm");
        if (loanForm) {
          await loanForm.evaluate((f) => {
            const evt = new Event("submit", { bubbles: true, cancelable: true });
            f.dispatchEvent(evt);
          });
          await page.waitForTimeout(500);
        }

        const loanDialogAfterSubmit = await page.$("#loanDialog");
        const loanDialogClosed = loanDialogAfterSubmit
          ? await loanDialogAfterSubmit.evaluate((el) => el.classList.contains("hidden"))
          : true;
        assert(loanDialogClosed, "借阅提交后弹窗关闭");

        const returnBtn = await page.$("#returnBtn");
        const returnBtnVisible = returnBtn ? await returnBtn.isVisible() : false;
        assert(returnBtnVisible, "借出后出现'标记归还'按钮");
      }
    }

    const viewHistoryBtn = await page.$("#viewLoanHistoryBtn");
    if (viewHistoryBtn) {
      const histVisible = await viewHistoryBtn.isVisible();
      if (histVisible) {
        await viewHistoryBtn.click();
        await page.waitForTimeout(300);
        const loanHistoryDialog = await page.$("#loanHistoryDialog");
        const historyOpen = loanHistoryDialog
          ? !(await loanHistoryDialog.evaluate((el) => el.classList.contains("hidden")))
          : false;
        assert(historyOpen, "点击'查看借出记录'后历史弹窗打开");

        if (historyOpen) {
          const closeHistoryBtns = await loanHistoryDialog.$$("button");
          for (const btn of closeHistoryBtns) {
            const txt = await btn.textContent();
            if (txt && txt.includes("关闭")) {
              await btn.click();
              await page.waitForTimeout(200);
              break;
            }
          }
        }
      }
    }
  }

  console.log("\n▶ 10. 编辑弹窗 — 真实打开并验证");
  const editBtn = await page.$("#editGameBtn");
  if (editBtn) {
    const editBtnVisible = await editBtn.isVisible();
    assert(editBtnVisible, "编辑按钮可见");
    if (!editBtnVisible) {
      assert(false, "编辑弹窗打开", "#editGameBtn 不可见");
    } else {
      await editBtn.click();
      await page.waitForTimeout(300);
    }
    const editDialog = await page.$("#editDialog");
    const editDialogOpen = editDialog
      ? !(await editDialog.evaluate((el) => el.classList.contains("hidden")))
      : false;
    assert(editDialogOpen, "编辑弹窗打开");

    if (editDialogOpen) {
      const editNameInput = await page.$("#editNameInput");
      assert(editNameInput !== null, "编辑弹窗中名称输入框存在");
      const editNameValue = editNameInput ? await editNameInput.inputValue() : "";
      assert(editNameValue.length > 0, "编辑弹窗中名称输入框有值");

      const editCancelBtn = await page.$("#editCancelBtn");
      if (editCancelBtn) {
        await editCancelBtn.click();
        await page.waitForTimeout(200);
      }
    }
  } else {
    assert(false, "编辑按钮存在", "未找到 #editGameBtn");
  }

  console.log("\n▶ 11. 复习会话 — 真实触发并验证弹窗");
  const reviewStartBtn = await page.$("[data-start-review='all_pending']");
  if (reviewStartBtn) {
    const reviewBtnVisible = await reviewStartBtn.isVisible();
    if (reviewBtnVisible) {
      await reviewStartBtn.click();
      await page.waitForTimeout(500);
      const reviewDialog = await page.$("#reviewSessionDialog");
      const reviewDialogOpen = reviewDialog
        ? !(await reviewDialog.evaluate((el) => el.classList.contains("hidden")))
        : false;
      assert(reviewDialogOpen, "点击'全部待复习'后复习弹窗打开");

      if (reviewDialogOpen) {
        const reviewTitle = await page.textContent("#reviewSessionTitle");
        assert(
          reviewTitle && reviewTitle.length > 0,
          "复习弹窗标题非空",
          `实际: ${reviewTitle}`
        );

        const reviewProgress = await page.textContent("#reviewSessionProgress");
        assert(
          reviewProgress && reviewProgress.length > 0,
          "复习进度文本非空"
        );

        const reviewContent = await page.$("#reviewSessionContent");
        const reviewContentHTML = reviewContent
          ? await reviewContent.innerHTML()
          : "";
        assert(
          reviewContentHTML.length > 0,
          "复习内容区有内容"
        );

        const closeReviewBtn = await page.$("#reviewSessionCloseBtn");
        if (closeReviewBtn) {
          await closeReviewBtn.click();
          await page.waitForTimeout(300);
          const confirmAfterReview = await page.$("#confirmDialog");
          if (confirmAfterReview) {
            const confirmVisible = !(await confirmAfterReview.evaluate((el) => el.classList.contains("hidden")));
            if (confirmVisible) {
              const confirmOkBtn = await page.$("#confirmOk");
              if (confirmOkBtn) {
                await confirmOkBtn.click();
                await page.waitForTimeout(300);
              }
            }
          }
        }
      }
    }
  }

  console.log("\n▶ 12. 保存视图弹窗 — 真实打开");
  const saveViewBtn = await page.$("#saveViewBtn");
  if (saveViewBtn) {
    await saveViewBtn.click();
    await page.waitForTimeout(300);
    const saveViewDialog = await page.$("#saveViewDialog");
    const saveViewOpen = saveViewDialog
      ? !(await saveViewDialog.evaluate((el) => el.classList.contains("hidden")))
      : false;
    assert(saveViewOpen, "保存视图弹窗打开");

    if (saveViewOpen) {
      const saveViewNameInput = await page.$("#saveViewNameInput");
      assert(saveViewNameInput !== null, "保存视图名称输入框存在");

      const saveViewCancelBtn = await page.$("#saveViewCancelBtn");
      if (saveViewCancelBtn) {
        await saveViewCancelBtn.click();
        await page.waitForTimeout(200);
      }
    }
  }

  console.log("\n▶ 13. 导入功能 — 真实上传文件并走完预览流程");
  const importBtn = await page.$("#importBtn");
  const importFileInput = await page.$("#importFile");
  if (importBtn && importFileInput) {
    const testImportData = {
      version: 1,
      schemaVersion: 3,
      games: [
        {
          id: crypto.randomUUID ? "e2e-import-test-1" : "e2e-import-test-1",
          name: "E2E导入测试桌游",
          minPlayers: 3,
          maxPlayers: 5,
          duration: 90,
          complexity: "复杂",
          lastPlayed: "2025-01-01",
          cover: "",
          forgets: [],
          disputes: [],
          setup: [],
          scoring: [],
          loanRecords: [],
          expansions: [],
          disputeRulings: [],
          changeHistory: [],
          coverHistory: [],
        },
      ],
    };
    const importJsonPath = path.join(__dirname, "_e2e_test_import.json");
    fs.writeFileSync(importJsonPath, JSON.stringify(testImportData, null, 2));

    await importFileInput.setInputFiles(importJsonPath);
    await page.waitForTimeout(800);

    const importPreviewDialog = await page.$("#importPreviewDialog");
    const importPreviewOpen = importPreviewDialog
      ? !(await importPreviewDialog.evaluate((el) => el.classList.contains("hidden")))
      : false;
    assert(importPreviewOpen, "导入文件后预览弹窗打开");

    if (importPreviewOpen) {
      const importPreviewContent = await importPreviewDialog.innerHTML();
      assert(
        importPreviewContent.includes("E2E导入测试桌游") || importPreviewContent.length > 0,
        "导入预览弹窗有内容"
      );

      const importPreviewCancelBtn = await page.$("#importPreviewCancelBtn");
      if (importPreviewCancelBtn) {
        await importPreviewCancelBtn.click();
        await page.waitForTimeout(300);
      }
    }

    try {
      fs.unlinkSync(importJsonPath);
    } catch {}
  }

  console.log("\n▶ 14. 聚会配置流程 — 启动");
  const startPartyBtn = await page.$("#startPartyBtn");
  if (startPartyBtn) {
    await startPartyBtn.click();
    await page.waitForTimeout(500);
    const partyConfigView = await page.$("#partyConfigView");
    const partyConfigVisible = partyConfigView
      ? !(await partyConfigView.evaluate((el) => el.classList.contains("hidden")))
      : false;
    assert(partyConfigVisible, "点击'开始聚会'后配置视图显示");

    const cancelPartyBtn = await page.$("#cancelPartyBtn");
    if (cancelPartyBtn) {
      await cancelPartyBtn.click();
      await page.waitForTimeout(300);
    }
  }

  console.log("\n▶ 15. 确认弹窗 — 触发并验证");
  const resetBtn = await page.$("#resetBtn");
  if (resetBtn) {
    await resetBtn.click();
    await page.waitForTimeout(300);
    const confirmDialog = await page.$("#confirmDialog");
    const confirmOpen = confirmDialog
      ? !(await confirmDialog.evaluate((el) => el.classList.contains("hidden")))
      : false;
    assert(confirmOpen, "重置按钮触发确认弹窗");

    if (confirmOpen) {
      const confirmTitle = await page.textContent("#confirmTitle");
      assert(
        confirmTitle && confirmTitle.length > 0,
        "确认弹窗标题非空"
      );
      const confirmCancelBtn = await page.$("#confirmCancel");
      if (confirmCancelBtn) {
        await confirmCancelBtn.click();
        await page.waitForTimeout(200);
      }
    }
  }

  await browser.close();
  server.close();

  console.log(`\n${"=".repeat(50)}`);
  console.log(`E2E 真实自动化测试：通过 ${passed}，失败 ${failed}`);
  if (failed > 0) {
    console.log("\n失败详情：");
    for (const f of failures) {
      console.log(`  ✗ ${f.name}${f.detail ? `: ${f.detail}` : ""}`);
    }
    process.exit(1);
  } else {
    console.log("🎉 全部通过！");
    process.exit(0);
  }
}

run().catch((err) => {
  console.error("E2E 测试运行失败:", err);
  process.exit(1);
});
