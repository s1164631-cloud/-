/** Soft Web Audio synth tones — used when .mp3/.wav files are absent. */

function env(ctx: AudioContext) {
  return ctx.createGain()
}

function tone(
  ctx: AudioContext,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  peak: number,
  dest: AudioNode,
) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(peak, start + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(g)
  g.connect(dest)
  osc.start(start)
  osc.stop(start + dur + 0.02)
}

/** Soft tap — button click */
export function synthClick(ctx: AudioContext, masterGain: GainNode) {
  const t = ctx.currentTime
  const bus = env(ctx)
  bus.gain.value = 1
  bus.connect(masterGain)
  tone(ctx, 880, t, 0.08, 'sine', 0.18, bus)
  tone(ctx, 1320, t, 0.06, 'triangle', 0.08, bus)
}

/** Gentle chime — select / hover confirm */
export function synthSelect(ctx: AudioContext, masterGain: GainNode) {
  const t = ctx.currentTime
  const bus = env(ctx)
  bus.gain.value = 1
  bus.connect(masterGain)
  tone(ctx, 523.25, t, 0.18, 'sine', 0.16, bus)
  tone(ctx, 659.25, t + 0.05, 0.22, 'sine', 0.12, bus)
}

/** Soft arpeggio — success / planted */
export function synthSuccess(ctx: AudioContext, masterGain: GainNode) {
  const t = ctx.currentTime
  const bus = env(ctx)
  bus.gain.value = 1
  bus.connect(masterGain)
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((f, i) => {
    tone(ctx, f, t + i * 0.07, 0.28, 'sine', 0.14 - i * 0.015, bus)
  })
}

/** Quiet ambient pad when no BGM file exists */
export function startSynthPad(
  ctx: AudioContext,
  masterGain: GainNode,
): { stop: () => void } {
  const oscs: OscillatorNode[] = []
  const gains: GainNode[] = []
  const specs: Array<[number, OscillatorType, number]> = [
    [110, 'sine', 0.035],
    [164.5, 'sine', 0.022],
    [220, 'triangle', 0.014],
  ]
  for (const [freq, type, peak] of specs) {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    g.gain.value = 0.0001
    g.gain.linearRampToValueAtTime(peak, ctx.currentTime + 0.8)
    osc.connect(g)
    g.connect(masterGain)
    osc.start()
    oscs.push(osc)
    gains.push(g)
  }
  return {
    stop: () => {
      const now = ctx.currentTime
      gains.forEach((g) => {
        g.gain.cancelScheduledValues(now)
        g.gain.setValueAtTime(g.gain.value, now)
        g.gain.linearRampToValueAtTime(0.0001, now + 0.4)
      })
      window.setTimeout(() => {
        oscs.forEach((o) => {
          try {
            o.stop()
          } catch {
            /* already stopped */
          }
        })
      }, 500)
    },
  }
}
