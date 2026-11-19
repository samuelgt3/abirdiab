/**
 * Greyed-out preview of the card form, shown until card payments are switched on.
 * It is NOT a form: nothing can be typed or submitted, so no card details can be entered into it.
 * Once payments are enabled, Paymob's real form (PaymobPixel) replaces it.
 */
export default function CardPlaceholder({ labels }) {
  const box = 'flex h-11 items-center rounded-md border border-dashed border-green/25 bg-sand/60 px-3.5 text-[14px] text-ink/75';
  return (
    <div role="group" aria-label={labels.title} aria-disabled="true" className="mb-3 select-none rounded-lg border border-green/15 bg-cream p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold text-ink/70">{labels.title}</span>
        <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-[12px] font-semibold text-terracotta">{labels.soon}</span>
      </div>
      <div className="flex flex-col gap-2.5 opacity-80">
        <div className={box} dir="ltr"><span aria-hidden="true">•••• •••• •••• ••••</span><span className="sr-only">{labels.number}</span></div>
        <div className="grid grid-cols-2 gap-2.5" dir="ltr">
          <div className={box}><span aria-hidden="true">MM / YY</span><span className="sr-only">{labels.expiry}</span></div>
          <div className={box}><span aria-hidden="true">CVV</span><span className="sr-only">{labels.cvv}</span></div>
        </div>
        <div className={box}>{labels.name}</div>
      </div>
    </div>
  );
}
