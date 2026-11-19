/** A calm "nothing here yet" with one clear next step. */
export default function Empty({ title, lead, children }) {
  return (
    <div className="rounded-2xl border border-dashed border-green/25 bg-white/60 px-6 py-12 text-center">
      <div className="mb-1 font-serif text-[1.3rem] text-ink">{title}</div>
      <p className="mx-auto mb-5 mt-0 max-w-sm text-[14.5px] leading-relaxed text-ink/75">{lead}</p>
      {children}
    </div>
  );
}
