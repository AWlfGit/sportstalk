# Talk pack brief

A talk pack is a sport's shared talk, as one fan of that sport talks to another in one country:
slang, things to say, pub-test rounds, outsider giveaways, and a five-beat exchange for each kind
of result. Team guides (`research/BRIEF.md`) hold what's specific to one club; region packs
(`research/REGIONS.md`) hold a city's dialect. The page reads all three, and reads lines aloud.

Existing packs to match for tone and depth: `research/hockey-canada.json`,
`research/football-uk.json`, `research/football-nfl.json`.

## Output

One JSON object, written to the file you were given, with these keys in this order:

```json
{
  "terms": [
    {"term": "biscuit", "say": "BIS-kit", "ipa": "", "tts": "", "means": "The puck.", "use": "Just throw the biscuit on net and see what happens.", "common": true}
  ],
  "phrases": {
    "open":    [{"t": "You catch the {team} game?", "m": "When and why to use it"}],
    "opinion": [{"t": "...", "m": "..."}],
    "agree":   [{"t": "...", "m": "..."}],
    "dodge":   [{"t": "...", "m": "..."}],
    "telly":   [{"t": "...", "m": "..."}],
    "exit":    [{"t": "...", "m": "..."}]
  },
  "exchanges": {
    "win": {"open": "...", "them": "...", "back": "...", "agree": "...", "exit": "..."}
  },
  "pub": [
    {"say": "What a fan says to you", "o": [["A reply", 2, "Why it works"], ["Another", -1, "Why it's off"], ["A third", -2, "Why it gives you away"]]}
  ],
  "avoid": [
    {"say": "the giveaway", "instead": "what a fan says", "why": "One short sentence."}
  ],
  "nerd": "One over-detailed stats sentence a know-it-all fan would say.",
  "offq": "One niche question that sounds like insider knowledge.",
  "builtin": {},
  "sources": ["https://..."],
  "unsure": []
}
```

- `terms`: 30-35 slang words and phrases fans of this sport really use in that country today,
  everyday ones first (`common: true` for the ones every fan knows). `use` is a natural example
  sentence.
- `phrases`: 6-8 per kind. `open` starts a conversation about the latest game; `opinion` is a
  safe take that fits most games; `agree` keeps the other person talking; `dodge` gets you out of
  a question you can't answer; `telly` is something to shout at the screen; `exit` ends the chat.
- `exchanges`: one per situation key you were given. Five beats: `open` (you start), `them` (what
  the other fan says back), `back` (your follow-up), `agree` (you agree with whatever they say
  next), `exit` (you leave). Each beat is one or two short sentences a fan really says.
- `pub`: 8 rounds. Each has exactly three options scored 2 (what a fan says), 1, 0, -1 or -2 (an
  instant giveaway), with at least one 2, and a short note on each.
- `avoid`: 8-10 outsider giveaways for the sport in that country (wrong names, wrong words, wrong
  assumptions).
- `builtin`: the sport's card for the page, used when nothing else is available. Shape:
  `{"label": "...", "team": "an example club, named exactly as in the team guides", "play": "game",
  "cover": {"nickname": "", "rival": "", "ground": "", "player": "a retired great", "since": "a year",
  "memory": "a famous moment"}, "others": ["six other clubs, short names"],
  "betting": [["term", "SAY-it", "what it means"]]}` with 4-6 betting words used in that country.

Placeholders, filled from the real game: `{team}` (the fan's team), `{opp}` (the opposition),
`{player}` (a scorer from the game), `{score}` (the score), `{when}` ("on Saturday", "last night").
Use no others. A line that needs `{player}` should still read well with any name. `phrases` and
`pub` aren't tied to one game, so they may use only `{team}` and `{when}`.

## Rules

- Today is 2 November 2026. Facts must be current (club names, grounds, competition formats).
- Write in the country's own English: spelling, words, betting slang.
- Pronunciation fields follow "Pronunciation" in `research/BRIEF.md` (`ipa` from a reference;
  `tts` only when a speech voice would misread the spelling).
- Content rules as in `research/BRIEF.md`: your own words, no song or chant lyrics (titles are
  fine), no TV, film or ad catchphrases, nothing offensive, mild banter, nothing about deaths or
  tragedies, nothing that depends on current players or coaches.
- Accuracy over volume; note anything you couldn't confirm in `unsure`.
- Validate the JSON, run `node research/audit.js <your file name>` and fix what it flags. Report
  back in under 200 words.
