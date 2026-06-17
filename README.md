# 桌游规则遗忘点卡片库

一个纯前端本地应用，用来管理桌游收藏中的规则遗忘点、常见争议、开局准备和计分提醒。支持按最近未玩、人数范围和复杂度筛选，并在详情里展示聚会前快速复习卡片。

直接打开 `index.html` 即可使用，也可以在本目录启动静态服务访问。

## 工程化验证流程

项目保留「直接打开 index.html 即可使用」的特性，同时提供一套轻量本地检查脚本，方便在改动 `app.js`、`index.html`、`styles.css` 后快速发现语法错误、关键 DOM 缺失和核心交互回归。

### 前置条件

- Node.js >= 16
- 首次使用需安装依赖：`npm install`
- E2E 测试还需安装 Playwright 浏览器：`npx playwright install chromium`

### 可用命令

| 命令 | 说明 |
|------|------|
| `npm test` | 运行数据逻辑单元测试（test.js） |
| `npm run check:dom` | 静态扫描 index.html，检查关键 DOM ID 是否存在 |
| `npm run check:js` | 用 acorn 对 app.js / data-functions.js 做 AST 语法检查 |
| `npm run check:css` | 对 styles.css 做大括号匹配、关键选择器等基础检查 |
| `npm run check` | 一键运行以上三项静态检查 |
| `npm run e2e` | Playwright 浏览器级冒烟测试（需先安装 Playwright） |
| `npm run lint` | 运行全部静态检查 + 单元测试 |
| `npm run serve` | 启动本地开发服务器（端口 3000） |

### 检查覆盖范围

**静态检查（`npm run check`）：**
- DOM ID 存在性：搜索框、筛选器、新增表单、导出/导入按钮、借阅弹窗、复习会话弹窗、导入预览弹窗、聚会配置等 60+ 个关键元素
- JS 语法：app.js 和 data-functions.js 的 AST 级语法验证
- CSS 语法：大括号匹配、CSS 变量声明完整性、关键选择器存在性

**E2E 冒烟测试（`npm run e2e`）：**
- 应用启动无控制台错误
- 页面标题与统计指标正常渲染
- 关键输入控件（搜索、筛选、新增表单）可访问
- 关键按钮（导出/导入/撤销/筛选保存/复习清单/批量封面/聚会开始）可见
- 导出功能可触发
- 筛选功能可交互
- 复习会话弹窗入口可达
- 借阅弹窗入口可达（含借阅人、借出日期输入框）
- 导入预览弹窗入口可达
- 游戏列表可点击、详情面板有内容
