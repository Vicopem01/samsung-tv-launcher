import { useState } from 'react'
import { Play } from 'lucide-react'
import {
  SiApplemusic,
  SiAppletv,
  SiDazn,
  SiNetflix,
  SiSpotify,
  SiYoutube,
} from 'react-icons/si'

type AppIconProps = {
  appId: string
  size?: number
  /** The TV's own icon, used for installed apps without a brand mark here. */
  iconPath?: string
  /** App name, used for a letter icon when the TV's icon is missing. */
  name?: string
}

type BrandLogoProps = {
  appId: string
  name: string
  size: number
  aspectRatio: number
}

function BrandLogo({ appId, name, size, aspectRatio }: BrandLogoProps) {
  const width = Math.round(size * (size <= 32 ? 1.6 : 2.8))
  return (
    <img
      className="brand-logo"
      src={`${import.meta.env.BASE_URL}app-icons/${appId}.svg`}
      alt={name}
      data-brand-logo={appId}
      width={width}
      height={Math.round(width / aspectRatio)}
      style={{ maxHeight: Math.round(size * 1.35) }}
      draggable={false}
    />
  )
}

/** The TV's own icon, or the app's first letter if there is none or it fails to load. */
function TvIcon({ iconPath, name, size }: { iconPath?: string; name: string; size: number }) {
  const [failedPath, setFailedPath] = useState<string | null>(null)
  const pixels = Math.round(size * 1.5)

  if (!iconPath || failedPath === iconPath) {
    return (
      <span className="tv-app-monogram" style={{ width: pixels, height: pixels, fontSize: pixels * 0.5 }} aria-hidden="true">
        {name.charAt(0).toUpperCase()}
      </span>
    )
  }
  return (
    <img
      className="tv-app-icon"
      src={iconPath}
      alt=""
      width={pixels}
      height={pixels}
      draggable={false}
      loading="lazy"
      decoding="async"
      onError={() => setFailedPath(iconPath)}
    />
  )
}

export function AppIcon({ appId, size = 42, iconPath, name }: AppIconProps) {
  const iconProps = { size, 'aria-hidden': true }

  switch (appId) {
    case 'netflix':
      return <SiNetflix {...iconProps} color="#e7463c" />
    case 'youtube':
      return <SiYoutube {...iconProps} color="#ff574d" />
    case 'prime-video':
      return <BrandLogo appId={appId} name="Prime Video" size={size} aspectRatio={800.3 / 246.3} />
    case 'disney-plus':
      return <BrandLogo appId={appId} name="Disney+" size={size} aspectRatio={1041 / 565} />
    case 'crave':
      return <BrandLogo appId={appId} name="Crave" size={size} aspectRatio={600 / 106.2} />
    case 'apple-tv':
      return (
        <span className="wordmark apple-wordmark" style={{ fontSize: size * 0.62 }}>
          <SiAppletv size={size * 1.25} aria-hidden="true" />
        </span>
      )
    case 'tsn':
      return <BrandLogo appId={appId} name="TSN" size={size} aspectRatio={192.84357 / 46.642879} />
    case 'dazn':
      return <SiDazn {...iconProps} color="#f4f06e" />
    case 'spotify':
      return <SiSpotify {...iconProps} color="#6fd892" />
    case 'apple-music':
      return <SiApplemusic {...iconProps} color="#fa8da4" />
    default:
      if (name) return <TvIcon iconPath={iconPath} name={name} size={size} />
      return <Play {...iconProps} aria-hidden="true" />
  }
}
