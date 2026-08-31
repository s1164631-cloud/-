/**
 * Audio asset paths
 * ----------------
 * Drop royalty-free / owned files here:
 *
 *   public/sounds/bgm.mp3      — looping background music
 *   public/sounds/click.wav    — short UI click
 *   public/sounds/select.wav   — flower / option select
 *   public/sounds/success.wav  — plant success / confirm
 *
 * Formats: .mp3 or .wav (also .ogg). If a file is missing,
 * Web Audio synth fallbacks play automatically.
 *
 * Optional override:
 *   VITE_BGM_URL=/sounds/bgm.mp3
 */

export const SOUND_DIR = '/sounds'

export const SOUND_PATHS = {
  bgm: import.meta.env.VITE_BGM_URL || `${SOUND_DIR}/bgm.mp3`,
  /** Legacy path still checked as fallback */
  bgmLegacy: '/audio/bgm.mp3',
  click: `${SOUND_DIR}/click.wav`,
  select: `${SOUND_DIR}/select.wav`,
  success: `${SOUND_DIR}/success.wav`,
} as const

export type SfxName = 'click' | 'select' | 'success'
