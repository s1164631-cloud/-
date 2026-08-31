import { SOUND_PATHS, type SfxName } from './paths'
import {
  startSynthPad,
  synthClick,
  synthSelect,
  synthSuccess,
} from './synth'

const BGM_VOLUME = 0.35 // 35% — mid of 30–40%
const SFX_VOLUME = 0.55

type PadHandle = { stop: () => void }

/**
 * Central audio engine: unlocks after first user gesture (autoplay policy),
 * loops BGM from /public/sounds/, and plays SFX (file or Web Audio fallback).
 */
export class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private sfxBus: GainNode | null = null
  private bgmBus: GainNode | null = null
  private unlocked = false
  private bgmEl: HTMLAudioElement | null = null
  private bgmUsingFile = false
  private pad: PadHandle | null = null
  private sfxCache = new Map<SfxName, HTMLAudioElement | null>()
  private bgmWanted = false

  get isUnlocked() {
    return this.unlocked
  }

  get isBgmPlaying() {
    if (this.bgmUsingFile && this.bgmEl) return !this.bgmEl.paused
    return !!this.pad
  }

  get usingFileBgm() {
    return this.bgmUsingFile
  }

  /** Call once from a click/pointer handler to satisfy browser autoplay rules. */
  async unlock() {
    if (this.unlocked) return true
    try {
      const ctx = this.ensureCtx()
      if (ctx.state === 'suspended') await ctx.resume()
      // Silent blip primes the graph
      const g = ctx.createGain()
      g.gain.value = 0.0001
      const o = ctx.createOscillator()
      o.connect(g)
      g.connect(ctx.destination)
      o.start()
      o.stop(ctx.currentTime + 0.01)
      this.unlocked = true
      if (this.bgmWanted) await this.playBgm()
      return true
    } catch {
      return false
    }
  }

  private ensureCtx() {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.master = this.ctx.createGain()
      this.master.gain.value = 1
      this.master.connect(this.ctx.destination)
      this.sfxBus = this.ctx.createGain()
      this.sfxBus.gain.value = SFX_VOLUME
      this.sfxBus.connect(this.master)
      this.bgmBus = this.ctx.createGain()
      this.bgmBus.gain.value = BGM_VOLUME
      this.bgmBus.connect(this.master)
    }
    return this.ctx
  }

  private async resolveBgmSrc(): Promise<string | null> {
    // Prefer local files — try play path first (Vite may not answer HEAD for mp3)
    for (const url of [SOUND_PATHS.bgm, SOUND_PATHS.bgmLegacy]) {
      if (await this.canLoadAudio(url)) return url
    }
    return null
  }

  private canLoadAudio(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const el = new Audio()
      const done = (ok: boolean) => {
        el.removeEventListener('canplaythrough', onOk)
        el.removeEventListener('error', onErr)
        resolve(ok)
      }
      const onOk = () => done(true)
      const onErr = () => done(false)
      el.addEventListener('canplaythrough', onOk, { once: true })
      el.addEventListener('error', onErr, { once: true })
      el.preload = 'auto'
      el.src = url
      el.load()
      window.setTimeout(() => done(el.readyState >= 2), 2000)
    })
  }

  async playBgm() {
    this.bgmWanted = true
    if (!this.unlocked) return { playing: false, missingFile: true }
    this.ensureCtx()
    if (this.ctx?.state === 'suspended') await this.ctx.resume()

    this.stopBgmInternal(false)

    const src = await this.resolveBgmSrc()
    if (src) {
      const el = new Audio(src)
      el.loop = true
      el.preload = 'auto'
      el.volume = BGM_VOLUME
      try {
        await el.play()
        this.bgmEl = el
        this.bgmUsingFile = true
        return { playing: true, missingFile: false }
      } catch {
        /* fall through to synth */
      }
    }

    // Synth pad fallback
    if (this.ctx && this.bgmBus) {
      this.pad = startSynthPad(this.ctx, this.bgmBus)
      this.bgmUsingFile = false
      return { playing: true, missingFile: true }
    }
    return { playing: false, missingFile: true }
  }

  pauseBgm() {
    this.bgmWanted = false
    this.stopBgmInternal(true)
  }

  private stopBgmInternal(resetWanted: boolean) {
    if (resetWanted) this.bgmWanted = false
    if (this.bgmEl) {
      this.bgmEl.pause()
      this.bgmEl.currentTime = 0
      this.bgmEl = null
    }
    this.pad?.stop()
    this.pad = null
    this.bgmUsingFile = false
  }

  setBgmVolume(v: number) {
    const vol = Math.min(1, Math.max(0, v))
    if (this.bgmEl) this.bgmEl.volume = vol
    if (this.bgmBus) this.bgmBus.gain.value = vol
  }

  async playSfx(name: SfxName) {
    if (!this.unlocked) return
    const ctx = this.ensureCtx()
    if (ctx.state === 'suspended') await ctx.resume()
    if (!this.sfxBus) return

    const path = SOUND_PATHS[name]
    let el = this.sfxCache.get(name)
    if (el === undefined) {
      const ok = await this.canLoadAudio(path)
      if (ok) {
        el = new Audio(path)
        el.preload = 'auto'
        el.volume = SFX_VOLUME
        this.sfxCache.set(name, el)
      } else {
        this.sfxCache.set(name, null)
        el = null
      }
    }

    if (el) {
      try {
        const node = el.cloneNode(true) as HTMLAudioElement
        node.volume = SFX_VOLUME
        await node.play()
        return
      } catch {
        /* synth fallback */
      }
    }

    switch (name) {
      case 'click':
        synthClick(ctx, this.sfxBus)
        break
      case 'select':
        synthSelect(ctx, this.sfxBus)
        break
      case 'success':
        synthSuccess(ctx, this.sfxBus)
        break
    }
  }
}

export const audioEngine = new AudioEngine()
