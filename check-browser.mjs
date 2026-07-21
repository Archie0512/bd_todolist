const { setupBrowserRuntime } = await import("file:///C:/Users/qi.lu/.codex/plugins/cache/openai-bundled/browser/26.707.61608/scripts/browser-client.mjs");
await setupBrowserRuntime({ globals: globalThis });

const iab = await globalThis.agent.browsers.getInAppBrowser();

const tabs = await iab.tabs.list();
let tab;
if (tabs.length > 0) {
  tab = tabs[0];
} else {
  tab = await iab.tabs.create("about:blank");
}

await tab.navigate("https://bdtolist.netlify.app/");
await new Promise(r => setTimeout(r, 12000));

try {
  const text = await tab.innerText();
  console.log("=== Page Text ===");
  console.log(text.substring(0, 2000));
} catch(e) {
  console.log("innerText error:", e.message);
}

try {
  const logs = await tab.consoleLogs();
  console.log("\n=== Console Logs ===");
  logs.forEach(l => console.log(`[${l.type}] ${l.text}`));
} catch(e) {
  console.log("consoleLogs error:", e.message);
}

try {
  const url = await tab.url();
  console.log("\n=== Current URL ===");
  console.log(url);
} catch(e) {
  console.log("url error:", e.message);
}

try {
  const screenshot = await tab.screenshot();
  require("fs").writeFileSync("D:/Downloads/.vibeCode/bd_todolist/netlify-screenshot.png", Buffer.from(screenshot));
  console.log("\nScreenshot saved");
} catch(e) {
  console.log("screenshot error:", e.message);
}

try {
  const html = await tab.pageContent();
  console.log("\n=== Page HTML (first 2000) ===");
  console.log(html.substring(0, 2000));
} catch(e) {
  console.log("pageContent error:", e.message);
}