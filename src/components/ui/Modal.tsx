import { useEffect, useRef } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="modal-title"
      className="backdrop:bg-black/40 backdrop-blur-sm bg-transparent p-0 m-auto rounded-3xl shadow-2xl max-w-md w-[calc(100%-2rem)] overflow-visible"
    >
      <div className="bg-surface rounded-3xl border border-outline-variant/30 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
          <h3 id="modal-title" className="font-headline-md text-headline-md text-on-surface">{title}</h3>
          <button onClick={onClose} aria-label="Close dialog" className="w-8 h-8 rounded-full hover:bg-surface-container-low flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">close</span>
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </dialog>
  )
}
