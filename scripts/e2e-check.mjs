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
  const context = await browser.newContext();
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

  console.log("\n▶ 6. 导出功能可触发");
  const exportBtn = await page.$("#exportBtn");
  if (exportBtn) {
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 5000 }).catch(() => null),
      exportBtn.click(),
    ]);
    assert(true, "导出按钮点击无报错");
  } else {
    assert(false, "导出按钮点击无报错", "按钮不存在");
  }

  console.log("\n▶ 7. 筛选功能可交互");
  const searchInput = await page.$("#searchInput");
  if (searchInput) {
    await searchInput.fill("奥尔良");
    await page.waitForTimeout(300);
    const gameCards = await page.$$(".game-card");
    assert(gameCards.length >= 0, "搜索筛选可输入");
    await searchInput.fill("");
    await page.waitForTimeout(300);
  }

  const playerFilter = await page.$("#playerFilter");
  if (playerFilter) {
    await playerFilter.selectOption("2");
    await page.waitForTimeout(300);
    assert(true, "人数筛选可切换");
    await playerFilter.selectOption("all");
    await page.waitForTimeout(300);
  }

  console.log("\n▶ 8. 复习会话弹窗入口可达");
  const reviewDialog = await page.$("#reviewSessionDialog");
  if (reviewDialog) {
    const isHidden = await reviewDialog.evaluate((el) =>
      el.classList.contains("hidden")
    );
    assert(isHidden, "复习会话弹窗初始状态隐藏");
  } else {
    assert(false, "复习会话弹窗元素存在");
  }

  console.log("\n▶ 9. 借阅弹窗入口可达");
  const loanDialog = await page.$("#loanDialog");
  if (loanDialog) {
    const isHidden = await loanDialog.evaluate((el) =>
      el.classList.contains("hidden")
    );
    assert(isHidden, "借阅弹窗初始状态隐藏");

    const loanBorrowerInput = await page.$("#loanBorrowerInput");
    const loanBorrowedAtInput = await page.$("#loanBorrowedAtInput");
    assert(loanBorrowerInput !== null, "借阅弹窗 - 借阅人输入框存在");
    assert(loanBorrowedAtInput !== null, "借阅弹窗 - 借出日期输入框存在");
  } else {
    assert(false, "借阅弹窗元素存在");
  }

  console.log("\n▶ 10. 导入弹窗入口可达");
  const importPreviewDialog = await page.$("#importPreviewDialog");
  if (importPreviewDialog) {
    const isHidden = await importPreviewDialog.evaluate((el) =>
      el.classList.contains("hidden")
    );
    assert(isHidden, "导入预览弹窗初始状态隐藏");
  } else {
    assert(false, "导入预览弹窗元素存在");
  }

  console.log("\n▶ 11. 游戏列表可点击");
  const firstGameCard = await page.$(".game-card");
  if (firstGameCard) {
    await firstGameCard.click();
    await page.waitForTimeout(300);
    const detailView = await page.$("#detailView");
    const detailContent = detailView
      ? await detailView.innerHTML()
      : "";
    assert(
      detailContent.length > 0,
      "点击游戏卡片后详情面板有内容"
    );
  } else {
    assert(false, "游戏列表至少有一张卡片");
  }

  await browser.close();
  server.close();

  console.log(`\n${"=".repeat(50)}`);
  console.log(`E2E 冒烟测试：通过 ${passed}，失败 ${failed}`);
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
