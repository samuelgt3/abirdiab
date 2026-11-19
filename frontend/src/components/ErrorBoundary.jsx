import { Component } from 'react';

const COPY = {
  en: { h: 'Something went wrong', p: 'The page ran into a problem. Please reload it. If it keeps happening, tell us and we will fix it.', b: 'Reload the page' },
  ar: { h: 'حدث خطأ ما', p: 'واجهت الصفحة مشكلة. يُرجى إعادة تحميلها. وإن تكرر الأمر فأخبرونا لنُصلحه.', b: 'إعادة تحميل الصفحة' },
};

/** Catches a crash anywhere below it and shows a friendly page instead of a blank white screen. */
export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error) { console.error('[page crashed]', error); }

  render() {
    if (!this.state.failed) return this.props.children;
    let lang = 'en';
    try { lang = localStorage.getItem('abir_lang') === 'ar' ? 'ar' : 'en'; } catch { /* ignore */ }
    const c = COPY[lang];
    return (
      <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="mx-auto max-w-[520px] px-5 py-24 text-center" role="alert">
        <h1 className="mb-3 font-serif text-[2rem] font-normal text-ink">{c.h}</h1>
        <p className="mb-6 text-[16px] text-ink/75">{c.p}</p>
        <button type="button" className="btn-solid" onClick={() => window.location.reload()}>{c.b}</button>
      </div>
    );
  }
}
