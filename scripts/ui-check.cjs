/**
 * 自动化 UI 自检脚本：访问本地 dev 服务器，检查页面是否正常渲染、有无运行时错误
 * 用法：node scripts/ui-check.cjs
 */
const { chromium } = require("playwright");

const URL = process.env.URL || "http://localhost:3001/";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  const consoleMessages = [];

  page.on("pageerror", (err) => {
    errors.push(`[pageerror] ${err.message}`);
  });
  page.on("console", (msg) => {
    const type = msg.type();
    if (type === "error" || type === "warning") {
      consoleMessages.push(`[${type}] ${msg.text()}`);
    }
  });
  page.on("requestfailed", (req) => {
    errors.push(`[requestfailed] ${req.url()} - ${req.failure()?.errorText}`);
  });

  console.log(`访问 ${URL} ...`);
  try {
    await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  } catch (err) {
    console.error("页面加载失败:", err.message);
    await browser.close();
    process.exit(1);
  }

  // 等待 React 渲染
  await page.waitForTimeout(2000);

  // 检查 #root 是否有内容
  const rootHtml = await page.evaluate(() => {
    const root = document.getElementById("root");
    return root ? root.innerHTML.length : -1;
  });
  console.log(`#root 内容长度: ${rootHtml}`);

  // 检查页面标题
  const title = await page.title();
  console.log(`页面标题: ${title}`);

  // 检查关键元素是否存在
  const headerExists = await page.locator(".app-header").count();
  console.log(`Header (.app-header): ${headerExists} 个`);

  const lanesCount = await page.locator(".lane").count();
  console.log(`Lane (.lane): ${lanesCount} 个`);

  const cardsCount = await page.locator(".card").count();
  console.log(`Card (.card): ${cardsCount} 个`);

  // 截图保存
  await page.screenshot({ path: "docs/screenshots/react-ui-check.png", fullPage: true });
  console.log("截图已保存: docs/screenshots/react-ui-check.png");

  // 输出错误
  console.log("\n=== 运行时错误 ===");
  if (errors.length === 0) {
    console.log("无");
  } else {
    errors.forEach((e) => console.log(e));
  }

  console.log("\n=== Console 错误/警告 ===");
  if (consoleMessages.length === 0) {
    console.log("无");
  } else {
    consoleMessages.forEach((m) => console.log(m));
  }

  await browser.close();

  // 失败标准：有 pageerror 或 #root 为空
  if (errors.length > 0 || rootHtml < 100) {
    console.error("\n❌ 自检失败");
    process.exit(1);
  } else {
    console.log("\n✅ 自检通过");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("脚本异常:", err);
  process.exit(1);
});
