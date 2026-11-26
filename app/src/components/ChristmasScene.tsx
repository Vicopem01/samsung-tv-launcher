const W = 1920
const H = 640

const stars = Array.from({ length: 26 }, (_, index) => ({
  x: (index * 311 + 140) % W,
  y: 30 + ((index * 53) % 230),
  radius: 0.9 + (index % 3) * 0.35,
}))

const ornaments = [
  { x: 0, y: 47, color: '#c95750', radius: 3.8 },
  { x: -15, y: 66, color: '#e5c372', radius: 4.3 },
  { x: 16, y: 73, color: '#f4efe0', radius: 4 },
  { x: -30, y: 96, color: '#c95750', radius: 4.7 },
  { x: 0, y: 91, color: '#e5c372', radius: 4.3 },
  { x: 32, y: 103, color: '#f4efe0', radius: 4.5 },
  { x: -51, y: 129, color: '#e5c372', radius: 4.5 },
  { x: -18, y: 124, color: '#c95750', radius: 4.9 },
  { x: 16, y: 121, color: '#f4efe0', radius: 4.2 },
  { x: 51, y: 136, color: '#c95750', radius: 4.6 },
  { x: -70, y: 158, color: '#c95750', radius: 4.5 },
  { x: -38, y: 160, color: '#f4efe0', radius: 4.8 },
  { x: -4, y: 149, color: '#e5c372', radius: 4.4 },
  { x: 34, y: 155, color: '#c95750', radius: 4.8 },
  { x: 69, y: 163, color: '#e5c372', radius: 4.2 },
]

const distantTrees: [number, number, number, boolean][] = [
  [700, 392, 1.05, false],
  [770, 410, 0.8, true],
  [1210, 398, 0.95, true],
  [1265, 418, 0.7, false],
  [1880, 404, 0.85, true],
  [560, 420, 0.7, true],
]

/** Original snowy evening artwork used as the Home backdrop. Static, so the TV only paints it once. */
export function ChristmasScene() {
  return (
    <div className="christmas-scene" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role="presentation">
        <defs>
          <linearGradient id="scene-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0d2431" />
            <stop offset="0.55" stopColor="#1e4448" />
            <stop offset="0.82" stopColor="#5b4a4c" />
            <stop offset="1" stopColor="#7a5a52" />
          </linearGradient>
          <radialGradient id="scene-moon-halo">
            <stop offset="0" stopColor="#f6e2ad" stopOpacity="0.35" />
            <stop offset="1" stopColor="#f6e2ad" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="scene-snow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9ecdf" />
            <stop offset="1" stopColor="#a9bcb1" />
          </linearGradient>
        </defs>

        <rect width={W} height={H} fill="url(#scene-sky)" />

        <g className="scene-stars" fill="#f4efdc">
          {stars.map((star) => (
            <circle key={`${star.x}-${star.y}`} cx={star.x} cy={star.y} r={star.radius} opacity=".55" />
          ))}
        </g>

        <circle cx="1130" cy="150" r="120" fill="url(#scene-moon-halo)" />
        <circle className="scene-moon" cx="1130" cy="150" r="38" fill="#f3dda2" />
        <circle cx="1118" cy="140" r="7" fill="#e3c98a" opacity=".55" />
        <circle cx="1144" cy="163" r="5" fill="#e3c98a" opacity=".45" />

        <path d="M0 470c190-58 360-52 540 2 170 51 330 30 500-16 220-60 400-44 560 12 130 45 230 36 320 10V640H0Z" fill="#4f6f68" opacity=".55" />

        <g className="distant-trees">
          {distantTrees.map(([x, y, scale, dark]) => (
            <g key={x} transform={`translate(${x} ${y}) scale(${scale})`}>
              <path d="M0 0-42 70h26l-38 45H44L8 70h25Z" fill={dark ? '#24493f' : '#315a4b'} />
              <path d="M0 0-30 50 0 40 25 50Zm-12 61-26 39 35-11 32 10-17-29Z" fill="#e5e8d8" opacity=".8" />
              <path d="M-5 110h10v25H-5Z" fill="#4b3e33" />
            </g>
          ))}
        </g>

        <g className="house" transform="translate(860 330) scale(1.3)">
          <path d="M20 66h244v96H20Z" fill="#a86d58" />
          <path d="m0 70 139-68 145 68Z" fill="#5e2e31" />
          <path d="m0 70 139-68 145 68-12 7-133-58L10 78Z" fill="#eff0df" />
          <path d="M35 84h45v39H35Zm164 0h45v39h-45Z" fill="#f0cf83" />
          <path d="M57 84v39M35 103h45M221 84v39M199 103h45" stroke="#6d493b" strokeWidth="4" />
          <path d="M108 87h60v75h-60Z" fill="#244539" />
          <circle cx="138" cy="112" r="18" fill="none" stroke="#7d9862" strokeWidth="8" />
          <circle cx="138" cy="126" r="5" fill="#c95f58" />
          <path d="M8 162h269v9H8Z" fill="#f3f0df" />
          <path d="M204 21h27v33h-27Z" fill="#6c3d37" />
          <path d="M199 19h37v8h-37Z" fill="#eef0df" />
        </g>

        <path d="M0 548c230-36 420-22 610 8 200 32 380 14 560-10 240-32 450-14 750 26V640H0Z" fill="url(#scene-snow)" />

        <g className="christmas-tree" transform="translate(1560 196) scale(2.05)">
          <ellipse cx="0" cy="194" rx="116" ry="8" fill="#5d7b70" opacity=".3" />
          <path d="M-8 159h16v34H-8Z" fill="#5f4a37" />
          <path d="M0 22C-8 37-23 53-36 67q15-3 25-1C-20 77-29 84-40 91 0 81 0 81 0 81s20 5 40 10C29 82 21 75 13 66q12 2 24 1C22 52 8 36 0 22Z" fill="#2d7053" />
          <path d="M0 54C-14 72-36 92-57 107q20-3 31-1C-40 119-52 126-65 133 0 118 0 118 0 118s33 10 65 15C51 124 40 117 28 106q15 3 29 1C35 92 14 72 0 54Z" fill="#276449" />
          <path d="M0 89C-20 108-50 133-77 147q23-3 40 0C-55 160-72 168-91 177 0 160 0 160 0 160s50 14 91 17C72 167 55 159 39 147q20 2 38 0C50 132 20 108 0 89Z" fill="#1f5945" />
          <g fill="#edf1e5" opacity=".87">
            <path d="m-16 51-16 14 15-3 11 4 8-5Z" />
            <path d="m-34 91-18 13 20-3 12 5 11-5Z" />
            <path d="m19 110 23 14 13-1-19-13Z" />
            <path d="m-59 143-22 16 25-4 13 5 13-5Z" />
            <path d="m29 148 29 15 15-1-25-14Z" />
          </g>
          <path className="tree-star" d="m0-4 4.4 8.8 9.6 1.4-7 6.8 1.7 9.6L0 17.3l-8.7 4.3L-7 12l-7-6.8 9.6-1.4Z" fill="#f0cb76" />
          <g fill="none" stroke="#d4b66d" strokeWidth="2.1" strokeLinecap="round">
            <path d="M-23 72Q0 85 25 73" />
            <path d="M-50 111Q0 135 52 113" />
            <path d="M-76 151Q0 179 77 153" />
          </g>
          <g className="tree-ornaments">
            {ornaments.map(({ x, y, color, radius }) => (
              <g key={`${x}-${y}`} className="tree-ornament">
                <path d={`M${x} ${y - radius - 2}v2`} stroke="#dbc183" strokeWidth="1.4" />
                <circle cx={x} cy={y} r={radius} fill={color} />
                <circle cx={x - radius * 0.3} cy={y - radius * 0.35} r=".9" fill="#fff9e9" opacity=".65" />
              </g>
            ))}
          </g>
          <g className="gifts">
            <path d="M-108 159h42v32h-42Z" fill="#a94f4b" />
            <path d="M-91 159h7v32h-7Zm-17 12h42v7h-42Z" fill="#e5c47d" />
            <path d="M59 163h47v28H59Z" fill="#d6b96e" />
            <path d="M79 163h7v28h-7Zm-20 10h47v6H59Z" fill="#934b48" />
            <path d="M-24 169h39v22h-39Z" fill="#e8e2c4" />
            <path d="M-8 169h6v22h-6Z" fill="#a94f4b" />
          </g>
        </g>

      </svg>
    </div>
  )
}

/** Kept small: each flake is its own layer on the TV's graphics chip. */
const flakes = Array.from({ length: 20 }, (_, index) => ({
  left: (index * 437 + 61) % 1920,
  top: (index * 97 + 23) % 520,
  size: 4 + (index % 3) * 2,
  delay: -(index % 11),
  duration: 11 + (index % 6),
}))

/**
 * Snow as separate small elements that move with transforms only, which the TV
 * can animate without repainting the backdrop.
 */
export function Snowfall() {
  return (
    <div className="snowfall" aria-hidden="true">
      {flakes.map((flake, index) => (
        <span
          key={index}
          className="snowflake"
          style={{
            left: flake.left,
            top: flake.top,
            width: flake.size,
            height: flake.size,
            animationDelay: `${flake.delay}s`,
            animationDuration: `${flake.duration}s`,
          }}
        />
      ))}
    </div>
  )
}
