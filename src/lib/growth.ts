export type GrowthStage = 'seed' | 'sprout' | 'young' | 'mature'

export function daysSincePlanted(plantedAt: string, now = Date.now()) {
  const planted = new Date(plantedAt).getTime()
  if (Number.isNaN(planted)) return 0
  return Math.max(0, Math.floor((now - planted) / 86_400_000))
}

/** Seed → sprout → young → mature based on days in the garden. */
export function getGrowthStage(plantedAt: string, now = Date.now()): GrowthStage {
  const days = daysSincePlanted(plantedAt, now)
  if (days <= 0) return 'seed'
  if (days <= 2) return 'sprout'
  if (days <= 5) return 'young'
  return 'mature'
}

export const GROWTH_LABEL: Record<GrowthStage, string> = {
  seed: '種子',
  sprout: '幼苗',
  young: '茁壯',
  mature: '成熟',
}

export type Morphology =
  | 'rose'
  | 'spike'
  | 'sun'
  | 'daisy'
  | 'cluster'
  | 'branch'
  | 'rosette'
  | 'leafy'
  | 'aloe'
  | 'lily'
  | 'fan'
  | 'clover'
  | 'puff'
  | 'generic'

const MORPHOLOGY_MAP: Record<string, Morphology> = {
  rose: 'rose',
  lavender: 'spike',
  sunflower: 'sun',
  'babys-breath': 'cluster',
  daisy: 'daisy',
  hydrangea: 'cluster',
  sakura: 'branch',
  succulent: 'rosette',
  mint: 'leafy',
  aloe: 'aloe',
  'water-lily': 'lily',
  ginkgo: 'fan',
  clover: 'clover',
  dandelion: 'puff',
  mystery: 'generic',
}

export function getMorphology(plantId: string): Morphology {
  return MORPHOLOGY_MAP[plantId] ?? 'generic'
}
