# Team lingo research brief

Ludicrous Display is a sports-talk trainer inspired by the Bluffball site in *The IT Crowd*. It
helps people who don't follow sport hold a short, convincing conversation about a team. We
want, for each team, the local knowledge a real fan has: what fans call the team and
themselves, the ground, the rivalry, a few things fans genuinely say, and the giveaways that
mark someone as an outsider. The page uses this to fill in a "cover story", add a "talk like a
local" section, and quiz people in a pretend pub conversation.

Today is 1 November 2026. Facts must be current for the 2026-27 season (stadium names after
renames or moves, relocated or renamed franchises, current league).

## Output

Write a JSON array to the file path you were given. One object per team, exactly this shape:

```json
{
  "team": "Arsenal",
  "espnId": "359",
  "league": "soccer/eng.1",
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
    {"term": "Gooner", "say": "GOO-ner", "means": "An Arsenal fan. Fans use it with pride."}
  ],
  "lines": [
    {"t": "A line a fan of this team would actually say", "m": "What it means, or when to use it"}
  ],
  "avoid": [
    {"say": "Arsenal FC are", "instead": "Arsenal are", "why": "Short reason this marks you as an outsider"}
  ],
  "sources": ["https://..."],
  "unsure": []
}
```

Field rules:

- `team`, `espnId`, `league`: copy exactly from the team list you were given. For teams with no
  ESPN list (national sides, F1 teams), use `"espnId": ""` and the league key you were given.
- `aliases`: lowercase strings someone might type to mean this team (city, short name,
  nickname, common abbreviation). 2-6 entries. No aliases that equally fit another team in the
  same league (e.g. not "united" alone in the Premier League).
- `nickname`: what people call the team, written the way you'd use it mid-sentence, with "the"
  if fans say "the" ("the Gunners", "the Bhoys", "Da Bears" if that's the usage). "" if none.
- `fans`: what supporters call themselves, if anything ("Gooners", "Kopites", "Bills Mafia").
- `ground`: the home venue as fans say it today (short form). Note renames and moves.
- `rivals`: 1-3, biggest first. `team` = the rival's full name, `name` = what fans call them,
  `derby` = the rivalry's name if it has one, else "".
- `legends`: 2-4 retired greats. Never current players or coaches: they go out of date.
- `memory`: one famous moment or era a fan might mention, with a year.
- `lingo`: 2-4 fan terms, nicknames or slang specific to this team. `say` is a pronunciation
  respelling with the stressed syllable in capitals (e.g. "GOO-ner", "ah-TLEH-tee-ko"). Include
  local-language terms where fans use them (e.g. "Barça", "Die Roten").
- `lines`: 3-5 short things fans of this team actually say: rallying cries, in-jokes, local
  phrasing, how they talk about the rival. Each must make sense whatever the latest result and
  must not depend on current players or managers. Keep them pub-safe.
- `avoid`: 1-3 outsider giveaways specific to this team: a wrong name, a mispronunciation,
  praising the rival, mixing them up with another club. `say` = the giveaway, `instead` = what
  a fan says, `why` = one short sentence.
- `sources`: 1-3 URLs you relied on.
- `unsure`: list anything you could not confirm, as "field: reason". Leave the field out of the
  data (use "" or []) rather than guess.

## Content rules

- Write everything in your own words. Never reproduce song or chant lyrics, even a line. You may
  name a song or anthem by its title in a line's meaning (e.g. "fans sing 'Blue Moon'"), and use
  well-known acronyms and short mottos (YNWA, COYS, "Mia san mia", "Més que un club").
- Nothing offensive: no slurs, sectarian or political terms, chants about tragedies or deaths,
  violence, or mocking of disasters. Rivalry banter must be mild.
- Accuracy over volume. Check facts against reliable sources (club sites, Wikipedia, major
  outlets). If you're not confident, leave it out and note it in `unsure`.
- Plain, natural English in `m`, `means` and `why`. Short sentences.

## Before you finish

Validate the file: `node -e "const a=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));console.log(a.length,'teams')" <your file>`.
Report back in under 150 words: how many teams, and any teams or fields you were unsure about.
