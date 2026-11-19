import { chipCls } from '../../components/chip.js';

/**
 * The filter row used on every account tab: filter buttons (with counts), a search box, and an optional sort menu.
 * chips = [{ key, label, count }]   select = { label, value, onChange, options: [{ key, label }] }  (sort order, or a type)
 */
export default function FilterBar({ label, chips, value, onChange, q, onQ, searchLabel, select }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={label}>
        {chips.map((c) => (
          <button key={c.key} type="button" aria-pressed={value === c.key} onClick={() => onChange(c.key)} className={chipCls(value === c.key)}>
            {c.label} <span className="opacity-70">{c.count}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <input type="search" value={q} onChange={(e) => onQ(e.target.value)} placeholder={searchLabel} aria-label={searchLabel}
          className="min-w-0 flex-1 basis-[220px] rounded-full border border-green/25 bg-white px-4 py-2 text-[14px] text-ink placeholder:text-ink/50 focus:border-green focus:outline-none" />
        {select && (
          <label className="flex items-center gap-2 text-[13px] text-ink/75">
            <span>{select.label}</span>
            <select value={select.value} onChange={(e) => select.onChange(e.target.value)} className="rounded-full border border-green/25 bg-white px-3 py-2 text-[13.5px] text-ink">
              {select.options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}
