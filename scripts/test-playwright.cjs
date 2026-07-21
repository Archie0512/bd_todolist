const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[PAGE_ERROR] ${err.message}`));
  page.on('requestfailed', req => logs.push(`[REQ_FAILED] ${req.url()}`));
  
  console.log('Navigating to https://bdtolist.netlify.app/...');
  await page.goto('https://bdtolist.netlify.app/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);
  
  const title = await page.title();
  console.log('Title:', title);
  
  const text = await page.innerText('body');
  console.log('\n=== Page text (first 1500) ===');
  console.log(text.substring(0, 1500));
  
  console.log('\n=== Console logs ===');
  logs.forEach(l => console.log(l));
  
  await page.screenshot({ path: 'D:/Downloads/.vibeCode/bd_todolist/playwright-screenshot.png', fullPage: true });
  console.log('\nScreenshot saved');
  
  const rootHTML = await page.innerHTML('#root');
  console.log('\n=== #root HTML (first 800) ===');
  console.log(rootHTML.substring(0, 800));
  
  await browser.close();
})().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});