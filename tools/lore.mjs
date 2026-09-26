#!/usr/bin/env node
/**
 * The keeper of the Gallowmark canon. No dependencies.
 *
 *   node tools/lore.mjs validate        check every entity, link and relation
 *   node tools/lore.mjs build           validate, then write dist/lore.json and GRAPH.md
 *   node tools/lore.mjs check           validate and fail if dist/lore.json is stale
 *   node tools/lore.mjs new <type> <id> scaffold a new entity file
 *   node tools/lore.mjs list [type]     print entities
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Entity types and the folder each lives in. */
export const TYPES = {
  character: "characters",
  place: "places",
  faction: "factions",
  god: "gods",
  artifact: "artifacts",
  event: "events",
  story: "stories",
};

export const STATUSES = ["canon", "draft", "retired"];

/** Relation kinds and their inverses. Write one side; the export carries both. */
export const INVERSE = {
  "ally-of": "ally-of",
  "enemy-of": "enemy-of",
  "rival-of": "rival-of",
  "kin-of": "kin-of",
  "born-in": "birthplace-of",
  "lives-in": "home-of",
  "haunts": "haunted-by",
  "rules": "ruled-by",
  "member-of": "has-member",
  "leads": "led-by",
  "worships": "worshipped-by",
  "serves": "served-by",
  "named-by": "names",
  "created": "created-by",
  "forged": "forged-by",
  "wields": "wielded-by",
  "stole": "stolen-by",
  "guards": "guarded-by",
  "located-in": "contains",
  "caused": "caused-by",
  "survived": "survived-by",
  "destroyed": "destroyed-by",
  "narrates": "narrated-by",
  "speaks": "spoken-by",
  "features": "featured-in",
  "precedes": "follows",
};

// ---------------------------------------------------------------------------------------------
// A small YAML subset for frontmatter: scalars, [inline lists], {inline maps}, block lists of
// scalars or inline maps, and one level of nested maps. Enough for lore, not for anything else.
// ---------------------------------------------------------------------------------------------

export function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!m) return { data: null, body: text };
  return { data: parseYaml(m[1]), body: text.slice(m[0].length) };
}

function scalar(raw) {
  const s = raw.trim();
  if (s === "" || s === "null" || s === "~") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
  if (s.startsWith("[") && s.endsWith("]")) return splitTop(s.slice(1, -1)).map(scalar).filter((x) => x !== null);
  if (s.startsWith("{") && s.endsWith("}")) {
    const out = {};
    for (const part of splitTop(s.slice(1, -1))) {
      const idx = part.indexOf(":");
      if (idx < 0) throw new Error(`bad inline map entry: ${part}`);
      out[part.slice(0, idx).trim()] = scalar(part.slice(idx + 1));
    }
    return out;
  }
  return s;
}

/** Split on top-level commas, respecting brackets and quotes. */
function splitTop(s) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let cur = "";
  for (const c of s) {
    if (quote) {
      cur += c;
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === "[" || c === "{") depth++;
    else if (c === "]" || c === "}") depth--;
    if (c === "," && depth === 0) {
      parts.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

export function parseYaml(src) {
  const lines = src.split(/\r?\n/).filter((l) => l.trim() !== "" && !l.trim().startsWith("#"));
  const root = {};
  let i = 0;
  const indentOf = (l) => l.length - l.trimStart().length;
  function parseMap(indent) {
    const out = {};
    while (i < lines.length) {
      const line = lines[i];
      const ind = indentOf(line);
      if (ind < indent) break;
      if (ind > indent) throw new Error(`unexpected indent at: ${line}`);
      const t = line.trim();
      const idx = t.indexOf(":");
      if (idx < 0) throw new Error(`expected key: value at: ${line}`);
      const key = t.slice(0, idx).trim();
      const rest = t.slice(idx + 1);
      i++;
      if (rest.trim() === "") {
        const next = lines[i];
        if (next === undefined) {
          out[key] = null;
        } else if (next.trim().startsWith("- ")) {
          out[key] = parseList(indentOf(next));
        } else if (indentOf(next) > indent) {
          out[key] = parseMap(indentOf(next));
        } else {
          out[key] = null;
        }
      } else {
        out[key] = scalar(rest);
      }
    }
    return out;
  }
  function parseList(indent) {
    const out = [];
    while (i < lines.length) {
      const line = lines[i];
      const ind = indentOf(line);
      if (ind < indent) break;
      const t = line.trim();
      if (!t.startsWith("- ")) break;
      out.push(scalar(t.slice(2)));
      i++;
    }
    return out;
  }
  Object.assign(root, parseMap(0));
  return root;
}

// ---------------------------------------------------------------------------------------------
// Loading and validation
// ---------------------------------------------------------------------------------------------

export function loadEntities(root = ROOT) {
  const entities = new Map();
  const problems = [];
  for (const [type, dir] of Object.entries(TYPES)) {
    const full = join(root, dir);
    if (!existsSync(full)) continue;
    for (const file of readdirSync(full).filter((f) => f.endsWith(".md")).sort()) {
      const rel = `${dir}/${file}`;
      const text = readFileSync(join(full, file), "utf8");
      let parsed;
      try {
        parsed = parseFrontmatter(text);
      } catch (e) {
        problems.push(`${rel}: ${e.message}`);
        continue;
      }
      if (!parsed.data) {
        problems.push(`${rel}: missing frontmatter`);
        continue;
      }
      const id = file.replace(/\.md$/, "");
      const e = { file: rel, id, type, ...parsed.data, body: parsed.body.trim() };
      if (parsed.data.id !== undefined && parsed.data.id !== id) problems.push(`${rel}: id '${parsed.data.id}' must equal the file name '${id}'`);
      if (parsed.data.type !== undefined && parsed.data.type !== type) problems.push(`${rel}: type '${parsed.data.type}' must be '${type}' in folder ${dir}/`);
      if (entities.has(id)) problems.push(`${rel}: duplicate id '${id}' (also ${entities.get(id).file})`);
      entities.set(id, e);
    }
  }
  return { entities, problems };
}

export function validate(root = ROOT) {
  const { entities, problems } = loadEntities(root);
  const wiki = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g;
  for (const e of entities.values()) {
    const where = e.file;
    if (typeof e.name !== "string" || !e.name.trim()) problems.push(`${where}: 'name' is required`);
    if (!STATUSES.includes(e.status)) problems.push(`${where}: 'status' must be one of ${STATUSES.join(", ")}`);
    if (typeof e.summary !== "string" || !e.summary.trim()) problems.push(`${where}: 'summary' (one line) is required`);
    if (e.aliases !== undefined && !Array.isArray(e.aliases)) problems.push(`${where}: 'aliases' must be a list`);
    if (e.tags !== undefined && !Array.isArray(e.tags)) problems.push(`${where}: 'tags' must be a list`);
    if (e.relations !== undefined) {
      if (!Array.isArray(e.relations)) problems.push(`${where}: 'relations' must be a list`);
      else
        e.relations.forEach((r, n) => {
          if (!r || typeof r !== "object") return problems.push(`${where}: relation #${n + 1} must be { to: id, kind: kind }`);
          if (!entities.has(r.to)) problems.push(`${where}: relation to unknown entity '${r.to}'`);
          if (!(r.kind in INVERSE) && !Object.values(INVERSE).includes(r.kind)) problems.push(`${where}: unknown relation kind '${r.kind}'`);
          if (r.to === e.id) problems.push(`${where}: relation to itself`);
        });
    }
    if (e.type === "event" && (typeof e.year !== "number")) problems.push(`${where}: events need a numeric 'year' (years since the Ashfall; negative is before)`);
    if (e.type === "story" && typeof e.speaker === "string" && !entities.has(e.speaker)) problems.push(`${where}: unknown speaker '${e.speaker}'`);
    for (const m of e.body.matchAll(wiki)) {
      const target = m[1].trim().toLowerCase().replace(/\s+/g, "-");
      if (!entities.has(target)) problems.push(`${where}: wikilink [[${m[1]}]] does not resolve to an entity id`);
    }
  }
  return { entities, problems };
}

// ---------------------------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------------------------

export function build(root = ROOT) {
  const { entities, problems } = validate(root);
  if (problems.length) return { problems };
  const relations = [];
  const seen = new Set();
  const add = (from, to, kind, declared) => {
    const key = `${from}|${to}|${kind}`;
    if (seen.has(key)) return;
    seen.add(key);
    relations.push({ from, to, kind, declared });
  };
  for (const e of entities.values()) {
    for (const r of e.relations ?? []) {
      add(e.id, r.to, r.kind, true);
      const inv = INVERSE[r.kind] ?? Object.entries(INVERSE).find(([, v]) => v === r.kind)?.[0];
      if (inv) add(r.to, e.id, inv, false);
    }
    if (e.type === "story" && typeof e.speaker === "string") {
      add(e.speaker, e.id, "speaks", true);
      add(e.id, e.speaker, "spoken-by", false);
    }
  }
  const out = {
    world: "Gallowmark",
    generatedAt: new Date().toISOString().slice(0, 10),
    entityCount: entities.size,
    types: Object.keys(TYPES),
    entities: Object.fromEntries(
      [...entities.values()].map((e) => [
        e.id,
        {
          id: e.id,
          type: e.type,
          name: e.name,
          aliases: e.aliases ?? [],
          status: e.status,
          tags: e.tags ?? [],
          summary: e.summary,
          ...(e.type === "event" ? { year: e.year } : {}),
          ...(e.type === "story" ? { speaker: e.speaker ?? null, form: e.form ?? "prose" } : {}),
          ...(e.epithet ? { epithet: e.epithet } : {}),
          relations: relations.filter((r) => r.from === e.id).map(({ to, kind, declared }) => ({ to, kind, declared })),
          body: e.body,
          file: e.file,
        },
      ]),
    ),
    relations,
    timeline: [...entities.values()]
      .filter((e) => e.type === "event")
      .sort((a, b) => a.year - b.year)
      .map((e) => ({ year: e.year, id: e.id, name: e.name, summary: e.summary })),
  };
  return { out, entities, relations };
}

export function graphMarkdown(entities, relations) {
  const label = (id) => `${id}["${entities.get(id).name.replace(/"/g, "'")}"]`;
  const lines = ["```mermaid", "graph LR"];
  for (const e of entities.values()) lines.push(`  ${label(e.id)}`);
  for (const r of relations.filter((r) => r.declared)) lines.push(`  ${r.from} -- ${r.kind} --> ${r.to}`);
  lines.push("```");
  return `# Gallowmark, drawn\n\nGenerated by \`node tools/lore.mjs build\`. Declared relations only; inverses are implied.\n\n${lines.join("\n")}\n`;
}

// ---------------------------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------------------------

function stableJson(o) {
  return JSON.stringify(o, null, 2) + "\n";
}

function main(argv) {
  const [cmd, ...args] = argv;
  if (cmd === "validate") {
    const { entities, problems } = validate();
    if (problems.length) {
      console.error(problems.map((p) => `  ✖ ${p}`).join("\n"));
      process.exit(1);
    }
    console.log(`✔ ${entities.size} entities, all links and relations resolve`);
    return;
  }
  if (cmd === "build" || cmd === "check") {
    const r = build();
    if (r.problems) {
      console.error(r.problems.map((p) => `  ✖ ${p}`).join("\n"));
      process.exit(1);
    }
    const json = stableJson({ ...r.out, generatedAt: cmd === "check" ? current().generatedAt : r.out.generatedAt });
    const graph = graphMarkdown(r.entities, r.relations);
    if (cmd === "check") {
      const stale = json !== readIf("dist/lore.json") || graph !== readIf("GRAPH.md");
      if (stale) {
        console.error("✖ dist/lore.json or GRAPH.md is stale; run: node tools/lore.mjs build");
        process.exit(1);
      }
      console.log(`✔ dist/lore.json is current (${r.entities.size} entities)`);
      return;
    }
    mkdirSync(join(ROOT, "dist"), { recursive: true });
    writeFileSync(join(ROOT, "dist/lore.json"), json);
    writeFileSync(join(ROOT, "GRAPH.md"), graph);
    console.log(`✔ wrote dist/lore.json (${r.entities.size} entities, ${r.relations.length} relations) and GRAPH.md`);
    return;
  }
  if (cmd === "new") {
    const [type, id] = args;
    if (!TYPES[type] || !id || !/^[a-z0-9-]+$/.test(id)) {
      console.error(`usage: node tools/lore.mjs new <${Object.keys(TYPES).join("|")}> <kebab-id>`);
      process.exit(1);
    }
    const file = join(ROOT, TYPES[type], `${id}.md`);
    if (existsSync(file)) {
      console.error(`exists: ${file}`);
      process.exit(1);
    }
    const name = id.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
    writeFileSync(
      file,
      `---\nname: ${name}\naliases: []\nstatus: draft\ntags: []\nsummary: \n${type === "event" ? "year: 0\n" : ""}${type === "story" ? "speaker: \nform: prose\n" : ""}relations: []\n---\n\n## Who or what\n\n## In the world\n\n## Threads\n`,
    );
    console.log(`created ${TYPES[type]}/${id}.md`);
    return;
  }
  if (cmd === "list") {
    const { entities } = loadEntities();
    for (const e of [...entities.values()].filter((e) => !args[0] || e.type === args[0])) console.log(`${e.type.padEnd(9)} ${e.id.padEnd(22)} ${e.status.padEnd(7)} ${e.name}`);
    return;
  }
  console.log("usage: node tools/lore.mjs <validate|build|check|new|list>");
  process.exit(cmd ? 1 : 0);
}

function readIf(rel) {
  const p = join(ROOT, rel);
  return existsSync(p) ? readFileSync(p, "utf8") : "";
}

function current() {
  try {
    return JSON.parse(readIf("dist/lore.json"));
  } catch {
    return { generatedAt: "" };
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main(process.argv.slice(2));
