import { useEffect, useRef } from 'react';

/** Accessible dialog: Esc closes, focus moves in, page scroll is locked. */
export default function Modal({ open, onClose, title, children, wide = false, closeLabel = 'Close' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 p-0 md:items-center md:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative max-h-[calc(var(--vh)*88)] w-full overflow-auto rounded-t-2xl bg-cream p-5 shadow-2xl outline-none md:rounded-xl md:p-7 ${wide ? 'max-w-3xl' : 'max-w-[34rem]'}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="absolute end-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-2xl text-ink/70 hover:bg-sand"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
