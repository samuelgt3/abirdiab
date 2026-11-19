import { useEffect, useState } from 'react';

/** The current time, refreshed every 30 seconds, so buttons that open at a set time unlock by themselves. */
export function useNow(everyMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}
