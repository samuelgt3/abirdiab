export default function Section({ id, kicker, title, lead, tone = 'cream', center = false, children }) {
  const bg = tone === 'sand' ? 'bg-sand' : tone === 'green' ? 'bg-green text-cream' : 'bg-cream';
  return (
    <section id={id} className={`section-pad scroll-mt-16 ${bg}`}>
      <div className="container-x">
        {(kicker || title) && (
          <header className={`mb-10 ${center ? 'text-center' : ''}`}>
            {kicker && <div className="kicker mb-3">{kicker}</div>}
            {title && <h2 className="h2">{title}</h2>}
            {lead && (
              <p className={`mt-4 max-w-2xl text-[17px] leading-relaxed text-ink/70 ${center ? 'mx-auto' : ''}`}>{lead}</p>
            )}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}
