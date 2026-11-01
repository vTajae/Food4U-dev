import { test as base, expect, type Page, type TestInfo } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

export const ICD = /\b[A-TV-Z]\d{2}(\.\w{1,4})?\b/;
export type Gate = { check: (state: string, options?: { medical?: boolean }) => Promise<void> };

// Export the same observer used by product fixtures for negative self-tests.
export function observe(page: Page, origin: string, expected: { fault?: string; http?: { path: string; status: number }[] } = {}) {
  const errors: string[] = [];
  let expectedFaultSource: string | undefined;
  const handledResponses = new Map<string, Set<number>>();
  const componentResponses = new Map<string, number>();
  const rscAborts: { url: string; responseAt: string; failedAt: string; reached: boolean; settled: boolean }[] = [];
  // Main-frame commits, including same-document history updates (Playwright emits
  // framenavigated for both), show whether an aborted RSC target actually rendered.
  page.on('framenavigated', frame => {
    if (frame !== page.mainFrame()) return;
    const pathname = new URL(frame.url()).pathname;
    for (const abort of rscAborts) if (!abort.settled && new URL(abort.url).pathname === pathname) abort.reached = true;
  });
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.origin === origin && response.status() === 200 && response.headers()['content-type']?.startsWith('text/x-component')) {
      componentResponses.set(response.url(), Date.now());
    }
    if (url.origin === origin && expected.http?.some(item => item.path === url.pathname && item.status === response.status())) {
      const statuses = handledResponses.get(response.url()) ?? new Set<number>();
      statuses.add(response.status()); handledResponses.set(response.url(), statuses);
    }
  });
  page.on('console', message => {
    if (message.type() !== 'error') return;
    // The explicitly requested missing-document journey MUST return 404. Chrome
    // logs that expected document status as an error, not an application fault.
    // Only the exact document URL and exact native 404 text are exempted.
    if (message.location().url === `${origin}/this-page-does-not-exist-018` &&
      message.text() === 'Failed to load resource: the server responded with a status of 404 (Not Found)') return;
    // Opt-in, exact transport statuses deliberately exercised by a UI test.
    // Application console errors and undeclared statuses remain fatal.
    const native = /^Failed to load resource: the server responded with a status of (\d+) \([^)]+\)$/.exec(message.text());
    if (native && handledResponses.get(message.location().url)?.has(Number(native[1]))) return;
    // Only the private-build fault test may expect this exact React exception.
    if (expected.fault === 'E2E_ERROR_019_EXPECTED' && new URL(page.url()).pathname === '/e2e-error-019') {
      const firstLine = message.text().split('\n')[0];
      const source = /https?:\/\/[^\s)]+\.js/.exec(message.text())?.[0];
      if (firstLine === 'Error: E2E_ERROR_019_EXPECTED') {
        expectedFaultSource = source;
        return;
      }
      // React emits a second component-stack diagnostic for that same caught
      // fault. Permit only its immediate, same-source companion, once.
      if (expectedFaultSource && source === expectedFaultSource && firstLine === 'The above error occurred in a React component:') {
        expectedFaultSource = undefined;
        return;
      }
    }
    expectedFaultSource = undefined;
    errors.push(`console.error: ${message.text()} @ ${message.location().url}`);
  });
  page.on('pageerror', error => {
    if (expected.fault === 'E2E_ERROR_019_EXPECTED' && new URL(page.url()).pathname === '/e2e-error-019' && error.message === expected.fault) return;
    errors.push(`pageerror: ${error.message}`);
  });
  page.on('requestfailed', request => {
    const url = new URL(request.url());
    if (url.origin !== origin) return;
    const headers = request.headers();
    const responseAt = componentResponses.get(request.url());
    // D019-01: only a live RSC stream with an earlier,
    // exact-URL successful component response may wait for the committed URL.
    if (request.method() === 'GET' && headers.rsc === '1' && !Object.hasOwn(headers, 'next-router-prefetch') &&
      request.failure()?.errorText === 'net::ERR_ABORTED' && responseAt !== undefined) {
      rscAborts.push({ url: request.url(), responseAt: new Date(responseAt).toISOString(), failedAt: new Date().toISOString(),
        reached: new URL(page.url()).pathname === url.pathname, settled: false });
      return;
    }
    errors.push(`same-origin requestfailed: ${request.method()} ${request.url()} ${request.failure()?.errorText}`);
  });
  page.on('request', request => {
    if (/(^|\.)onrender\.com$/i.test(new URL(request.url()).hostname)) errors.push(`ONRENDER REQUEST DENIED: ${request.url()}`);
  });
  return {
    errors,
    checkRequests(info?: TestInfo) {
      // 019b: tolerated only if the main frame was on, or later committed to, the
      // aborted pathname before this check (or teardown). Each abort settles once;
      // later navigation can neither excuse nor resurrect it.
      for (const abort of rscAborts) {
        if (abort.settled) continue;
        abort.settled = true;
        if (!abort.reached && new URL(page.url()).pathname !== new URL(abort.url).pathname) {
          errors.push(`same-origin requestfailed: GET ${abort.url} net::ERR_ABORTED; the page never committed that pathname before the gate (now ${page.url()})`);
        } else if (info) {
          info.annotations.push({ type: 'tolerated-rsc-abort', description: JSON.stringify({ url: abort.url, responseAt: abort.responseAt, failedAt: abort.failedAt, checkedAt: new Date().toISOString() }) });
        }
      }
      expect(errors, 'No console errors, page errors, failed same-origin or Render requests').toEqual([]);
    },
  };
}

export async function checkPage(page: Page, observation: ReturnType<typeof observe>, medical: boolean, info?: TestInfo) {
  observation.checkRequests(info);
  if (medical) expect(await page.locator('body').innerText(), 'ICD codes must not be visible').not.toMatch(ICD);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  if (info) await info.attach('axe-results', { body: JSON.stringify(results, null, 2), contentType: 'application/json' });
  const blocking = results.violations.filter(item => item.impact === 'serious' || item.impact === 'critical');
  expect(blocking.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => node.target) })), 'axe serious/critical WCAG 2.1 AA violations').toEqual([]);
  observation.checkRequests(info);
}

export const test = base.extend<{ gate: Gate }>({
  // eslint-disable-next-line no-empty-pattern -- Playwright option fixtures require an explicit dependency object.
  baseURL: async ({}, use) => { await use(process.env.E2E_BASE_URL!); },
  // eslint-disable-next-line no-empty-pattern -- This option depends only on the setup process environment.
  proxy: async ({}, use) => {
    await use(process.env.E2E_PROXY_URL ? { server: process.env.E2E_PROXY_URL, bypass: '<-loopback>,127.0.0.1,localhost' } : undefined);
  },
  context: async ({ context }, use) => {
    // Only this exact non-product stylesheet is stubbed. It avoids contacting
    // Google and makes offline runs deterministic; screenshots use fallback fonts.
    // Only the narrowly documented expected native-404 console message is exempt.
    await context.route('https://fonts.googleapis.com/css2?*', route => route.fulfill({ contentType: 'text/css', body: '/* offline font boundary; see e2e/README.md */' }));
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin === process.env.E2E_BASE_URL || url.hostname === 'fonts.googleapis.com') return route.fallback();
      return route.abort('blockedbyclient');
    });
    await use(context);
  },
  gate: [async ({ page, baseURL }, use, info) => {
    const errors = observe(page, new URL(baseURL!).origin, {
      fault: info.annotations.find(item => item.type === 'expected-error')?.description,
      http: info.annotations.filter(item => item.type === 'expected-http-error').map(item => {
        const [path, status] = item.description!.split(':'); return { path, status: Number(status) };
      }),
    });
    try {
      await use({ check: async (state, options = {}) => {
        errors.checkRequests(info);
        await page.screenshot({ path: info.outputPath(`018-${state}.png`), fullPage: true, animations: 'disabled' });
        await checkPage(page, errors, options.medical ?? /\/(welcome|dashboard)/.test(new URL(page.url()).pathname), info);
      } });
    } finally {
      // The URL/request check also runs for closed or blank pages; only DOM
      // inspection is skipped there. Test failures cannot bypass teardown.
      errors.checkRequests(info);
      if (!page.isClosed() && page.url() !== 'about:blank') await checkPage(page, errors, /\/(welcome|dashboard)/.test(new URL(page.url()).pathname), info);
    }
  }, { auto: true }],
});
export { expect };
