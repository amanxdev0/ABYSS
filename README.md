<div align="center">

# 🌊 ABYSS

**A scroll-driven 3D descent to the bottom of the ocean.**

From sunlit waves to Challenger Deep at 10,911 metres — a cinematic WebGL "film" plays under the page as you scroll through the five zones of the ocean, while every zone name and fact on top is real HTML.

[![live demo](https://img.shields.io/badge/demo-live-brightgreen?style=flat-square)](https://amanxdev0.github.io/ABYSS/)
[![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![three.js](https://img.shields.io/badge/three.js-%5E0.160.0-black?style=flat-square)](https://threejs.org/)

[Live demo](https://amanxdev0.github.io/ABYSS/) · [Report a bug](https://github.com/amanxdev0/ABYSS/issues)

</div>

---

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

1. **Fixed canvas, tall page** — the film is a `position: fixed` canvas; the page height *is* the timeline.
2. **Scroll is the playhead** — one number, 0 → 1, drives the camera's descent, the fading light, and every creature's visibility.
3. **Interpolation, not snapping** — the render loop eases toward the scroll target every frame with frame-rate-independent damping.
4. **Real HTML on top** — zone chapters fade in/out by depth range.

## Run it

No video files, no build step — just open it:

```bash
cd abyss
python3 -m http.server 8000
# → http://localhost:8000
```

Or via **GitHub Pages** (already live).

## The Scroll Series

Part of Aman Singh's scroll-driven cinematic universe — real HTML floating over live 3D films, where scroll is the playhead:

- [SCROLLFILM](https://amanxdev0.github.io/scrollfilm-3d/) — the original cinematic WebGL film + full reverse-engineering breakdown
- [HELIOS](https://amanxdev0.github.io/helios/) — scroll from the Milky Way to Pluto
- [ABYSS](https://amanxdev0.github.io/ABYSS/) — descend through the five ocean zones to Challenger Deep
- [EVENT HORIZON](https://amanxdev0.github.io/event-horizon/) — dive into the heart of a black hole
- [RAMAYANA](https://amanxdev0.github.io/ramayana/) — a 3D flight through the Valmiki Ramayana

Built with the [scrollfilm engine](https://github.com/amanxdev0/scrollfilm) — make your own.

## License

MIT © Aman Singh
