/**
 * Teste de fumaça no navegador: abre /admin e /viewer, aciona controles,
 * verifica erros de console e salva capturas em smoke-output/.
 *
 * Uso (com o servidor rodando em outro terminal: npm run dev  ou  npm run build && npm start):
 *   npm install --no-save playwright && npx playwright install chromium   (apenas na 1ª vez)
 *   npm run smoke
 *
 * Variáveis: BASE_URL (padrão http://localhost:3000), CHROMIUM_PATH (opcional).
 */
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';

// require() respeita NODE_PATH, permitindo usar um Playwright instalado globalmente.
const { chromium } = createRequire(import.meta.url)('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT = 'smoke-output';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const errors = [];
const check = (cond, msg) => {
  console.log(`${cond ? '✔' : '✘'} ${msg}`);
  if (!cond) errors.push(msg);
};

// Um único contexto: abas do mesmo "perfil", como no uso real (BroadcastChannel não cruza contextos).
const context = await browser.newContext();

async function openPage(path, viewport) {
  const page = await context.newPage();
  await page.setViewportSize(viewport);
  page.on('console', (m) => m.type() === 'error' && errors.push(`[console ${path}] ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`[pageerror ${path}] ${e.message}`));
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(2500);
  return page;
}

// ---------- /admin ----------
const admin = await openPage('/admin', { width: 1366, height: 768 });
check(await admin.locator('canvas').count() === 1, 'admin: canvas 3D presente');
check(await admin.getByText('MODELO PROVISÓRIO').count() > 0, 'admin: aviso de modelo provisório visível');
await admin.screenshot({ path: `${OUT}/admin-inicial.png` });

const fpsText = await admin.locator('.preview-hud').innerText();
check(/\d+ FPS/.test(fpsText) && parseInt(fpsText) > 0, `admin: renderizando (${fpsText})`);

await admin.waitForTimeout(6500);
const blinks = parseInt(await admin.getByTestId('status-blinks').innerText());
check(blinks >= 1, `admin: piscadas automáticas acontecendo (${blinks})`);

await admin.getByRole('button', { name: /Feliz/ }).click();
await admin.getByTestId('gesture-wave').click();
await admin.waitForTimeout(400);
check((await admin.getByTestId('status-gesture').innerText()).includes('Acenar'), 'admin: gesto acenar em execução');
await admin.waitForTimeout(600);
await admin.screenshot({ path: `${OUT}/admin-acenando.png` });

// Viewer em outra aba recebe comandos do painel
const viewer = await openPage('/viewer?camera=busto', { width: 540, height: 960 });
await viewer.screenshot({ path: `${OUT}/viewer-busto.png` });

await admin.getByTestId('demon-toggle').click();
await admin.getByRole('button', { name: 'Demoníaco' }).click();
await admin.waitForTimeout(3500);
await admin.screenshot({ path: `${OUT}/admin-demonio.png` });
await viewer.screenshot({ path: `${OUT}/viewer-demonio-espelhado.png` });

await admin.getByRole('button', { name: /Rosto/ }).click();
await admin.getByRole('button', { name: /Surpreso/ }).click();
await admin.waitForTimeout(2000);
await admin.screenshot({ path: `${OUT}/admin-rosto-surpreso.png` });

await admin.getByRole('button', { name: 'Corpo inteiro' }).click();
await admin.getByTestId('gesture-celebrate').click();
await admin.waitForTimeout(1400);
await viewer.screenshot({ path: `${OUT}/viewer-corpo-comemorando.png` });

// Modo transparente para OBS
const obs = await openPage('/viewer?transparent=1&nobadge=1&camera=busto', { width: 540, height: 960 });
const bg = await obs.evaluate(() => getComputedStyle(document.body).backgroundColor);
check(bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent', `viewer: fundo transparente (${bg})`);
await obs.screenshot({ path: `${OUT}/viewer-transparente.png`, omitBackground: true });

await browser.close();

const real = errors.filter((e) => !/GPU stall|WebGL.*performance|GL_CLOSE_PATH/i.test(e));
if (real.length) {
  console.error('\nFALHAS:\n' + real.join('\n'));
  process.exit(1);
}
console.log(`\nOK — capturas em ${OUT}/`);
