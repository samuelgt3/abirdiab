import { Link } from 'react-router-dom';
import { useSite } from '../hooks/SiteContext.jsx';
import { assetUrl } from '../lib/content.js';
import { coursePath } from '../lib/slug.js';
import { PlayIcon } from './Icons.jsx';

/** Cover image in the design's shape: photo (video), arch (audio), folded page (PDF). */
export function CourseCover({ course, className = '' }) {
  const src = assetUrl(course.image_url);
  if (!src) return <div className={`bg-[#DCE7E1] ${className}`} />;
  if (course.type === 'Audio') {
    return (
      <div className={`flex flex-col items-center bg-[#DCE7E1] ${className}`}>
        <div className="mt-3 w-[56%] flex-1 overflow-hidden" style={{ borderRadius: '50% 50% 40% 40% / 55% 55% 30% 30%' }}>
          <img loading="lazy" src={src} alt="" className="h-full w-full object-cover" />
        </div>
      </div>
    );
  }
  if (course.type === 'PDF') {
    return (
      <div className={`relative bg-[#DCE7E1] ${className}`}>
        <div className="absolute inset-2.5 shadow-md" style={{ clipPath: 'polygon(0 0,78% 0,100% 16%,100% 100%,0 100%)' }}>
          <img loading="lazy" src={src} alt="" className="h-full w-full object-cover" />
          <div className="absolute end-0 top-0 h-[16%] w-[22%] bg-cream/80" style={{ clipPath: 'polygon(0 0,100% 100%,0 100%)' }} />
        </div>
      </div>
    );
  }
  return (
    <div className={`overflow-hidden bg-[#DCE7E1] ${className}`}>
      <img loading="lazy" src={src} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
    </div>
  );
}

/** variant "home": larger, description shown, outlined button. "lms": compact catalogue card, solid button. */
export default function CourseCard({ course: x, variant = 'home' }) {
  const { t, u, pick, price, kindLabel } = useSite();
  const c = t.courses;
  const home = variant === 'home';
  const Tag = home ? 'h3' : 'h2'; // cards on their own page sit directly under the page title (h1)
  const count = x.pack_items?.length || 0;
  const priceLabel = x.is_free || !x.price_usd ? c.free : price(x.price_usd);

  return (
    <Link to={coursePath(x)} className="lib-card group !text-ink no-underline">
      <div className={`relative ${home ? 'h-[150px] sm:h-[210px]' : 'h-[124px] sm:h-[140px]'}`}>
        <CourseCover course={x} className="absolute inset-0" />
        {x.badge && (
          <span title={pick(x, 'badge')}
            className="absolute start-2.5 top-2.5 max-w-[calc(50%-14px)] truncate rounded-full bg-cream px-2 py-[3px] text-[12px] font-semibold leading-tight text-green">
            {pick(x, 'badge')}
          </span>
        )}
        <span className="absolute end-2.5 top-2.5 rounded-full bg-green px-2.5 py-1 text-[12px] font-semibold leading-tight text-cream">{kindLabel(x.type)}</span>
        {x.has_teaser && (
          <span className={`absolute flex items-center justify-center rounded-full bg-cream/95 text-green shadow ${home ? 'left-1/2 top-1/2 h-[46px] w-[46px] -translate-x-1/2 -translate-y-1/2' : 'bottom-2.5 end-2.5 h-[38px] w-[38px]'}`}>
            <PlayIcon size={home ? 16 : 13} />
          </span>
        )}
        {home && count > 0 && (
          <span className="absolute bottom-2.5 start-2.5 rounded-full bg-ink/70 px-2.5 py-1 text-[12px] text-cream">{count} {u.items}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col px-3 pb-[18px] pt-3.5 sm:px-4">
        <div className="mb-1.5 text-[12px] uppercase tracking-[.03em] text-terracotta">{pick(x, 'category')}</div>
        <Tag className={`mb-2 font-serif leading-[1.3] text-ink ${home ? 'text-[16px] sm:text-[20px]' : 'text-[15px] sm:text-[16.5px]'}`}>{pick(x, 'title')}</Tag>
        {home && <p className="mb-2.5 hidden text-[13.5px] leading-normal text-ink/70 sm:line-clamp-2">{pick(x, 'description')}</p>}
        <div className="mb-2.5 mt-auto flex items-center justify-between gap-2.5">
          {!home && <span className="text-xs text-ink/75">{count > 0 ? `${count} ${u.items}` : pick(x, 'meta')}</span>}
          <span className="font-serif text-[17px] text-green">{priceLabel}</span>
        </div>
        <span className={`mx-auto mt-1.5 block w-[88%] rounded-md px-3 py-[11px] text-center text-[12.5px] font-semibold transition sm:text-[13px] ${home ? 'border border-green text-green group-hover:bg-green group-hover:text-cream' : 'bg-green text-cream group-hover:bg-[#0D2E27]'}`}>
          {c.discover}
        </span>
      </div>
    </Link>
  );
}
