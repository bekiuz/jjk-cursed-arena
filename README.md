# JJK Cursed Arena

A browser-based 2.5D fighting game with a real-time Three.js 3D arena, smooth anime-inspired characters and side-view combat.

## Play online

https://bekiuz.github.io/jjk-cursed-arena/

## Run locally

This is a static site. From the repository folder run:

```powershell
py -m http.server 8080
```

Then open http://localhost:8080.

Three.js is loaded as ES modules from jsDelivr, so an internet connection is required while running the game.

## Controls

| Key | Action |
|---|---|
| A / D | Move |
| W | Jump |
| S | Guard |
| Shift | Dash |
| J | Quick strike |
| K | Heavy strike |
| L | Character-specific cursed technique |
| O | Domain Expansion (requires 100% cursed energy) |
| R | Retry after a result |

Touch controls are included for mobile devices, including a dedicated DASH button.

## Current game systems

- Real-time Three.js 3D rendering with perspective camera, shadows, fog and cinematic lighting
- Smooth rounded anime-style fighter meshes — no voxel or Minecraft geometry
- Yuji, Gojo, Megumi and Nobara character selection
- Three story missions: Jujutsu High, Cursed Womb / Detention Center and Geto's Night Parade chapter
- Mission unlock progression saved in the browser
- Enemy curse designs and increasing boss difficulty
- Keyboard and touch combat, blocking, dash, special technique, Domain Expansion at 100% cursed energy, health and cursed-energy meters
- Hit combo tracking with best-combo result summary
- Domain Expansion creates a temporary sure-hit arena field that pulses damage and slows the curse
- Responsive interface and GitHub Pages deployment workflow

## Yuji GLB model

The game automatically looks for this optional model:

`assets/characters/test-anime-fighter.glb`

Place the licensed Yuji GLB at that path to load it in-game. If it is absent, the game uses its built-in smooth procedural 3D fighter model. The GLB loader also plays the first animation clip if the file contains animations.

## Next milestones

1. Add proper rigged idle, walk, run, jump, hit and combo animations
2. Replace prototype fighters with final licensed character models
3. Add more cursed spirits, boss encounters and Domain Expansion sequences
4. Add audio, camera finishers, settings and accessibility options

This is an unofficial fan project and is not affiliated with or endorsed by the creators or rights holders of Jujutsu Kaisen. Third-party characters, names, art, models, music and other assets must only be distributed within the scope of applicable permissions and licenses.
