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
// It also renders the Local lingo tab for every team (with its region) and a word search, and the
// All sports list with Local mode on for a few sample cities (including one with nothing near).
// It reloads the page when it's done, so nothing it changed sticks.
(async () => {
  // ("null vier" is German for Leverkusen's 04, so it's allowed)
  const B1 = /undefined|NaN|\[object|\bnull\b(?! vier)|\{team\}|\{opp\}|\{player\}|\{score\}|\{when\}|\{driver\}|\{winner\}|\{pos\}|\{race\}/, B2 = /\bthe the |\bGo the /i;
  const bad = (t) => { const m = B1.exec(t) || B2.exec(t); return m ? t.slice(Math.max(0, m.index - 60), m.index + 30).replace(/\n/g, " ") : null; };
  // A hidden or minimised window reports 0px; only check width when there is one
  const wide = () => innerWidth > 0 && document.documentElement.scrollWidth > innerWidth + 1;
  const tabs = [[renderPub, "tab-pub"], [renderCover, "tab-cover"], [renderPhrases, "tab-phrases"], [renderDrill, "tab-drill"], [renderPocket, "tab-pocket"]];
  const problems = [];
  let renders = 0;
  DATA.liveFailed = true; DATA.liveAllowed = false;
  const savedWhere = S.where, savedPick = S.pick;
  for (const lg of Object.values(ESPN.LEAGUES).flat().map((x) => x[0])) { DATA.cache[lg] = { games: (SNAP && SNAP.leagues[lg]) || [], src: "snap", at: new Date(SNAP.taken) }; DATA.tables[lg] = (SNAP && SNAP.tables[lg]) || {}; }
  const AREAS = [["Toronto, ON", 43.65, -79.38], ["London, England", 51.51, -0.13], ["Los Angeles, CA", 34.05, -118.24], ["Madrid, Spain", 40.42, -3.7], ["Reykjavik", 64.15, -21.94]];
  for (const look of ["modern", "retro"]) {
    setSkin(look);
    // All sports, Local on: every game near each sample city
    S.pick = "all";
    for (const city of AREAS) {
      S.where = { mode: "city", city }; poolMemo = { k: null, v: null };
      const P = pool(), list = [null].concat((P && P.games.slice(0, 25)) || []);
      for (const g of list) {
        if (g) selectGame(g); else S.game = null;
        renders++;
        try {
          renderScript();
          const b = bad(document.getElementById("tab-script").innerText + " " + document.getElementById("strip").innerText);
          if (b) problems.push(`${look} all near ${city[0]} ${g ? g.id : "(none)"}: …${b}…`);
          if (wide()) problems.push(`${look} all near ${city[0]} ${g ? g.id : "(none)"}: wider than the window`);
        } catch (e) { problems.push(`${look} all near ${city[0]} ${g ? g.id : "(none)"}: ${e.message}`); }
      }
    }
    // Then each sport and league on its own, everywhere
    S.where = { mode: "off" }; poolMemo = { k: null, v: null };
    for (const sp of Object.keys(SPORTS)) {
      S.pick = sp; S.sport = sp;
      for (const [lg] of ESPN.LEAGUES[sp] || []) {
        S.leagues[sp] = lg; poolMemo = { k: null, v: null };
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
      // Local lingo: every team's guide with its region, then a word search
      if (typeof renderLingo === "function") {
        if (typeof ensureLingo === "function") await ensureLingo(sp);
        S.lingoQ = "";
        for (const t of lingoPool(sp)) {
          try {
            S.lingoPick = { [sp]: t.team }; renderLingo(); renders++;
            const b = bad(document.getElementById("tab-lingo").innerText);
            if (b) problems.push(`${look} ${sp} lingo ${t.team}: …${b}…`);
            if (wide()) problems.push(`${look} ${sp} lingo ${t.team}: wider than the window`);
          } catch (e) { problems.push(`${look} ${sp} lingo ${t.team}: ${e.message}`); }
        }
        try {
          S.lingoQ = "the"; renderLingo(); renders++;
          if (wide()) problems.push(`${look} ${sp} lingo search: wider than the window`);
        } catch (e) { problems.push(`${look} ${sp} lingo search: ${e.message}`); }
        S.lingoQ = ""; S.lingoPick = {};
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
  S.where = savedWhere; S.pick = savedPick;
  console.log(`Checked ${renders} renders${innerWidth ? " at " + innerWidth + "px wide" : " (window has no width, so widths weren't checked)"}: ${problems.length ? problems.length + " problems" : "no problems"}`);
  for (const p of problems.slice(0, 50)) console.warn(p);
  setTimeout(() => location.reload(), 500);
  return { renders, width: innerWidth, problems };
})();
