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
- Team logos: the build downloads each team's logo from ESPN's image server in two sizes (a
  crisp 96px one for the Modern look and a 16px one the Retro look enlarges into pixels) and
  caches them in `_cache/logos` (not committed). The single-file copies embed them; the website
  copy and the feed keep them in a `logos/` folder. Teams without an ESPN logo get a badge with
  their abbreviation in the team colour.
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
- `.github/workflows/refresh.yml`: rebuilds the results feed twice a day

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

- `ludicrous-display.html`: open it in a browser. It loads live results from ESPN itself.
- `src/artifact.html`: the version for publishing on claude.ai.

## Updating the website

The website copy lives in the c0rw1n.com site folder, `Dropbox\C01InnovativeWebsite\sportstalk`,
and goes up inside that folder's `SITE.zip`. To rebuild it with the latest results:

```bash
node src/build.js --site-only --site "C:/Users/Awake/Dropbox/C01InnovativeWebsite/sportstalk"
```

That writes `index.html`, `fonts/` and `logos/` into the folder. Then add the folder to
`SITE.zip` (replacing the `sportstalk/` entries) and upload the site as usual. To preview it
first, run `node src/serve.js "C:/Users/Awake/Dropbox/C01InnovativeWebsite" 8766` and open
http://localhost:8766/sportstalk/.

You only need to re-upload when the page itself changes. Results stay fresh through the feed.

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
