# Sports talk trainer

Ludicrous Display: a sports talk trainer inspired by the Bluffball website in *The IT Crowd*.
Pick a real game from the last week, learn a three-beat script about it, and practise in a
pretend pub conversation. It covers football, rugby, cricket, F1, NFL, NBA, NHL and MLB, with
local fan lingo for 297 teams.

Live page: https://awlfgit.github.io/sportstalk/

## What's in this repository

- `src/app.html`: the page itself (HTML, CSS and JavaScript in one file)
- `src/build.js`: fetches the last week of ESPN results and builds the page
- `src/fonts/`: self-hosted fonts, SIL Open Font License (see the `OFL-*.txt` files);
  `src/get-fonts.js` re-downloads them
- `src/serve.js`: a small local preview server
- Team logos: the build downloads each team's logo from ESPN's image server in two sizes (a
  crisp 96px one for the Modern look and a 16px one the Retro look enlarges into pixels) and
  caches them in `_cache/logos` (not committed). The single-file copies embed them; the website
  copy writes them to a `logos/` folder next to the page. Teams without an ESPN logo get a
  badge with their abbreviation in the team colour.
- `src/art/`: the Retro look's characters (`football.webp` for the header and the fan's
  lines, `glasses.webp` for yours). The build embeds them into the page, so swap a file and
  rebuild to change one.
- `research/out/*.json`: the team guides, one file per league group. Edit these to change
  nicknames, fan terms, rivals, sayings and giveaways.
- `research/hockey-canada.json`, `research/football-uk.json`, `research/football-nfl.json`:
  talk packs for hockey, football (soccer) and American football. Each holds sport-wide slang,
  phrase-book lines, pub-test rounds, outsider giveaways, and a five-beat exchange for each
  kind of result (an overtime win, a late winner, a shutout and so on). The script picks the
  exchange that matches the game and fills in `{team}`, `{opp}`, `{player}`, `{score}` and
  `{when}`; if a slot can't be filled, it uses the built-in line instead.
- `research/BRIEF.md`: the rules the team guides were researched to (format, accuracy, no
  lyrics, nothing offensive)
- `research/audit.js`: checks the team guides and talk packs against those rules
- `research/get-teams.js` and `research/teams/`: ESPN's team lists, used when researching
- `.github/workflows/refresh.yml`: rebuilds and publishes the page twice a day

## Working on it from any computer

You need git and Node.js 18 or later.

```bash
git clone https://github.com/AWlfGit/sportstalk.git
```

Then, inside the `sportstalk` folder:

```bash
node src/build.js
```

That writes two files, which git ignores:

- `ludicrous-display.html`: open it in a browser. It loads live results itself.
- `src/artifact.html`: the version for publishing on claude.ai.

To preview the website version exactly as GitHub publishes it:

```bash
node src/build.js --site-only --site _site
```

```bash
node src/serve.js _site 8765
```

Then open http://localhost:8765/.

Push to `main` and the live page rebuilds and republishes within a few minutes.

## Changing the team guides

1. Edit the team in `research/out/<group>.json`, following `research/BRIEF.md`, or the
   sport-wide talk in one of the talk-pack files.
2. Run `node research/audit.js` and review anything it flags.
3. To drop a line without editing the research, add a phrase from it to
   `research/blocked.json` (a JSON list of strings). The build skips any text containing it.
4. Build, check the page, and push.

## How the live page stays fresh

The workflow rebuilds the page with the latest ESPN results and publishes it to GitHub Pages:

- twice a day, at 06:30 and 18:30 UTC (after North American night games and European
  afternoon games)
- every time you push to `main`
- whenever you run it by hand: **Actions** tab, **Refresh results**, **Run workflow**

Only the built page, its fonts and the team logos are published, not the rest of this repository. Visitors'
browsers load everything from the site itself, so the page makes no requests to other
companies' servers when it opens. Visitors can still press **Load today's results from ESPN**
for up-to-the-minute scores; that button asks ESPN directly and says so. The page carries
`noindex, nofollow`, so search engines leave it out.

GitHub pauses scheduled workflows in public repositories after 60 days with no activity. If
nothing has been committed for 45 days, the workflow adds an empty commit to keep running.

## Other copies

- **claude.ai**: after building, publish `src/artifact.html` from Claude to the existing
  Ludicrous Display artifact link. That copy can't fetch live results, so it shows the results
  saved when it was built.
- **The c0rw1n.com website folder**: not needed while GitHub Pages serves the page. If you ever
  host it there instead, `node src/build.js --site <folder>` writes the website copy into
  `<folder>`.

## One-time GitHub setup

1. Give the GitHub CLI permission to push workflow files:
   ```bash
   gh auth refresh -h github.com -s workflow
   ```
2. Create the repository:
   ```bash
   gh repo create AWlfGit/sportstalk --public --description "Sports talk trainer"
   ```
3. Publish GitHub Pages from Actions:
   ```bash
   gh api -X POST repos/AWlfGit/sportstalk/pages -f build_type=workflow
   ```
4. From this folder, push:
   ```bash
   gh auth setup-git; git remote add origin https://github.com/AWlfGit/sportstalk.git; git push -u origin main
   ```

If c0rw1n.com is ever served from an `AWlfGit.github.io` repository, this page moves to
c0rw1n.com/sportstalk/ automatically.
