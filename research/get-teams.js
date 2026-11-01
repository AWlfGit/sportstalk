// Saves ESPN's team list for each league the trainer supports: node research/get-teams.js
const fs=require("fs"),path=require("path");
const LEAGUES=["soccer/eng.1","soccer/eng.2","soccer/sco.1","soccer/usa.1","soccer/esp.1","soccer/ita.1","soccer/ger.1","soccer/fra.1","football/nfl","football/cfl","basketball/nba","hockey/nhl","baseball/mlb","rugby/267979","rugby/270557"];
(async()=>{
  for(const lg of LEAGUES){
    const r=await fetch("https://site.api.espn.com/apis/site/v2/sports/"+lg+"/teams?limit=200");
    const j=await r.json();
    const teams=(((j.sports||[])[0]||{}).leagues||[{}])[0].teams||[];
    const list=teams.map(x=>x.team).map(t=>({id:String(t.id),name:t.displayName,short:t.shortDisplayName,abbr:t.abbreviation,location:t.location}));
    fs.writeFileSync(path.join(__dirname,"teams",lg.replace("/","_")+".json"),JSON.stringify(list,null,1));
    console.log(lg.padEnd(16),list.length,list.slice(0,4).map(t=>t.name).join(", "));
  }
})();
