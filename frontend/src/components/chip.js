/** One size for every filter button on the site (small, pill-shaped). accent = the orange variant (e.g. "Free"). */
export const chipCls = (on, accent = false) =>
  `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] leading-none transition max-md:min-h-[44px] ${
    accent
      ? on ? 'border-accent bg-accent font-semibold text-ink' : 'border-accent/70 text-terracotta hover:bg-accent/10'
      : on ? 'border-green bg-green font-semibold text-cream' : 'border-green/35 text-green hover:bg-green/5'}`;
