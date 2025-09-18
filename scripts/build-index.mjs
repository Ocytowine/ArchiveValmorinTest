// scripts/build-index.mjs
// Node >= 18
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- Options CLI ----------
const ROOT = path.resolve(process.argv[2] || process.cwd());
const WITH_META = process.argv.includes("--with-meta");
const PRETTY = process.argv.includes("--pretty");

// Dossiers standards attendus
const FOLDERS = {
  classes: "classes",
  subclasses: "subclasses",
  features: "features",
  items: "items",
};

// ---------- Helpers ----------
async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function listJsonFiles(dir) {
  if (!(await exists(dir))) return [];
  const names = await fs.readdir(dir);
  const files = [];
  for (const name of names) {
    const full = path.join(dir, name);
    const stat = await fs.stat(full);
    if (stat.isDirectory()) {
      files.push(...(await listJsonFiles(full)));
    } else if (name.toLowerCase().endsWith(".json")) {
      files.push(full);
    }
  }
  return files;
}

async function readJsonSafe(file) {
  const raw = await fs.readFile(file, "utf8");
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`JSON invalide: ${file}\n${e.message}`);
  }
}

function sha256(str) {
  return crypto.createHash("sha256").update(str).digest("hex");
}

// ---------- Core ----------
async function collectCategory(category, relFolder) {
  const abs = path.join(ROOT, relFolder);
  const files = await listJsonFiles(abs);
  const ids = [];
  const map = {}; // id -> relative file path
  const meta = {}; // id -> { sha256, size, mtime }

  for (const file of files) {
    const relPath = path.relative(ROOT, file).split(path.sep).join("/");
    const raw = await fs.readFile(file, "utf8");
    const obj = JSON.parse(raw);

    // id : soit champ "id", sinon dérivé du nom de fichier
    const inferredId = path.basename(file, path.extname(file));
    const id = (obj && obj.id) ? String(obj.id) : inferredId;

    // Remplissage
    ids.push(id);
    map[id] = relPath;

    if (WITH_META) {
      const stat = await fs.stat(file);
      meta[id] = {
        sha256: sha256(raw),
        size: stat.size,
        mtime: stat.mtime.toISOString(),
      };
    }
  }

  // Tri alphanumérique pour stabilité du diff
  ids.sort((a, b) => a.localeCompare(b, "fr"));

  return { ids, map, meta: WITH_META ? meta : undefined };
}

async function buildIndex() {
  const out = {
    $schema: "internal-index-v1",
    generated_at: new Date().toISOString(),
    root: path.basename(ROOT),
    categories: {},           // { classes:{ids,map}, ... }
    summary: {},              // nombre d'éléments par catégorie
    problems: {               // mini validation
      missing_ids: [],        // fichiers sans id + nom fichier != id
      duplicates: [],         // si jamais
      mixed_naming: [],       // '_' vs '-' incohérences détectées
    },
  };

  for (const [cat, folder] of Object.entries(FOLDERS)) {
    const { ids, map, meta } = await collectCategory(cat, folder);
    out.categories[cat] = { ids, map };
    if (meta) out.categories[cat].meta = meta;
    out.summary[cat] = ids.length;

    // Détection simple d'incohérences d'ids (kebab-case conseillé)
    const snake = ids.filter((x) => x.includes("_"));
    const kebab = ids.filter((x) => x.includes("-"));
    if (snake.length && kebab.length) {
      out.problems.mixed_naming.push({ category: cat, snake, kebab });
    }

    // Vérifie si un fichier a un id absent/incohérent (nom fichier ≠ id)
    for (const [id, rel] of Object.entries(map)) {
      const name = path.basename(rel, ".json");
      if (id !== name) {
        out.problems.missing_ids.push({ category: cat, id_in_file: id, file_basename: name, file: rel });
      }
    }
  }

  // Sortie
  const dest = path.join(ROOT, "index.json");
  const json = PRETTY ? JSON.stringify(out, null, 2) : JSON.stringify(out);
  await fs.writeFile(dest, json, "utf8");
  return { dest, out };
}

// ---------- Run ----------
buildIndex()
  .then(({ dest, out }) => {
    console.log(`✔ index.json généré : ${dest}`);
    for (const [cat, n] of Object.entries(out.summary)) {
      console.log(`  - ${cat}: ${n}`);
    }
    if (out.problems.mixed_naming.length || out.problems.missing_ids.length) {
      console.log("\n⚠ Avertissements de validation :");
      if (out.problems.mixed_naming.length) {
        for (const p of out.problems.mixed_naming) {
          console.log(`  * ${p.category}: mélange '_' et '-' → unifie en kebab-case (ex: "berserker-rage").`);
        }
      }
      if (out.problems.missing_ids.length) {
        for (const p of out.problems.missing_ids) {
          console.log(`  * ${p.category}: id "${p.id_in_file}" ≠ nom de fichier "${p.file_basename}" (${p.file})`);
        }
      }
    }
  })
  .catch((e) => {
    console.error("✖ Erreur:", e.message);
    process.exit(1);
  });
