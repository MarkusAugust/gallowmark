import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { build, parseFrontmatter, parseYaml, validate } from "./lore.mjs";

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
