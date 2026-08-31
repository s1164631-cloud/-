import { useEffect, useState } from 'react'

const STAGES = [
  '正在辨識植物...',
  '正在繪製油畫...',
  '正在種入花園...',
]

type Props = {
  active: boolean
}

export function ProcessingOverlay({ active }: Props) {
  const [stage, setStage] = useState(0)

  useEffect(() => {
    if (!active) {
      setStage(0)
      return
    }
    const timers = [
      window.setTimeout(() => setStage(1), 900),
      window.setTimeout(() => setStage(2), 2000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [active])

  if (!active) return null

  return (
    <div className="processing-overlay">
      <div className="processing-petal" aria-hidden />
      <p className="processing-text">{STAGES[stage]}</p>
    </div>
  )
}
