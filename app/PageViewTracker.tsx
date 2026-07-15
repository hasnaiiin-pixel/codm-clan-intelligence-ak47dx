'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

const VISITOR_KEY = 'codm_visitor_id_v1';
const LAST_VIEW_KEY = 'codm_last_page_view_v1';

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function getVisitorId() {
  try {
    const saved = window.localStorage.getItem(VISITOR_KEY);
    if (saved) return saved;
    const created = randomId();
    window.localStorage.setItem(VISITOR_KEY, created);
    return created;
  } catch {
    return randomId();
  }
}

function deviceType() {
  const width = window.innerWidth;
  if (width <= 720) return 'mobile';
  if (width <= 1100) return 'tablet';
  return 'desktop';
}

function isStandalonePwa() {
  return window.matchMedia?.('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isSupabaseConfigured || !pathname) return;

    const now = Date.now();
    const dedupeValue = `${pathname}|${Math.floor(now / 15000)}`;
    try {
      if (window.sessionStorage.getItem(LAST_VIEW_KEY) === dedupeValue) return;
      window.sessionStorage.setItem(LAST_VIEW_KEY, dedupeValue);
    } catch {}

    const timer = window.setTimeout(async () => {
      try {
        const { data } = await supabase.auth.getSession();
        await supabase.from('site_page_views').insert({
          visitor_id: getVisitorId(),
          user_id: data.session?.user?.id || null,
          path: pathname,
          referrer: document.referrer || null,
          device_type: deviceType(),
          is_pwa: isStandalonePwa(),
          user_agent: navigator.userAgent.slice(0, 500),
        });
      } catch {
        // Analytics must never block navigation or the app.
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
