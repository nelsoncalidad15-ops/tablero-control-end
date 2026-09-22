const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');

const base = process.env.REPORT_TEST_URL || 'http://localhost:3000/tablero-control-end/';
const output = process.env.REPORT_TEST_OUTPUT || path.join(require('node:os').tmpdir(), 'autosol-report-check');

async function main() {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
    page.on('requestfailed', request => console.error(request.url(), request.failure()?.errorText));
    const survey = { sucursal: 'JUJUY', mes: 'Diciembre', anio: 2025 };
    const fixtures = {
      fetchDetailedQualityData: [],
      fetchSalesQualityData: [
        { ...survey, cem_general: 2, cem_trato: 3 },
        { ...survey, cem_general: null },
        { ...survey, anio: 2026, cem_general: 5 },
        { ...survey, sucursal: 'SALTA', cem_general: 4 }
      ],
      fetchQualityData: [{ mes: 'Enero', anio: 2026, sucursal: 'JUJUY' }],
      fetchSalesClaimsData: [],
      fetchCemOsData: [],
      fetchInternalPostventaData: [
        { ...survey, servicio_prestado: 2, lavado: 1 },
        { ...survey, servicio_prestado: null },
        { ...survey, anio: 2026, servicio_prestado: 5 }
      ]
    };
    await page.route('**/services/dataService.ts', route => route.fulfill({
      contentType: 'text/javascript',
      body: Object.entries(fixtures).map(([name, rows]) => `export async function ${name}() { return ${JSON.stringify(rows)}; }`).join('\n')
    }));
    await page.route('**/__report-check', route => route.fulfill({
      contentType: 'text/html',
      body: `<html><head><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body><div id="root"></div>
        <script type="module">
          import RefreshRuntime from '/tablero-control-end/@react-refresh';
          RefreshRuntime.injectIntoGlobalHook(window);
          window.$RefreshReg$ = () => {};
          window.$RefreshSig$ = () => type => type;
          window.__vite_plugin_react_preamble_installed__ = true;
          const React = (await import('/tablero-control-end/node_modules/.vite/deps/react.js')).default;
          const { default: ReactDOM } = await import('/tablero-control-end/node_modules/.vite/deps/react-dom_client.js');
          const { default: Report } = await import('/tablero-control-end/components/ProfessionalReport.tsx');
          await import('/tablero-control-end/index.css');
          ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Report, { config: { sheetUrls: {} }, onBack() {} }));
        </script></body></html>`
    }));
    await page.goto(`${base}__report-check`);
    await page.locator('.report-command-bar').waitFor({ timeout: 60000 });
    await page.locator('select').nth(0).selectOption({ label: 'Enero' });
    await page.locator('select').nth(1).selectOption('JUJUY');
    const sales = page.locator('.page-break-after-always').filter({ has: page.getByRole('heading', { name: /ENCUESTA INTERNA/ }) }).first();
    const service = page.locator('.page-break-after-always').filter({ has: page.getByText(/POSTVENTA .*DICIEMBRE 2025/) });
    await page.waitForTimeout(1200);
    assert.match(await sales.innerText(), /DICIEMBRE 2025/);
    assert.match(await sales.innerText(), /Respuestas con calificaciones: 1\./);
    assert.match(await sales.innerText(), /Sin respuestas sobre procesos/);
    assert.match(await sales.innerText(), /2\.00/);
    assert.match(await service.innerText(), /Satisfacci.n con el servicio: 2\.00/);
    assert.doesNotMatch(await service.innerText(), /niveles de excelencia/);
    await sales.screenshot({ path: path.join(output, 'internal-sales-desktop.png') });
    await service.screenshot({ path: path.join(output, 'internal-service-desktop.png') });
    const pageCount = await page.locator('.executive-report-document > .page-break-after-always').count();
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('.report-command-bar').isVisible(), false);
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true, path: path.join(output, 'report.pdf') });
    assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length, pageCount, 'One PDF page per report section');
    await page.emulateMedia({ media: 'screen' });
    await page.locator('select').nth(0).selectOption({ label: 'Febrero' });
    await page.waitForTimeout(300);
    assert.match(await sales.innerText(), /Sin respuestas/);
    assert.match(await sales.innerText(), /Sin datos/);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(output, 'report-mobile.png') });
    const controls = await page.locator('.report-command-bar').boundingBox();
    assert.ok(controls.x >= 0 && controls.x + controls.width <= 390);
    assert.deepEqual(errors, []);
    console.log(`Report checks passed: year rollover, branch, response counts, empty state, mobile controls, ${pageCount} PDF pages. Artifacts: ${output}`);
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
