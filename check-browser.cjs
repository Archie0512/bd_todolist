const path = require('path');
const browserClientPath = 'C:/Users/qi.lu/.codex/plugins/cache/openai-bundled/browser/26.707.61608/scripts/browser-client.mjs';

async function main() {
  const fileUrl = 'file:///' + browserClientPath.replace(/\\/g, '/');
  const mod = await import(fileUrl);
  await mod.setupBrowserRuntime({ globals: globalThis });
  console.log('Browser runtime initialized');

  const iab = await globalThis.agent.browsers.getInAppBrowser();
  console.log('Got in-app browser');

  const tabs = await iab.tabs.list();
  let tab;
  if (tabs.length > 0) {
    tab = tabs[0];
    console.log('Using existing tab:', tab.url || 'no url');
    await tab.navigate('https://bd-todolist.vercel.app');
  } else {
    tab = await iab.tabs.create('https://bd-todolist.vercel.app');
    console.log('Created new tab');
  }

  await new Promise(r => setTimeout(r, 10000));
  console.log('Waited for load');

  const screenshot = await tab.screenshot();
  const fs = require('fs');
  fs.writeFileSync('D:/Downloads/.vibeCode/bd_todolist/browser-screenshot.png', Buffer.from(screenshot));
  console.log('Screenshot saved');

  const text = await tab.innerText();
  console.log('Page text (first 500):', text.substring(0, 500));

  try {
    const logs = await tab.consoleLogs();
    console.log('Console logs (last 20):', JSON.stringify(logs.slice(-20), null, 2));
  } catch(e) {
    console.log('Could not get console logs:', e.message);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  console.error(err.stack);
});