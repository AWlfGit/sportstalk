# Sports talk trainer

Ludicrous Display: a sports talk trainer inspired by the Bluffball website in *The IT Crowd*.
Pick a real game from the last week, learn a three-beat script about it, and practise in a
pretend pub conversation. It covers football, rugby, cricket, F1, NFL, NBA, NHL and MLB, with
local fan lingo for 297 teams.

Website: https://c0rw1n.com/sportstalk/ (a hidden demo folder on c0rw1n.com, not linked from
the main site). This repository holds the source and builds the results feed; it doesn't host
the website.

## What's in this repository

- `src/app.html`: the page itself (HTML, CSS and JavaScript in one file)
- `src/build.js`: fetches the last week of ESPN results and builds the page and the feed
- `src/fonts/`: self-hosted fonts, SIL Open Font License (see the `OFL-*.txt` files);
  `src/get-fonts.js` re-downloads them
- `src/serve.js`: a small local preview server
- `src/pack-site.js`: puts the website folder into the c0rw1n.com `SITE.zip`
- `src/checks.js`: pre-publish checks you run in the browser (see "Checking a build")
- `scrollcraft/`: the Modern look's design brief (made with the Scrollcraft skill: a live app
  surface with a status-bar Bluff meter that fills as you practise) and the skill's fingerprint
  registry
- `CLAUDE.md`: the project's rules and where each copy lives, for anyone (or any Claude
  session) picking the work up on another computer
- Team logos: the build downloads each team's logo from ESPN's image server in two sizes (a
  crisp 96px one for the Modern look and a 16px one the Retro look enlarges into pixels) and
  caches them in `_cache/logos` (not committed). The single-file copies embed them; the website
  copy and the feed keep them in a `logos/` folder. Teams without an ESPN logo get a badge with
  their abbreviation in the team colour.
- `src/art/`: the Retro look's characters (`football.webp` for the header and the fan's
  lines, `glasses.webp` for yours). The build embeds them into the page, so swap a file and
  rebuild to change one.
- `research/out/*.json`: the team guides, one file per league group: nicknames, fan terms,
  sayings by result (any time, after a win, after a loss, rival week), traditions, sore
  subjects, names to say right, rivals and giveaways. Each team has a `region`.
- `research/regions/*.json`: region packs (72 regions, from Boston and Pittsburgh to Merseyside,
  Glasgow, Montreal and New Zealand): the dialect words locals use about sport, place names to
  say right, how the area talks sport, local habits and giveaways. Listed in
  `research/REGIONS.md`.
- `research/SOURCES.md`: where the lingo and pronunciations come from, and how far to trust each
  source.
- `research/pronounce.json`, `research/pronounce-check.js` (with `pronounce-check.ps1`): the
  speech lexicon and its checker. Every researched word carries its IPA and, where the voices
  would misread the spelling, a respelling they read correctly; the build turns those into a
  lexicon the page applies before speaking ("eh" is said like the letter A, "Barça" as
  "barsa"). On Windows, `node research/pronounce-check.js` speaks every word and respelling
  with a Windows voice and compares the sounds with the IPA, and
  `node research/pronounce-fix.js --write` tries other respellings for any that sound wrong and
  saves the closest. Words that are also everyday English ("mate", "gone") are listed under
  `alone` in `pronounce.json`, so they only get the local sound when that word is played on its
  own, and "Alright, mate" still sounds normal.
- `research/hockey-canada.json`, `football-uk.json`, `football-nfl.json`, `basketball-nba.json`,
  `baseball-mlb.json`, `f1-na.json`: talk packs. Soccer's is British; the rest are North
  American (hockey's is Canadian rink talk). Each holds sport-wide slang,
  phrase-book lines, pub-test rounds, outsider giveaways, and a five-beat exchange for each
  kind of result (an overtime win, a late winner, a shutout and so on). The script picks the
  exchange that matches the game and fills in `{team}`, `{opp}`, `{player}`, `{score}` and
  `{when}`; if a slot can't be filled, it uses the built-in line instead.
- `research/BRIEF.md`: the rules the team guides were researched to (format, accuracy, no
  lyrics, nothing offensive)
- `research/audit.js`: checks the team guides, region packs and talk packs against those rules
- `research/get-teams.js` and `research/teams/`: ESPN's team lists, used when researching
- `.github/workflows/refresh.yml`: rebuilds the results feed twice a day

## Local mode

Every visit opens on **All sports**, showing games **near you**. The **Where** button sets the
area: *Near me* (the city of your device's time zone, or your precise location if you choose to
share it), a city you pick, or *Everywhere*. A game counts as local when either team is based
within 500 km of you, home or away, or when your own team plays; *How near* changes the distance
(250 to 2,000 km), and a time-zone guess reaches 1,000 km until you choose. The page opens on the
nearest team's latest game. Where nothing is near (most of Asia, Africa and Oceania, for the
leagues the site covers), it shows every game with a note saying so. Your location is worked out
in your browser and never sent anywhere.

- `src/local.js`: the rules (the build puts it into the page; tests can `require()` it)
- `research/places.json`: where every team is based, plus the city of each time zone. Made by
  `node research/get-places.js`: home venues from ESPN team schedules (rugby by hand in
  `research/places-manual.json`), coordinates from OpenStreetMap's Nominatim, cached in
  `research/geocode-cache.json`. Re-run it for a new season or promoted teams.
- `node research/test-local.js`: checks the rules and the data against sample cities

## Working on it from any computer

You need git and Node.js 18 or later. To push changes, sign the GitHub CLI in once
(`gh auth login`, then `gh auth setup-git`). To update the website you also need the c0rw1n.com
site folder, which syncs through Dropbox.

```bash
git clone https://github.com/AWlfGit/sportstalk.git
```

Then, inside the `sportstalk` folder:

```bash
node src/build.js
```

That writes two files, which git ignores:

- `ludicrous-display.html`: open it in a browser. It loads live results from ESPN itself.
- `src/artifact.html`: the version for publishing on claude.ai.

## Updating the website

The website copy lives in the c0rw1n.com site folder (`Dropbox/C01InnovativeWebsite` on the main
computer; use wherever Dropbox puts it on yours) as `sportstalk/`, and goes up inside that
folder's `SITE.zip`. Rebuild the folder with the latest results:

```bash
node src/build.js --site-only --site "<site folder>/sportstalk"
```

That writes `index.html`, `fonts/`, `logos/` and `lingo/` (one file of local lingo per sport, which the page loads when that sport is picked). Then put the folder into `SITE.zip`:

```bash
node src/pack-site.js "<site folder>"
```

It replaces only the `sportstalk/` entries, copies everything else across untouched, checks the
result, and backs up the previous zip to your temp folder. Then upload the site as usual. To
preview first, run `node src/serve.js "<site folder>" 8766` and open
http://localhost:8766/sportstalk/.

On the main computer, `<site folder>` is `C:/Users/Awake/Dropbox/C01InnovativeWebsite`.

You only need to re-upload when the page itself changes. Results stay fresh through the feed.

## Checking a build

Before publishing, run the checks in a browser:

1. `node src/build.js`, then `node src/serve.js`, and open http://localhost:8765/.
2. In the browser's developer console, run:
   ```js
   (0,eval)(await (await fetch("/src/checks.js")).text())
   ```
3. Do it at desktop width and again at phone width (about 375px). It renders every game in both
   looks, plus every team's Local lingo page, and lists any stray text (undefined, unfilled
   slots), anything wider than the window, and errors. It reloads the page when it's done. Keep
   the window visible while it runs; a background window slows it right down.

## Changing the lingo

1. Edit the team in `research/out/<group>.json` or the region in `research/regions/`,
   following `research/BRIEF.md` and `research/REGIONS.md`, or the sport-wide talk in one of
   the talk-pack files. `research/SOURCES.md` says where to look.
2. Run `node research/audit.js` (add a filter such as `out/nhl` or `regions/uk` to see one
   file) and review anything it flags.
3. On Windows, run `node research/pronounce-check.js` and fix any respelling it lists
   (`node research/pronounce-fix.js --write` does most of them). To fix a word everywhere, add it
   to `research/pronounce.json`; if it's also an everyday English word, add it to `alone` there.
4. To drop a line without editing the research, add a phrase from it to
   `research/blocked.json` (a JSON list of strings). The build skips any text containing it.
5. Build, check the page, and push.

## The results feed

The workflow rebuilds the feed and publishes it to this repository's `feed` branch:

- twice a day, at 06:30 and 18:30 UTC (after North American night games and European
  afternoon games)
- every time you push to `main`
- whenever you run it by hand: **Actions** tab, **Refresh results**, **Run workflow**

The branch holds `results.json` (the last week of ESPN results and league tables) and
`logos/`, and is replaced on each run, so it never grows. Don't commit to it.

The website opens with the results saved when it was built, and makes no requests to other
companies' servers. Visitors who press **Load the latest results** get the feed from
`raw.githubusercontent.com`; the page tells them GitHub will see their IP address before they
press it. Visitors' browsers never contact ESPN. The page carries `noindex, nofollow`, so
search engines leave it out.

GitHub pauses scheduled workflows in public repositories after 60 days with no activity. If
nothing has been committed to `main` for 45 days, the workflow adds an empty commit to keep
running.

## Other copies

- **claude.ai**: after building, publish `src/artifact.html` from Claude to the existing
  Ludicrous Display artifact link. That copy can't fetch anything, so it shows the results
  saved when it was built.

## One-time GitHub setup (already done)

1. Give the GitHub CLI permission to push workflow files:
   ```bash
   gh auth refresh -h github.com -s workflow
   ```
2. Create the repository:
   ```bash
   gh repo create AWlfGit/sportstalk --public --description "Sports talk trainer"
   ```
3. From this folder, push:
   ```bash
   gh auth setup-git; git remote add origin https://github.com/AWlfGit/sportstalk.git; git push -u origin main
   ```

GitHub Pages is switched off for this repository; the website is hosted on c0rw1n.com.
