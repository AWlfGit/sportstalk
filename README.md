# Sports talk trainer

Ludicrous Display: a sports talk trainer inspired by the Bluffball website in *The IT Crowd*.
Pick a real game from the last week, learn a three-beat script about it, and practise in a
pretend pub conversation. It covers football, rugby, cricket, F1, NFL, NBA, NHL and MLB, with
local fan lingo for 297 teams.

## How the results stay fresh

The workflow in `.github/workflows/refresh.yml` rebuilds the page with the latest ESPN results
and publishes it to GitHub Pages:

- twice a day, at 06:30 and 18:30 UTC
- every time you push to `main`
- whenever you run it by hand: **Actions** tab, **Refresh results**, **Run workflow**

Only the built page and its fonts are published. The source files in this repository are not.
Visitors' browsers load everything from your site, so the page makes no requests to other
companies' servers when it opens. Visitors can still press **Load today's results from ESPN**
for up-to-the-minute scores; that button asks ESPN directly and says so.

## One-time setup

1. On the GitHub account that hosts c0rw1n.com, create a **public** repository named
   `sportstalk`. Don't add a README or licence; this folder already has them.
2. Push this folder to it (commands below).
3. In the repository, go to **Settings**, **Pages**, and set **Source** to **GitHub Actions**.
4. Go to **Actions**, open **Refresh results** and click **Run workflow** for the first build.

```bash
git remote add origin https://github.com/<your-account>/sportstalk.git
git push -u origin main
```

### Where it appears

- If c0rw1n.com is served from this account's user site (the repository named
  `<your-account>.github.io` with the custom domain set), this repository is published at
  **c0rw1n.com/sportstalk/** automatically.
- Otherwise it's at `https://<your-account>.github.io/sportstalk/`.

Keep the trainer in one place: if you use this repository, don't also upload a `sportstalk`
folder with the main site.

The page carries `noindex, nofollow`, so search engines leave it out, and nothing on the main
site links to it.

## Files

- `src/app.html`: the page source
- `src/build.js`: fetches ESPN results and builds the page
- `src/lingo.json`: the team guides (nicknames, fan terms, rivals, giveaways)
- `src/fonts/`: self-hosted fonts, SIL Open Font License (see the `OFL-*.txt` files)
- `src/get-fonts.js`: re-downloads the fonts, if you ever need to
- `src/serve.js`: a small local preview server

## Build and preview on your computer

Needs Node.js 18 or later.

```bash
node src/build.js --site-only --site _site
node src/serve.js _site 8765
```

Then open http://localhost:8765/.
