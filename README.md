# Gallowmark

The canon of Gallowmark: characters, places, factions, gods, artifacts, events and stories,
with the relations between them, kept as Markdown and exported as one JSON file that any
other project can read.

Start with [WORLD.md](WORLD.md) for the world in one page and [STYLE.md](STYLE.md) for the
rules of writing it. [GRAPH.md](GRAPH.md) draws the relations.

## Layout

```
characters/  places/  factions/  gods/  artifacts/  events/  stories/  quotes/
    one Markdown file per entity; the file name is the id
tools/lore.mjs         validate, build, check, new, list  (no dependencies)
schema/lore.schema.json  JSON Schema for dist/lore.json
dist/lore.json         the export, committed, always current (CI fails otherwise)
GRAPH.md               generated Mermaid graph of declared relations
```

Open the folder in Obsidian and it just works: `[[wikilinks]]`, graph view, backlinks.

## An entity

```markdown
---
name: Sarn
epithet: the Faceless
aliases: [Sarn the Faceless, Lord of Streams]
status: canon            # canon | draft | retired
tags: [demon, thief]
summary: One line, safe to show anywhere.
relations:
  - { to: iron-crown-of-kell, kind: stole }
  - { to: thurn, kind: named-by }
---

## What
Prose. Link other entities with [[gorvek]].
```

Events add `year:` (years since the Ashfall; negative is before). Stories add `speaker:`
(an entity id) and `form:` (creed, whisper, chronicle, prose, verse).

## A quote

The one-liners a tool draws at random live in `quotes/`, one file each. The body is the
text; `name` and `summary` are derived from it, so the frontmatter is only where it is used:

```markdown
---
speaker: gorvek            # optional; an entity id
pool: farewell             # where the tool uses it: farewell, initializing, scanning, analyzing, complete
used-in: [linelord]        # the projects that draw from this pool
status: canon
tags: [nod]                # nod: a reference to the films or the old stories; see STYLE.md
---

Enough talk of code. The wind calls my name.
```

The export carries them twice: as entities, and as a flat `quotes` array
(`{ id, text, speaker, pool, usedIn, status, tags }`) that a tool can filter by project and
pool. Quotes are not drawn in GRAPH.md.

Relations are written on one side only; the export carries the inverse (`stole` becomes
`stolen-by` on the crown). Kinds: ally-of, enemy-of, rival-of, kin-of, born-in, lives-in,
haunts, rules, member-of, leads, worships, serves, named-by, created, forged, wields, stole,
guards, located-in, caused, survived, destroyed, narrates, speaks, features, precedes.

## Working on the canon

```
npm run new -- character the-hollow-king   # scaffold characters/the-hollow-king.md
npm run validate                           # ids, links, relations, required fields
npm run build                              # dist/lore.json + GRAPH.md
npm test                                   # the tool's own tests and a canon smoke test
```

CI runs `npm run check` and fails if `dist/lore.json` was not rebuilt after a change, so the
export is never stale on `main`.

## Using it from another project

`dist/lore.json` is the interface. Its shape is fixed by `schema/lore.schema.json`:

```json
{
  "world": "Gallowmark",
  "entities": {
    "sarn": { "id": "sarn", "type": "character", "name": "Sarn", "epithet": "the Faceless",
              "summary": "...", "relations": [{ "to": "iron-crown-of-kell", "kind": "stole", "declared": true }],
              "body": "## What\n...", "file": "characters/sarn.md" }
  },
  "relations": [{ "from": "sarn", "to": "iron-crown-of-kell", "kind": "stole", "declared": true }],
  "timeline": [{ "year": -40, "id": "the-drowning-of-kell", "name": "The Drowning of Kell", "summary": "..." }]
}
```

Ways to get it:

- **Git submodule** (private repo, works with your SSH key):
  `git submodule add git@github.com:MarkusAugust/gallowmark.git lore` and read
  `lore/dist/lore.json`.
- **Fetch with the GitHub CLI** in a build step:
  `gh api repos/MarkusAugust/gallowmark/contents/dist/lore.json -H "Accept: application/vnd.github.raw" > lore.json`
- **Copy the file.** It is one file; that is the point.

Reference entities by id and never by display name: `gorvek`, `sarn`, `gallowmark`. Ids do
not change; names, epithets and aliases may.

```kotlin
// Kotlin, with the Streamlord JSON parser (no dependencies)
val lore = JsonParser.parseObject(File("lore/dist/lore.json").readText())
val sarn = lore.obj("entities")!!.obj("sarn")!!
println("${sarn.string("name")} ${sarn.string("epithet")}: ${sarn.string("summary")}")
```

```ts
// TypeScript
import lore from "./lore/dist/lore.json" with { type: "json" };
const creed = lore.entities["gorveks-creed"].body;
```

## The first uses

The Streamlord SDK takes its epigraphs from `stories/`, its narrator from [[sarn]] and its
hero from [[gorvek]]. LineLord takes its names from the canon and its farewells and analysis
messages from `quotes/`, generated into its source by `bun run sync-lore` from this file. A
game, one day, starts from the same file.

## License

All rights reserved. This is a world, not a library.
