import { useEffect, useState } from 'react'
import type { GestureState } from '../lib/handGesture'

const HAND_STEPS = [
  {
    title: '伸出手掌',
    body: '將手對準左下角視窗，畫面中會出現半透明手勢游標，跟著你的掌心移動。',
    icon: '👋',
  },
  {
    title: '靠近花朵',
    body: '游標靠近一株花時，花朵會發光放大並顯示名稱——這表示可以摘取。',
    icon: '✨',
  },
  {
    title: '捏合摘下',
    body: '拇指與食指輕輕捏合（像摘花一樣），花朵會從地面拔起，跟隨你的手移動。',
    icon: '🤏',
  },
  {
    title: '張開放下',
    body: '移到想種的位置後張開手指，花朵會落下並重新扎根。若手離開畫面，花朵也會就地放下。',
    icon: '🌱',
  },
]

const BLOW_STEPS = [
  {
    title: '允許麥克風',
    body: '開啟吹氣風動後，請允許瀏覽器使用麥克風。說話通常不會觸發，需要輕輕吹氣。',
    icon: '🎙️',
  },
  {
    title: '對著麥克風吹氣',
    body: '持續約 0.3 秒以上，花園會顯示「風來了」，花朵搖曳、花瓣飄散、水面泛起漣漪。',
    icon: '💨',
  },
]

type Props = {
  open: boolean
  mode: 'hand' | 'blow'
  onClose: () => void
}

export function GestureGuide({ open, mode, onClose }: Props) {
  const steps = mode === 'hand' ? HAND_STEPS : BLOW_STEPS
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (open) setStep(0)
  }, [open, mode])

  if (!open) return null

  const current = steps[Math.min(step, steps.length - 1)]
  const isLast = step >= steps.length - 1

  return (
    <div className="guide-overlay" role="dialog" aria-modal="true">
      <div className="guide-panel">
        <button type="button" className="guide-skip" onClick={onClose}>
          跳過
        </button>

        <p className="guide-kicker">
          {mode === 'hand' ? '手勢取放引導' : '吹氣風動引導'}
        </p>
        <div className="guide-icon" aria-hidden>
          {current.icon}
        </div>
        <h2>{current.title}</h2>
        <p className="guide-body">{current.body}</p>

        <div className="guide-dots" aria-hidden>
          {steps.map((_, i) => (
            <span key={i} className={i === step ? 'on' : ''} />
          ))}
        </div>

        <div className="guide-actions">
          {step > 0 && (
            <button
              type="button"
              className="ghost-btn"
              onClick={() => setStep((s) => s - 1)}
            >
              上一步
            </button>
          )}
          <button
            type="button"
            className="solid-btn"
            onClick={() => {
              if (isLast) {
                onClose()
              } else {
                setStep((s) => s + 1)
              }
            }}
          >
            {isLast ? '開始體驗' : '下一步'}
          </button>
        </div>

        {mode === 'hand' && (
          <p className="guide-footnote">
            狀態提醒：靠近 → 捏合摘花 → 移動 → 張開放下
          </p>
        )}
      </div>
    </div>
  )
}

const COACH: Record<GestureState, string> = {
  idle: '將手移近一株花，游標靠近時花朵會發光',
  hover: '捏合拇指與食指，摘下這朵花',
  grab: '花朵已摘起，保持捏合並移動手掌',
  move: '移到想種的位置，張開手指放下',
  release: '正在放下…',
  settle: '花朵落地扎根中',
}

type CoachProps = {
  handEnabled: boolean
  handReady: boolean
  gestureState: GestureState
  handActive: boolean
  onOpenGuide: () => void
}

export function GestureCoach({
  handEnabled,
  handReady,
  gestureState,
  handActive,
  onOpenGuide,
}: CoachProps) {
  if (!handEnabled) return null

  const text = !handReady
    ? '正在啟動手勢追蹤，請允許攝影機權限…'
    : !handActive
      ? '請將手移入畫面（看左下角視窗）'
      : COACH[gestureState]

  return (
    <div className="gesture-coach">
      <p>{text}</p>
      <button type="button" onClick={onOpenGuide} aria-label="重新查看引導">
        ?
      </button>
    </div>
  )
}
