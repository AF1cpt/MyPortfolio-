# TSHWANELO // ASTEROID FIELD PORTFOLIO

A portfolio website that is a fully playable Asteroids (1979) clone.
You are the ship. Shoot the labeled asteroids to unlock each portfolio section.

One file. No frameworks. No build step.

## Run it

Double-click `index.html`. That's it.

## Controls

| Key | Action |
|---|---|
| Arrows / WASD | Rotate + thrust |
| Space | Fire |
| H | Hyperspace (mostly safe) |
| G | Realism Protocol (see easter eggs) |
| N | Nav menu for busy recruiters |
| M | Sound on/off |
| P | Pause |
| Esc | Close panel |

Mobile gets touch buttons automatically.

## Content status

ABOUT, SKILLS, CONTACT (email, GitHub: AF1cpt, LinkedIn) and the featured
Mandela Legacy Foundation mission are filled from the real CV
(`CV_Ditshwanelo_Tumane.pdf`, wired to the DOWNLOAD CV button).
Last placeholders (search for `ph` in index.html): descriptions/links for
iButler, Job Hunter, CashConnect, Clearbound in the PROJECTS panel.

## Easter eggs (spoilers)

- Shoot the saucer → fun facts
- Shoot the `???` rock → classified intel
- Unlock all 5 sectors → a special saucer appears. Shoot it.
- The Konami code works. Obviously.
- **REALISM PROTOCOL** (press **G**): space becomes honest. The world grows ~12x
  with a chase camera, Newtonian physics (no friction — your momentum is forever),
  a parallax starfield, and a vector compass pointing to every labeled rock, the
  nearest plain rock, and any saucers — with distances. And because sound does not
  travel in vacuum: total silence except your own engine through the hull.
  Press G again to apologize to 1979.
- **THE VENDETTA**: play for 2+ minutes, then kill a saucer. His name was Kevin.
  His brother arrives to mourn — then it's SWARM PROTOCOL: survive 2 minutes of
  hunting, shooting saucers. You get overclocked fire systems. It will not be enough
  for most pilots. Victory: +5000 and the family's forgiveness. Once per run.

## AI Wing (v1.2)

`ai.js` adds seven AI features. Two files now: `index.html` (the game) + `ai.js` (the brain).

| Feature | How to find it |
|---|---|
| Chatty saucer | Saucer on screen → press **C** to hail it |
| SHIPCOM terminal | Press **T** (also in the N nav menu) — recruiters interrogate your CV |
| Vendetta trash talk | Kevin's brother taunts you mid-swarm, based on your actual run |
| Performance review | Die completely → press **R** for an HR debrief of your run |
| Mission briefing generator | CONTACT panel → paste a job description |
| Memorial wall | ??? panel — every dead saucer gets an AI obituary |
| Local brain | Terminal footer → ENGAGE downloads a small LLM to the visitor's GPU (WebGPU) |

**Architecture:** the site never touches the Gemini key. It calls a Supabase Edge
Function (`oracle`, project `asteroid-oracle`) which holds the key as a secret and
proxies Gemini. Every feature has canned fallbacks — the site works fine offline.

**⚠ ONE SETUP STEP:** Supabase dashboard → project `asteroid-oracle` →
Edge Functions → Secrets → add `GEMINI_API_KEY` = your key.
(Optional: `GEMINI_MODEL` to override the default `gemini-2.5-flash` — chosen
because `gemini-2.0-flash`'s free tier was retired (quota limit 0).)
Free-tier Supabase projects pause after ~1 week idle; wake it in the dashboard
if the oracle goes quiet. Gemini free tier has daily request caps — when
exceeded, the site silently falls back to canned lines until the quota resets.

## Deploy free

**GitHub Pages:** push this folder to a repo → Settings → Pages → deploy from main branch.
**Netlify/Vercel:** drag the folder onto their dashboard. Done.
(Deploy both files + the CV pdf together.)
