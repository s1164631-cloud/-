import type { GardenFlower } from '../data/plants'
import {
  GROWTH_LABEL,
  getGrowthStage,
  getMorphology,
  type GrowthStage,
  type Morphology,
} from '../lib/growth'

type Props = {
  flower: GardenFlower
  className?: string
  showLabel?: boolean
}

function uid(prefix: string, id: string) {
  return `${prefix}-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`
}

export function PlantSprite({ flower, className = '', showLabel = true }: Props) {
  const stage = getGrowthStage(flower.plantedAt)
  const morph = getMorphology(flower.plantId)
  const [c0, c1, c2] = flower.palette
  const gid = uid('p', flower.id)

  return (
    <div
      className={`plant-sprite stage-${stage} morph-${morph} ${className}`}
      data-stage={stage}
    >
      <svg
        viewBox="0 0 120 160"
        className="plant-svg"
        aria-hidden
        overflow="visible"
      >
        <defs>
          <radialGradient id={`${gid}-petal`} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor={c1} />
            <stop offset="55%" stopColor={c0} />
            <stop offset="100%" stopColor={c2} />
          </radialGradient>
          <linearGradient id={`${gid}-stem`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5a8a58" />
            <stop offset="100%" stopColor="#2f5530" />
          </linearGradient>
          <linearGradient id={`${gid}-leaf`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7db07a" />
            <stop offset="100%" stopColor="#3d6a40" />
          </linearGradient>
          <radialGradient id={`${gid}-seed`} cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#e8d2a8" />
            <stop offset="100%" stopColor="#8a6a38" />
          </radialGradient>
          <filter id={`${gid}-soft`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Soft ground shadow */}
        <ellipse
          cx="60"
          cy="152"
          rx={stage === 'seed' ? 16 : stage === 'sprout' ? 14 : 22}
          ry="4"
          fill="rgba(10, 24, 22, 0.35)"
        />

        {stage === 'seed' && <SeedBody gid={gid} />}
        {stage === 'sprout' && <SproutBody gid={gid} morph={morph} />}
        {stage === 'young' && (
          <YoungBody gid={gid} morph={morph} c0={c0} c1={c1} />
        )}
        {stage === 'mature' && (
          <MatureBody
            gid={gid}
            morph={morph}
            c0={c0}
            c1={c1}
            c2={c2}
          />
        )}
      </svg>

      {showLabel && (
        <span className="plant-stage-chip">
          {GROWTH_LABEL[stage]} · {flower.name}
        </span>
      )}
    </div>
  )
}

function SeedBody({ gid }: { gid: string }) {
  return (
    <g className="seed-body">
      {/* Earth patch — readable on dark garden */}
      <ellipse cx="60" cy="148" rx="28" ry="9" fill="#2a1c12" opacity="0.75" />
      <ellipse cx="60" cy="146" rx="22" ry="7" fill="#6b4a32" />
      <ellipse cx="60" cy="144" rx="16" ry="4.5" fill="#8a6540" opacity="0.85" />
      {/* Elongated botanical seed, half under soil line */}
      <ellipse
        cx="60"
        cy="141"
        rx="11"
        ry="5"
        fill={`url(#${gid}-seed)`}
        stroke="#3d2918"
        strokeWidth="0.8"
      />
      <path
        d="M51 141 Q60 137.5 69 141"
        fill="none"
        stroke="#2a1a10"
        strokeWidth="0.7"
        opacity="0.4"
      />
      {/* Soil covering lower half of seed */}
      <ellipse cx="60" cy="145" rx="14" ry="3.5" fill="#6b4a32" opacity="0.95" />
      <circle cx="46" cy="146" r="1.4" fill="#5a3c28" />
      <circle cx="74" cy="147" r="1.1" fill="#5a3c28" />
      <circle cx="55" cy="148" r="0.9" fill="#4a3018" />
    </g>
  )
}

function SproutBody({ gid, morph }: { gid: string; morph: Morphology }) {
  const stemH = morph === 'lily' ? 20 : 36
  return (
    <g className="sprout-body">
      <path
        d={`M60 148 C58 ${148 - stemH * 0.4}, 61 ${148 - stemH * 0.75}, 60 ${148 - stemH}`}
        fill="none"
        stroke={`url(#${gid}-stem)`}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <ellipse
        cx="48"
        cy={148 - stemH + 4}
        rx="12"
        ry="6"
        fill={`url(#${gid}-leaf)`}
        transform={`rotate(-28 48 ${148 - stemH + 4})`}
        opacity="0.95"
      />
      <ellipse
        cx="72"
        cy={148 - stemH + 6}
        rx="11"
        ry="5.5"
        fill={`url(#${gid}-leaf)`}
        transform={`rotate(32 72 ${148 - stemH + 6})`}
        opacity="0.9"
      />
    </g>
  )
}

function YoungBody({
  gid,
  morph,
  c0,
  c1,
}: {
  gid: string
  morph: Morphology
  c0: string
  c1: string
}) {
  return (
    <g className="young-body">
      <Stem gid={gid} morph={morph} tall={false} />
      <Leaves gid={gid} morph={morph} dense={false} />
      {/* Bud */}
      {morph === 'spike' ? (
        <ellipse cx="60" cy="58" rx="5" ry="14" fill={c0} opacity="0.85" />
      ) : morph === 'aloe' || morph === 'rosette' ? (
        <RosetteLeaves gid={gid} size={0.7} bloom={false} />
      ) : morph === 'lily' ? (
        <>
          <ellipse cx="60" cy="118" rx="28" ry="8" fill={`url(#${gid}-leaf)`} opacity="0.85" />
          <ellipse cx="60" cy="100" rx="8" ry="10" fill={c1} />
        </>
      ) : (
        <g>
          <ellipse cx="60" cy="52" rx="11" ry="13" fill={c0} />
          <ellipse cx="60" cy="50" rx="6" ry="7" fill={c1} opacity="0.8" />
        </g>
      )}
    </g>
  )
}

function MatureBody({
  gid,
  morph,
  c0,
  c1,
  c2,
}: {
  gid: string
  morph: Morphology
  c0: string
  c1: string
  c2: string
}) {
  return (
    <g className="mature-body" filter={`url(#${gid}-soft)`}>
      <Stem gid={gid} morph={morph} tall />
      <Leaves gid={gid} morph={morph} dense />
      <BloomShape morph={morph} gid={gid} c0={c0} c1={c1} c2={c2} />
    </g>
  )
}

function Stem({
  gid,
  morph,
  tall,
}: {
  gid: string
  morph: Morphology
  tall: boolean
}) {
  if (morph === 'lily') {
    return (
      <path
        d="M60 148 C59 130, 58 118, 60 108"
        fill="none"
        stroke={`url(#${gid}-stem)`}
        strokeWidth="2"
        strokeLinecap="round"
      />
    )
  }
  if (morph === 'rosette' || morph === 'aloe' || morph === 'clover') {
    return (
      <path
        d="M60 148 C60 140, 60 136, 60 130"
        fill="none"
        stroke={`url(#${gid}-stem)`}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    )
  }
  if (morph === 'branch') {
    return (
      <path
        d="M40 148 C48 120, 55 90, 70 48"
        fill="none"
        stroke="#6a4a30"
        strokeWidth="3"
        strokeLinecap="round"
      />
    )
  }
  const top = tall ? 70 : 90
  return (
    <path
      d={`M60 148 C58 120, 62 95, 60 ${top}`}
      fill="none"
      stroke={`url(#${gid}-stem)`}
      strokeWidth={morph === 'sun' || morph === 'spike' ? 3.2 : 2.4}
      strokeLinecap="round"
    />
  )
}

function Leaves({
  gid,
  morph,
  dense,
}: {
  gid: string
  morph: Morphology
  dense: boolean
}) {
  if (morph === 'lily' || morph === 'rosette' || morph === 'aloe' || morph === 'branch') {
    return null
  }
  return (
    <g opacity="0.95">
      <ellipse
        cx="42"
        cy="110"
        rx={dense ? 16 : 12}
        ry="7"
        fill={`url(#${gid}-leaf)`}
        transform="rotate(-35 42 110)"
      />
      <ellipse
        cx="78"
        cy="118"
        rx={dense ? 15 : 11}
        ry="6.5"
        fill={`url(#${gid}-leaf)`}
        transform="rotate(38 78 118)"
      />
      {dense && (
        <ellipse
          cx="48"
          cy="95"
          rx="12"
          ry="5.5"
          fill={`url(#${gid}-leaf)`}
          transform="rotate(-20 48 95)"
        />
      )}
    </g>
  )
}

function RosetteLeaves({
  gid,
  size,
  bloom,
}: {
  gid: string
  size: number
  bloom: boolean
}) {
  const n = bloom ? 8 : 6
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2
        const x = 60 + Math.cos(a) * 18 * size
        const y = 120 + Math.sin(a) * 10 * size
        return (
          <ellipse
            key={i}
            cx={x}
            cy={y}
            rx={14 * size}
            ry={6 * size}
            fill={`url(#${gid}-leaf)`}
            transform={`rotate(${(a * 180) / Math.PI} ${x} ${y})`}
            opacity={0.85 + (i % 3) * 0.05}
          />
        )
      })}
    </g>
  )
}

function BloomShape({
  morph,
  gid,
  c0,
  c1,
  c2,
}: {
  morph: Morphology
  gid: string
  c0: string
  c1: string
  c2: string
}) {
  switch (morph) {
    case 'rose':
      return (
        <g>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <ellipse
              key={deg}
              cx="60"
              cy="42"
              rx="16"
              ry="10"
              fill={`url(#${gid}-petal)`}
              transform={`rotate(${deg} 60 42)`}
              opacity="0.9"
            />
          ))}
          <circle cx="60" cy="42" r="8" fill={c1} />
          <circle cx="60" cy="42" r="4" fill={c2} opacity="0.7" />
        </g>
      )
    case 'sun':
      return (
        <g>
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i / 16) * Math.PI * 2
            return (
              <ellipse
                key={i}
                cx={60 + Math.cos(a) * 22}
                cy={42 + Math.sin(a) * 22}
                rx="7"
                ry="14"
                fill={`url(#${gid}-petal)`}
                transform={`rotate(${(a * 180) / Math.PI + 90} ${60 + Math.cos(a) * 22} ${42 + Math.sin(a) * 22})`}
              />
            )
          })}
          <circle cx="60" cy="42" r="14" fill="#5a3a18" />
          <circle cx="60" cy="42" r="11" fill="#c9a227" opacity="0.85" />
        </g>
      )
    case 'spike':
      return (
        <g>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <g key={i}>
              <ellipse
                cx="52"
                cy={40 + i * 10}
                rx="7"
                ry="5"
                fill={`url(#${gid}-petal)`}
              />
              <ellipse
                cx="68"
                cy={44 + i * 10}
                rx="7"
                ry="5"
                fill={`url(#${gid}-petal)`}
              />
            </g>
          ))}
          <rect x="57" y="36" width="6" height="62" rx="3" fill={`url(#${gid}-stem)`} />
        </g>
      )
    case 'daisy':
      return (
        <g>
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2
            return (
              <ellipse
                key={i}
                cx={60 + Math.cos(a) * 16}
                cy={42 + Math.sin(a) * 16}
                rx="6"
                ry="12"
                fill={c1}
                transform={`rotate(${(a * 180) / Math.PI + 90} ${60 + Math.cos(a) * 16} ${42 + Math.sin(a) * 16})`}
              />
            )
          })}
          <circle cx="60" cy="42" r="9" fill="#e8c85a" />
        </g>
      )
    case 'cluster':
      return (
        <g>
          {[
            [60, 36],
            [48, 44],
            [72, 44],
            [52, 56],
            [68, 56],
            [60, 50],
            [42, 52],
            [78, 52],
          ].map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={7 - (i % 3)}
              fill={`url(#${gid}-petal)`}
              opacity="0.9"
            />
          ))}
        </g>
      )
    case 'branch':
      return (
        <g>
          {[
            [58, 40],
            [72, 48],
            [66, 58],
            [80, 62],
            [54, 52],
          ].map(([x, y], i) => (
            <g key={i}>
              {[0, 72, 144, 216, 288].map((deg) => (
                <ellipse
                  key={deg}
                  cx={x}
                  cy={y}
                  rx="7"
                  ry="4"
                  fill={`url(#${gid}-petal)`}
                  transform={`rotate(${deg} ${x} ${y})`}
                  opacity="0.88"
                />
              ))}
              <circle cx={x} cy={y} r="2.5" fill="#f0d878" />
            </g>
          ))}
        </g>
      )
    case 'rosette':
      return <RosetteLeaves gid={gid} size={1} bloom />
    case 'aloe':
      return (
        <g>
          {[-40, -20, 0, 20, 40].map((deg, i) => (
            <path
              key={deg}
              d={`M60 130 Q${60 + deg * 0.6} ${90 - i * 2} ${60 + deg * 0.9} ${55 + Math.abs(deg) * 0.2}`}
              fill="none"
              stroke={`url(#${gid}-leaf)`}
              strokeWidth="7"
              strokeLinecap="round"
              opacity="0.9"
            />
          ))}
        </g>
      )
    case 'lily':
      return (
        <g>
          <ellipse cx="60" cy="120" rx="34" ry="10" fill={`url(#${gid}-leaf)`} opacity="0.8" />
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <ellipse
              key={deg}
              cx="60"
              cy="88"
              rx="14"
              ry="8"
              fill={`url(#${gid}-petal)`}
              transform={`rotate(${deg} 60 88)`}
            />
          ))}
          <circle cx="60" cy="88" r="5" fill="#e8c85a" />
        </g>
      )
    case 'fan':
      return (
        <g>
          {[-30, 0, 30].map((deg) => (
            <path
              key={deg}
              d="M60 100 Q40 70 35 48 Q60 58 85 48 Q80 70 60 100"
              fill={`url(#${gid}-petal)`}
              transform={`rotate(${deg} 60 100)`}
              opacity="0.92"
            />
          ))}
        </g>
      )
    case 'clover':
      return (
        <g>
          {[0, 90, 180, 270].map((deg) => (
            <ellipse
              key={deg}
              cx="60"
              cy="100"
              rx="14"
              ry="10"
              fill={`url(#${gid}-leaf)`}
              transform={`rotate(${deg} 60 115) translate(0 -16)`}
            />
          ))}
        </g>
      )
    case 'puff':
      return (
        <g>
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i / 24) * Math.PI * 2
            return (
              <line
                key={i}
                x1="60"
                y1="48"
                x2={60 + Math.cos(a) * 26}
                y2={48 + Math.sin(a) * 26}
                stroke={c1}
                strokeWidth="1.2"
                opacity="0.85"
              />
            )
          })}
          <circle cx="60" cy="48" r="6" fill={c0} />
        </g>
      )
    case 'leafy':
      return (
        <g>
          {[
            [50, 55],
            [70, 48],
            [55, 70],
            [68, 66],
          ].map(([x, y], i) => (
            <ellipse
              key={i}
              cx={x}
              cy={y}
              rx="11"
              ry="6"
              fill={`url(#${gid}-leaf)`}
              transform={`rotate(${i % 2 === 0 ? -25 : 28} ${x} ${y})`}
            />
          ))}
          <circle cx="62" cy="42" r="6" fill={c0} opacity="0.85" />
        </g>
      )
    default:
      return (
        <g>
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <ellipse
              key={deg}
              cx="60"
              cy="42"
              rx="14"
              ry="8"
              fill={`url(#${gid}-petal)`}
              transform={`rotate(${deg} 60 42)`}
            />
          ))}
          <circle cx="60" cy="42" r="6" fill={c1} />
        </g>
      )
  }
}

export function growthStageOf(flower: GardenFlower): GrowthStage {
  return getGrowthStage(flower.plantedAt)
}
