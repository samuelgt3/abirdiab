import { useState } from 'react';
import { giftUrl } from '../../lib/orders.js';
import Empty from './Empty.jsx';

/** Gifts the customer has sent, with the share link of each unclaimed one. */
export default function GiftsTab({ p, a, lang, data }) {
  const { gifts } = data;
  const [copied, setCopied] = useState('');
  if (gifts === null) return <p className="text-ink/75">…</p>;
  if (gifts.length === 0) return <Empty title={p.empty.gifts} lead={p.empty.giftsLead} />;
  return (
    <div className="flex flex-col gap-4">
      {gifts.map((x) => {
        const url = giftUrl(x.token);
        const state = x.redeemed ? a.giftClaimed : a.giftOpen; // only paid gifts are ever listed
        return (
          <article key={x.token} className="rounded-xl border border-green/15 bg-cream p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="m-0 font-serif text-[1.15rem] font-normal text-ink">{(lang === 'ar' && x.title_ar) || x.title}</h3>
              <span className={`rounded-full border px-2.5 py-0.5 text-xs ${x.redeemed ? 'border-green/30 bg-green/10 text-green' : 'border-accent/50 bg-accent/15 text-terracotta'}`}>{state}</span>
            </div>
            <p className="mb-3 mt-1 text-[13.5px] text-ink/75">
              {x.mode === 'direct' ? `${a.giftToName.replace('{name}', x.recipient_name || '')} · ${x.recipient_email || ''}` : a.giftToCard}
            </p>
            {!x.redeemed && (
              <div className="flex flex-wrap items-center gap-2">
                <code dir="ltr" className="min-w-0 flex-1 truncate rounded bg-sand px-2.5 py-2 text-[12.5px]">{url}</code>
                <button type="button" className="btn-outline !px-4 !py-2 !text-[13.5px]"
                  onClick={() => navigator.clipboard?.writeText(url).then(() => { setCopied(x.token); setTimeout(() => setCopied(''), 2000); }).catch(() => {})}>
                  {copied === x.token ? '✓' : (lang === 'ar' ? 'نسخ الرابط' : 'Copy link')}
                </button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
