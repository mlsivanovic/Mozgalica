import { useEffect, useState } from 'react'

interface IkonaNagradeProps {
  iconUrl?: string | null
  emoji: string
  className: string
}

// Emoji je namerna rezerva: istorijske stavke i slike koje više nisu dostupne
// ostaju razumljive detetu.
export function IkonaNagrade({ iconUrl, emoji, className }: IkonaNagradeProps) {
  const url = iconUrl?.trim() ?? ''
  const [slikaNijeDostupna, setSlikaNijeDostupna] = useState(false)

  useEffect(() => {
    setSlikaNijeDostupna(false)
  }, [url])

  if (url && !slikaNijeDostupna) {
    return (
      <img
        src={url}
        alt=""
        aria-hidden="true"
        className={className}
        onError={() => setSlikaNijeDostupna(true)}
      />
    )
  }

  return <span className={className} aria-hidden="true">{emoji}</span>
}
