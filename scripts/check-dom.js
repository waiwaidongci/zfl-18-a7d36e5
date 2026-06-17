const fs = require("fs");
const path = require("path");

const htmlPath = path.join(__dirname, "..", "index.html");

const REQUIRED_IDS = [
  "searchInput",
  "playerFilter",
  "complexityFilter",
  "sortMode",
  "filterMustReview",
  "gameForm",
  "nameInput",
  "minPlayersInput",
  "maxPlayersInput",
  "durationInput",
  "complexityInput",
  "lastPlayedInput",
  "gameList",
  "detailView",
  "gameCount",
  "ruleCount",
  "staleGame",
  "reviewPendingCount",
  "visibleCount",
  "exportBtn",
  "importBtn",
  "importFile",
  "resetBtn",
  "backupMessage",
  "confirmDialog",
  "confirmTitle",
  "confirmMessage",
  "confirmOk",
  "confirmCancel",
  "loanDialog",
  "loanForm",
  "loanBorrowerInput",
  "loanBorrowedAtInput",
  "loanCancelBtn",
  "loanSubmitBtn",
  "reviewSessionDialog",
  "reviewSessionTitle",
  "reviewSessionProgress",
  "reviewSessionContent",
  "reviewSessionCloseBtn",
  "editDialog",
  "editForm",
  "editNameInput",
  "editCancelBtn",
  "editSubmitBtn",
  "importPreviewDialog",
  "importPreviewConfirmBtn",
  "importPreviewCancelBtn",
  "startPartyBtn",
  "generateChecklistBtn",
  "clearChecklistBtn",
  "checklistGameList",
  "checklistView",
  "batchCoverBtn",
  "batchCoverDialog",
  "undoBtn",
  "saveViewBtn",
  "saveViewDialog",
  "saveViewNameInput",
  "saveViewConfirmBtn",
  "listTagFilter",
  "checklistPlayerFilter",
  "checklistTagFilter",
  "loanStatsPanel",
  "loanBorrowersList",
  "borrowerDetailDialog",
  "coverGalleryGrid",
  "partyNameInput",
  "partyPlayerCountInput",
  "partyCandidateList",
  "archivePanel",
  "archiveList",
];

let passed = 0;
let failed = 0;
const failures = [];

if (!fs.existsSync(htmlPath)) {
  console.error(`✗ index.html 不存在: ${htmlPath}`);
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, "utf-8");

const idPattern = /id="([^"]+)"/g;
const foundIds = new Set();
let match;
while ((match = idPattern.exec(html)) !== null) {
  foundIds.add(match[1]);
}

for (const id of REQUIRED_IDS) {
  if (foundIds.has(id)) {
    passed++;
    console.log(`  ✓ #${id} 存在`);
  } else {
    failed++;
    failures.push(id);
    console.log(`  ✗ #${id} 缺失`);
  }
}

console.log(`\n${"=".repeat(50)}`);
console.log(`DOM ID 检查：通过 ${passed}，失败 ${failed}`);
if (failed > 0) {
  console.log(`缺失 ID：${failures.join(", ")}`);
  process.exit(1);
} else {
  console.log("🎉 全部通过！");
  process.exit(0);
}
