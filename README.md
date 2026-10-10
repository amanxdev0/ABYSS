# ABYSS

A scroll-driven 3D descent through the five zones of the ocean — from sunlit waves to Challenger Deep at 10,911 metres. A cinematic WebGL "film" plays under the page as you scroll; every zone name and fact is real HTML.

**Live:** https://amanxdev0.github.io/abyss/

## The voyage

| Stop | Zone | Depth |
|---|---|---|
| 1 | The Surface | 0 m |
| 2 | Sunlight Zone (Epipelagic) | 0–200 m |
| 3 | Twilight Zone (Mesopelagic) | 200–1,000 m |
| 4 | Midnight Zone (Bathypelagic) | 1,000–4,000 m |
| 5 | The Abyss (Abyssal) | 4,000–6,000 m |
| 6 | The Trench (Hadal) → Challenger Deep | 6,000–10,911 m |

## What's in the 3D scene

- **God rays** fading as you leave the surface
- **Marine snow** drifting through the whole water column
- **Fish schools**, **pulsing jellyfish**, **anglerfish** with glowing lures
- **Bioluminescent** plankton that takes over in the dark zones
- **Hydrothermal vent field** with a black smoker and tube worms
- **Mariana Trench walls** closing in, and a **submersible** with its headlights on at Challenger Deep
- HUD with live **zone name, depth ticker (m) and FPS meter**

## The engine

Same SCROLLFILM interpolation architecture as [HELIOS](https://amanxdev0.github.io/helios/):

- Fixed WebGL canvas under real HTML chapters; scroll position is the playhead
- Frame-rate-independent damped interpolation (`1 − e^(−dt·k)`) — irregular scroll input drives smooth 40+ fps rendering
- Chapter activation windows and camera stops are **measured from the real page layout**, so text and camera never drift apart
- Adaptive pixel ratio (drops resolution if FPS sags, restores when it recovers)
- `prefers-reduced-motion` and no-WebGL fallbacks

## Files

- `index.html` — chapters, HUD, footer
- `css/style.css` — deep-ocean theme, sticky chapter text, readability scrim
- `js/dive.js` — the whole Three.js film (ES module, imports Three.js from CDN)

## Run locally

```bash
cd abyss
python3 -m http.server 8000
# open http://localhost:8000/
```

Crafted by **Aman Singh**.
