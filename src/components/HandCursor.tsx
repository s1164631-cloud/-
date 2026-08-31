import type { GestureState } from '../lib/handGesture'

type Props = {
  x: number
  y: number
  state: GestureState
  active: boolean
  video?: HTMLVideoElement | null
}

export function HandCursor({ x, y, state, active, video }: Props) {
  const pinching = state === 'grab' || state === 'move'

  return (
    <>
      {active && (
        <div
          className={`hand-cursor state-${state} ${pinching ? 'is-pinch' : ''}`}
          style={{ left: `${x}%`, top: `${y}%` }}
          aria-hidden
        >
          <span className="hand-core" />
          <span className="hand-ring" />
          {pinching && <span className="hand-trail" />}
        </div>
      )}

      {video && (
        <div className="hand-pip">
          <video
            ref={(el) => {
              if (el && video && el.srcObject !== video.srcObject) {
                el.srcObject = video.srcObject
                void el.play().catch(() => undefined)
              }
            }}
            muted
            playsInline
            autoPlay
          />
          <span>手勢視窗</span>
        </div>
      )}
    </>
  )
}
