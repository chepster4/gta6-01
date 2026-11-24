[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/chepster4/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/chepster4/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

# SOLMARA — Streets of the Neon Tide

An original open-world crime game for the [Make GTA 6 bounty](https://make.fun/bounty/gta6-01) ($1,666 prize pool, top 100 paid). Play it free, offline, in desktop Chrome — no account, no network, no build step: open `game/index.html` (or serve `game/` with any static server).

You are **Dario “Dare” Solano**, a wheelman back on the island of **Solmara**. The **Coral Kings** run the six districts — take them back, one job at a time, with your crew: **Maya “Wrench” Okafor** (mechanic) and **Leo “Ghost” Ferreira** (lookout).

## What is in the game

- **12 story missions, staged** — from “First Light” to the final “Coronation” at Vane Kessler’s Hillside mansion, with beacons, objectives and a distance readout.
- **Wanted system + SBPD dispatch** — 5 stars, cop cars that chase and PIT, and at wanted ≥ 3: **roadblocks** and the **CONDOR-2 helicopter** with a night searchlight.
- **Combat** — weapon wheel (hold Q) with 4 weapons: pistol, SMG, shotgun, rifle. Enemies, tracers, muzzle flashes, explosions and burning wrecks.
- **Cars** — steal parked and traffic cars, arcade driving with nitro, damage, fire and explosions. Traffic and pedestrians share the roads.
- **Garage + shop** — Maya’s garage sells engine / armor / nitro / tire upgrades; Dockside Arms sells weapons, ammo and body armor. All bought with cash earned in missions and races.
- **3 street races** — Sunset Loop, Coastal Sprint, Neon Grand Prix: checkpoint gates, live timer, par times, cash + respect prizes.
- **Crew abilities** — Maya repairs your car in the field; Leo cools your wanted level faster.
- **Respect ranks + district standing** — Rookie → Hustler → Wheelman → Street King → Island Legend; taking a district raises its standing.
- **Radio** — 3 synthesized WebAudio stations (SOLMARA FM, TIDE 99, TALK ISLA). R switches station.
- **Day/night cycle** — sun, dusk and night lighting, lamps, headlights and the heli searchlight.
- **HUD + minimap** — wanted stars, cash, respect, health, ammo, speed, mission tracker and a live minimap with cops, heli, enemies and the mission beacon.
- **Saves** — autosave after every mission, manual save with M, continue from the title screen.

## Controls

| Key | Action |
|---|---|
| W A S D | Move on foot / drive |
| SHIFT | Run / nitro boost |
| E | Enter / exit car (steal cars) |
| Mouse + CLICK | Aim & shoot on foot |
| Q (hold) / 1–4 | Weapon wheel / quick weapon |
| R | Switch radio station |
| G | Garage / shop / race start (when nearby) |
| M | Save game |
| P / ESC | Pause |

## Tech

- `three.js` (r160) vendored under `game/vendor/three.module.min.js` — the only library.
- All art, sound and music are original and generated in code (WebAudio synthesis, procedural city). No assets from any commercial game.
- Source is split by system: `world`, `player`, `vehicles`, `police`, `combat`, `crew`, `missions`, `races`, `garage`, `hud`, `radio`, `audio`, `effects`, `save`, `shots`.

## Screenshots

1. Night heli chase — CONDOR-2 searchlight on the player’s car
2. Roadblock at golden hour — SBPD interceptors behind the barricade
3. Street race — Sunset Loop gate, live timer
4. Weapon wheel — rifle selected, Kings enforcers closing in

## License

MIT — see [LICENSE](LICENSE).

---

Built by [@chepster4](https://github.com/chepster4) for make.fun — play more at [make.fun](https://make.fun/?ref=b5gt2sm0).
