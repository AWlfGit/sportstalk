# Ludicrous Display, Modern look: brief

Interviewed on 1 November 2026, partly. The owner answered the four forks below. The rest
is authored from the existing project (CLAUDE.md, earlier requests in this project) and is
labelled as such.

Scope: the **Modern** look only. Every rule is scoped `:root:not([data-skin=retro])` or
rendered only when the Modern look is on. The Retro look must not change.

## The interview

1. **Vibe in three to five words.** *Authored, from the owner's earlier request:* "tighter,
   like a modern ESPN type interaction". A sports app's match centre, dense and crisp.
2. **The scroll journey.** *Authored, from the page's own job:* see last night's real result,
   learn five beats, hear them, say them from memory, test them in the pub, leave.
3. **Energy curve.** *Authored:* calm and informational at the top (the result), building as
   you practise, one jolt when the meter tips over, quiet at the end (an input with a cursor).
4. **Feeling, stage by stage, and the one moment.** See the feeling curve and the peak below.
5. **One thing no other site does.** Owner's choice: **"Bluff meter (Recommended)": a fixed
   gauge that fills from what you actually do (lines heard, words learned, pub-test answers),
   showing how convincing you'll sound.**
6. **How far from premium-minimal.** Owner's choice: **"Dense sports-data (Recommended)":
   push the tight ESPN-style app further: information-forward, small type, lots on screen,
   crisp.**
7. **One unbroken world, or distinct scenes?** Neither. Owner's choice for scope: **"Live app
   surface (Recommended)": keep it a working app. Apply the skill's design rules (type,
   spacing, depth, motion, states) and add one bespoke scroll interaction. No marketing hero,
   no video. Retro untouched.**
8. **Assets.** Owner's choice: **"No new imagery (Recommended)": type, real team logos and
   real data only. No cost, and the page still makes no outside requests.**

## Grammar: live surface

The page is the product: a working trainer computing everything from real results and
researched lingo. The other seven lost:

- Filmic one-shot, continuous world: a film or a flight hides a tool's controls. The visitor
  needs tabs, a game picker and buttons, not a camera move.
- Chaptered editorial, typographic poster: built for reading or one claim. This page is used.
- Gallery: the real question is "what do I say about this game", not "what are the options".
- Split stage: there's no two-sided argument to resolve.
- Rhythmic cutlist: energy at speed fights a page you study.

Constraints kept: app chrome is the navigation (app bar, game strip, tab strip, status bar).
No marketing chrome, no scrims, no full-bleed photography, no kinetic headlines, no video
scrub, no spotlight. Copy stays in the surface's idiom: labels, status lines, help text. The
hero is the surface already in a state (last night's game, its script). The close is an
actual input.

The skill's engine (`scrollcraft.js`/`.css`) isn't used. Live surface bans most of its
devices, and its global stylesheet would restyle the Retro look. Its taste floor (spacing,
type, contrast, motion, states, browser surfaces) is applied by hand, Modern-scoped.

## Journey

1. Recognition: last night's real game is already on the scorebug.
2. Learning: five beats, your lines against theirs.
3. Practice: hear your lines; read each beat.
4. Caution: what they'll ask, what not to say.
5. Recall: say your three lines from memory, typed.
6. Test: the pub test.

## Feeling curve

1. Recognition: the real score, both teams' colours, already there when the page opens.
2. Curiosity: five beats in a chat; each beat you stop on is marked as read in the status bar.
3. Confidence: you hear your own lines and the needle moves.
4. Wariness: "If they ask" and "Don't say", plain and quiet.
5. Resolve: the last thing on the script is a text box with a cursor in it. You type your
   opener from memory and it tells you if it would pass.

## The peak

"The little meter at the bottom tipped over into Season-ticket holder and the whole bar lit
up."

It lives in the status bar (the chrome layer), not in an act, so it can happen wherever the
visitor is (the script, the memory box, or the pub test). The act before it is quiet: typing.
It fires once per game.

## Tell-someone sentence

It's the site where a meter at the bottom shows how convincing you'll sound, and it only
climbs when you actually practise.

## Signature move: the Bluff meter

A status bar fixed to the bottom of the Modern look. A half-dial gauge, the level in words, the
percentage, and the next thing to do. Computed for the current game and side from what the
visitor really did on the page, saved in their browser:

| Part | Points | How it's earned |
|---|---|---|
| Read the script | 3 × 5 = 15 | Each beat held on screen for most of a second (scroll dwell) |
| Heard your lines | 6 × 3 = 18 | Hear it, or Play it out loud |
| Said from memory | 10 × 3 = 30 | Typed in the memory box close enough to pass |
| Local words | 4 × 3 = 12 | Any three local words or sayings heard (Local touch or Local lingo) |
| Pub test | up to 25 | Credibility from the game's pub test, zero if rumbled |

Levels: Obvious outsider (0), Nodding along (20), Passable (40), Sounds like a regular (60),
Season-ticket holder (80). Tap the meter for the breakdown and a button for each next step.
The Panic button docks in the same bar.

## Score

| Beat | Device | Why |
|---|---|---|
| Recognition | Surface in a state | The live-surface hero: no title, the result itself |
| Curiosity | Scroll dwell drives state | Reading is tracked by the scroll, beat by beat |
| Confidence | Meter count (real numbers only) | The needle moves on a real action |
| Wariness | Flow, no device | Administrative information: compressed, quiet |
| Resolve | An input | Live-surface close: a field with a cursor |
| Peak | Chrome-layer hold | Fires in the status bar, wherever the visitor is |

## Authored silence

None. The script tab has no empty scroll.
