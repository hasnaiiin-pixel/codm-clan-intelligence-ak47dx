import { useEffect, useState } from 'react';

function getMobileState() {
  if (typeof window === 'undefined') {
    return { isMobile: false, isStandalone: false, isPwaMobile: false };
  }

  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  const isMobile =
    window.matchMedia?.('(max-width: 820px)').matches ||
    /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);

  return { isMobile, isStandalone, isPwaMobile: isMobile || isStandalone };
}

export function useCodmMobile() {
  const [state, setState] = useState(getMobileState);

  useEffect(() => {
    const refresh = () => setState(getMobileState());
    const media = window.matchMedia?.('(max-width: 820px)');

    media?.addEventListener?.('change', refresh);
    window.addEventListener('resize', refresh);

    return () => {
      media?.removeEventListener?.('change', refresh);
      window.removeEventListener('resize', refresh);
    };
  }, []);

  return state;
}
