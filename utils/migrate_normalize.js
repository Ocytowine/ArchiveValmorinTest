#!/usr/bin/env node
// utils/migrate_normalize.js
// Node.js standalone migration script that normalizes JSON data files and writes them to normalized/
//
// Usage (from project root):
//   node utils/migrate_normalize.js
// Or with custom input dirs:
//   node utils/migrate_normalize.js classes,races,features --out normalized
//
// The script:
// - scans provided directories for .json files (recursive)
// - normalizes feature/effect shapes with sensible fallbacks
// - writes normalized JSON to normalized/<same-path>
// - produces normalized/report.json with a summary

const fs = require('fs');
const path = require('path');

const DEFAULT_INPUT_DIRS = ['classes', 'races', 'features', 'spells', 'subclasses', 'backgrounds', 'items'];

function usageAndExit() {
  console.log('Usage: node utils/migrate_normalize.js [inputDirsCommaSeparated] [--out outputDir]');
  console.log('Example: node utils/migrate_normalize.js classes,races --out normalized');
  process.exit(1);
}

function parseArgs() {
  const argv = process.argv.slice(2);
  let inputDirs = DEFAULT_INPUT_DIRS;
  let outDir = 'normalized';

  if (argv.length >= 1 && argv[0] && !argv[0].startsWith('--')) {
    inputDirs = argv[0].split(',').map(s => s.trim()).filter(Boolean);
  }
  const outIdx = argv.indexOf('--out');
  if (outIdx >= 0 && argv.length > outIdx + 1) {
    outDir = argv[outIdx + 1];
  }
  return { inputDirs, outDir };
}

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJson(file) {
  const raw = fs.readFileSync(file, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error('JSON parse error: ' + e.message);
  }
}

function writeJson(file, obj) {
  ensureDirSync(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
}

/* ---------------------------
   Normalization helpers
   --------------------------- */

function cloneDeep(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function ensureArray(x) {
  if (x === undefined || x === null) return [];
  if (Array.isArray(x)) return x;
  return [x];
}

function normalizeFromArray(rawFrom, warnings, context) {
  // rawFrom may be array of strings, or array of objects {id,label}, or weird nested objects
  if (!rawFrom) return [];
  if (!Array.isArray(rawFrom)) {
    warnings.push({ kind: 'from_not_array', context, value: rawFrom });
    if (typeof rawFrom === 'string') return [rawFrom];
    return [];
  }
  const out = [];
  const labels = [];
  for (const item of rawFrom) {
    if (typeof item === 'string') {
      out.push(item);
      labels.push({ id: item, label: item });
      continue;
    }
    if (item && typeof item === 'object') {
      const id = item.id ?? item.value ?? item.key ?? item.name ?? null;
      const label = item.label ?? item.name ?? item.title ?? null;
      if (id) {
        out.push(id);
        labels.push({ id, label });
      } else {
        // fallback stringify
        const s = JSON.stringify(item);
        out.push(s);
        labels.push({ id: s, label: s });
      }
      continue;
    }
    // unknown type -> stringify
    const s = String(item);
    out.push(s);
    labels.push({ id: s, label: s });
  }
  return { ids: out, labels }; // labels can be saved as from_labels if desired
}

function normalizeSlotsTable(raw, warnings, context) {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object') return parsed;
      warnings.push({ kind: 'slots_table_parse_non_object', context, value: raw });
      return {};
    } catch (e) {
      warnings.push({ kind: 'slots_table_parse_error', context, value: raw, message: e.message });
      return {};
    }
  }
  warnings.push({ kind: 'slots_table_unknown', context, value: raw });
  return {};
}

function normalizeEffect(raw, warnings = [], context = {}) {
  // Accepts raw effect or feature — returns normalized effect-like object
  if (!raw || typeof raw !== 'object') {
    warnings.push({ kind: 'effect_not_object', context, value: raw });
    return raw;
  }
  const e = cloneDeep(raw);

  // Top-level normalization
  e.id = e.id ?? e.payload?.id ?? e.payload?.feature_id ?? e.payload?.featureId ?? e.raw?.id ?? null;
  e.type = e.type ?? e.raw?.type ?? e.payload?.type ?? e.type ?? null;
  e.source = e.source ?? e.raw?.source ?? e.payload?.source ?? e.source ?? context.source ?? null;
  e.priority = e.priority ?? e.raw?.priority ?? e.payload?.priority ?? e.priority ?? 0;

  // payload
  e.payload = e.payload ?? (e.raw && e.raw.payload ? cloneDeep(e.raw.payload) : (e.raw && e.raw.mecanique ? cloneDeep(e.raw.mecanique) : {}));
  if (!e.payload) e.payload = {};

  // mecanique -> effects (if someone stored effects under mecanique)
  if (!e.effects && e.raw && e.raw.mecanique) {
    const mech = e.raw.mecanique;
    e.effects = Array.isArray(mech) ? mech : [mech];
    warnings.push({ kind: 'mecanique_mapped_to_effects', context, file: context.file ?? null });
  }

  // grant_feature: unify feature_id
  if (e.type === 'grant_feature' || e.payload?.feature_id || e.payload?.featureId || e.payload?.id || e.payload?.feature) {
    e.payload.feature_id = e.payload.feature_id ?? e.payload.featureId ?? e.payload.id ?? e.payload.feature ?? null;
    if (!e.payload.feature_id) warnings.push({ kind: 'grant_feature_no_id', context });
  }

  // spell grant id normalization
  if (e.type === 'spell_grant' || e.payload?.spell_id || e.payload?.spellId || e.payload?.id) {
    e.payload.spell_id = e.payload.spell_id ?? e.payload.spellId ?? e.payload.id ?? null;
  }

  // choice-like normalization
  const typeStr = String(e.type ?? '').toLowerCase();
  if (typeStr.includes('choice') || typeStr.includes('skill_choice') || typeStr.includes('language_choice') || typeStr.includes('tool_choice')) {
    e.type = 'choice';
    // choose
    let choose = e.payload?.choose ?? e.raw?.choose ?? e.payload?.count ?? null;
    if (choose === null || choose === undefined) choose = 1;
    e.payload.choose = Number(choose);

    // from
    const rawFrom = e.payload?.from ?? e.raw?.from ?? null;
    const nf = normalizeFromArray(rawFrom, warnings, context);
    if (nf && nf.ids) {
      e.payload.from = nf.ids;
      if (nf.labels && nf.labels.length > 0) e.payload.from_labels = nf.labels;
    } else if (Array.isArray(rawFrom)) {
      e.payload.from = rawFrom.map(x => (typeof x === 'string' ? x : (x && x.id ? x.id : JSON.stringify(x))));
    } else {
      e.payload.from = [];
    }
    // preserve expertise flag etc.
    if (e.payload.expertise === undefined && e.raw?.expertise !== undefined) {
      e.payload.expertise = !!e.raw.expertise;
    }
  } else {
    // If payload has choose/from but type doesn't indicate choice, normalize anyway
    if (e.payload?.choose !== undefined || e.payload?.from !== undefined) {
      e.payload.choose = Number(e.payload.choose ?? 1);
      if (typeof e.payload.from === 'string') e.payload.from = [e.payload.from];
      if (Array.isArray(e.payload.from)) {
        const nf = normalizeFromArray(e.payload.from, warnings, context);
        if (nf && nf.ids) {
          e.payload.from = nf.ids;
          if (nf.labels) e.payload.from_labels = nf.labels;
        }
      }
    }
  }

  // spellcasting slots_table normalization
  if (e.type === 'spellcasting_feature' || e.payload?.slots_table) {
    e.payload.slots_table = normalizeSlotsTable(e.payload.slots_table ?? e.raw?.payload?.slots_table ?? e.raw?.slots_table, warnings, context) || {};
  }

  // conditions: accept payload.conditions as top-level conditions
  if (!e.conditions && e.payload && e.payload.conditions) {
    e.conditions = e.payload.conditions;
  }

  // if effect has nested mecanique/effects, normalize them
  if (e.effects && Array.isArray(e.effects)) {
    e.effects = e.effects.map((sub, idx) => normalizeEffect(sub, warnings, Object.assign({}, context, { nestedIndex: idx })));
  }

  // keep a raw backup for manual review
  e._normalized_from = e._normalized_from ?? [];
  e._normalized_from.push({ file: context.file ?? null });

  return e;
}

/* Normalize a whole file content (could be a feature file, a collection, or an effect) */
function normalizeFileContent(data, warnings = [], context = {}) {
  // Determine likely shapes
  const out = cloneDeep(data);

  // If the file is a wrapper that contains `features` array (like race/class file)
  if (out && typeof out === 'object' && Array.isArray(out.features)) {
    out.features = out.features.map((feat, i) => {
      const nf = cloneDeep(feat);
      // If the feature contains mecanique -> convert to effects
      if (!nf.effects && nf.mecanique) {
        nf.effects = Array.isArray(nf.mecanique) ? nf.mecanique : [nf.mecanique];
        warnings.push({ kind: 'feature_mecanique_mapped', file: context.file, featureId: nf.id ?? null });
      }
      // If the feature has effects, normalize each
      if (nf.effects && Array.isArray(nf.effects)) {
        nf.effects = nf.effects.map((eff, idx) => normalizeEffect(eff, warnings, { file: context.file, featureId: nf.id, idx }));
      }
      // If feature itself has type/choice-like payload, normalize it as well
      const maybeNormalized = normalizeEffect(nf, warnings, { file: context.file, featureId: nf.id });
      // keep original id/name/title if present
      maybeNormalized.id = nf.id ?? maybeNormalized.id ?? maybeNormalized.payload?.feature_id ?? maybeNormalized.id;
      return maybeNormalized;
    });
    return out;
  }

  // If the file is directly an array of features/effects
  if (Array.isArray(out)) {
    return out.map((it, idx) => {
      if (it && typeof it === 'object' && (it.type || it.effects || it.mecanique)) {
        return normalizeEffect(it, warnings, { file: context.file, idx });
      }
      return it;
    });
  }

  // If the file appears to be a single feature (has id/type/payload/effects)
  if (out && typeof out === 'object' && (out.id || out.type || out.effects || out.mecanique)) {
    // for files like classes/mage.json where top-level object contains features or effects
    // if it contains features property, handled above; else try to normalize top-level effects inside `mecanique` or `effects`
    if (out.mecanique && !out.effects) {
      out.effects = Array.isArray(out.mecanique) ? out.mecanique : [out.mecanique];
    }
    if (out.effects && Array.isArray(out.effects)) {
      out.effects = out.effects.map((eff, idx) => normalizeEffect(eff, warnings, { file: context.file, idx }));
    }
    // normalize the top-level object itself (it might be a feature)
    const topNormalized = normalizeEffect(out, warnings, { file: context.file });
    // preserve original top-level properties that are metadata (nom, description)
    topNormalized.nom = out.nom ?? out.name ?? topNormalized.nom;
    topNormalized.description = out.description ?? topNormalized.description;
    return topNormalized;
  }

  // otherwise return untouched data (but warn)
  warnings.push({ kind: 'file_unknown_shape', file: context.file });
  return out;
}

/* ---------------------------
   File walking & processing
   --------------------------- */

function walkDir(dir, filelist = []) {
  if (!fs.existsSync(dir)) return filelist;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walkDir(full, filelist);
    } else if (e.isFile() && e.name.endsWith('.json')) {
      filelist.push(full);
    }
  }
  return filelist;
}

async function main() {
  const { inputDirs, outDir } = parseArgs();
  const root = process.cwd();
  console.log('Migration normalize run from', root);
  console.log('Input dirs:', inputDirs.join(', '));
  console.log('Output dir:', outDir);

  ensureDirSync(outDir);

  const report = {
    startedAt: new Date().toISOString(),
    processed: [],
    errors: [],
    warnings: [],
    stats: { files: 0, normalizedFiles: 0 }
  };

  for (const dir of inputDirs) {
    const absDir = path.join(root, dir);
    if (!fs.existsSync(absDir)) {
      console.warn('[WARN] input dir not found:', absDir);
      continue;
    }
    const files = walkDir(absDir, []);
    for (const f of files) {
      const rel = path.relative(root, f);
      report.stats.files++;
      const warnings = [];
      try {
        const data = readJson(f);
        const normalized = normalizeFileContent(data, warnings, { file: rel });
        const outPath = path.join(root, outDir, rel);
        writeJson(outPath, normalized);
        report.processed.push({ file: rel, out: path.relative(root, outPath), warningsCount: warnings.length, warnings });
        report.stats.normalizedFiles++;
        for (const w of warnings) {
          report.warnings.push({ file: rel, warning: w });
        }
      } catch (e) {
        console.error('[ERR] failed to process', rel, e.message);
        report.errors.push({ file: rel, error: String(e) });
      }
    }
  }

  report.finishedAt = new Date().toISOString();
  const reportFile = path.join(root, outDir, 'report.json');
  writeJson(reportFile, report);
  console.log('Done. files processed:', report.stats.files, 'normalized:', report.stats.normalizedFiles, 'report:', reportFile);
  if (report.warnings.length > 0) {
    console.log('Warnings:', report.warnings.length, '- check', reportFile);
  }
  if (report.errors.length > 0) {
    console.log('Errors:', report.errors.length, '- check', reportFile);
  }
}

main().catch(e => {
  console.error('Fatal error', e);
  process.exit(2);
});
