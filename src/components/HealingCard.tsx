import type { GardenFlower } from '../data/plants'
import {
  GROWTH_LABEL,
  daysSincePlanted,
  getGrowthStage,
} from '../lib/growth'
import { formatPlantedDate } from '../lib/storage'
import { PlantSprite } from './PlantSprite'

type Props = {
  flower: GardenFlower
  onClose: () => void
}

export function HealingCard({ flower, onClose }: Props) {
  const stage = getGrowthStage(flower.plantedAt)
  const days = daysSincePlanted(flower.plantedAt)

  return (
    <div className="card-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <article
        className="healing-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="card-close" onClick={onClose} aria-label="關閉">
          ×
        </button>

        <div className="card-bloom card-bloom-plant">
          {flower.imageDataUrl && stage === 'mature' ? (
            <img src={flower.imageDataUrl} alt={flower.name} />
          ) : (
            <PlantSprite flower={flower} showLabel={false} />
          )}
        </div>

        <h2 className="card-title">
          <span className="card-name">{flower.name}</span>
          <span className="card-sci">{flower.scientificName}</span>
        </h2>

        <p className="card-growth">
          {GROWTH_LABEL[stage]} · 種植第 {days} 天
        </p>

        <div className="card-divider" />

        <section className="card-section">
          <p className="card-label">花語</p>
          <p className="card-meaning">{flower.languageOfFlower}</p>
        </section>

        <div className="card-divider" />

        <section className="card-section">
          <p className="card-label">給你的小句子</p>
          <p className="card-quote">「{flower.healingQuote}」</p>
        </section>

        <p className="card-planted">✦ 種植於 {formatPlantedDate(flower.plantedAt)} ✦</p>
      </article>
    </div>
  )
}
