import policies from '../content/policies.json';
import Layout, { BackLink } from '../components/Layout.jsx';
import { useSite } from '../hooks/SiteContext.jsx';
import { whatsapp } from '../lib/links.js';

export default function PolicyPage({ kind }) {
  const { lang, u } = useSite();
  const p = policies[kind][lang];
  return (
    <Layout>
      <article className="mx-auto max-w-3xl px-5 pb-24 pt-10 md:px-8">
        <BackLink to="/" label={u.home} />
        <div className="kicker mb-2 mt-6">{p.kicker}</div>
        <h1 className="mb-2 font-serif text-4xl font-normal">{p.title}</h1>
        <p className="mb-6 text-sm text-ink/75">{p.updated}</p>
        <p className="mb-8 text-lg leading-relaxed">{p.intro}</p>
        {p.sections.map((s) => (
          <section key={s.h} className="mb-6">
            <h2 className="mb-1 font-serif text-2xl font-normal text-green">{s.h}</h2>
            <p className="leading-relaxed text-ink/80">{s.p}</p>
          </section>
        ))}
        <p className="mt-8 rounded-md bg-sand p-5">
          {p.contactLine} <a href={whatsapp()} target="_blank" rel="noopener">WhatsApp</a>
        </p>
      </article>
    </Layout>
  );
}
