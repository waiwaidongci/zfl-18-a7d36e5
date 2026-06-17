const fs = require("fs");
const path = require("path");

const cssPath = path.join(__dirname, "..", "styles.css");

let passed = 0;
let failed = 0;
const failures = [];

if (!fs.existsSync(cssPath)) {
  console.error(`✗ styles.css 不存在: ${cssPath}`);
  process.exit(1);
}

const css = fs.readFileSync(cssPath, "utf-8");

const checks = [
  {
    name: "无未闭合的大括号",
    check: () => {
      let depth = 0;
      let inComment = false;
      let inString = false;
      let stringChar = "";
      for (let i = 0; i < css.length; i++) {
        const ch = css[i];
        const next = css[i + 1] || "";
        if (inComment) {
          if (ch === "*" && next === "/") {
            inComment = false;
            i++;
          }
          continue;
        }
        if (inString) {
          if (ch === stringChar && css[i - 1] !== "\\") {
            inString = false;
          }
          continue;
        }
        if (ch === "/" && next === "*") {
          inComment = true;
          i++;
          continue;
        }
        if (ch === '"' || ch === "'") {
          inString = true;
          stringChar = ch;
          continue;
        }
        if (ch === "{") depth++;
        if (ch === "}") depth--;
        if (depth < 0) return `位置 ${i} 处有多余的 }`;
      }
      if (depth > 0) return `有 ${depth} 个未闭合的 {`;
      if (depth < 0) return `有 ${Math.abs(depth)} 个多余的 }`;
      return null;
    },
  },
  {
    name: "CSS 变量声明完整（:root 内 var(--*) 对）",
    check: () => {
      const rootBlock = css.match(/:root\s*\{([^}]*)\}/s);
      if (!rootBlock) return "未找到 :root 块";
      const vars = rootBlock[1].match(/--[\w-]+\s*:/g);
      if (!vars || vars.length < 5) return `:root 内变量数 ${vars ? vars.length : 0}，期望至少 5 个`;
      return null;
    },
  },
  {
    name: "关键选择器存在",
    check: () => {
      const required = [
        ".shell",
        ".topbar",
        ".game-card",
        ".dialog-overlay",
        ".panel",
        ".hidden",
      ];
      const missing = required.filter((sel) => !css.includes(sel));
      if (missing.length > 0) return `缺少选择器: ${missing.join(", ")}`;
      return null;
    },
  },
  {
    name: "无 CSS 语法常见错误（连续分号）",
    check: () => {
      const lines = css.split("\n");
      const badLines = [];
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (trimmed.startsWith("/*") || trimmed.startsWith("*") || trimmed.endsWith("*/")) continue;
        if (/;;/.test(trimmed)) {
          badLines.push(i + 1);
        }
      }
      if (badLines.length > 0) return `第 ${badLines.join(", ")} 行有连续分号`;
      return null;
    },
  },
  {
    name: "媒体查询语法正确",
    check: () => {
      const mediaBlocks = css.match(/@media[^{]*\{/g) || [];
      if (mediaBlocks.length === 0) return null;
      let depth = 0;
      let inComment = false;
      let inString = false;
      let stringChar = "";
      for (let i = 0; i < css.length; i++) {
        const ch = css[i];
        const next = css[i + 1] || "";
        if (inComment) {
          if (ch === "*" && next === "/") { inComment = false; i++; }
          continue;
        }
        if (inString) {
          if (ch === stringChar && css[i - 1] !== "\\") inString = false;
          continue;
        }
        if (ch === "/" && next === "*") { inComment = true; i++; continue; }
        if (ch === '"' || ch === "'") { inString = true; stringChar = ch; continue; }
        if (ch === "{") depth++;
        if (ch === "}") depth--;
      }
      if (depth !== 0) return `大括号嵌套不平衡（差 ${depth}）`;
      return null;
    },
  },
];

for (const { name, check } of checks) {
  const error = check();
  if (error) {
    failed++;
    failures.push({ name, error });
    console.log(`  ✗ ${name}: ${error}`);
  } else {
    passed++;
    console.log(`  ✓ ${name}`);
  }
}

console.log(`\n${"=".repeat(50)}`);
console.log(`CSS 语法检查：通过 ${passed}，失败 ${failed}`);
if (failed > 0) {
  console.log("\n失败详情：");
  for (const f of failures) {
    console.log(`  ✗ ${f.name}: ${f.error}`);
  }
  process.exit(1);
} else {
  console.log("🎉 全部通过！");
  process.exit(0);
}
