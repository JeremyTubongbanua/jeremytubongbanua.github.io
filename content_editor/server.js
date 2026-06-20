#!/usr/bin/env node
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT   = path.resolve(__dirname, '..');
const SITE_ROOT   = path.resolve(REPO_ROOT, 'site/src/pages/index');
const PAGES_ROOT  = path.resolve(REPO_ROOT, 'site/src/pages');
const LAYOUTS_ROOT = path.resolve(REPO_ROOT, 'site/src/layouts');
const TODOS_PATH  = path.resolve(REPO_ROOT, 'TODOs.md');
const PORT = 3131;

// ── helpers ───────────────────────────────────────────────────────────────────

function parseTodosPaths() {
  const raw = fs.readFileSync(TODOS_PATH, 'utf8');
  const set = new Set();
  for (const line of raw.split('\n')) {
    const m = line.match(/^- (site\/.+?\/index\.md)\s*$/);
    if (m) set.add(m[1]);
  }
  return set;
}

function scanAllPages() {
  const results = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'index.md') results.push(full);
    }
  }
  walk(SITE_ROOT);
  return results;
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { frontmatter: '', body: raw };
  return { frontmatter: match[1], body: match[2] };
}

function absToRel(abs) {
  const idx = abs.indexOf('site/src/pages/');
  return idx !== -1 ? abs.slice(idx) : abs;
}

function relToAbs(relPath) {
  return path.resolve(REPO_ROOT, relPath);
}

function readPage(relPath) {
  const abs = relToAbs(relPath);
  const raw = fs.readFileSync(abs, 'utf8');
  return { abs, ...parseFrontmatter(raw) };
}

function writePage(relPath, frontmatter, body) {
  const abs = relToAbs(relPath);
  fs.writeFileSync(abs, `---\n${frontmatter}\n---\n${body}`, 'utf8');
}

function classify(body) {
  const lines = body.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
  if (lines.length === 0) return 'empty';
  if (lines.length <= 1) return 'minimal';
  return 'ok';
}

function getSection(relPath) {
  if (relPath.includes('/experiences/')) return 'experiences';
  if (relPath.includes('/awards/')) return 'awards';
  if (relPath.includes('/projects/')) return 'projects';
  if (relPath.includes('/certifications/')) return 'certifications';
  return 'other';
}

// ── dead link / missing image / missing field audit ───────────────────────────

function parseFrontmatterFields(fm) {
  const fields = {};
  for (const line of fm.split('\n')) {
    const m = line.match(/^([a-zA-Z_]+):/);
    if (m) fields[m[1]] = true;
  }
  return fields;
}

function runAudit() {
  const absPaths = scanAllPages();
  const issues = [];

  // Build a set of all known internal page slugs: /index/section/slug/ → exists
  const knownPages = new Set();
  for (const abs of absPaths) {
    const rel = absToRel(abs); // e.g. site/src/pages/index/projects/foo/index.md
    const parts = rel.split('/');
    // parts: ['site','src','pages','index', section, slug, 'index.md']
    if (parts.length >= 7) {
      const section = parts[4];
      const slug = parts[5];
      knownPages.add(`/index/${section}/${slug}/`);
      knownPages.add(`/index/${section}/${slug}`);
    }
  }

  // Also add blog pages
  const blogDir = path.join(PAGES_ROOT, 'blog');
  if (fs.existsSync(blogDir)) {
    for (const entry of fs.readdirSync(blogDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        knownPages.add(`/blog/${entry.name}/`);
        knownPages.add(`/blog/${entry.name}`);
      }
    }
  }

  for (const abs of absPaths) {
    const relPath = absToRel(abs);
    const raw = fs.readFileSync(abs, 'utf8');
    const { frontmatter, body } = parseFrontmatter(raw);
    const pageDir = path.dirname(abs);
    const slug = relPath.split('/').at(-2);
    const section = getSection(relPath);

    // Check for missing required frontmatter fields
    const schema = SCHEMA[section];
    if (schema) {
      const present = parseFrontmatterFields(frontmatter);
      for (const field of schema) {
        if (field === 'layout') continue; // not user-facing
        if (!present[field]) {
          issues.push({ relPath, slug, section, type: 'missing-field', href: field, text: `missing frontmatter field` });
        }
      }
    }

    // Extract all markdown links: [text](url)
    const linkRe = /\[([^\]]*)\]\(([^)]+)\)/g;
    let m;
    while ((m = linkRe.exec(body)) !== null) {
      const [, text, href] = m;
      if (!href) continue;

      // Skip anchors, mailto, raw http external links that aren't images
      if (href.startsWith('#') || href.startsWith('mailto:')) continue;

      if (href.startsWith('http://') || href.startsWith('https://')) {
        // External — skip (would need network)
        continue;
      }

      if (href.startsWith('/')) {
        // Internal absolute path — check if the page exists
        const clean = href.replace(/\/$/, '');
        if (!knownPages.has(href) && !knownPages.has(clean + '/') && !knownPages.has(clean)) {
          // Check if it's a file path (like /pdfs/...)
          const filePath = path.join(PAGES_ROOT, '..', '..', 'public', href);
          const filePath2 = path.join(REPO_ROOT, 'site', 'public', href);
          if (!fs.existsSync(filePath) && !fs.existsSync(filePath2)) {
            issues.push({ relPath, slug, section, type: 'dead-link', href, text });
          }
        }
      } else {
        // Relative path — check file exists next to index.md
        const target = path.resolve(pageDir, href);
        if (!fs.existsSync(target)) {
          issues.push({ relPath, slug, section, type: 'dead-link', href, text });
        }
      }
    }

    // Extract all markdown images: ![alt](src)
    const imgRe = /!\[([^\]]*)\]\(([^)]+)\)/g;
    while ((m = imgRe.exec(body)) !== null) {
      const [, alt, src] = m;
      if (!src) continue;
      if (src.startsWith('http://') || src.startsWith('https://')) continue; // external
      if (src.startsWith('/')) {
        const filePath = path.join(REPO_ROOT, 'site', 'public', src);
        if (!fs.existsSync(filePath)) {
          issues.push({ relPath, slug, section, type: 'missing-image', href: src, text: alt || src });
        }
      } else {
        // Relative — resolve from page directory (strip leading ./)
        const clean = src.replace(/^\.\//, '');
        const target = path.join(pageDir, clean);
        if (!fs.existsSync(target)) {
          issues.push({ relPath, slug, section, type: 'missing-image', href: src, text: alt || src });
        }
      }
    }
  }

  return issues;
}

// ── frontmatter templates ─────────────────────────────────────────────────────

// Canonical field order per section
const SCHEMA = {
  experiences: ['title', 'subtitle', 'description', 'fromdate', 'todate', 'category', 'hidden', 'layout'],
  awards:      ['title', 'subtitle', 'description', 'placement', 'date', 'hidden', 'layout'],
  projects:    ['title', 'subtitle', 'description', 'date', 'languages', 'progress', 'association', 'hidden', 'layout'],
};

function makeExperienceFrontmatter(slug, title) {
  return `title: "${title}"
subtitle: ""
description: ""
fromdate: ""
todate: ""
category: ""
hidden: false
layout: ../../../../layouts/ExperienceLayout.astro`;
}

function makeAwardFrontmatter(slug, title) {
  return `title: "${title}"
subtitle: ""
description: ""
placement: ""
date: ""
hidden: false
layout: ../../../../layouts/AwardLayout.astro`;
}

function makeProjectFrontmatter(slug, title) {
  return `title: "${title}"
subtitle: ""
description: ""
date: ""
languages: []
progress: "In-Progress"
association: ""
hidden: false
layout: ../../../../layouts/ProjectLayout.astro`;
}

// ── http helpers ──────────────────────────────────────────────────────────────

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function parseBodyRaw(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', d => chunks.push(d));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

// ── request handler ───────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // GET /api/pages
  if (req.method === 'GET' && url.pathname === '/api/pages') {
    const todoSet = parseTodosPaths();
    const absPaths = scanAllPages();
    const pages = absPaths.map(abs => {
      const relPath = absToRel(abs);
      try {
        const raw = fs.readFileSync(abs, 'utf8');
        const { body } = parseFrontmatter(raw);
        const slug = relPath.split('/').at(-2);
        return { relPath, slug, section: getSection(relPath), status: classify(body), todo: todoSet.has(relPath) };
      } catch {
        return { relPath, slug: relPath, section: 'other', status: 'missing', todo: todoSet.has(relPath) };
      }
    });
    pages.sort((a, b) => {
      if (a.todo !== b.todo) return a.todo ? -1 : 1;
      if (a.section !== b.section) return a.section.localeCompare(b.section);
      return a.slug.localeCompare(b.slug);
    });
    return json(res, pages);
  }

  // GET /api/page?path=...
  if (req.method === 'GET' && url.pathname === '/api/page') {
    const relPath = url.searchParams.get('path');
    if (!relPath) return json(res, { error: 'missing path' }, 400);
    try {
      const { frontmatter, body } = readPage(relPath);
      return json(res, { frontmatter, body });
    } catch (e) {
      return json(res, { error: e.message }, 404);
    }
  }

  // POST /api/page — save body
  if (req.method === 'POST' && url.pathname === '/api/page') {
    const buf = await parseBodyRaw(req);
    let payload;
    try { payload = JSON.parse(buf.toString()); } catch { return json(res, { error: 'bad json' }, 400); }
    const { relPath, body, frontmatter } = payload;
    if (!relPath || body === undefined || frontmatter === undefined) return json(res, { error: 'missing fields' }, 400);
    try {
      writePage(relPath, frontmatter, body);
      return json(res, { ok: true });
    } catch (e) {
      return json(res, { error: e.message }, 500);
    }
  }

  // POST /api/upload?path=<page-relpath>&name=<filename>&overwrite=1
  if (req.method === 'POST' && url.pathname === '/api/upload') {
    const pageRelPath = url.searchParams.get('path');
    const name = url.searchParams.get('name') || 'image.png';
    const overwrite = url.searchParams.get('overwrite') === '1';
    if (!pageRelPath) return json(res, { error: 'missing path' }, 400);
    const pageDir = path.dirname(relToAbs(pageRelPath));
    const safeName = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
    const dest = path.join(pageDir, safeName);
    if (!overwrite && fs.existsSync(dest)) {
      return json(res, { error: 'exists', filename: safeName }, 409);
    }
    try {
      const buf = await parseBodyRaw(req);
      fs.writeFileSync(dest, buf);
      return json(res, { ok: true, filename: safeName, markdown: `![](${safeName})` });
    } catch (e) {
      return json(res, { error: e.message }, 500);
    }
  }

  // POST /api/toggle-todo?path=...
  if (req.method === 'POST' && url.pathname === '/api/toggle-todo') {
    const relPath = url.searchParams.get('path');
    if (!relPath) return json(res, { error: 'missing path' }, 400);
    try {
      let raw = fs.readFileSync(TODOS_PATH, 'utf8');
      const entry = `- ${relPath}`;
      if (raw.includes(entry)) {
        // Remove the line
        raw = raw.split('\n').filter(l => l.trim() !== entry.trim()).join('\n');
        fs.writeFileSync(TODOS_PATH, raw);
        return json(res, { ok: true, todo: false });
      } else {
        // Add under the appropriate section header, or at end of Blank Pages section
        const section = getSection(relPath);
        const sectionLabel = section === 'experiences' ? 'Experiences (empty)'
          : section === 'awards' ? 'Awards (empty)'
          : section === 'projects' ? 'Projects (empty)' : null;
        if (sectionLabel && raw.includes(sectionLabel)) {
          raw = raw.replace(sectionLabel + '\n', sectionLabel + '\n' + entry + '\n');
        } else {
          raw = raw.trimEnd() + '\n' + entry + '\n';
        }
        fs.writeFileSync(TODOS_PATH, raw);
        return json(res, { ok: true, todo: true });
      }
    } catch (e) {
      return json(res, { error: e.message }, 500);
    }
  }

  // GET /api/audit — scan all pages for dead links and missing images
  if (req.method === 'GET' && url.pathname === '/api/audit') {
    try {
      return json(res, runAudit());
    } catch (e) {
      return json(res, { error: e.message }, 500);
    }
  }

  // POST /api/open-folder?path=<page-relpath>
  if (req.method === 'POST' && url.pathname === '/api/open-folder') {
    const relPath = url.searchParams.get('path');
    if (!relPath) return json(res, { error: 'missing path' }, 400);
    const dir = path.dirname(relToAbs(relPath));
    try {
      execSync(`open "${dir}"`);
      return json(res, { ok: true });
    } catch (e) {
      return json(res, { error: e.message }, 500);
    }
  }

  // POST /api/new-page — create a new index.md
  if (req.method === 'POST' && url.pathname === '/api/new-page') {
    const buf = await parseBodyRaw(req);
    let payload;
    try { payload = JSON.parse(buf.toString()); } catch { return json(res, { error: 'bad json' }, 400); }
    const { section, slug, title } = payload;
    if (!section || !slug || !title) return json(res, { error: 'missing fields' }, 400);
    const safeSlug = slug.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const dir = path.join(SITE_ROOT, section, safeSlug);
    const file = path.join(dir, 'index.md');
    if (fs.existsSync(file)) return json(res, { error: 'exists', slug: safeSlug }, 409);
    let fm;
    if (section === 'experiences') fm = makeExperienceFrontmatter(safeSlug, title);
    else if (section === 'awards') fm = makeAwardFrontmatter(safeSlug, title);
    else fm = makeProjectFrontmatter(safeSlug, title);
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, `---\n${fm}\n---\n`);
      const relPath = absToRel(file);
      return json(res, { ok: true, relPath, slug: safeSlug });
    } catch (e) {
      return json(res, { error: e.message }, 500);
    }
  }

  // GET / — serve app
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(HTML);
  }

  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, () => {
  console.log(`content_editor running at http://localhost:${PORT}`);
});

// ── embedded HTML ─────────────────────────────────────────────────────────────

const HTML = /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>content_editor</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #111;
    --surface: #1a1a1a;
    --border: #2e2e2e;
    --accent: #4f9eff;
    --text: #e0e0e0;
    --muted: #666;
    --empty: #ff6b6b;
    --minimal: #f0a500;
    --ok: #4caf50;
    --todo: #b97cff;
    font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
    font-size: 13px;
  }
  body { background: var(--bg); color: var(--text); height: 100dvh; display: flex; flex-direction: column; overflow: hidden; }

  /* ── header ── */
  header { padding: 8px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  header h1 { font-size: 14px; font-weight: 600; color: var(--accent); }
  .header-tabs { display: flex; gap: 2px; margin-left: 12px; }
  .tab-btn { background: none; border: 1px solid transparent; border-radius: 4px; padding: 3px 12px; color: var(--muted); cursor: pointer; font: inherit; font-size: 12px; }
  .tab-btn:hover { color: var(--text); }
  .tab-btn.active { border-color: var(--border); color: var(--text); background: var(--surface); }
  .legend { margin-left: auto; display: flex; gap: 14px; align-items: center; font-size: 11px; color: var(--muted); }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
  .dot.empty   { background: var(--empty); }
  .dot.minimal { background: var(--minimal); }
  .dot.ok      { background: var(--ok); }
  .dot.todo    { background: var(--todo); border-radius: 2px; }

  /* ── layout ── */
  .layout { display: flex; flex: 1; overflow: hidden; }
  .view { display: none; flex: 1; overflow: hidden; }
  .view.active { display: flex; }

  /* ── editor view ── */
  .sidebar { width: 270px; border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0; }
  .sidebar-top { padding: 8px; border-bottom: 1px solid var(--border); display: flex; gap: 6px; }
  .sidebar-top input { flex: 1; min-width: 0; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 5px 8px; color: var(--text); outline: none; font: inherit; }
  .sidebar-top input:focus { border-color: var(--accent); }
  .filter-btn { background: var(--surface); border: 1px solid var(--border); border-radius: 4px; padding: 4px 8px; color: var(--muted); cursor: pointer; font: inherit; font-size: 11px; white-space: nowrap; }
  .filter-btn.active { border-color: var(--todo); color: var(--todo); }
  .new-btn { background: var(--surface); border: 1px solid var(--border); border-radius: 4px; padding: 4px 8px; color: var(--muted); cursor: pointer; font: inherit; font-size: 15px; line-height: 1; white-space: nowrap; }
  .new-btn:hover { color: var(--accent); border-color: var(--accent); }
  .page-list { overflow-y: auto; flex: 1; }
  .section-label { padding: 8px 10px 3px; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); display: flex; gap: 6px; }
  .page-item { padding: 6px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; border-left: 3px solid transparent; }
  .page-item:hover { background: var(--surface); }
  .page-item.active { background: var(--surface); border-left-color: var(--accent); }
  .page-item.is-todo { border-left-color: var(--todo); }
  .page-item.is-todo.active { border-left-color: var(--accent); }
  .page-item .slug { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .status-dot.empty   { background: var(--empty); }
  .status-dot.minimal { background: var(--minimal); }
  .status-dot.ok      { background: var(--ok); }
  .todo-pip { width: 5px; height: 5px; border-radius: 1px; background: var(--todo); flex-shrink: 0; }

  /* ── editor pane ── */
  .editor-pane { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .editor-header { padding: 8px 12px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; flex-shrink: 0; min-height: 39px; }
  .section-tag { background: var(--surface); border: 1px solid var(--border); border-radius: 3px; padding: 2px 7px; font-size: 11px; color: var(--muted); flex-shrink: 0; }
  .todo-tag { background: #2a1a40; border: 1px solid var(--todo); border-radius: 3px; padding: 2px 7px; font-size: 11px; color: var(--todo); flex-shrink: 0; }
  .editor-path { color: var(--muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
  .open-folder-btn { background: var(--surface); border: 1px solid var(--border); border-radius: 4px; padding: 2px 8px; font: inherit; font-size: 11px; color: var(--muted); cursor: pointer; flex-shrink: 0; white-space: nowrap; }
  .open-folder-btn:hover { color: var(--text); }
  .todo-toggle-btn { border: 1px solid var(--border); border-radius: 4px; padding: 2px 8px; font: inherit; font-size: 11px; cursor: pointer; flex-shrink: 0; white-space: nowrap; background: var(--surface); color: var(--muted); }
  .todo-toggle-btn.is-todo { background: #2a1a40; border-color: var(--todo); color: var(--todo); }
  .todo-toggle-btn:hover { opacity: .8; }
  .fm-panel { background: var(--surface); border-bottom: 1px solid var(--border); font-size: 11px; color: var(--muted); flex-shrink: 0; line-height: 1.5; display: flex; flex-direction: column; }
  .fm-label { padding: 4px 16px 2px; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: var(--border); cursor: pointer; user-select: none; display: flex; align-items: center; gap: 6px; }
  .fm-label:hover { color: var(--muted); }
  .fm-body { display: none; flex-direction: column; }
  .fm-body.open { display: flex; }
  .fm-fields { padding: 6px 16px 4px; display: flex; flex-direction: column; gap: 5px; }
  .fm-row { display: flex; align-items: center; gap: 8px; }
  .fm-key { width: 100px; flex-shrink: 0; color: var(--muted); font-size: 11px; text-align: right; }
  .fm-val { flex: 1; background: var(--bg); border: 1px solid var(--border); border-radius: 3px; padding: 3px 7px; color: var(--text); font: inherit; font-size: 11px; outline: none; min-width: 0; }
  .fm-val:focus { border-color: var(--accent); }
  .fm-val select { width: 100%; }
  select.fm-val { appearance: none; cursor: pointer; }
  .fm-raw-toggle { padding: 2px 16px 6px; font-size: 10px; color: var(--border); cursor: pointer; width: fit-content; }
  .fm-raw-toggle:hover { color: var(--muted); }
  .fm-textarea { resize: none; background: var(--surface); color: var(--muted); border: none; border-top: 1px solid var(--border); outline: none; padding: 8px 16px; font: inherit; line-height: 1.5; tab-size: 2; max-height: 180px; overflow-y: auto; display: none; width: 100%; }
  .fm-textarea.open { display: block; }
  .fm-textarea:focus { color: var(--text); }
  .editor-body { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; }
  textarea { flex: 1; resize: none; background: var(--bg); color: var(--text); border: none; outline: none; padding: 16px; font: inherit; line-height: 1.7; tab-size: 2; }
  .paste-overlay { position: absolute; inset: 0; background: rgba(79,158,255,.08); border: 2px dashed var(--accent); display: none; align-items: center; justify-content: center; font-size: 14px; color: var(--accent); pointer-events: none; }
  .paste-overlay.visible { display: flex; }
  .editor-footer { padding: 8px 16px; border-top: 1px solid var(--border); display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  .save-btn { background: var(--accent); color: #000; border: none; border-radius: 4px; padding: 5px 16px; font: inherit; font-weight: 600; cursor: pointer; }
  .save-btn:hover { opacity: .85; }
  .save-btn:disabled { opacity: .4; cursor: default; }
  .status-msg { font-size: 11px; color: var(--muted); }
  .status-msg.saved { color: var(--ok); }
  .status-msg.error { color: var(--empty); }
  .char-count { margin-left: auto; font-size: 11px; color: var(--muted); }
  .empty-state { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--muted); }
  .kbd { display: inline-block; background: var(--surface); border: 1px solid var(--border); border-radius: 3px; padding: 1px 5px; font-size: 11px; }

  /* ── audit view ── */
  .audit-view { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .audit-toolbar { padding: 10px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  .audit-toolbar h2 { font-size: 13px; font-weight: 600; }
  .refresh-btn { background: var(--surface); border: 1px solid var(--border); border-radius: 4px; padding: 4px 12px; color: var(--muted); cursor: pointer; font: inherit; font-size: 12px; }
  .refresh-btn:hover { color: var(--text); }
  .audit-list { overflow-y: auto; flex: 1; padding: 0; }
  .audit-empty { padding: 32px 20px; color: var(--ok); text-align: center; }
  .audit-group { border-bottom: 1px solid var(--border); }
  .audit-group-header { padding: 8px 16px; background: var(--surface); font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
  .audit-group-header:hover { color: var(--text); }
  .audit-group-header .ag-slug { color: var(--text); font-weight: 600; }
  .audit-group-header .ag-count { color: var(--border); }
  .audit-items { display: none; }
  .audit-items.open { display: block; }
  .audit-item { padding: 6px 16px 6px 28px; display: flex; align-items: flex-start; gap: 10px; border-top: 1px solid var(--border); }
  .audit-item:hover { background: var(--surface); }
  .audit-type { font-size: 10px; border-radius: 3px; padding: 1px 5px; flex-shrink: 0; margin-top: 1px; }
  .audit-type.dead-link { background: #3a1a1a; color: var(--empty); }
  .audit-type.missing-image { background: #2a2000; color: var(--minimal); }
  .audit-type.missing-field { background: #1a2a3a; color: var(--accent); }
  .audit-href { flex: 1; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .audit-text { color: var(--text); }
  .audit-go { background: none; border: none; color: var(--accent); cursor: pointer; font: inherit; font-size: 11px; padding: 0; flex-shrink: 0; }
  .audit-go:hover { text-decoration: underline; }
  .audit-loading { padding: 32px 20px; color: var(--muted); text-align: center; }

  /* ── modal ── */
  .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.65); display: flex; align-items: center; justify-content: center; z-index: 100; }
  .modal { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px; width: 380px; display: flex; flex-direction: column; gap: 14px; }
  .modal h2 { font-size: 13px; font-weight: 600; }
  .modal-field { display: flex; flex-direction: column; gap: 5px; }
  .modal-field label { font-size: 11px; color: var(--muted); }
  .modal-field input, .modal-field select { background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 6px 10px; color: var(--text); font: inherit; outline: none; width: 100%; }
  .modal-field input:focus, .modal-field select:focus { border-color: var(--accent); }
  .modal-field input.conflict { border-color: var(--empty); }
  .modal-field select option { background: var(--surface); }
  .conflict-msg { font-size: 11px; color: var(--empty); display: none; }
  .conflict-msg.visible { display: block; }
  .modal-actions { display: flex; gap: 8px; justify-content: flex-end; }
  .modal-actions button { border: none; border-radius: 4px; padding: 5px 14px; font: inherit; cursor: pointer; }
  .btn-cancel { background: var(--surface); border: 1px solid var(--border) !important; color: var(--muted); }
  .btn-confirm { background: var(--accent); color: #000; font-weight: 600; }
  .btn-confirm:disabled { opacity: .4; cursor: default; }
  .modal a { color: var(--empty); }
</style>
</head>
<body>
<header>
  <h1>content_editor</h1>
  <div class="header-tabs">
    <button class="tab-btn active" data-tab="editor">Pages</button>
    <button class="tab-btn" data-tab="audit">Audit</button>
  </div>
  <span style="color:var(--muted);font-size:11px;margin-left:4px"><span class="kbd">⌘S</span> save</span>
  <a href="http://localhost:4321/" target="_blank" style="font-size:11px;color:var(--muted);text-decoration:none;border:1px solid var(--border);border-radius:4px;padding:2px 8px;margin-left:4px;" onmouseover="this.style.color='var(--text)'" onmouseout="this.style.color='var(--muted)'">localhost:4321 ↗</a>
  <div class="legend">
    <span><span class="dot todo"></span>todo</span>
    <span><span class="dot empty"></span>empty</span>
    <span><span class="dot minimal"></span>minimal</span>
    <span><span class="dot ok"></span>ok</span>
  </div>
</header>
<div class="layout">

  <!-- ── EDITOR VIEW ── -->
  <div class="view active" id="view-editor" style="flex:1;overflow:hidden;display:flex;">
    <aside class="sidebar">
      <div class="sidebar-top">
        <input id="search" placeholder="filter…" autocomplete="off">
        <button class="filter-btn" id="todo-filter" title="Show only TODO pages">todos</button>
        <button class="new-btn" id="new-page-btn" title="New page">+</button>
      </div>
      <div class="page-list" id="page-list"></div>
    </aside>
    <div class="editor-pane" id="editor-pane">
      <div class="empty-state">← select a page to edit</div>
    </div>
  </div>

  <!-- ── AUDIT VIEW ── -->
  <div class="view" id="view-audit" style="flex:1;overflow:hidden;display:none;flex-direction:column;">
    <div class="audit-toolbar">
      <h2>Dead Links &amp; Missing Images</h2>
      <button class="refresh-btn" id="audit-refresh">Scan now</button>
      <span style="margin-left:auto;font-size:11px;color:var(--muted)" id="audit-summary"></span>
    </div>
    <div class="audit-list" id="audit-list">
      <div class="audit-loading">Click "Scan now" to run the audit.</div>
    </div>
  </div>

</div>

<script>
// ── state ─────────────────────────────────────────────────────────────────────
let allPages = [];
let current = null;
let dirty = false;
let todoOnly = false;

// ── tab switching ─────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById('view-editor').style.display = tab === 'editor' ? 'flex' : 'none';
    const auditEl = document.getElementById('view-audit');
    auditEl.style.display = tab === 'audit' ? 'flex' : 'none';
  });
});

// ── pages list ────────────────────────────────────────────────────────────────
async function loadPages() {
  const res = await fetch('/api/pages');
  allPages = await res.json();
  renderList();
}

function applyFilter() {
  const q = document.getElementById('search').value.toLowerCase();
  let list = todoOnly ? allPages.filter(p => p.todo) : allPages;
  if (q) list = list.filter(p => p.slug.includes(q) || p.section.includes(q));
  return list;
}

function groupBy(arr, key) {
  const map = {};
  for (const item of arr) (map[item[key]] ??= []).push(item);
  return map;
}

function renderList() {
  const filtered = applyFilter();
  const list = document.getElementById('page-list');
  const grouped = groupBy(filtered, 'section');
  const order = ['experiences', 'awards', 'projects', 'certifications', 'other'];
  let html = '';
  for (const section of order) {
    const items = grouped[section];
    if (!items?.length) continue;
    html += \`<div class="section-label">\${section} <span style="color:var(--border)">\${items.length}</span></div>\`;
    for (const p of items) {
      const active = current?.relPath === p.relPath ? ' active' : '';
      const todoClass = p.todo ? ' is-todo' : '';
      html += \`<div class="page-item\${active}\${todoClass}" data-path="\${escAttr(p.relPath)}">
        <span class="status-dot \${p.status}"></span>
        <span class="slug">\${escHtml(p.slug)}</span>
        \${p.todo ? '<span class="todo-pip" title="in TODOs.md"></span>' : ''}
      </div>\`;
    }
  }
  list.innerHTML = html || '<div style="padding:16px;color:var(--muted)">no results</div>';
  list.querySelectorAll('.page-item').forEach(el => {
    el.addEventListener('click', () => selectPage(el.dataset.path));
  });
}

async function selectPage(relPath) {
  if (dirty && current) {
    if (!confirm('Unsaved changes. Discard?')) return;
  }
  const res = await fetch(\`/api/page?path=\${encodeURIComponent(relPath)}\`);
  const data = await res.json();
  const page = allPages.find(p => p.relPath === relPath);
  current = { relPath, ...data, page };
  dirty = false;
  renderEditor();
  document.querySelectorAll('.page-item').forEach(el =>
    el.classList.toggle('active', el.dataset.path === relPath));
  document.querySelector(\`.page-item[data-path="\${CSS.escape(relPath)}"]\`)?.scrollIntoView({ block: 'nearest' });
}

// ── editor ────────────────────────────────────────────────────────────────────
function renderEditor() {
  const pane = document.getElementById('editor-pane');
  const { relPath, frontmatter, body, page } = current;
  const todoTag = page.todo ? '<span class="todo-tag">todo</span>' : '';
  pane.innerHTML = \`
    <div class="editor-header">
      <span class="section-tag">\${escHtml(page.section)}</span>
      <span class="editor-path">\${escHtml(relPath)}</span>
      <button class="todo-toggle-btn\${page.todo ? ' is-todo' : ''}" id="todo-toggle-btn">\${page.todo ? '★ todo' : '☆ todo'}</button>
      <button class="open-folder-btn" id="open-folder-btn">Open folder ↗</button>
    </div>
    <div class="fm-panel" id="fm-panel">
      <div class="fm-label" id="fm-toggle">frontmatter <span id="fm-chevron">▼</span></div>
      <div class="fm-body open" id="fm-body">
        <div class="fm-fields" id="fm-fields"></div>
        <div class="fm-raw-toggle" id="fm-raw-toggle">raw ▶</div>
        <textarea class="fm-textarea" id="fm-ta" spellcheck="false">\${escHtml(frontmatter)}</textarea>
      </div>
    </div>
    <div class="editor-body">
      <textarea id="body-ta" spellcheck="true">\${escHtml(body)}</textarea>
      <div class="paste-overlay" id="paste-overlay">Drop / paste image here</div>
    </div>
    <div class="editor-footer">
      <button class="save-btn" id="save-btn">Save</button>
      <span class="status-msg" id="status-msg"></span>
      <span class="char-count" id="char-count">\${body.length} chars</span>
    </div>
  \`;

  const ta = document.getElementById('body-ta');
  const fmTa = document.getElementById('fm-ta');
  const fmBody = document.getElementById('fm-body');
  const fmFields = document.getElementById('fm-fields');

  // ── enum definitions ──────────────────────────────────────────────────────
  const ENUMS = {
    category:    ['Conference', 'General', 'In-Person Competition', 'Robotics', 'Virtual Competition', 'Volunteer'],
    progress:    ['In-Progress', 'Finished'],
    association: ['Atsign', 'Hackathon', 'Hobby', 'School'],
    hidden:      ['false', 'true'],
  };

  // ── parse/serialize frontmatter ───────────────────────────────────────────
  function parseFmLines(raw) {
    // Returns [{key, value, raw}]
    return raw.split('\\n').map(line => {
      const m = line.match(/^([a-zA-Z_]+):\\s*(.*)/);
      return m ? { key: m[1], value: m[2], raw: line } : { key: null, value: null, raw: line };
    });
  }

  function serializeFmLines(lines) {
    return lines.map(l => l.raw).join('\\n');
  }

  function updateLineValue(lines, key, value) {
    return lines.map(l => l.key === key ? { ...l, value, raw: \`\${l.key}: \${value}\` } : l);
  }

  // ── render structured fields ──────────────────────────────────────────────
  function renderFmFields() {
    const lines = parseFmLines(fmTa.value);
    fmFields.innerHTML = '';
    for (const line of lines) {
      if (!line.key || line.key === 'layout') continue;
      const row = document.createElement('div');
      row.className = 'fm-row';
      const keyEl = document.createElement('span');
      keyEl.className = 'fm-key';
      keyEl.textContent = line.key;
      row.appendChild(keyEl);

      let input;
      if (ENUMS[line.key]) {
        input = document.createElement('select');
        input.className = 'fm-val';
        const currentVal = line.value.replace(/^"|"$/g, '');
        for (const opt of ENUMS[line.key]) {
          const o = document.createElement('option');
          o.value = opt; o.textContent = opt;
          if (opt === currentVal) o.selected = true;
          input.appendChild(o);
        }
        // If current value isn't in the enum list, add it
        if (!ENUMS[line.key].includes(currentVal) && currentVal !== '') {
          const o = document.createElement('option');
          o.value = currentVal; o.textContent = currentVal; o.selected = true;
          input.prepend(o);
        }
      } else {
        input = document.createElement('input');
        input.className = 'fm-val';
        input.type = 'text';
        input.value = line.value;
        input.spellcheck = false;
      }

      input.dataset.key = line.key;
      input.addEventListener('change', () => {
        let newVal = input.tagName === 'SELECT' ? input.value : input.value;
        // Preserve quoting style from original
        if (line.value.startsWith('"')) newVal = \`"\${newVal.replace(/^"|"$/g, '')}"\`;
        const updated = updateLineValue(parseFmLines(fmTa.value), line.key, newVal);
        fmTa.value = serializeFmLines(updated);
        dirty = true; setMsg('');
      });
      input.addEventListener('input', () => {
        if (input.tagName !== 'SELECT') {
          let newVal = input.value;
          if (line.value.startsWith('"')) newVal = \`"\${newVal.replace(/^"|"$/g, '')}"\`;
          const updated = updateLineValue(parseFmLines(fmTa.value), line.key, newVal);
          fmTa.value = serializeFmLines(updated);
          dirty = true; setMsg('');
        }
      });

      row.appendChild(input);
      fmFields.appendChild(row);
    }
  }

  renderFmFields();

  document.getElementById('fm-toggle').addEventListener('click', () => {
    const open = fmBody.classList.toggle('open');
    document.getElementById('fm-chevron').textContent = open ? '▼' : '▶';
    if (open) renderFmFields();
  });

  // raw toggle
  document.getElementById('fm-raw-toggle').addEventListener('click', () => {
    const rawOpen = fmTa.classList.toggle('open');
    document.getElementById('fm-raw-toggle').textContent = rawOpen ? 'raw ▼' : 'raw ▶';
    if (!rawOpen) renderFmFields(); // sync fields when closing raw
  });

  fmTa.addEventListener('input', () => {
    dirty = true; setMsg('');
    renderFmFields();
  });

  ta.addEventListener('input', () => {
    dirty = true;
    setMsg('');
    document.getElementById('char-count').textContent = ta.value.length + ' chars';
  });
  document.getElementById('save-btn').addEventListener('click', savePage);
  document.getElementById('open-folder-btn').addEventListener('click', () => {
    fetch(\`/api/open-folder?path=\${encodeURIComponent(current.relPath)}\`, { method: 'POST' });
  });

  document.getElementById('todo-toggle-btn').addEventListener('click', async () => {
    const res = await fetch(\`/api/toggle-todo?path=\${encodeURIComponent(current.relPath)}\`, { method: 'POST' });
    const data = await res.json();
    if (!data.ok) return;
    const p = allPages.find(p => p.relPath === current.relPath);
    if (p) p.todo = data.todo;
    current.page.todo = data.todo;
    const btn = document.getElementById('todo-toggle-btn');
    btn.textContent = data.todo ? '★ todo' : '☆ todo';
    btn.classList.toggle('is-todo', data.todo);
    renderList();
    document.querySelectorAll('.page-item').forEach(el =>
      el.classList.toggle('active', el.dataset.path === current.relPath));
  });

  ta.addEventListener('paste', handlePaste);
  ta.addEventListener('dragover', e => { e.preventDefault(); showOverlay(true); });
  ta.addEventListener('dragleave', () => showOverlay(false));
  ta.addEventListener('drop', e => { e.preventDefault(); showOverlay(false); handleDrop(e); });
}

function showOverlay(on) {
  document.getElementById('paste-overlay')?.classList.toggle('visible', on);
}

async function handlePaste(e) {
  const items = [...(e.clipboardData?.items || [])];
  const imgItem = items.find(i => i.type.startsWith('image/'));
  if (!imgItem) return;
  e.preventDefault();
  await promptAndUpload(imgItem.getAsFile());
}

async function handleDrop(e) {
  const file = [...(e.dataTransfer?.files || [])].find(f => f.type.startsWith('image/'));
  if (!file) return;
  await promptAndUpload(file);
}

function promptAndUpload(file) {
  return new Promise((resolve) => {
    const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
    const suggested = file.name && !file.name.startsWith('image.') ? file.name : \`image.\${ext}\`;
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = \`
      <div class="modal">
        <h2>Name this image</h2>
        <div class="modal-field">
          <label>Filename (saved next to index.md)</label>
          <input id="img-name-input" type="text" value="\${escHtml(suggested)}" spellcheck="false">
          <div class="conflict-msg" id="img-conflict-msg"></div>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" id="img-cancel">Cancel</button>
          <button class="btn-confirm" id="img-confirm">Save image</button>
        </div>
      </div>
    \`;
    document.body.appendChild(backdrop);
    const input = backdrop.querySelector('#img-name-input');
    const conflictMsg = backdrop.querySelector('#img-conflict-msg');
    const confirmBtn = backdrop.querySelector('#img-confirm');
    input.focus(); input.select();

    function clearConflict() {
      input.classList.remove('conflict');
      conflictMsg.textContent = '';
      conflictMsg.classList.remove('visible');
    }
    input.addEventListener('input', clearConflict);

    async function doUpload(overwrite = false) {
      const name = input.value.trim();
      if (!name) return;
      confirmBtn.disabled = true;
      try {
        const url = \`/api/upload?path=\${encodeURIComponent(current.relPath)}&name=\${encodeURIComponent(name)}\${overwrite ? '&overwrite=1' : ''}\`;
        const res = await fetch(url, { method: 'POST', body: file, headers: { 'Content-Type': file.type } });
        const data = await res.json();
        if (res.status === 409) {
          input.classList.add('conflict');
          conflictMsg.innerHTML = \`"\${escHtml(data.filename)}" already exists. <a href="#" id="overwrite-link">Overwrite?</a>\`;
          conflictMsg.classList.add('visible');
          backdrop.querySelector('#overwrite-link').addEventListener('click', e => { e.preventDefault(); clearConflict(); doUpload(true); });
          confirmBtn.disabled = false;
        } else if (data.ok) {
          insertAtCursor(document.getElementById('body-ta'), \`\n\${data.markdown}\n\`);
          setMsg('Image saved as ' + data.filename, 'saved');
          backdrop.remove(); resolve();
        } else {
          setMsg('Upload error: ' + data.error, 'error');
          backdrop.remove(); resolve();
        }
      } catch (err) {
        setMsg('Upload error: ' + err.message, 'error');
        backdrop.remove(); resolve();
      }
    }

    confirmBtn.addEventListener('click', () => doUpload(false));
    backdrop.querySelector('#img-cancel').addEventListener('click', () => { backdrop.remove(); resolve(); });
    backdrop.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); doUpload(false); }
      if (e.key === 'Escape') { backdrop.remove(); resolve(); }
    });
  });
}

function insertAtCursor(ta, text) {
  const start = ta.selectionStart, end = ta.selectionEnd;
  ta.value = ta.value.slice(0, start) + text + ta.value.slice(end);
  ta.selectionStart = ta.selectionEnd = start + text.length;
  ta.dispatchEvent(new Event('input'));
}

async function savePage() {
  if (!current) return;
  const body = document.getElementById('body-ta').value;
  const frontmatter = document.getElementById('fm-ta')?.value ?? current.frontmatter;
  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  try {
    const res = await fetch('/api/page', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relPath: current.relPath, body, frontmatter }),
    });
    const data = await res.json();
    if (data.ok) {
      dirty = false; current.body = body;
      const p = allPages.find(p => p.relPath === current.relPath);
      if (p) {
        const lines = body.split('\\n').filter(l => l.trim() && !l.trim().startsWith('#'));
        p.status = lines.length === 0 ? 'empty' : lines.length <= 1 ? 'minimal' : 'ok';
      }
      renderList();
      document.querySelectorAll('.page-item').forEach(el =>
        el.classList.toggle('active', el.dataset.path === current.relPath));
      setMsg('Saved', 'saved');
    } else {
      setMsg('Error: ' + data.error, 'error');
    }
  } catch (e) { setMsg('Error: ' + e.message, 'error'); }
  btn.disabled = false;
}

function setMsg(text, cls = '') {
  const el = document.getElementById('status-msg');
  if (!el) return;
  el.textContent = text;
  el.className = 'status-msg' + (cls ? ' ' + cls : '');
}

// ── new page modal ─────────────────────────────────────────────────────────────
document.getElementById('new-page-btn').addEventListener('click', () => {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = \`
    <div class="modal">
      <h2>New Page</h2>
      <div class="modal-field">
        <label>Section</label>
        <select id="new-section">
          <option value="experiences">experiences</option>
          <option value="awards">awards</option>
          <option value="projects">projects</option>
        </select>
      </div>
      <div class="modal-field">
        <label>Title</label>
        <input id="new-title" type="text" placeholder="My New Experience" autocomplete="off">
      </div>
      <div class="modal-field">
        <label>Slug (folder name)</label>
        <input id="new-slug" type="text" placeholder="auto-generated" autocomplete="off">
        <div class="conflict-msg" id="new-conflict"></div>
      </div>
      <div class="modal-actions">
        <button class="btn-cancel" id="new-cancel">Cancel</button>
        <button class="btn-confirm" id="new-confirm">Create</button>
      </div>
    </div>
  \`;
  document.body.appendChild(backdrop);

  const titleInput = backdrop.querySelector('#new-title');
  const slugInput  = backdrop.querySelector('#new-slug');
  const conflictEl = backdrop.querySelector('#new-conflict');
  const confirmBtn = backdrop.querySelector('#new-confirm');
  titleInput.focus();

  // auto-generate slug from title
  titleInput.addEventListener('input', () => {
    if (!slugInput.dataset.manual) {
      slugInput.value = titleInput.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_\$/g, '');
    }
    conflictEl.classList.remove('visible');
  });
  slugInput.addEventListener('input', () => {
    slugInput.dataset.manual = '1';
    conflictEl.classList.remove('visible');
  });

  async function doCreate() {
    const section = backdrop.querySelector('#new-section').value;
    const title   = titleInput.value.trim();
    const slug    = slugInput.value.trim();
    if (!title || !slug) return;
    confirmBtn.disabled = true;
    try {
      const res = await fetch('/api/new-page', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, title, slug }),
      });
      const data = await res.json();
      if (res.status === 409) {
        slugInput.classList.add('conflict');
        conflictEl.textContent = \`"\${escHtml(data.slug)}" already exists.\`;
        conflictEl.classList.add('visible');
        confirmBtn.disabled = false;
      } else if (data.ok) {
        backdrop.remove();
        await loadPages();
        await selectPage(data.relPath);
        // switch to editor tab
        document.querySelector('.tab-btn[data-tab="editor"]').click();
      } else {
        conflictEl.textContent = 'Error: ' + data.error;
        conflictEl.classList.add('visible');
        confirmBtn.disabled = false;
      }
    } catch (err) {
      conflictEl.textContent = 'Error: ' + err.message;
      conflictEl.classList.add('visible');
      confirmBtn.disabled = false;
    }
  }

  confirmBtn.addEventListener('click', doCreate);
  backdrop.querySelector('#new-cancel').addEventListener('click', () => backdrop.remove());
  backdrop.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName !== 'SELECT') { e.preventDefault(); doCreate(); }
    if (e.key === 'Escape') backdrop.remove();
  });
});

// ── audit ─────────────────────────────────────────────────────────────────────
async function runAudit() {
  const listEl = document.getElementById('audit-list');
  const summaryEl = document.getElementById('audit-summary');
  listEl.innerHTML = '<div class="audit-loading">Scanning…</div>';
  summaryEl.textContent = '';
  try {
    const res = await fetch('/api/audit');
    const issues = await res.json();
    if (!issues.length) {
      listEl.innerHTML = '<div class="audit-empty">✓ No issues found</div>';
      summaryEl.textContent = 'all clear';
      return;
    }
    // Group by page
    const byPage = {};
    for (const issue of issues) {
      (byPage[issue.relPath] ??= []).push(issue);
    }
    const deadLinks = issues.filter(i => i.type === 'dead-link').length;
    const missingImgs = issues.filter(i => i.type === 'missing-image').length;
    const missingFields = issues.filter(i => i.type === 'missing-field').length;
    const parts = [];
    if (deadLinks)    parts.push(\`\${deadLinks} dead link\${deadLinks !== 1 ? 's' : ''}\`);
    if (missingImgs)  parts.push(\`\${missingImgs} missing image\${missingImgs !== 1 ? 's' : ''}\`);
    if (missingFields) parts.push(\`\${missingFields} missing field\${missingFields !== 1 ? 's' : ''}\`);
    summaryEl.textContent = \`\${issues.length} issue\${issues.length !== 1 ? 's' : ''} — \${parts.join(', ')}\`;

    let html = '';
    for (const [relPath, pageIssues] of Object.entries(byPage)) {
      const slug = relPath.split('/').at(-2);
      const section = pageIssues[0].section;
      html += \`<div class="audit-group">
        <div class="audit-group-header" onclick="this.nextElementSibling.classList.toggle('open')">
          <span class="section-tag" style="font-size:10px">\${escHtml(section)}</span>
          <span class="ag-slug">\${escHtml(slug)}</span>
          <span class="ag-count">\${pageIssues.length} issue\${pageIssues.length !== 1 ? 's' : ''}</span>
          <button class="audit-go" data-path="\${escAttr(relPath)}" onclick="event.stopPropagation();goToPage(this.dataset.path)">edit →</button>
        </div>
        <div class="audit-items open">\`;
      for (const issue of pageIssues) {
        html += \`<div class="audit-item">
          <span class="audit-type \${issue.type}">\${issue.type === 'dead-link' ? 'dead link' : issue.type === 'missing-image' ? 'missing img' : 'missing field'}</span>
          <span class="audit-href" title="\${escAttr(issue.href)}">\${escHtml(issue.href)}</span>
          \${issue.text ? \`<span class="audit-text" title="\${escAttr(issue.text)}">\${escHtml(issue.text.slice(0,40))}</span>\` : ''}
        </div>\`;
      }
      html += '</div></div>';
    }
    listEl.innerHTML = html;
  } catch (e) {
    listEl.innerHTML = \`<div class="audit-loading" style="color:var(--empty)">Error: \${escHtml(e.message)}</div>\`;
  }
}

function goToPage(relPath) {
  document.querySelector('.tab-btn[data-tab="editor"]').click();
  selectPage(relPath);
}

document.getElementById('audit-refresh').addEventListener('click', runAudit);

// ── misc ──────────────────────────────────────────────────────────────────────
document.getElementById('search').addEventListener('input', renderList);
document.getElementById('todo-filter').addEventListener('click', () => {
  todoOnly = !todoOnly;
  document.getElementById('todo-filter').classList.toggle('active', todoOnly);
  renderList();
});

document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); savePage(); }
});

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function escAttr(s) {
  return String(s).replace(/"/g,'&quot;');
}

loadPages();
</script>
</body>
</html>
`;
