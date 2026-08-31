import { useCallback, useEffect, useRef, useState } from 'react'
import { audioEngine } from '../lib/audio/AudioEngine'
import type { SfxName } from '../lib/audio/paths'

/**
 * Garden audio hook — unlocks on first gesture, manages BGM + SFX.
 *
 * Files (optional):
 *   public/sounds/bgm.mp3
 *   public/sounds/click.wav | select.wav | success.wav
 * Missing files → Web Audio synth fallbacks.
 */
export function useAudio() {
  const [unlocked, setUnlocked] = useState(false)
  const [bgmOn, setBgmOn] = useState(false)
  const [bgmMissingFile, setBgmMissingFile] = useState(false)
  const unlocking = useRef(false)

  const unlock = useCallback(async () => {
    if (unlocking.current || audioEngine.isUnlocked) {
      setUnlocked(audioEngine.isUnlocked)
      return
    }
    unlocking.current = true
    const ok = await audioEngine.unlock()
    setUnlocked(ok)
    unlocking.current = false
  }, [])

  // Unlock after the first real user gesture (autoplay policy)
  useEffect(() => {
    const onFirst = () => {
      void unlock()
    }
    window.addEventListener('pointerdown', onFirst, { once: true })
    window.addEventListener('keydown', onFirst, { once: true })
    return () => {
      window.removeEventListener('pointerdown', onFirst)
      window.removeEventListener('keydown', onFirst)
    }
  }, [unlock])

  const playSfx = useCallback(
    async (name: SfxName) => {
      if (!audioEngine.isUnlocked) await unlock()
      await audioEngine.playSfx(name)
    },
    [unlock],
  )

  const toggleBgm = useCallback(async () => {
    if (!audioEngine.isUnlocked) await unlock()
    if (bgmOn) {
      audioEngine.pauseBgm()
      setBgmOn(false)
      return false
    }
    const result = await audioEngine.playBgm()
    setBgmOn(result.playing)
    setBgmMissingFile(result.missingFile)
    return result.playing
  }, [bgmOn, unlock])

  const setBgmEnabled = useCallback(
    async (on: boolean) => {
      if (!audioEngine.isUnlocked) await unlock()
      if (!on) {
        audioEngine.pauseBgm()
        setBgmOn(false)
        return
      }
      const result = await audioEngine.playBgm()
      setBgmOn(result.playing)
      setBgmMissingFile(result.missingFile)
    },
    [unlock],
  )

  useEffect(() => {
    return () => {
      audioEngine.pauseBgm()
    }
  }, [])

  return {
    unlocked,
    unlock,
    bgmOn,
    bgmMissingFile,
    toggleBgm,
    setBgmEnabled,
    playSfx,
  }
}
