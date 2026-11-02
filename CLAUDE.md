# Ludicrous Display: notes for working on this project

A sports-talk trainer parodying Bluffball, the website in *The IT Crowd* series 3, episode 2,
"Are We Not Men?" (Channel 4, 2008). Someone who doesn't follow sport picks a real game, learns a
five-beat script about it, practises in a pretend pub conversation, and leaves before they're
caught out. The whole page is `src/app.html`; `src/build.js` builds every copy of it. README.md
has the commands.

## Where each copy lives

- **Website**: https://c0rw1n.com/sportstalk/, a hidden folder of the c0rw1n.com site. The site
  folder is `Dropbox/C01InnovativeWebsite` on the owner's computer; the folder goes up inside
  that folder's `SITE.zip`, which the owner uploads. To update it:
  `node src/build.js --site-only --site "<site folder>/sportstalk"`, then
  `node src/pack-site.js "<site folder>"`. Don't upload anything; the owner does.
- **Results feed**: `.github/workflows/refresh.yml` force-pushes `results.json` and `logos/` to
  this repo's `feed` branch twice a day and on every push to main. GitHub Pages is off; there is
  no website on GitHub.
- **claude.ai**: publish `src/artifact.html` to https://claude.ai/artifact/85D6bepjW1FBELC4J5CAt6
  (update that artifact; don't create a new one).
- **Local**: `ludicrous-display.html`, which loads results straight from ESPN.

## Rules to keep

- **Privacy** (c0rw1n.com/privacy.html promises it): the website copy makes no requests to other
  companies' servers when it opens. Fonts are self-hosted, logos are files beside the page, and
  visitors' browsers never contact ESPN. The GitHub feed loads only after the visitor presses
  "Load the latest results", and the page says GitHub will see their IP address first. Don't
  auto-load it on later visits. The page carries `noindex, nofollow`, isn't in the sitemap, and
  nothing on c0rw1n.com links to it.
- **Two looks.** Every Modern rule is scoped `:root:not([data-skin=retro])` and every Retro rule
  `:root[data-skin=retro]`. Changing one must not change the other: after a restyle, compare the
  other look's computed styles element by element against the previous build.
- **Regions.** Soccer, rugby and cricket are British: wording, spelling, betting slang (pony,
  acca) and British voices. NFL, NBA, NHL, MLB and F1 are North American: wording, US spelling
  (hockey's researched talk is Canadian and keeps Canadian spelling), parlays and spreads, and
  smooth US voices in Modern, robotic US voices in Retro. `REGION` and `isNA()` in `app.html`
  drive this; any new shared text needs both versions.
- **Every visit opens on hockey (NHL).**
- **Content**: no song lyrics (naming a song is fine), no TV, film or ad catchphrases, no slurs,
  nothing about deaths or tragedies, mild banter only. Research follows `research/BRIEF.md` and
  must pass `node research/audit.js`.
- **Credits** name *The IT Crowd*, Channel 4 and Graham Linehan, link the episode on IMDb, and
  say it's an unofficial fan parody. The Retro characters (`src/art/`) are the owner's own images
  (fan redrawings of the show's Bluffball characters); credits say so.
- **Episode lines** ("Did you see that ludicrous display last night?", "The thing about Arsenal
  is, they always try to walk it in") stay where they fit and are tagged "From the episode".

## How the content fits together

- `research/out/*.json`: per-team guides (nicknames, fans, rivals, sayings, giveaways), shown as
  "talk like a local" and used in the pub test.
- Talk packs (`research/hockey-canada.json`, `football-uk.json`, `football-nfl.json`,
  `basketball-nba.json`, `baseball-mlb.json`, `f1-na.json`): sport-wide slang, phrase-book lines,
  pub-test rounds, giveaways, and a five-beat exchange per kind of result. `talkSituation()` in
  `app.html` picks the exchange from the real game; placeholders that can't be filled fall back
  to the built-in line.
- Team logos come from ESPN's image server at build time (crisp 96px for Modern, 16px enlarged
  into pixels for Retro), cached in `_cache/`.

## Before publishing

1. `node src/build.js` and `node research/audit.js`.
2. `node src/serve.js`, open http://localhost:8765/, and in the browser console run
   `(0,eval)(await (await fetch("/src/checks.js")).text())` at desktop width and again at phone
   width (about 375px). It renders every game in both looks and lists stray text, overflow and
   errors.
3. If a look was restyled, compare the other look against the previous build.
4. Push to main (the workflow rebuilds the feed), republish the claude.ai artifact, rebuild the
   website folder and `SITE.zip`.
