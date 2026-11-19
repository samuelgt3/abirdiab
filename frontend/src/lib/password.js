/** A new password needs 8+ characters with at least one letter and one number. Returns true when it is acceptable. */
export const strongEnough = (pw) => String(pw || '').length >= 8 && /[A-Za-z\u0600-\u06FF]/.test(pw) && /\d/.test(pw);
