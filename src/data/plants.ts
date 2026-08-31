export type PlantTemplate = {
  id: string
  name: string
  scientificName: string
  family: string
  languageOfFlower: string
  healingQuote: string
  /** Dominant hue ranges for local demo matching (0–360) */
  hueRanges: [number, number][]
  palette: [string, string, string]
}

export const PLANT_LIBRARY: PlantTemplate[] = [
  {
    id: 'rose',
    name: '月季',
    scientificName: 'Rosa chinensis',
    family: 'Rosaceae',
    languageOfFlower: '熱烈的愛 · 純潔的友誼',
    healingQuote: '即使帶刺，也有人願意擁抱你全部的溫柔。',
    hueRanges: [[340, 360], [0, 25]],
    palette: ['#c45c6a', '#e8a0a8', '#8b3a44'],
  },
  {
    id: 'lavender',
    name: '薰衣草',
    scientificName: 'Lavandula angustifolia',
    family: 'Lamiaceae',
    languageOfFlower: '等待愛情 · 寧靜',
    healingQuote: '深呼吸，讓這片紫色帶走你肩上的重量。',
    hueRanges: [[250, 290]],
    palette: ['#7a6aad', '#b8a8d4', '#4a3d72'],
  },
  {
    id: 'sunflower',
    name: '向日葵',
    scientificName: 'Helianthus annuus',
    family: 'Asteraceae',
    languageOfFlower: '沉默的愛 · 忠誠',
    healingQuote: '不用一直追著太陽轉，陰天裡休息也是一種勇敢。',
    hueRanges: [[40, 55]],
    palette: ['#e8b84a', '#f5d878', '#a87820'],
  },
  {
    id: 'babys-breath',
    name: '滿天星',
    scientificName: "Gypsophila paniculata",
    family: 'Caryophyllaceae',
    languageOfFlower: '純潔的心 · 配角之愛',
    healingQuote: '你不必成為誰的主角，你本來就是星星。',
    hueRanges: [[0, 20]],
    palette: ['#f2ebe3', '#e8ddd0', '#c4b8a8'],
  },
  {
    id: 'daisy',
    name: '雛菊',
    scientificName: 'Bellis perennis',
    family: 'Asteraceae',
    languageOfFlower: '天真 · 和平 · 希望',
    healingQuote: '小小的你，也有讓世界變溫柔的力量。',
    hueRanges: [[45, 60]],
    palette: ['#f5f0e6', '#f0d878', '#d4c4a0'],
  },
  {
    id: 'hydrangea',
    name: '繡球花',
    scientificName: 'Hydrangea macrophylla',
    family: 'Hydrangeaceae',
    languageOfFlower: '團聚 · 希望 · 善變',
    healingQuote: '變化不是錯，是你正在綻放成更多可能的形狀。',
    hueRanges: [[190, 230]],
    palette: ['#6a9ac4', '#a8c8e0', '#4a7088'],
  },
  {
    id: 'sakura',
    name: '櫻花',
    scientificName: 'Prunus serrulata',
    family: 'Rosaceae',
    languageOfFlower: '生命之美 · 純潔',
    healingQuote: '短暫的東西更珍貴，包括此刻的你。',
    hueRanges: [[330, 350]],
    palette: ['#f0b8c4', '#f8d4dc', '#d48898'],
  },
  {
    id: 'succulent',
    name: '多肉植物',
    scientificName: 'Echeveria elegans',
    family: 'Crassulaceae',
    languageOfFlower: '堅韌 · 治癒',
    healingQuote: '慢慢來，像我一樣，在乾涸裡也能儲存溫柔。',
    hueRanges: [[100, 150]],
    palette: ['#7a9a78', '#a8c4a0', '#4a6848'],
  },
  {
    id: 'mint',
    name: '薄荷',
    scientificName: 'Mentha spicata',
    family: 'Lamiaceae',
    languageOfFlower: '美德 · 清涼',
    healingQuote: '頭腦亂糟糟的時候，讓清涼替你整理思緒。',
    hueRanges: [[120, 160]],
    palette: ['#5a9a78', '#98c4a8', '#3a6850'],
  },
  {
    id: 'aloe',
    name: '蘆薈',
    scientificName: 'Aloe vera',
    family: 'Asphodelaceae',
    languageOfFlower: '自癒 · 保護',
    healingQuote: '你療癒別人的樣子，也值得被這樣對待。',
    hueRanges: [[90, 130]],
    palette: ['#6a9868', '#98b890', '#3a5838'],
  },
  {
    id: 'water-lily',
    name: '睡蓮',
    scientificName: 'Nymphaea alba',
    family: 'Nymphaeaceae',
    languageOfFlower: '純潔 · 夢幻 · 重生',
    healingQuote: '水面下的根很長，但綻放只需要一瞬間。',
    hueRanges: [[200, 240]],
    palette: ['#e8e0f0', '#c8b8d8', '#8878a8'],
  },
  {
    id: 'ginkgo',
    name: '銀杏',
    scientificName: 'Ginkgo biloba',
    family: 'Ginkgoaceae',
    languageOfFlower: '堅韌 · 長壽 · 希望',
    healingQuote: '走得很慢沒關係，你已經走了這麼遠。',
    hueRanges: [[45, 70]],
    palette: ['#d4b84a', '#e8d078', '#8a7830'],
  },
  {
    id: 'clover',
    name: '四葉草',
    scientificName: 'Trifolium repens',
    family: 'Fabaceae',
    languageOfFlower: '幸運 · 幸福',
    healingQuote: '今天沒找到幸運也沒關係，你本身就是。',
    hueRanges: [[100, 140]],
    palette: ['#4a9860', '#78c488', '#2a5838'],
  },
  {
    id: 'dandelion',
    name: '蒲公英',
    scientificName: 'Taraxacum officinale',
    family: 'Asteraceae',
    languageOfFlower: '自由 · 無法停留的愛',
    healingQuote: '讓風帶走該走的，你會落在對的地方。',
    hueRanges: [[45, 58]],
    palette: ['#f0d060', '#f8e898', '#c4a030'],
  },
]

export const MYSTERY_PLANT: PlantTemplate = {
  id: 'mystery',
  name: '神秘花',
  scientificName: 'Unknown',
  family: '未知',
  languageOfFlower: '未知的可能',
  healingQuote: '還不知道名字的你，正準備被世界認識。',
  hueRanges: [],
  palette: ['#a898b0', '#c8b8d0', '#686078'],
}

export const GENERIC_QUOTES = [
  '這朵花選擇保持神秘，就像你還沒說出口的那些心事。',
  '有些美不需要名字，就像有些感受不需要解釋。',
  '花園裡多了一個未知的朋友，它說謝謝你願意種下它。',
  '也許明天陽光會告訴我們它的名字，但今天先好好相處吧。',
]

export type GardenFlower = {
  id: string
  plantId: string
  name: string
  scientificName: string
  languageOfFlower: string
  healingQuote: string
  imageDataUrl: string
  plantedAt: string
  x: number
  y: number
  scale: number
  palette: [string, string, string]
}

export function createSeedGarden(): GardenFlower[] {
  const seeds = [
    // Different ages so the garden shows seed → mature together
    { plantId: 'water-lily', x: 28, y: 62, scale: 1.1, daysAgo: 9 },
    { plantId: 'rose', x: 58, y: 54, scale: 1, daysAgo: 6 },
    { plantId: 'lavender', x: 42, y: 70, scale: 0.95, daysAgo: 3 },
    { plantId: 'sakura', x: 74, y: 58, scale: 1.05, daysAgo: 1 },
    { plantId: 'sunflower', x: 16, y: 52, scale: 1, daysAgo: 0 },
  ]

  return seeds.map((seed, i) => {
    const plant = PLANT_LIBRARY.find((p) => p.id === seed.plantId)!
    return {
      id: `seed-${plant.id}-${i}`,
      plantId: plant.id,
      name: plant.name,
      scientificName: plant.scientificName,
      languageOfFlower: plant.languageOfFlower,
      healingQuote: plant.healingQuote,
      imageDataUrl: '',
      plantedAt: new Date(
        Date.now() - seed.daysAgo * 86400000,
      ).toISOString(),
      x: seed.x,
      y: seed.y,
      scale: seed.scale,
      palette: plant.palette,
    }
  })
}
