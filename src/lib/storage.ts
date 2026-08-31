import { createSeedGarden, type GardenFlower } from '../data/plants'

const STORAGE_KEY = 'cyber-monet-garden-v2'

export function loadGarden(): GardenFlower[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createSeedGarden()
    const parsed = JSON.parse(raw) as GardenFlower[]
    if (!Array.isArray(parsed) || parsed.length === 0) return createSeedGarden()
    return parsed
  } catch {
    return createSeedGarden()
  }
}

export function saveGarden(flowers: GardenFlower[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flowers))
}

export function getTimeOfDay(): 'dawn' | 'day' | 'dusk' | 'night' {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 8) return 'dawn'
  if (hour >= 8 && hour < 17) return 'day'
  if (hour >= 17 && hour < 20) return 'dusk'
  return 'night'
}

export function formatPlantedDate(iso: string) {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}
