import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build, graphMarkdown, parseFrontmatter, parseYaml, validate } from "./lore.mjs";

describe("frontmatter yaml subset", () => {
  it("parses scalars, inline lists and maps, block lists and nested maps", () => {
    const y = parseYaml(`name: Sarn the Faceless
aliases: [Sarn, "Lord of Streams", 'The Thief']
status: canon
year: -12
truth: true
nothing:
tags: []
relations:
  - { to: thurn, kind: named-by }
  - { to: iron-crown-of-kell, kind: stole }
looks:
  eyes: yellow
  face: none
# a comment
`);
    assert.deepEqual(y, {
      name: "Sarn the Faceless",
      aliases: ["Sarn", "Lord of Streams", "The Thief"],
      status: "canon",
      year: -12,
      truth: true,
      nothing: null,
      tags: [],
      relations: [{ to: "thurn", kind: "named-by" }, { to: "iron-crown-of-kell", kind: "stole" }],
      looks: { eyes: "yellow", face: "none" },
    });
  });

  it("splits frontmatter from body", () => {
    const { data, body } = parseFrontmatter("---\nname: X\nstatus: draft\n---\n\nBody [[gorvek]]\n");
    assert.equal(data.name, "X");
    assert.equal(body.trim(), "Body [[gorvek]]");
    assert.equal(parseFrontmatter("no frontmatter").data, null);
  });
});

describe("the canon", () => {
  it("validates and builds", () => {
    const { problems } = validate();
    assert.deepEqual(problems, []);
    const { out, relations } = build();
    assert.ok(out.entityCount >= 9);
    assert.ok(out.entities.gorvek && out.entities.sarn && out.entities.gallowmark);
    const stole = relations.find((r) => r.from === "sarn" && r.kind === "stole");
    assert.ok(stole, "sarn stole the crown");
    assert.ok(relations.some((r) => r.from === stole.to && r.to === "sarn" && r.kind === "stolen-by" && r.declared === false), "inverse is generated");
    assert.ok(out.timeline.length >= 1 && out.timeline.every((t, i, a) => i === 0 || a[i - 1].year <= t.year));
  });
});

describe("quotes", () => {
  it("derives name and summary from the body and exports a flat quotes array", () => {
    const { out } = build();
    const q = out.quotes;
    assert.ok(q.length >= 200, "the Linelord pools are imported");
    for (const pool of ["farewell", "initializing", "scanning", "analyzing", "complete"]) assert.ok(q.some((x) => x.pool === pool && x.usedIn.includes("linelord")), pool);
    const one = q.find((x) => x.id === "enough-talk-of-code-the-wind");
    assert.equal(one.text, "Enough talk of code. The wind calls my name.");
    assert.equal(one.speaker, "gorvek");
    const ent = out.entities["enough-talk-of-code-the-wind"];
    assert.equal(ent.type, "quote");
    assert.equal(ent.name, "Enough talk of code. The wind…");
    assert.equal(ent.summary, ent.text);
    assert.ok(!/enough-talk-of-code/.test(graphMarkdown(new Map(Object.entries(out.entities)), out.relations)), "quotes are not drawn");
  });

  it("rejects a quote without a pool, a project, or a body", () => {
    const dir = mkdtempSync(join(tmpdir(), "lore-"));
    mkdirSync(join(dir, "quotes"));
    mkdirSync(join(dir, "characters"));
    writeFileSync(join(dir, "characters/gorvek.md"), "---\nname: Gorvek\nstatus: canon\nsummary: x\n---\n");
    writeFileSync(join(dir, "quotes/a.md"), "---\nspeaker: gorvek\nstatus: canon\n---\n\nA line.\n");
    writeFileSync(join(dir, "quotes/b.md"), "---\npool: farewell\nused-in: [linelord]\nstatus: canon\n---\n");
    writeFileSync(join(dir, "quotes/c.md"), "---\nspeaker: nobody\npool: farewell\nused-in: [linelord]\nstatus: canon\n---\n\nTwo\n\nparagraphs.\n");
    const { problems } = validate(dir);
    assert.ok(problems.some((p) => p.includes("quotes/a.md") && p.includes("'pool'")));
    assert.ok(problems.some((p) => p.includes("quotes/a.md") && p.includes("'used-in'")));
    assert.ok(problems.some((p) => p.includes("quotes/b.md") && p.includes("must not be empty")));
    assert.ok(problems.some((p) => p.includes("quotes/c.md") && p.includes("unknown speaker")));
    assert.ok(problems.some((p) => p.includes("quotes/c.md") && p.includes("one paragraph")));
    rmSync(dir, { recursive: true });
  });
});
