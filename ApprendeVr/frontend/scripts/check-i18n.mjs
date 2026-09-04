#!/usr/bin/env node
/**
 * check-i18n.mjs — valida la integridad del sistema multidioma de ApprendeVr/frontend.
 *
 * Chequeos:
 *   1. Los tres locales (es/en/br) son JSON válido.
 *   2. Toda clave usada en código vía `t('clave')` / `t("clave")` existe en los TRES idiomas.
 *   3. Las claves de los tres locales son simétricas (misma estructura, sin drift).
 *   4. (opcional, --hardcoded) heurística de strings visibles hardcodeados en JSX.
 *
 * Uso:
 *   node scripts/check-i18n.mjs [--hardcoded]
 *
 * Sale con código 1 si hay errores; 0 si todo está OK.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..'); // ApprendeVr/frontend
const LOCALES_DIR = join(ROOT, 'src', 'locales');
const SRC_DIR = join(ROOT, 'src');

const LOCALES = ['es', 'en', 'br'];
const CODE_EXTENSIONS = new Set(['.js', '.jsx']);

let errors = 0;
let warnings = 0;

const fail = (msg) => { console.error(`\u001b[31m✗ ${msg}\u001b[0m`); errors++; };
const warn = (msg) => { console.warn(`\u001b[33m⚠ ${msg}\u001b[0m`); warnings++; };
const ok = (msg) => console.log(`\u001b[32m✓ ${msg}\u001b[0m`);

// ── 1. Parsear los locales ──────────────────────────────────────────────────
const translations = {};
for (const lang of LOCALES) {
  const path = join(LOCALES_DIR, `${lang}.json`);
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (e) {
    fail(`No se pudo leer ${path}`);
    continue;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.translation !== 'object' || parsed.translation === null) {
      fail(`${lang}.json no tiene el objeto raíz "translation"`);
      continue;
    }
    translations[lang] = parsed.translation;
  } catch (e) {
    fail(`${lang}.json no es JSON válido: ${e.message}`);
  }
}

// ── utilidades: aplanar a claves con notación de punto ──────────────────────
function flatten(obj, prefix = '', out = {}) {
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, fullKey, out);
    } else {
      out[fullKey] = value;
    }
  }
  return out;
}

const flatLocales = {};
for (const lang of LOCALES) {
  if (translations[lang]) flatLocales[lang] = flatten(translations[lang]);
}

// ── 3. Simetría entre locales ───────────────────────────────────────────────
if (Object.keys(flatLocales).length === LOCALES.length) {
  const reference = LOCALES[0];
  const refKeys = new Set(Object.keys(flatLocales[reference]));
  for (const lang of LOCALES.slice(1)) {
    const langKeys = new Set(Object.keys(flatLocales[lang]));
    const missing = [...refKeys].filter((k) => !langKeys.has(k));
    const extra = [...langKeys].filter((k) => !refKeys.has(k));
    if (missing.length) {
      for (const k of missing) fail(`${lang}.json no tiene la clave "${k}" (sí está en ${reference}.json)`);
    }
    if (extra.length) {
      for (const k of extra) warn(`${lang}.json tiene la clave "${k}" que no está en ${reference}.json`);
    }
  }
  if (errors === 0) ok('Las claves de es/en/br son simétricas');
}

// ── 2. Claves usadas en código ──────────────────────────────────────────────
function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walk(full);
    } else if (CODE_EXTENSIONS.has(entry.slice(entry.lastIndexOf('.')))) {
      yield full;
    }
  }
}

const usedKeys = new Set();
const keyUsageFiles = new Map(); // key -> [files]

// t('...') y t("...") — captura claves literales (no variables)
const tCallRegex = /\bt\(\s*(['"])((?:\\.|(?!\1).)*?)\1\s*\)/g;

for (const file of walk(SRC_DIR)) {
  const content = readFileSync(file, 'utf8');
  let m;
  tCallRegex.lastIndex = 0;
  while ((m = tCallRegex.exec(content)) !== null) {
    const key = m[2].replace(/\\(['"])/g, '$1');
    // descartar claves que son variables interpoladas (ej. t(`...`)) o no-dot
    if (!key || key.includes('${') || key.includes('`')) continue;
    usedKeys.add(key);
    if (!keyUsageFiles.has(key)) keyUsageFiles.set(key, []);
    keyUsageFiles.get(key).push(file.replace(ROOT + '/', ''));
  }
}

if (usedKeys.size > 0) {
  for (const key of usedKeys) {
    for (const lang of LOCALES) {
      if (!flatLocales[lang] || !(key in flatLocales[lang])) {
        const files = [...new Set(keyUsageFiles.get(key))].join(', ');
        fail(`Clave "${key}" usada en ${files} no existe en ${lang}.json`);
      }
    }
  }
  if (errors === 0) ok(`${usedKeys.size} claves usadas en código existen en los 3 locales`);
} else {
  warn('No se encontraron llamadas t(\'...\') para validar');
}

// ── 4. (opcional) hardcoded en JSX ──────────────────────────────────────────
function stripComments(code) {
  // Quita comentarios de bloque /* ... */ y de línea // ... (heurístico).
  let out = code.replace(/\/\*[\s\S]*?\*\//g, ' ');
  out = out.replace(/\/\/[^\n]*/g, ' ');
  return out;
}

if (process.argv.includes('--hardcoded')) {
  const jsxTextRegex = />\s*([^<>{}]{2,}?)\s*</g;
  const ignorePatterns = [/^\d+(px|p|%)?$/, /^[#./]/, /^\s*$/, /console\./];
  for (const file of walk(SRC_DIR)) {
    const content = stripComments(readFileSync(file, 'utf8'));
    let m;
    jsxTextRegex.lastIndex = 0;
    while ((m = jsxTextRegex.exec(content)) !== null) {
      const text = m[1].trim();
      if (text.length < 2) continue;
      if (ignorePatterns.some((re) => re.test(text))) continue;
      if (/^[A-Za-záéíóúñÁÉÍÓÚÑ]/.test(text)) {
        warn(`Posible texto hardcodeado en ${file.replace(ROOT + '/', '')}: "${text}"`);
      }
    }
  }
}

// ── resumen ─────────────────────────────────────────────────────────────────
console.log('');
if (errors > 0) {
  console.error(`\u001b[31m✗ ${errors} error(es), ${warnings} advertencia(s)\u001b[0m`);
  process.exit(1);
} else {
  console.log(`\u001b[32m✓ OK — ${warnings} advertencia(s)\u001b[0m`);
  process.exit(0);
}
