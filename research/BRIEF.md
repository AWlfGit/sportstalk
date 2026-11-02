# Team lingo research brief (version 2)

Ludicrous Display is a sports-talk trainer inspired by the Bluffball site in *The IT Crowd*. It
helps people who don't follow sport hold a short, convincing conversation about a team. Local
lingo is the heart of the site: we want, for each team, the knowledge a real local fan has:
what fans call the team and themselves, the ground, the rivalry, the things fans genuinely say
after a win, a loss or a rivalry game, their traditions, the sore subjects, the names locals
pronounce their own way, and the giveaways that mark someone as an outsider. The page uses
this for a "talk like a local" section, the script, a cover story, a drill, and a pretend pub
conversation, and it reads terms and lines aloud.

Today is 1 November 2026. Facts must be current for the 2026-27 season (stadium names after
renames or moves, relocated or renamed franchises, current league).

Each team also belongs to a region (see `research/REGIONS.md`). City-wide dialect (Boston's
"wicked", Pittsburgh's "yinz", Scouse, Geordie) goes in the region pack, not in every team.
A team's own lingo is what's specific to that club and its fans.

Where to look, and how much to trust each source: `research/SOURCES.md`.

## Output

Write a JSON array to the file path you were given. One object per team, exactly this shape
(keep every field, in this order):

```json
{
  "team": "Arsenal",
  "espnId": "359",
  "league": "soccer/eng.1",
  "region": "uk-london",
  "aliases": ["arsenal", "the arsenal", "gunners", "afc"],
  "nickname": "the Gunners",
  "fans": "Gooners",
  "ground": "the Emirates",
  "rivals": [
    {"team": "Tottenham Hotspur", "name": "Spurs", "derby": "the North London derby"}
  ],
  "legends": ["Thierry Henry", "Tony Adams", "Dennis Bergkamp"],
  "memory": "The Invincibles: unbeaten through the 2003-04 league season",
  "lingo": [
    {"term": "Gooner", "say": "GOO-ner", "ipa": "ˈɡuːnə", "tts": "", "means": "An Arsenal fan. Fans use it with pride."}
  ],
  "lines": [
    {"t": "A line a fan of this team would actually say", "m": "What it means, or when to use it", "when": "any"}
  ],
  "traditions": [
    {"name": "The clock end", "means": "Short note on the ritual, song (by title only), object or habit"}
  ],
  "sore": [
    {"topic": "A painful subject", "why": "Why to steer clear of it, in one short sentence"}
  ],
  "pronounce": [
    {"word": "Gabriel", "say": "GAB-ree-el", "ipa": "", "tts": "", "why": "Only when locals say a name differently from how it's spelled"}
  ],
  "avoid": [
    {"say": "Arsenal FC are", "instead": "Arsenal are", "why": "Short reason this marks you as an outsider"}
  ],
  "sources": ["https://..."],
  "unsure": []
}
```

Field rules:

- `team`, `espnId`, `league`: copy exactly from the existing file. Never change them.
- `region`: one id from `research/REGIONS.md`.
- `aliases`: lowercase strings someone might type to mean this team (city, short name,
  nickname, common abbreviation). 2-8 entries. No aliases that equally fit another team in the
  same league (e.g. not "united" alone in the Premier League).
- `nickname`: what people call the team, written the way you'd use it mid-sentence, with "the"
  if fans say "the" ("the Gunners", "the Bhoys", "Da Bears" if that's the usage). "" if none.
- `fans`: what supporters call themselves, if anything ("Gooners", "Kopites", "Bills Mafia").
  Include "the" only if fans say it ("the C of Red").
- `ground`: the home venue as fans say it today (short form). Note renames and moves.
- `rivals`: 1-3, biggest first. `team` = the rival's full name, `name` = what fans call them,
  `derby` = the rivalry's name if it has one, else "".
- `legends`: 2-4 retired greats. Never current players or coaches: they go out of date.
- `memory`: one famous moment or era a fan might mention, with a year.
- `lingo`: 4-8 fan terms, nicknames or slang specific to this team and its fans. Include
  local-language terms where fans use them (e.g. "Barça", "Die Roten", "le CH").
- `lines`: 5-8 short things fans of this team actually say: rallying cries, in-jokes, local
  phrasing, how they talk about the rival. `when` says when the line fits: "any" (fits whatever
  the latest result), "win", "loss" or "rival". At least three must be "any". None may depend
  on current players or managers. Keep them pub-safe.
- `traditions`: 1-3 rituals, objects or habits fans know (a towel, an octopus on the ice, a
  whiteout, a song sung at a set moment, named by title only).
- `sore`: 0-2 subjects fans would rather not hear about from an outsider (a lost final, a
  relocation, a famous blunder). Mild, and never a tragedy or anything about a death.
- `pronounce`: 0-3 names tied to the team (club, ground, area, legend) that locals say
  differently from how outsiders read them. Skip names everyone says correctly.
- `avoid`: 2-4 outsider giveaways specific to this team: a wrong name, a mispronunciation,
  praising the rival, mixing them up with another club. `say` = the giveaway, `instead` = what
  a fan says, `why` = one short sentence. `say` and `instead` are short quotable phrases.
- `sources`: the URLs you relied on (3-6).
- `unsure`: list anything you could not confirm, as "field: reason". Leave the field out of the
  data (use "" or []) rather than guess.

Keep existing content that's accurate and natural; fix what's stiff, wrong or out of date, and
add to reach the counts. North American teams use North American wording and spelling
(Canadian teams Canadian spelling); British and Irish teams British wording.

## Pronunciation

The page reads terms and lines aloud with the browser's speech voices, which guess a word's
sound from its spelling and get slang, local names and foreign words wrong. Every term and name
therefore carries three pronunciation fields:

- `say`: a respelling for people to read, stressed syllable in capitals: "GOO-ner",
  "ah-TLEH-tee-ko".
- `ipa`: the pronunciation in IPA, as locals say it, taken from a reference (see
  `research/SOURCES.md`: Wiktionary first, then Cambridge, Merriam-Webster, Collins, Forvo
  recordings, league or club pronunciation guides). Required for any term or name that isn't an
  everyday dictionary word with its everyday sound. "" for plain words ("clean sheet").
- `tts`: only when a speech voice reading the normal spelling would get it wrong. Write the
  word the way a speech engine will read correctly as ordinary English: lower case, normal
  English spelling patterns, words separated by spaces, no hyphens, no capital letters (capitals
  get spelled out letter by letter) and no IPA symbols. Examples: "deke" is read right, so ""
  ; "Barça" -> "barsa"; "Leicester" -> "lester"; "Atlético" -> "at let ee ko"; "yinz" is read
  right, so "". Measured engine traps: "eh" is read like "bed" (use "A" for the Canadian "eh");
  "ay" and "aye" are read as "eye"; a final silent "e" is dropped as in English; "ch" is read as
  in "church"; "ei" and "ie" are unpredictable; a word in capitals is spelled out.
  Leave `tts` as "" whenever the plain spelling is read right.

Every `tts` is checked automatically: it's run through a speech engine and the sounds it makes
are compared with `ipa`. Write `ipa` carefully; it's the reference.

## Content rules

- Write everything in your own words. Never reproduce song or chant lyrics, even a line. You may
  name a song or anthem by its title (e.g. "fans sing 'Blue Moon'"), and use well-known
  acronyms and short mottos (YNWA, COYS, "Mia san mia", "Més que un club").
- No TV, film or advertising catchphrases. A nickname that started in a sketch but is now just
  what people call the team is fine ("Da Bears").
- Nothing offensive: no slurs, sectarian or political terms (Glasgow and Belfast especially:
  football and rugby only), chants about tragedies or deaths, violence, or mocking of
  disasters. Rivalry banter must be mild.
- No dialect stereotypes outsiders use to mock a place ("aboot"). Only what locals really say.
- Accuracy over volume. Check facts against reliable sources (club sites, Wikipedia, major
  outlets). If you're not confident, leave it out and note it in `unsure`.
- Plain, natural English in `m`, `means` and `why`. Short sentences.

## Before you finish

Validate the file: `node -e "const a=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));console.log(a.length,'teams')" <your file>`,
then `node research/audit.js` and fix anything it flags in your file. Report back in under 200
words: how many teams, the totals for each field, and any teams or fields you were unsure about.
