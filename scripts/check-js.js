const fs = require("fs");
const path = require("path");
const acorn = require("acorn");

const root = path.join(__dirname, "..");
const jsFiles = ["app.js", "data-functions.js"];

let passed = 0;
let failed = 0;
const failures = [];

for (const file of jsFiles) {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) {
    failed++;
    failures.push({ file, error: `文件不存在: ${filePath}` });
    console.log(`  ✗ ${file}: 文件不存在`);
    continue;
  }

  const code = fs.readFileSync(filePath, "utf-8");

  try {
    acorn.parse(code, {
      ecmaVersion: 2022,
      sourceType: "module",
      allowReturnOutsideFunction: true,
      allowHashBang: true,
    });
    passed++;
    console.log(`  ✓ ${file}: 语法正确`);
  } catch (err) {
    failed++;
    failures.push({ file, error: err.message });
    console.log(`  ✗ ${file}: ${err.message}`);
  }
}

console.log(`\n${"=".repeat(50)}`);
console.log(`JS 语法检查：通过 ${passed}，失败 ${failed}`);
if (failed > 0) {
  console.log("\n失败详情：");
  for (const f of failures) {
    console.log(`  ✗ ${f.file}: ${f.error}`);
  }
  process.exit(1);
} else {
  console.log("🎉 全部通过！");
  process.exit(0);
}
