# Style: how Gallowmark is written

## Names

- Every land of Harth has its own naming culture. A name from one land should not sound like
  it came from another:
  - **Gallowmark and the Rimewold**: short and hard, Nordic. One or two syllables for people
    and gods (Sarn, Thurn, Hrok), compound words for places (Bonereach, Brandfell). Northern
    gods are often not named at all, only called (the Old Smith Under the Snow).
  - **Crownhold**: Latinate and imperial, long, with house names and regnal numbers
    (Aurelian Vasthorne VII).
  - **Harrowmere**: Dutch-sober, merchant names and house names (Aleid van der Haalst, the
    House of Salt).
  - **The Glassands, the Hadd and Old Vahr**: alien and their own, hard consonants and breaks,
    no model in any real language (Qeth-Ummar, Ysh'ra).
  - **The Feverfen**: vowel-rich and soft, names like water (Aoleiwa).
  - **Common speech across Harth**: plain English titles and epithets (Nevermourn, the Paid,
    Saltgrave).
- Cultures modelled on a real language (Latinate Crownhold, Dutch Harrowmere) may use real
  given names from it. Names from any published setting, game, book or film are never used:
  if a name turns out to belong to someone else's world, change it.
- Names are chosen, not dashed off. Offer several in different registers before one is fixed.
- Invented, always. No names, places, gods, orders or artifacts from any published setting,
  game, book or film. If a name turns out to exist elsewhere, change it.
- Creatures are named for what they do or what was done to them (the Barred, the Drawn,
  Notchers, the Unasked), never for a monster from another table. No ghouls, no wights, no
  krakens: if the word has a bestiary entry somewhere else, it is wrong here.
- English is the language of the canon. Nordic roots are welcome as long as the word does
  not mean something silly in Norwegian.

## Language

- All lore is written in English: every entity, quote, story and WORLD.md. English is the
  source of truth, and a translation never changes canon.
- Translations come later and are tuned by hand. They live in `translations/<lang>/`
  (Norwegian is `translations/nb/`), one file per entity with the same path and file name as
  the English one. A translation keeps the names as they are (Gorvek, Sarn, Gallowmark,
  the Greycloaks) unless the canon gives a translated name.
- When the English changes, its translations are stale until someone tunes them again.

## Voices

- **Gorvek** speaks in creeds: present tense, physical, no explanation. Someone else asks;
  he answers with what he wants. He is the hero, never the narrator. He gets four lines, not
  a paragraph.
- **Sarn** narrates. Short sentences that end where the knife goes in. Direct address
  ("Sit. Read."). Every gift is a theft. Never a lie, never the whole truth.
- **The river-priests** answer with names, never reasons.
- **The Greycloaks** are polite. That is the horror.

## Cadence

Conan-the-barbarian energy in the epigraphs: the question-and-answer creed, the chronicle
opening ("Know this, you who come late…"), the oath by a catastrophe rather than a god.
Always original words. Never quote the films or the old stories.

## Nods

The quote pools that the tools draw from (`quotes/`) are allowed one thing the canon prose
is not: a nod to the films and the old stories, laid on thick, as long as it is a reference
and not a name. "What is best in code?" is a nod. A god, a place or a person from another
table is a name, and is never used. Nods carry the tag `nod` so they can be found, counted
and, if the day comes, replaced.

## Canon rules

- Every entity is a Markdown file with frontmatter; see the README for the fields.
- `status: canon` is binding. A `draft` may contradict canon; canon may not contradict canon.
  Retire, do not delete.
- A relation is written on one side; the tool generates the inverse. Write it on the side
  that acts (`sarn stole iron-crown-of-kell`, not the reverse).
- Years count from the lifting of the Ashfall. Before it, negative and vague.
- One line `summary` per entity, safe to show anywhere, no spoilers.
- Wikilinks `[[id]]` in the body must resolve. Threads at the end of an entity are open
  questions, not promises.

## Tone

Brutal land, tired people, occasional magnificence. No cynicism. Nobody is stupid; the
Greycloaks win because people are tired, not because they are fools.
