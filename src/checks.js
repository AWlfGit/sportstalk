// Pre-publish checks, run in the browser against a fresh build.
//   1. node src/build.js
//   2. node src/serve.js      then open http://localhost:8765/ (ludicrous-display.html)
//   3. In the browser's developer console, run:
//        (0,eval)(await (await fetch("/src/checks.js")).text())
// For every sport, league, game and side, in both looks, it renders the script tab (and each other
// tab once per sport) from the saved results and reports:
//   - text that should never reach the page: undefined, NaN, [object, null, unfilled {team} slots,
//     "the the", "Go the"
//   - anything wider than the window (run it once at desktop width and once at phone width, ~375px)
//   - errors thrown while rendering
// It reloads the page when it's done, so nothing it changed sticks.
(async () => {
  const B1 = /undefined|NaN|\[object|\bnull\b|\{team\}|\{opp\}|\{player\}|\{score\}|\{when\}/, B2 = /\bthe the |\bGo the /i;
  const bad = (t) => { const m = B1.exec(t) || B2.exec(t); return m ? t.slice(Math.max(0, m.index - 60), m.index + 30).replace(/\n/g, " ") : null; };
  // A hidden or minimised window reports 0px; only check width when there is one
  const wide = () => innerWidth > 0 && document.documentElement.scrollWidth > innerWidth + 1;
  const tabs = [[renderPub, "tab-pub"], [renderCover, "tab-cover"], [renderPhrases, "tab-phrases"], [renderDrill, "tab-drill"], [renderPocket, "tab-pocket"]];
  const problems = [];
  let renders = 0;
  DATA.liveFailed = true; DATA.liveAllowed = false;
  for (const look of ["modern", "retro"]) {
    setSkin(look);
    for (const sp of Object.keys(SPORTS)) {
      S.sport = sp;
      for (const [lg] of ESPN.LEAGUES[sp] || []) {
        S.leagues[sp] = lg;
        DATA.cache[lg] = { games: (SNAP && SNAP.leagues[lg]) || [], src: "snap", at: new Date(SNAP.taken) };
        DATA.tables[lg] = (SNAP && SNAP.tables[lg]) || {};
        for (const g of DATA.cache[lg].games) {
          for (const side of g.res ? [null] : ["h", "a", null]) {
            S.game = g; S.side = side; if (g.res) S.driver = g.res[0].n; pub = null; drill = null; renders++;
            try {
              renderScript();
              const b = bad(document.getElementById("tab-script").innerText + " " + document.getElementById("strip").innerText);
              if (b) problems.push(`${look} ${lg} ${g.id} ${side || "neutral"}: …${b}…`);
              if (wide()) problems.push(`${look} ${lg} ${g.id}: wider than the window`);
            } catch (e) { problems.push(`${look} ${lg} ${g.id} ${side}: ${e.message}`); }
          }
          if (renders % 300 < 3) await new Promise((r) => setTimeout(r, 0)); // let the page breathe now and then
        }
      }
      for (const [render, id] of tabs) {
        try {
          pub = null; drill = null; render(); renders++;
          const b = bad(document.getElementById(id).innerText);
          if (b) problems.push(`${look} ${sp} ${id}: …${b}…`);
          if (wide()) problems.push(`${look} ${sp} ${id}: wider than the window`);
        } catch (e) { problems.push(`${look} ${sp} ${id}: ${e.message}`); }
      }
    }
  }
  console.log(`Checked ${renders} renders${innerWidth ? " at " + innerWidth + "px wide" : " (window has no width, so widths weren't checked)"}: ${problems.length ? problems.length + " problems" : "no problems"}`);
  for (const p of problems.slice(0, 50)) console.warn(p);
  setTimeout(() => location.reload(), 500);
  return { renders, width: innerWidth, problems };
})();
