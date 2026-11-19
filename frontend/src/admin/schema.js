/**
 * What the client can manage. One entry per database table.
 * Field types: text | textarea | number | checkbox | select | datetime | lines | file | pack
 * `ar` = key of the Arabic twin (rendered on the right, right-to-left).
 * `optional: true` = column added by a later migration; the field is only shown when the column exists.
 */
export const SECTIONS = {
  meditation_samples: {
    label: 'Guided meditations', folder: 'meditations',
    note: 'The voices on the home page "Guided Audio" section. Upload a short audio clip for each one: visitors press it and listen right there. To delete a clip, open the item, press Remove next to the audio, then Save: the file is deleted too.',
    title: (r) => r.title,
    sub: (r) => [r.duration, r.audio_url ? 'Voice uploaded' : 'No audio yet'].filter(Boolean).join(' · '),
    defaults: {},
    fields: [
      { key: 'title', ar: 'title_ar', label: 'Title', type: 'text', required: true },
      { key: 'note', ar: 'note_ar', label: 'Short description (e.g. Weekly reset meditation)', type: 'text' },
      { key: 'duration', ar: 'duration_ar', label: 'Length (e.g. 2 min)', type: 'text' },
      { key: 'audio_url', label: 'Audio (MP3 or similar) — played on the home page', type: 'file', accept: 'audio/*' },
      { key: 'sort_order', label: 'Order (smaller shows first)', type: 'number' },
      { key: 'published', label: 'Visible on the website', type: 'checkbox' },
    ],
  },
  testimonials: {
    label: 'Testimonials', folder: 'testimonials',
    note: 'Client words shown on the site. "Kind" decides where it appears: written quote, voice note (use the quote box for the transcript) or screenshot.',
    title: (r) => r.name,
    sub: (r) => [r.kind, r.role].filter(Boolean).join(' · '),
    defaults: { kind: 'written' },
    fields: [
      { key: 'kind', label: 'Kind', type: 'select', options: ['written', 'voice', 'screenshot'] },
      { key: 'name', ar: 'name_ar', label: 'Name', type: 'text', required: true },
      { key: 'role', ar: 'role_ar', label: 'Service (e.g. 1:1 Sessions)', type: 'text' },
      { key: 'quote', ar: 'quote_ar', label: 'Quote / transcript', type: 'textarea' },
      { key: 'summary', ar: 'summary_ar', label: 'Short summary (voice notes)', type: 'text' },
      { key: 'via', ar: 'via_ar', label: 'Received via (screenshots, e.g. WhatsApp message)', type: 'text' },
      { key: 'audio_url', label: 'Voice note audio', type: 'file', accept: 'audio/*' },
      { key: 'image_url', label: 'Screenshot image (English)', type: 'file', accept: 'image/*' },
      { key: 'image_url_ar', label: 'Screenshot image (Arabic)', type: 'file', accept: 'image/*' },
      { key: 'sort_order', label: 'Order (smaller shows first)', type: 'number' },
      { key: 'published', label: 'Visible on the website', type: 'checkbox' },
    ],
  },
  courses: {
    label: 'Courses & materials', folder: 'courses',
    note: 'Meditations (Audio), video courses (Video) and manuals (PDF). Prices are in US dollars; the site converts them for each visitor.',
    title: (r) => r.title,
    sub: (r) => [r.type, r.is_free ? 'Free' : `$${r.price_usd}`].filter(Boolean).join(' · '),
    defaults: { type: 'Audio', price_usd: 0 },
    fields: [
      { key: 'type', label: 'Type', type: 'select', options: ['Audio', 'Video', 'PDF'] },
      { key: 'category', ar: 'category_ar', label: 'Category label', type: 'text' },
      { key: 'title', ar: 'title_ar', label: 'Title', type: 'text', required: true },
      { key: 'description', ar: 'description_ar', label: 'Short description', type: 'textarea' },
      { key: 'full_description', ar: 'full_description_ar', label: 'Full description', type: 'textarea' },
      { key: 'meta', ar: 'meta_ar', label: 'Length (e.g. 22 min)', type: 'text' },
      { key: 'badge', ar: 'badge_ar', label: 'Badge (e.g. 2 min taster)', type: 'text' },
      { key: 'what_you_get', ar: 'what_you_get_ar', label: 'What you get (one per line)', type: 'lines' },
      { key: 'price_usd', label: 'Price in USD', type: 'number', step: '0.01' },
      { key: 'is_free', label: 'This item is free', type: 'checkbox' },
      { key: 'downloadable', label: 'Can be downloaded', type: 'checkbox' },
      { key: 'image_url', label: 'Cover image', type: 'file', accept: 'image/*' },
      {
        key: 'pack_items', ar: 'pack_items_ar', label: 'Pack contents — one item per line:  a|v|p | title | length | description',
        arLabel: 'Pack contents (Arabic) — same order:  title | length | description', type: 'pack', optional: true,
      },
      { key: 'has_teaser', label: 'Has a free preview (teaser)', type: 'checkbox', optional: true },
      { key: 'sort_order', label: 'Order (smaller shows first)', type: 'number' },
      { key: 'published', label: 'Visible on the website', type: 'checkbox' },
    ],
  },
  workshops: {
    label: 'Workshops', folder: 'workshops',
    note: "Live workshops. The date and time use your computer's time zone; also fill the text time label, which is what visitors read. Past workshops disappear from the site automatically. Leave the date empty to post a workshop as Coming soon (it shows on the site but cannot be booked until you add a date).",
    title: (r) => r.title,
    sub: (r) => [
      r.starts_at ? new Date(r.starts_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date',
      `$${r.price_usd}`, r.spots > 0 ? `${r.spots} seats` : 'no seat limit',
    ].join(' · '),
    defaults: { spots: 0, price_usd: 0 },
    fields: [
      { key: 'title', ar: 'title_ar', label: 'Title', type: 'text', required: true },
      { key: 'starts_at', label: 'Date and time', type: 'datetime' },
      { key: 'time_label', ar: 'time_label_ar', label: 'Time label (e.g. 19:00 GST)', type: 'text' },
      { key: 'spots', label: 'Number of seats (real capacity)', type: 'number', hint: 'Buying counts down from this and the workshop shows Sold out at 0. Visitors see one fifth of the real number (50 seats shows "10 spots open") so the room never looks empty. Use 0 for no limit.' },
      { key: 'price_usd', label: 'Seat price in USD', type: 'number', step: '0.01' },
      { key: 'format', ar: 'format_ar', label: 'Format', type: 'text' },
      { key: 'duration', ar: 'duration_ar', label: 'Total duration', type: 'text' },
      { key: 'overview', ar: 'overview_ar', label: 'Overview', type: 'textarea' },
      { key: 'sort_order', label: 'Order (smaller shows first)', type: 'number' },
      { key: 'published', label: 'Visible on the website', type: 'checkbox' },
    ],
  },
  journal_posts: {
    label: 'Journal', folder: 'journal',
    note: 'Blog posts. Leave a blank line between paragraphs in the article text.',
    title: (r) => r.title,
    sub: (r) => [r.category, r.read_time].filter(Boolean).join(' · '),
    defaults: {},
    fields: [
      { key: 'title', ar: 'title_ar', label: 'Title', type: 'text', required: true },
      { key: 'category', ar: 'category_ar', label: 'Category', type: 'text' },
      { key: 'read_time', ar: 'read_time_ar', label: 'Reading time (e.g. 6 min read)', type: 'text' },
      { key: 'excerpt', ar: 'excerpt_ar', label: 'Short excerpt', type: 'textarea' },
      { key: 'body', ar: 'body_ar', label: 'Article text', type: 'textarea', tall: true },
      { key: 'image_url', label: 'Image', type: 'file', accept: 'image/*' },
      { key: 'sort_order', label: 'Order (smaller shows first)', type: 'number' },
      { key: 'published', label: 'Visible on the website', type: 'checkbox' },
    ],
  },
};

// ------------------------------------------------------------------ pack contents <-> text
const KINDS = ['a', 'v', 'p'];

/** items -> two text blocks (English with kind, Arabic without) */
export function packToText(items) {
  const arr = Array.isArray(items) ? items : [];
  return {
    en: arr.map((i) => [i.kind, i.title, i.length, i.description].map((x) => x ?? '').join(' | ')).join('\n'),
    ar: arr.map((i) => [i.title_ar, i.length_ar, i.description_ar].map((x) => x ?? '').join(' | ')).join('\n'),
  };
}

/** two text blocks -> items. Throws Error with a line number on bad input. */
export function textToPack(enText, arText) {
  const en = String(enText || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const ar = String(arText || '').split('\n').map((l) => l.trim());
  return en.map((line, i) => {
    const [kind, title, length = '', ...rest] = line.split('|').map((x) => x.trim());
    if (!KINDS.includes(kind)) throw new Error(`Pack line ${i + 1}: start with a, v or p (audio, video, PDF).`);
    if (!title) throw new Error(`Pack line ${i + 1}: the title is missing.`);
    const [tAr = '', lAr = '', ...rAr] = (ar[i] || '').split('|').map((x) => x.trim());
    return {
      kind, title, length, description: rest.join(' | '),
      title_ar: tAr, length_ar: lAr, description_ar: rAr.join(' | '),
    };
  });
}
