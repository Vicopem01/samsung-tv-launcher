import { Gamepad2 } from 'lucide-react'
import { SiPlaystation } from 'react-icons/si'
import type { ConsoleBrand } from '../data/home'

export function ConsoleIcon({ brand, size = 48 }: { brand: ConsoleBrand; size?: number }) {
  if (brand === 'playstation') return <SiPlaystation size={size} aria-hidden="true" />
  return <Gamepad2 size={size} strokeWidth={1.7} aria-hidden="true" />
}
