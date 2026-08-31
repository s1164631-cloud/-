export type GestureState =
  | 'idle'
  | 'hover'
  | 'grab'
  | 'move'
  | 'release'
  | 'settle'

export type HandSample = {
  active: boolean
  x: number // 0–100 garden %
  y: number
  pinchDist: number
  grabbing: boolean
}

export type GestureFrame = {
  state: GestureState
  hand: HandSample | null
  hoverId: string | null
  heldId: string | null
  cursorX: number
  cursorY: number
  hint: string | null
}

const GRAB_THRESHOLD = 0.05
const RELEASE_THRESHOLD = 0.12
const COLLISION_RADIUS = 9 // % of garden

export function pinchDistance(
  thumb: { x: number; y: number; z?: number },
  index: { x: number; y: number; z?: number },
) {
  const dx = thumb.x - index.x
  const dy = thumb.y - index.y
  const dz = (thumb.z ?? 0) - (index.z ?? 0)
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/** Map MediaPipe landmark (mirrored selfie) into garden percentage coords. */
export function landmarkToGarden(
  lm: { x: number; y: number },
  mirrored = true,
) {
  return {
    x: (mirrored ? 1 - lm.x : lm.x) * 100,
    y: lm.y * 100,
  }
}

export function updateGrabHysteresis(
  pinchDist: number,
  prevGrabbing: boolean,
): boolean {
  if (pinchDist < GRAB_THRESHOLD) return true
  if (pinchDist > RELEASE_THRESHOLD) return false
  return prevGrabbing
}

export type FlowerPos = { id: string; x: number; y: number }

export function findNearestFlower(
  hand: { x: number; y: number },
  flowers: FlowerPos[],
  radius = COLLISION_RADIUS,
): string | null {
  let best: string | null = null
  let bestDist = radius
  for (const f of flowers) {
    const d = Math.hypot(hand.x - f.x, hand.y - f.y)
    if (d < bestDist) {
      bestDist = d
      best = f.id
    }
  }
  return best
}

export function clampGardenPos(x: number, y: number) {
  return {
    x: Math.min(88, Math.max(10, x)),
    y: Math.min(82, Math.max(38, y)),
  }
}

export class GestureController {
  state: GestureState = 'idle'
  prevGrabbing = false
  hoverId: string | null = null
  heldId: string | null = null
  origin: { x: number; y: number } | null = null
  cursorX = 50
  cursorY = 50
  hint: string | null = null
  private lostFrames = 0

  reset() {
    this.state = 'idle'
    this.prevGrabbing = false
    this.hoverId = null
    this.heldId = null
    this.origin = null
    this.hint = null
    this.lostFrames = 0
  }

  step(
    hand: HandSample | null,
    flowers: FlowerPos[],
  ): GestureFrame {
    if (!hand?.active) {
      this.lostFrames++
      if (this.lostFrames > 18) {
        if (this.state === 'move' || this.state === 'grab') {
          // Drop at current cursor
          this.state = 'settle'
          this.hint = '手離開畫面，花朵已放下'
        } else if (this.state === 'hover') {
          this.state = 'idle'
          this.hoverId = null
        }
      } else if (this.state === 'move' || this.state === 'grab') {
        this.hint = '請將手移回畫面中'
      }
      return this.snapshot(hand)
    }

    this.lostFrames = 0
    this.hint = null
    this.cursorX = hand.x
    this.cursorY = hand.y
    const grabbing = updateGrabHysteresis(hand.pinchDist, this.prevGrabbing)
    const grabRising = grabbing && !this.prevGrabbing
    const grabFalling = !grabbing && this.prevGrabbing
    this.prevGrabbing = grabbing

    const near = findNearestFlower(hand, flowers)

    switch (this.state) {
      case 'idle':
        if (near) {
          this.state = 'hover'
          this.hoverId = near
        }
        break
      case 'hover':
        if (!near) {
          this.state = 'idle'
          this.hoverId = null
        } else {
          this.hoverId = near
          if (grabRising) {
            const flower = flowers.find((f) => f.id === near)
            this.state = 'grab'
            this.heldId = near
            this.origin = flower
              ? { x: flower.x, y: flower.y }
              : { x: hand.x, y: hand.y }
          }
        }
        break
      case 'grab':
        this.state = 'move'
        break
      case 'move':
        if (grabFalling) {
          this.state = 'release'
        }
        break
      case 'release':
        this.state = 'settle'
        break
      case 'settle':
        // External code applies position then clears held
        break
      default:
        break
    }

    return this.snapshot(hand)
  }

  acknowledgeSettle() {
    this.state = 'idle'
    this.heldId = null
    this.hoverId = null
    this.origin = null
    this.hint = null
  }

  private snapshot(hand: HandSample | null): GestureFrame {
    return {
      state: this.state,
      hand,
      hoverId: this.hoverId,
      heldId: this.heldId,
      cursorX: this.cursorX,
      cursorY: this.cursorY,
      hint: this.hint,
    }
  }
}
