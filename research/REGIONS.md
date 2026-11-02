# Regions

Every team belongs to one region: the city or area whose way of talking its fans share. A region
pack holds the local talk that every team there has in common (dialect words, how locals say
place names, how the city talks about sport, the giveaways), so it's written once and shown with
each of those teams. Team guides (`research/out/*.json`) hold what's specific to one club.

Region packs live in `research/regions/<group>.json` as a JSON array, one object per region.

## Region ids

Use exactly these ids. A team takes the region where its fans are; national sides take the
national region.

### United Kingdom and Ireland
- `uk-london`: London and the Home Counties (Arsenal, Chelsea, Spurs, West Ham, Crystal Palace, Fulham, Brentford, QPR, Millwall, Charlton, Watford, Harlequins, Saracens)
- `uk-south-coast`: Bournemouth, Brighton, Southampton, Portsmouth
- `uk-west-country`: Bristol, Bath, Exeter, Gloucester
- `uk-west-midlands`: Birmingham and the Black Country, Coventry, the Potteries (Aston Villa, Birmingham City, West Brom, Wolves, Coventry, Stoke)
- `uk-east-midlands`: Nottingham, Derby, Leicester, Northampton, Lincoln
- `uk-east-anglia`: Norwich, Ipswich
- `uk-merseyside`: Liverpool, Everton
- `uk-manchester`: Manchester City, Manchester United, Sale Sharks
- `uk-lancashire`: Burnley, Blackburn, Preston, Bolton
- `uk-yorkshire`: Leeds, Sheffield, Hull
- `uk-north-east`: Newcastle (Geordie), Sunderland (Mackem), Middlesbrough (Smoggie), Newcastle Falcons
- `uk-wales`: Cardiff, Swansea, Wrexham, the Welsh regions (Cardiff Rugby, Dragons, Ospreys, Scarlets), Wales
- `uk-glasgow`: Celtic, Rangers, Glasgow Warriors, Kilmarnock, Motherwell, St Mirren
- `uk-scotland-east`: Edinburgh (Hearts, Hibs, Edinburgh Rugby), Falkirk, Dundee, Dundee United, St Johnstone, Aberdeen
- `uk-scotland`: Scotland's national sides
- `uk-england`: England's national sides
- `ie-ireland`: Leinster, Munster, Connacht, Ulster, Ireland (rugby is all-island; keep it non-political)

### Europe
- `es-madrid`: Real Madrid, Atlético Madrid
- `es-catalonia`: Barcelona
- `es-basque`: Athletic Club
- `es-andalusia`: Sevilla, Real Betis
- `es-valencia`: Valencia
- `it-milan`: AC Milan, Inter
- `it-turin`: Juventus
- `it-rome`: Roma, Lazio
- `it-naples`: Napoli
- `it-italy`: Italy's national side, Benetton Treviso, Zebre Parma, Ferrari's tifosi
- `de-bavaria`: Bayern Munich
- `de-west`: Borussia Dortmund, Bayer Leverkusen, Eintracht Frankfurt
- `fr-paris`: Paris Saint-Germain, France's national side
- `fr-south`: Marseille, Lyon, Monaco

### Rugby and cricket nations
- `nz`: New Zealand
- `au`: Australia
- `za`: South Africa, the Bulls, Lions, Sharks and Stormers
- `ar`: Argentina
- `fj`: Fiji
- `jp`: Japan
- `in`: India
- `pk`: Pakistan
- `lk`: Sri Lanka
- `caribbean`: West Indies

### United States
- `us-new-england`: Boston and New England
- `us-new-york`: New York City, Long Island and northern New Jersey
- `us-philadelphia`: Philadelphia
- `us-pittsburgh`: Pittsburgh and western Pennsylvania
- `us-baltimore-dc`: Baltimore and Washington, D.C.
- `us-buffalo`: Buffalo and western New York
- `us-chicago`: Chicago
- `us-detroit`: Detroit and Michigan
- `us-ohio`: Cleveland, Columbus, Cincinnati
- `us-indiana`: Indianapolis
- `us-wisconsin`: Milwaukee and Green Bay
- `us-minnesota`: Minneapolis–St. Paul
- `us-missouri`: St. Louis and Kansas City
- `us-atlanta`: Atlanta and Georgia
- `us-carolinas`: Charlotte and Raleigh
- `us-tennessee`: Nashville and Memphis
- `us-florida`: Miami, Tampa Bay, Orlando, Jacksonville
- `us-new-orleans`: New Orleans
- `us-texas`: Dallas–Fort Worth, Houston, San Antonio, Austin
- `us-oklahoma`: Oklahoma City
- `us-colorado`: Denver
- `us-utah`: Salt Lake City
- `us-arizona`: Phoenix
- `us-las-vegas`: Las Vegas
- `us-socal`: Los Angeles, Anaheim, San Diego
- `us-norcal`: San Francisco Bay Area and Sacramento
- `us-pacific-northwest`: Seattle and Portland

### Canada
- `ca-ontario`: Toronto, Ottawa, Hamilton
- `ca-quebec`: Montreal
- `ca-prairies`: Calgary, Edmonton, Winnipeg, Saskatchewan
- `ca-bc`: Vancouver and British Columbia

### Australia
- `au-sydney`: Sydney (Sydney Swans, GWS Giants, Sydney FC, Western Sydney Wanderers, Macarthur FC, NSW Waratahs; the NRL's Roosters, Rabbitohs, Bulldogs, Eels, Wests Tigers, Sea Eagles, Sharks, Panthers and Dragons), and New South Wales's State of Origin side
- `au-newcastle`: Newcastle, the Hunter and the Central Coast (Newcastle Knights, Newcastle Jets, Central Coast Mariners)
- `au-canberra`: Canberra (Raiders, Brumbies)
- `au-melbourne`: Melbourne and Geelong (Collingwood, Carlton, Essendon, Richmond, Hawthorn, Melbourne, St Kilda, Western Bulldogs, North Melbourne, Geelong Cats, Melbourne Storm, Melbourne Victory, Melbourne City)
- `au-queensland`: Brisbane, the Gold Coast and North Queensland (Brisbane Lions, Gold Coast Suns, Broncos, Dolphins, Titans, Cowboys, Brisbane Roar, Queensland Reds), and Queensland's State of Origin side
- `au-adelaide`: Adelaide (Adelaide Crows, Port Adelaide, Adelaide United)
- `au-perth`: Perth and Western Australia (West Coast Eagles, Fremantle, Perth Glory, Western Force)

### New Zealand
- `nz-auckland`: Auckland (Auckland FC, Blues, the Warriors)
- `nz-waikato`: Hamilton, the Waikato and the Bay of Plenty (Chiefs)
- `nz-wellington`: Wellington (Wellington Phoenix, Hurricanes)
- `nz-south`: Canterbury and Otago (Crusaders, Highlanders)

The Fijian Drua take `fj`. The national regions `au` and `nz` stay for the Wallabies and the
All Blacks; city clubs take their city's region.

F1 teams may use the region of their home country or base (Ferrari: `it-italy`) or leave
`region` empty; F1 talk lives in the F1 talk pack.

## Region pack format

```json
{
  "id": "us-pittsburgh",
  "name": "Pittsburgh",
  "covers": "Pittsburgh and western Pennsylvania",
  "dialect": "Pittsburghese",
  "words": [
    {"term": "yinz", "say": "YINZ", "ipa": "jɪnz", "tts": "", "means": "You all. The city's signature word.", "use": "Yinz going to the game Sunday?", "common": true}
  ],
  "pronounce": [
    {"word": "Duquesne", "say": "doo-KANE", "ipa": "duːˈkeɪn", "tts": "doo cane", "why": "The incline, the university and plenty of streets. Outsiders say 'duh-KWEZ-nee'."}
  ],
  "lines": [
    {"t": "Yinz ready for Sunday?", "m": "The standard game-week greeting."}
  ],
  "avoid": [
    {"say": "Pittsburg", "instead": "Pittsburgh", "why": "The h matters to locals; the one without it is in Kansas or California."}
  ],
  "habits": ["Black and gold on Fridays before a home game, at work and at school."],
  "sources": ["https://..."],
  "unsure": []
}
```

- `words`: 8-14 dialect or local words and phrases people really use in casual talk about sport,
  at the bar, at work or in the stands today. Not stereotypes outsiders use to mock a place (no
  "aboot" for Canada). Include local-language words where fans use them (French in Montreal,
  Welsh in Wales, Spanish in Madrid, te reo Māori in New Zealand).
- `pronounce`: 3-6 local place, team, ground or street names outsiders get wrong.
- `lines`: 4-6 short things a local says when talking sport: city pride, rival cities, weather,
  the local way of moaning.
- `avoid`: 2-5 outsider giveaways about the place itself.
- `habits`: 2-4 short notes on how and where locals follow sport (rituals, where they watch,
  what day, what they wear).
- Pronunciation fields (`say`, `ipa`, `tts`) follow "Pronunciation" in `research/BRIEF.md`.
