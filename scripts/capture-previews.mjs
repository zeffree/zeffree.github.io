import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = resolve(ROOT, 'portfolio.config.json');
const PREVIEW_DIRECTORY = resolve(ROOT, 'assets', 'previews');
const VIEWPORT = { width: 1440, height: 900 };
const REPOSITORY_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/;
const HELP = `Capture real public project previews.

Usage: node scripts/capture-previews.mjs [--catalog <path>] [repository-name ...]

Defaults to projects.json and all projects with portfolio.config.json curation.
--catalog accepts a local catalog JSON array with unique names and http(s) URLs.
Repository arguments must match that catalog; direct URL arguments are rejected.

Uses installed Playwright Chromium. Set PLAYWRIGHT_CHANNEL=msedge to use Edge.
Each capture uses a fresh unauthenticated 1440×900 context and no user actions.
Writes 1280×800 and 640×400 WebP images and matching preview metadata only.
Failed captures are reported, retain any previous preview, and exit nonzero.
This optional helper is never invoked by the daily build.`;

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isText = (value) => typeof value === 'string' && value.trim().length > 0;
const readJson = async (path) => JSON.parse((await readFile(path, 'utf8')).replace(/^\uFEFF/, ''));

export function parseArguments(args) {
  const options = { catalog: resolve(ROOT, 'projects.json'), names: [], help: false };
  let explicitCatalog = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--help' || argument === '-h') {
      options.help = true;
    } else if (argument === '--catalog') {
      const path = args[++index];
      if (explicitCatalog || !path || path.startsWith('--') || /^https?:/i.test(path)) {
        throw new Error('--catalog requires one local JSON file path.');
      }
      options.catalog = resolve(ROOT, path);
      explicitCatalog = true;
    } else if (!REPOSITORY_NAME.test(argument)) {
      throw new Error(`Invalid repository argument "${argument}". Use --help for usage.`);
    } else {
      options.names.push(argument);
    }
  }
  options.names = [...new Set(options.names)];
  return options;
}

export function validateCatalog(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('The catalog must be a nonempty project array.');
  }
  const names = new Set();
  return value.map((project) => {
    if (!isObject(project) || typeof project.name !== 'string' || !REPOSITORY_NAME.test(project.name)) {
      throw new Error('Every catalog project needs a safe repository name.');
    }
    if (names.has(project.name)) throw new Error(`Duplicate catalog project "${project.name}".`);
    names.add(project.name);
    let url;
    try {
      if (!isText(project.url)) throw new Error('Missing URL.');
      url = new URL(project.url);
    } catch {
      throw new Error(`Invalid project URL for "${project.name}".`);
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      throw new Error(`Only credential-free http(s) project URLs are allowed: "${project.name}".`);
    }
    return { name: project.name, url: url.href };
  });
}

export function validateMetadata(value) {
  if (!isObject(value) || !isObject(value.projects)) {
    throw new Error('portfolio.config.json must contain a projects object.');
  }
  for (const [name, project] of Object.entries(value.projects)) {
    if (!REPOSITORY_NAME.test(name) || !isObject(project)
      || !['title', 'summary', 'category'].every((key) => isText(project[key]))) {
      throw new Error(`Invalid curated metadata for "${name}".`);
    }
    if ('featured' in project && (!Number.isInteger(project.featured) || project.featured < 1)) {
      throw new Error(`The featured rank for "${name}" must be a positive integer.`);
    }
  }
  return value;
}

export function assertUsablePage({ title, text }) {
  if (!isText(text) || /^(?:loading|please wait)[\s.…!]*$/i.test(text.trim())) {
    throw new Error('The page did not render useful content.');
  }
  if (/^(?:403|404|500|502|503)(?:\b|$)/.test(title.trim())
    || /\b(?:page not found|site not found|404 not found|internal server error|bad gateway|service unavailable)\b/i.test(title)
    || /^(?:404\b|file not found\b|page not found\b|not found\b|there isn't a github pages site here\b|application error:)/i.test(text.trim())) {
    throw new Error(`The rendered page is an error page: ${title || text.slice(0, 100)}.`);
  }
}

async function capturePage(browser, project) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    locale: 'en-US',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  });
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    const response = await page.goto(project.url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    if (!response || !response.ok()) {
      throw new Error(`HTTP ${response ? response.status() : 'response missing'}.`);
    }
    if (!/text\/html|application\/xhtml\+xml/i.test(response.headers()['content-type'] ?? '')) {
      throw new Error('The project URL did not return an HTML page.');
    }
    await page.locator('body').waitFor({ state: 'visible' });
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {
      console.warn(`[wait] ${project.name}: network remained active; using the bounded render wait.`);
    });
    const fontsReady = await page.evaluate(() => Promise.race([
      document.fonts.ready.then(() => true),
      new Promise((done) => setTimeout(() => done(false), 5_000)),
    ]));
    if (!fontsReady) console.warn(`[wait] ${project.name}: fonts were still pending after 5 seconds.`);
    await page.waitForTimeout(1_500);
    const finalUrl = new URL(page.url());
    if (!['http:', 'https:'].includes(finalUrl.protocol) || finalUrl.host !== new URL(project.url).host) {
      throw new Error(`Unexpected redirect to ${page.url()}.`);
    }
    const content = await page.evaluate(() => ({
      title: document.title,
      text: document.body.innerText,
      headings: [...document.querySelectorAll('h1, h2, h3')]
        .filter((heading) => {
          const bounds = heading.getBoundingClientRect();
          return bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0
            && bounds.top < innerHeight && bounds.right > 0 && bounds.left < innerWidth;
        })
        .map((heading) => heading.innerText.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .slice(0, 3),
    }));
    assertUsablePage(content);
    const image = await page.screenshot({
      type: 'png',
      fullPage: false,
      animations: 'disabled',
      caret: 'hide',
      timeout: 15_000,
    });
    return { image, headings: content.headings };
  } finally {
    await context.close();
  }
}

async function encodePreview(image, width, height, target, maximum, qualities) {
  let result;
  for (const quality of qualities) {
    result = await sharp(image)
      .resize(width, height, { fit: 'fill' })
      .webp({ quality, effort: 6, smartSubsample: true })
      .toBuffer();
    if (result.length <= target) return result;
  }
  if (result.length > maximum) {
    throw new Error(`The ${width}px preview exceeds its ${Math.round(maximum / 1024)} KiB size budget.`);
  }
  return result;
}

async function savePreview(project, capture) {
  const [large, small] = await Promise.all([
    encodePreview(capture.image, 1280, 800, 100 * 1024, 180 * 1024, [88, 84, 80, 76]),
    encodePreview(capture.image, 640, 400, 30 * 1024, 60 * 1024, [84, 80, 76, 72]),
  ]);
  // Preserve text-curation edits made while the screenshot was being captured.
  const config = validateMetadata(await readJson(CONFIG_PATH));
  const curated = config.projects[project.name];
  if (!curated) throw new Error('Curated metadata was removed while the page was being captured.');
  const previousAlt = curated.preview?.alt;
  const headingDescription = capture.headings.join('; ');
  const preview = {
    src: `assets/previews/${project.name}-1280.webp`,
    small: `assets/previews/${project.name}-640.webp`,
    width: 1280,
    height: 800,
    alt: isText(previousAlt) ? previousAlt
      : `${curated.title} project page${headingDescription ? ` showing ${headingDescription}` : ''}`,
    capturedAt: new Date().toISOString().slice(0, 10),
  };
  await mkdir(PREVIEW_DIRECTORY, { recursive: true });
  await writeFile(resolve(PREVIEW_DIRECTORY, `${project.name}-1280.webp`), large);
  await writeFile(resolve(PREVIEW_DIRECTORY, `${project.name}-640.webp`), small);
  curated.preview = preview;
  await writeFile(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`);
  return { large: large.length, small: small.length };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log(HELP);
    return;
  }
  const catalog = validateCatalog(await readJson(options.catalog));
  const config = validateMetadata(await readJson(CONFIG_PATH));
  const knownProjects = new Map(catalog.map((project) => [project.name, project]));
  for (const name of options.names) {
    if (!knownProjects.has(name)) throw new Error(`Unknown catalog project "${name}".`);
    if (!Object.hasOwn(config.projects, name)) throw new Error(`No curated metadata for "${name}".`);
  }
  const projects = options.names.length
    ? options.names.map((name) => knownProjects.get(name))
    : catalog.filter((project) => {
      if (Object.hasOwn(config.projects, project.name)) return true;
      console.warn(`[skip] ${project.name}: no curated metadata; catalog discovery is unaffected.`);
      return false;
    });
  if (projects.length === 0) throw new Error('No matching curated projects to capture.');

  let browser;
  let completed = 0;
  let failed = 0;
  let bytes = 0;
  try {
    browser = await chromium.launch({
      headless: true,
      ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
      timeout: 30_000,
    });
    for (const project of projects) {
      try {
        const capture = await capturePage(browser, project);
        const sizes = await savePreview(project, capture);
        completed += 1;
        bytes += sizes.large + sizes.small;
        console.log(`[ok] ${project.name}: ${(sizes.large / 1024).toFixed(1)} KiB + ${(sizes.small / 1024).toFixed(1)} KiB`);
      } catch (error) {
        failed += 1;
        console.error(`[failed] ${project.name} (${project.url}): ${error.message} No new preview metadata was saved.`);
      }
    }
  } finally {
    if (browser) await browser.close();
  }
  console.log(`Captured ${completed}/${projects.length} projects; ${failed} failed; ${completed * 2} assets; ${(bytes / 1024).toFixed(1)} KiB written.`);
  if (failed > 0) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(`Preview capture failed: ${error.message}`);
    process.exitCode = 1;
  });
}
