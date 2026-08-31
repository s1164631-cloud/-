import { PLANT_LIBRARY, type PlantTemplate } from '../data/plants'
import type { IdentifyResult } from '../lib/identify'

type Props = {
  previewUrl: string
  result: IdentifyResult
  onConfirm: (plant: PlantTemplate) => void
  onRetry: () => void
}

export function IdentifyConfirm({
  previewUrl,
  result,
  onConfirm,
  onRetry,
}: Props) {
  const suggestions =
    result.candidates.length > 0
      ? result.candidates
      : PLANT_LIBRARY.slice(0, 6).map((plant) => ({ plant, score: 0 }))

  return (
    <div className="identify-overlay" role="dialog" aria-modal="true">
      <div className="identify-panel">
        <div className="identify-preview">
          <img src={previewUrl} alt="拍攝預覽" />
        </div>

        <h2>
          {result.isMystery
            ? '這朵花有點神秘'
            : `辨識結果：${result.plant.name}`}
        </h2>
        <p className="identify-meta">
          {result.source === 'plantnet' ? 'PlantNet' : '色彩分析'} · 信心{' '}
          {Math.round(result.confidence * 100)}%
        </p>
        <p className="identify-hint">
          {result.isMystery
            ? '請選一個最接近的花名，再種入花園'
            : '若不正確，可改選下方候選'}
        </p>

        <div className="identify-grid">
          {!result.isMystery && (
            <button
              type="button"
              className="identify-option is-top"
              style={{
                background: `linear-gradient(145deg, ${result.plant.palette[1]}, ${result.plant.palette[0]})`,
              }}
              onClick={() => onConfirm(result.plant)}
            >
              <strong>{result.plant.name}</strong>
              <small>使用此結果</small>
            </button>
          )}
          {suggestions
            .filter((c) => c.plant.id !== result.plant.id || result.isMystery)
            .slice(0, 8)
            .map(({ plant, score }) => (
              <button
                key={plant.id}
                type="button"
                className="identify-option"
                style={{
                  background: `linear-gradient(145deg, ${plant.palette[1]}, ${plant.palette[0]})`,
                }}
                onClick={() => onConfirm(plant)}
              >
                <strong>{plant.name}</strong>
                <small>
                  {score > 0 ? `${Math.round(score * 100)}%` : '手動選擇'}
                </small>
              </button>
            ))}
        </div>

        <div className="identify-actions">
          <button type="button" className="ghost-btn" onClick={onRetry}>
            重新拍攝
          </button>
          {result.isMystery && (
            <button
              type="button"
              className="ghost-btn"
              onClick={() => onConfirm(result.plant)}
            >
              以神秘花種植
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
