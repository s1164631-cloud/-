/**
 * Blow detection — short gust events (~1s), then return to calm.
 */

export type BlowSample = {
  rms: number
  level: number
  blowing: boolean
  intensity: number
}

export type BlowDetectorOptions = {
  sensitivity?: number
  minHoldMs?: number
  /** How long wind visuals stay active after a trigger */
  gustHoldMs?: number
  /** Min gap between gusts */
  cooldownMs?: number
}

export class BlowDetector {
  private ctx: AudioContext | null = null
  private stream: MediaStream | null = null
  private analyser: AnalyserNode | null = null
  private timeData: Float32Array | null = null
  private freqData: Uint8Array | null = null
  private sensitivity: number
  private minHoldMs: number
  private gustHoldMs: number
  private cooldownMs: number

  private blowingSince: number | null = null
  private windStrength = 0
  private lastBlowEdge = false
  private lastTriggerAt = 0
  private gustUntil = 0
  private unavailableReason: string | null = null
  private floor = 0.008
  private calibrated = false
  private calibrateUntil = 0

  constructor(opts: BlowDetectorOptions = {}) {
    this.sensitivity = opts.sensitivity ?? 1.4
    this.minHoldMs = opts.minHoldMs ?? 180
    this.gustHoldMs = opts.gustHoldMs ?? 3000
    this.cooldownMs = opts.cooldownMs ?? 3500
  }

  get reason() {
    return this.unavailableReason
  }

  get strength() {
    return this.windStrength
  }

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
        video: false,
      })
      this.ctx = new AudioContext()
      if (this.ctx.state === 'suspended') await this.ctx.resume()
      const source = this.ctx.createMediaStreamSource(this.stream)
      this.analyser = this.ctx.createAnalyser()
      this.analyser.fftSize = 1024
      this.analyser.smoothingTimeConstant = 0.55
      source.connect(this.analyser)
      this.timeData = new Float32Array(this.analyser.fftSize)
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount)
      this.unavailableReason = null
      this.calibrated = false
      this.calibrateUntil = performance.now() + 700
      this.floor = 0.008
      this.windStrength = 0
      this.gustUntil = 0
    } catch {
      this.unavailableReason = '請允許麥克風權限以啟用吹氣風動'
      throw new Error(this.unavailableReason)
    }
  }

  stop() {
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    void this.ctx?.close()
    this.ctx = null
    this.analyser = null
    this.timeData = null
    this.freqData = null
    this.windStrength = 0
    this.gustUntil = 0
  }

  /** Start a 1s gust, then calm. */
  forceGust(intensity = 0.85, now = performance.now()) {
    this.lastTriggerAt = now
    this.gustUntil = now + this.gustHoldMs
    this.windStrength = Math.min(1, intensity)
    return true
  }

  clearGust() {
    this.windStrength = 0
    this.gustUntil = 0
  }

  tick(now = performance.now()): {
    sample: BlowSample
    triggered: boolean
    windStrength: number
  } {
    if (!this.analyser || !this.timeData || !this.freqData || !this.ctx) {
      return {
        sample: { rms: 0, level: 0, blowing: false, intensity: 0 },
        triggered: false,
        windStrength: this.windStrength,
      }
    }

    if (this.ctx.state === 'suspended') void this.ctx.resume()

    this.analyser.getFloatTimeDomainData(
      this.timeData as Float32Array<ArrayBuffer>,
    )
    let sum = 0
    for (let i = 0; i < this.timeData.length; i++) {
      sum += this.timeData[i] * this.timeData[i]
    }
    const rms = Math.sqrt(sum / this.timeData.length)

    this.analyser.getByteFrequencyData(
      this.freqData as Uint8Array<ArrayBuffer>,
    )
    const bins = this.freqData.length
    const midStart = Math.floor(bins * 0.08)
    const midEnd = Math.floor(bins * 0.55)
    let mid = 0
    let count = 0
    for (let i = midStart; i < midEnd; i++) {
      mid += this.freqData[i]
      count++
    }
    const midAvg = count ? mid / count / 255 : 0

    if (!this.calibrated) {
      this.floor = Math.max(this.floor, rms * 0.9)
      if (now > this.calibrateUntil) {
        this.calibrated = true
        this.floor = Math.max(0.004, this.floor * 1.15)
      }
    }

    const threshold = this.floor + 0.012 / this.sensitivity
    const volumeOk = rms > threshold
    const spectrumOk = midAvg > 0.08 / this.sensitivity
    const rawBlow = volumeOk && (spectrumOk || rms > threshold * 2.2)
    const level = Math.min(1, rms / Math.max(0.04, threshold * 4))

    let blowing = false
    let intensity = 0
    if (rawBlow) {
      if (this.blowingSince == null) this.blowingSince = now
      if (now - this.blowingSince >= this.minHoldMs) {
        blowing = true
        intensity = Math.min(
          1,
          ((rms - this.floor) * this.sensitivity) / 0.06 + midAvg,
        )
      }
    } else {
      this.blowingSince = null
    }

    const canTrigger = now - this.lastTriggerAt > this.cooldownMs
    const triggered = blowing && !this.lastBlowEdge && canTrigger
    if (triggered) {
      this.forceGust(Math.max(0.7, intensity + 0.15), now)
    }
    this.lastBlowEdge = blowing

    // Hold gust for gustHoldMs, then snap back to calm
    if (now < this.gustUntil) {
      const remain = (this.gustUntil - now) / this.gustHoldMs
      // Keep mostly full for the second, slight ease at the end
      this.windStrength = remain > 0.15 ? Math.max(this.windStrength, 0.75) : remain * 5
    } else {
      this.windStrength = 0
    }

    return {
      sample: { rms, level, blowing, intensity },
      triggered,
      windStrength: this.windStrength,
    }
  }
}
