import {
  GENERIC_QUOTES,
  MYSTERY_PLANT,
  PLANT_LIBRARY,
  type PlantTemplate,
} from '../data/plants'

export type IdentifyResult = {
  plant: PlantTemplate
  confidence: number
  isMystery: boolean
  source: 'plantnet' | 'local' | 'manual'
  candidates: Array<{ plant: PlantTemplate; score: number }>
}

/** Extra names for PlantNet / common-name matching */
const ALIASES: Record<string, string[]> = {
  rose: ['月季', '玫瑰', '薔薇', '中國薔薇', 'rosa', 'china rose'],
  lavender: ['薰衣草', 'lavandula', 'lavender'],
  sunflower: ['向日葵', 'helianthus', 'sunflower'],
  "babys-breath": ['滿天星', 'gypsophila', "baby's breath", 'babys breath'],
  daisy: ['雛菊', 'bellis', 'daisy', '延命菊'],
  hydrangea: ['繡球', '繡球花', 'hydrangea', '八仙花'],
  sakura: ['櫻花', '櫻', 'prunus', 'sakura', 'cherry blossom'],
  succulent: ['多肉', '多肉植物', 'echeveria', 'succulent', '石蓮'],
  mint: ['薄荷', 'mentha', 'mint'],
  aloe: ['蘆薈', 'aloe'],
  'water-lily': ['睡蓮', 'nymphaea', 'water lily', 'lotus', '荷花', '蓮花'],
  ginkgo: ['銀杏', 'ginkgo', '公孫樹'],
  clover: ['四葉草', '三葉草', 'trifolium', 'clover'],
  dandelion: ['蒲公英', 'taraxacum', 'dandelion'],
}

function rgbToHsv(r: number, g: number, b: number) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d) % 6
        break
      case g:
        h = (b - r) / d + 2
        break
      default:
        h = (r - g) / d + 4
    }
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  return { h, s, v: max }
}

function hueInRange(hue: number, lo: number, hi: number) {
  if (lo <= hi) return hue >= lo && hue <= hi
  return hue >= lo || hue <= hi
}

function hueDistance(a: number, b: number) {
  const d = Math.abs(a - b) % 360
  return Math.min(d, 360 - d)
}

function isLeafHue(h: number, s: number, v: number) {
  // Typical foliage — skip when looking for blooms
  return h >= 70 && h <= 165 && s > 0.15 && v > 0.12 && v < 0.85
}

function loadImageData(dataUrl: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const size = 160
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      // Center crop — matches capture frame / flower focus
      const side = Math.min(img.width, img.height) * 0.62
      const sx = (img.width - side) / 2
      const sy = (img.height - side) / 2
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
      resolve(ctx.getImageData(0, 0, size, size))
    }
    img.onerror = () => reject(new Error('image load failed'))
    img.src = dataUrl
  })
}

type ColorProfile = {
  flowerBuckets: number[]
  allBuckets: number[]
  flowerRatio: number
  meanSat: number
  meanVal: number
  whiteRatio: number
  yellowRatio: number
  pinkRatio: number
  purpleRatio: number
  redRatio: number
  blueRatio: number
}

function analyzeColors(image: ImageData): ColorProfile {
  const { data, width, height } = image
  const flowerBuckets = new Array(36).fill(0)
  const allBuckets = new Array(36).fill(0)
  let flowerCount = 0
  let sampleCount = 0
  let satSum = 0
  let valSum = 0
  let white = 0
  let yellow = 0
  let pink = 0
  let purple = 0
  let red = 0
  let blue = 0

  const cx = width / 2
  const cy = height / 2
  const maxDist = Math.hypot(cx, cy)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const { h, s, v } = rgbToHsv(r, g, b)

      // Center-weighted sampling
      const dist = Math.hypot(x - cx, y - cy) / maxDist
      const weight = dist < 0.55 ? 2 : dist < 0.8 ? 1 : 0
      if (weight === 0) continue
      if (v < 0.08) continue

      sampleCount += weight
      satSum += s * weight
      valSum += v * weight

      const bucket = Math.min(35, Math.floor(h / 10))
      allBuckets[bucket] += weight

      // Pale / white petals
      if (v > 0.72 && s < 0.22) {
        white += weight
        flowerCount += weight
        continue
      }

      if (isLeafHue(h, s, v)) continue
      if (s < 0.12 || v < 0.15) continue

      flowerBuckets[bucket] += weight
      flowerCount += weight

      if (hueInRange(h, 40, 58) && s > 0.35) yellow += weight
      if (hueInRange(h, 300, 350) || hueInRange(h, 330, 20)) pink += weight
      if (hueInRange(h, 250, 300) && s > 0.2) purple += weight
      if (hueInRange(h, 340, 25) && s > 0.25) red += weight
      if (hueInRange(h, 185, 235) && s > 0.2) blue += weight
    }
  }

  const denom = Math.max(1, flowerCount)
  return {
    flowerBuckets,
    allBuckets,
    flowerRatio: flowerCount / Math.max(1, sampleCount),
    meanSat: satSum / Math.max(1, sampleCount),
    meanVal: valSum / Math.max(1, sampleCount),
    whiteRatio: white / denom,
    yellowRatio: yellow / denom,
    pinkRatio: pink / denom,
    purpleRatio: purple / denom,
    redRatio: red / denom,
    blueRatio: blue / denom,
  }
}

function topHues(buckets: number[], n = 3) {
  return buckets
    .map((count, idx) => ({ hue: idx * 10 + 5, count }))
    .filter((b) => b.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}

function scorePlant(plant: PlantTemplate, profile: ColorProfile): number {
  const buckets =
    profile.flowerRatio > 0.04 ? profile.flowerBuckets : profile.allBuckets
  const peaks = topHues(buckets, 4)
  if (peaks.length === 0) return 0

  let bestHueScore = 0
  for (const peak of peaks) {
    for (const [lo, hi] of plant.hueRanges) {
      const mid = lo <= hi ? (lo + hi) / 2 : ((lo + hi + 360) / 2) % 360
      const span = lo <= hi ? (hi - lo) / 2 : (hi + 360 - lo) / 2
      if (hueInRange(peak.hue, lo - 8, hi + 8) || hueInRange(peak.hue, lo, hi)) {
        const dist = hueDistance(peak.hue, mid)
        const score = Math.max(0, 1 - dist / (span + 28))
        bestHueScore = Math.max(bestHueScore, score * (0.7 + 0.3 * (peak.count / peaks[0].count)))
      }
    }
  }

  // Soft feature boosts for lookalikes
  let boost = 0
  switch (plant.id) {
    case 'sunflower':
    case 'dandelion':
    case 'ginkgo':
      boost += profile.yellowRatio * 0.35
      break
    case 'rose':
    case 'sakura':
      boost += profile.pinkRatio * 0.3 + profile.redRatio * 0.25
      break
    case 'lavender':
    case 'water-lily':
      boost += profile.purpleRatio * 0.35
      break
    case 'hydrangea':
      boost += profile.blueRatio * 0.35 + profile.purpleRatio * 0.15
      break
    case 'daisy':
    case 'babys-breath':
      boost += profile.whiteRatio * 0.4
      break
    case 'succulent':
    case 'mint':
    case 'aloe':
    case 'clover':
      // Prefer when few bloom pixels (mostly green foliage plants)
      if (profile.flowerRatio < 0.08) boost += 0.25
      break
    default:
      break
  }

  return Math.min(1, bestHueScore * 0.75 + boost)
}

function rankLocalCandidates(profile: ColorProfile) {
  return PLANT_LIBRARY.map((plant) => ({
    plant,
    score: scorePlant(plant, profile),
  }))
    .filter((c) => c.score > 0.12)
    .sort((a, b) => b.score - a.score)
}

function mysteryResult(
  confidence: number,
  candidates: IdentifyResult['candidates'],
  source: IdentifyResult['source'],
): IdentifyResult {
  const quote =
    GENERIC_QUOTES[Math.floor(Math.random() * GENERIC_QUOTES.length)]
  return {
    plant: { ...MYSTERY_PLANT, healingQuote: quote },
    confidence,
    isMystery: true,
    source,
    candidates,
  }
}

function matchLibraryByNames(
  scientific?: string,
  commonNames: string[] = [],
): PlantTemplate | null {
  const hay = [
    scientific ?? '',
    ...commonNames,
  ]
    .join(' ')
    .toLowerCase()

  for (const plant of PLANT_LIBRARY) {
    const aliases = ALIASES[plant.id] ?? [plant.name]
    const keys = [
      plant.name.toLowerCase(),
      plant.scientificName.toLowerCase(),
      ...aliases.map((a) => a.toLowerCase()),
    ]
    if (keys.some((k) => k && hay.includes(k))) return plant
  }

  // Genus-level soft match
  const genus = scientific?.split(/\s+/)[0]?.toLowerCase()
  if (genus) {
    for (const plant of PLANT_LIBRARY) {
      if (plant.scientificName.toLowerCase().startsWith(genus)) return plant
    }
  }
  return null
}

async function identifyWithPlantNet(
  imageDataUrl: string,
): Promise<IdentifyResult | null> {
  const apiKey = import.meta.env.VITE_PLANTNET_API_KEY as string | undefined
  if (!apiKey) return null

  try {
    const blob = await (await fetch(imageDataUrl)).blob()
    const form = new FormData()
    form.append('images', blob, 'plant.jpg')
    form.append('organs', 'auto')

    const res = await fetch(
      `/api/plantnet/v2/identify/all?api-key=${encodeURIComponent(apiKey)}&lang=zh&nb-results=5`,
      { method: 'POST', body: form },
    )
    if (!res.ok) return null
    const json = (await res.json()) as {
      results?: Array<{
        score: number
        species: {
          scientificNameWithoutAuthor?: string
          commonNames?: string[]
          family?: { scientificName?: string }
        }
      }>
    }

    const results = json.results ?? []
    if (!results.length) return null

    const candidates: IdentifyResult['candidates'] = []
    for (const r of results) {
      const matched = matchLibraryByNames(
        r.species.scientificNameWithoutAuthor,
        r.species.commonNames ?? [],
      )
      if (matched && !candidates.some((c) => c.plant.id === matched.id)) {
        candidates.push({ plant: matched, score: r.score })
      }
    }

    const top = results[0]
    const mapped = matchLibraryByNames(
      top.species.scientificNameWithoutAuthor,
      top.species.commonNames ?? [],
    )

    if (!mapped || top.score < 0.35) {
      // Keep PlantNet common name even if not in healing library
      if (top.score >= 0.35) {
        const name =
          top.species.commonNames?.[0] ??
          top.species.scientificNameWithoutAuthor ??
          '神秘花'
        return {
          plant: {
            ...MYSTERY_PLANT,
            name,
            scientificName:
              top.species.scientificNameWithoutAuthor ?? 'Unknown',
            family: top.species.family?.scientificName ?? '未知',
            healingQuote:
              GENERIC_QUOTES[Math.floor(Math.random() * GENERIC_QUOTES.length)],
          },
          confidence: top.score,
          isMystery: true,
          source: 'plantnet',
          candidates,
        }
      }
      return mysteryResult(top.score, candidates, 'plantnet')
    }

    return {
      plant: mapped,
      confidence: top.score,
      isMystery: false,
      source: 'plantnet',
      candidates:
        candidates.length > 0
          ? candidates
          : [{ plant: mapped, score: top.score }],
    }
  } catch (err) {
    console.warn('PlantNet identify failed, falling back to local', err)
    return null
  }
}

function identifyLocal(profile: ColorProfile): IdentifyResult {
  const ranked = rankLocalCandidates(profile)
  if (!ranked.length) return mysteryResult(0.2, [], 'local')

  const top = ranked[0]
  // Soften threshold — previously 0.55 + weak hue match → always mystery
  if (top.score < 0.28) {
    return mysteryResult(top.score, ranked.slice(0, 5), 'local')
  }

  return {
    plant: top.plant,
    confidence: Math.min(0.92, 0.45 + top.score * 0.5),
    isMystery: false,
    source: 'local',
    candidates: ranked.slice(0, 5),
  }
}

/** Prefer PlantNet when configured; otherwise improved local color matching. */
export async function identifyPlant(
  imageDataUrl: string,
): Promise<IdentifyResult> {
  const remote = await identifyWithPlantNet(imageDataUrl)
  if (remote && (!remote.isMystery || remote.confidence >= 0.35)) {
    return remote
  }

  const image = await loadImageData(imageDataUrl)
  const profile = analyzeColors(image)
  const local = identifyLocal(profile)

  // If PlantNet returned mystery but local is confident, prefer local mapping
  if (remote?.isMystery && !local.isMystery) return local
  if (remote) {
    return {
      ...remote,
      candidates:
        remote.candidates.length > 0
          ? remote.candidates
          : local.candidates,
    }
  }
  return local
}

export function pickManualPlant(plantId: string): IdentifyResult {
  const plant =
    PLANT_LIBRARY.find((p) => p.id === plantId) ?? MYSTERY_PLANT
  return {
    plant,
    confidence: 1,
    isMystery: plant.id === 'mystery',
    source: 'manual',
    candidates: [{ plant, score: 1 }],
  }
}
