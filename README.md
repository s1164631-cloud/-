# Cyber Monet Garden · 賽博莫內花園

Interactive web demo based on the Cyber Monet Garden PRD.

## Run

```bash
npm install
npm run dev
```

## Demo features

- Immersive Monet-inspired garden with time-of-day sky (dawn / day / dusk / night)
- Capture flow: camera or image upload → Monet oil-paint filter → plant identify
- Improved local color matching (center crop, ignore foliage greens)
- Optional PlantNet API: set `VITE_PLANTNET_API_KEY` in `.env` (see `.env.example`)
- Confirm / correct plant name before planting
- Healing cards with flower meanings & quotes from the PRD
- Garden persistence in `localStorage`
- Soft ambient pad toggle

## Audio

- BGM: **Blossom** by Roa Music (CC BY 3.0) — `public/sounds/bgm.mp3`
  - Credit: [SoundCloud](https://soundcloud.com/roa_music1031) · [License](https://creativecommons.org/licenses/by/3.0/)
- Hook: `src/hooks/useAudio.ts` · Engine: `src/lib/audio/AudioEngine.ts`
- Optional SFX in `public/sounds/` (`click.wav`, `select.wav`, `success.wav`)
- Autoplay unlocks on first interaction; BGM loops at ~35% volume

Slogan: **每一朵花，都是一次深呼吸。**

「你的掌心可以摘下一朵花，你的呼吸可以吹動整片花園。」
