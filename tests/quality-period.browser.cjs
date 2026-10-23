const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
(async () => {
  const browser = await chromium.launch({headless: true});
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
    page.on('console', message => { if (message.type() === 'error') console.error(message.text()); });
    const rows = [
      {cod_id:'1', mes:'Septiembre', cliente:'Cliente septiembre', fecha_fin_encuesta:'2026-09-30 23:59:59'},
      {cod_id:'2', mes:'Octubre', cliente:'Cliente doble', fecha_fin_encuesta:'2026-10-20 23:59:59', categorizacion:'Asesoramiento deficiente, Nueva falla'},
      {cod_id:'3', mes:'Octubre', cliente:'Cliente sin fecha'}
    ].map(row => ({asesor:'Asesor prueba', orden:row.cod_id, q4_score:4, ...row}));
    await page.route('**/services/dataService.ts*', route => route.fulfill({contentType:'text/javascript', body:`export async function fetchDetailedQualityData(key) { return key === 'jujuy' ? ${JSON.stringify(rows)} : []; }`}));
    await page.route('**/__quality-check', route => route.fulfill({contentType:'text/html', body:`<html><body><div id="root"></div><script type="module">
      import RefreshRuntime from '/tablero-control-end/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      const React = (await import('/tablero-control-end/node_modules/.vite/deps/react.js')).default;
      const {default: ReactDOM} = await import('/tablero-control-end/node_modules/.vite/deps/react-dom.js');
      const {default: Dashboard} = await import('/tablero-control-end/components/DetailedQualityPostventa.tsx');
      await import('/tablero-control-end/index.css');
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Dashboard, {sheetUrls:{jujuy:'jujuy',salta:'salta'},onBack(){}}));
    </script></body></html>`}));
    await page.goto(process.env.QUALITY_TEST_URL || 'http://127.0.0.1:3013/tablero-control-end/__quality-check');
    await page.getByText('Cliente doble', {exact:true}).waitFor();
    await page.locator('summary').click();
    await page.getByRole('checkbox',{name:'Septiembre',exact:true}).check();
    assert.equal(await page.getByText('Cliente doble',{exact:true}).count(),0);
    await page.getByRole('checkbox',{name:'Octubre',exact:true}).check();
    await page.getByText('Cliente doble',{exact:true}).waitFor();
    await page.getByText('Cliente septiembre',{exact:true}).waitFor();
    await page.locator('summary').click();
    await page.getByLabel('Desde',{exact:true}).fill('2026-10-20');
    await page.getByLabel('Hasta',{exact:true}).fill('2026-10-20');
    await page.getByText('Cliente doble',{exact:true}).waitFor();
    assert.equal(await page.getByText('Cliente septiembre',{exact:true}).count(),0);
    assert.equal(await page.getByText('Cliente sin fecha',{exact:true}).count(),0);
    await page.getByText('Asesoramiento deficiente',{exact:true}).click();
    await page.getByText('Cliente doble',{exact:true}).waitFor();
    await page.getByText('Nueva falla',{exact:true}).click();
    await page.getByText('Cliente doble',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Limpiar Filtros'}).click();
    await page.getByText('Cliente septiembre',{exact:true}).waitFor();
    await page.getByText('Cliente sin fecha',{exact:true}).waitFor();
    assert.equal(await page.getByLabel('Desde',{exact:true}).inputValue(),'');
    assert.deepEqual(errors,[]);
    console.log('OK: varios meses, rango inclusivo, categorías múltiples y limpiar filtros');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
