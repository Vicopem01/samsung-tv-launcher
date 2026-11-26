import type { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

type HomeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  children: ReactNode
  className?: string
  /** Render inside the scaled TV stage so dialogs scale with it. */
  container?: HTMLElement | null
}

export function HomeDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className = '',
  container,
}: HomeDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={container}>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className={`dialog-content ${className}`}>
          <div className="dialog-heading">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>{description}</Dialog.Description>
            </div>
            <Dialog.Close className="icon-button dialog-close" aria-label="Close">
              <X size={34} aria-hidden="true" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
