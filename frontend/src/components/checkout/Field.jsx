/** Labelled input with an inline error message (shared by checkout and story forms). */
export default function Field({ id, label, error, hint, children, className = '' }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-ink/80">{label}</label>
      {children}
      {error ? (
        <p id={`${id}-err`} role="alert" className="mt-1.5 text-[13px] text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[12.5px] text-ink/75">{hint}</p>
      ) : null}
    </div>
  );
}

export const inputCls = (bad) =>
  `w-full rounded-md border bg-white px-3.5 py-3 text-[15px] text-ink outline-none transition focus:border-green ${bad ? 'border-danger' : 'border-green/25'}`;
