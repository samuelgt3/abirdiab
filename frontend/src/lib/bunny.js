/** Bunny Stream embed address. When the server sends a signed token the link stops working after it expires. */
export function bunnyEmbedUrl(library, videoId, token, expires) {
  if (!library || !videoId) return null;
  const base = `https://iframe.mediadelivery.net/embed/${library}/${videoId}`;
  return token && expires ? `${base}?token=${encodeURIComponent(token)}&expires=${encodeURIComponent(expires)}` : base;
}
