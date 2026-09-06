export function coursePriceLabel(course, L) {
  return course.free ? L.courses.free : `$${course.price}`;
}

export function courseDownloadLabel(course, L) {
  return course.downloadable ? L.courses.download : L.courses.portalOnly;
}

/** Based on the raw (untranslated) `type` field, which is stable across
 * languages — the localized display string is a separate, translated value. */
export function courseKind(rawType) {
  return {
    isPdf: rawType === 'PDF',
    isAudio: rawType === 'Audio',
    isPhoto: rawType !== 'PDF' && rawType !== 'Audio',
  };
}
