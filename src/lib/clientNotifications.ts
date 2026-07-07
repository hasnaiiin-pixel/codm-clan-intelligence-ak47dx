'use client';

import { useCallback, useEffect, useState } from 'react';
import { getEphemeralValue, setEphemeralValue } from './ephemeralStore';

export type CodmLocalNotification = {
  id: string;
  type: 'event' | 'reminder' | 'match' | 'admin' | 'system';
  title: string;
  body?: string;
  href?: string;
  readAt?: string | null;
  createdAt: string;
};

export const CODM_LOCAL_NOTIFICATIONS_KEY = 'codm_pwa_notifications_v7_0';
export const CODM_NOTIFICATION_EVENT = 'codm-notifications-changed';

export function loadLocalNotifications(): CodmLocalNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = getEphemeralValue<string>(CODM_LOCAL_NOTIFICATIONS_KEY, '[]');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.id && item.title) : [];
  } catch {
    return [];
  }
}

export function saveLocalNotifications(items: CodmLocalNotification[]) {
  if (typeof window === 'undefined') return;
  try {
    const ordered = items
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 120);
    setEphemeralValue(CODM_LOCAL_NOTIFICATIONS_KEY, JSON.stringify(ordered));
    window.dispatchEvent(new CustomEvent(CODM_NOTIFICATION_EVENT));
    void setCodmAppBadge(unreadLocalNotifications(ordered));
  } catch {
    // Il badge non deve mai bloccare l'app.
  }
}

export function unreadLocalNotifications(items = loadLocalNotifications()) {
  return items.filter((item) => !item.readAt).length;
}

export function pushLocalNotification(input: Omit<CodmLocalNotification, 'id' | 'createdAt' | 'readAt'> & { id?: string; createdAt?: string }) {
  const item: CodmLocalNotification = {
    id: input.id || `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    title: input.title,
    body: input.body || '',
    href: input.href || '/notifications',
    readAt: null,
    createdAt: input.createdAt || new Date().toISOString(),
  };
  const next = [item, ...loadLocalNotifications().filter((row) => row.id !== item.id)];
  saveLocalNotifications(next);
  void showBrowserNotification(item);
  return item;
}

export function markLocalNotificationRead(id: string) {
  const next = loadLocalNotifications().map((item) => item.id === id ? { ...item, readAt: item.readAt || new Date().toISOString() } : item);
  saveLocalNotifications(next);
}

export function markAllLocalNotificationsRead() {
  const now = new Date().toISOString();
  saveLocalNotifications(loadLocalNotifications().map((item) => ({ ...item, readAt: item.readAt || now })));
}

export function clearLocalNotifications() {
  saveLocalNotifications([]);
}

export async function setCodmAppBadge(count = unreadLocalNotifications()) {
  if (typeof navigator === 'undefined') return;
  try {
    const nav = navigator as Navigator & { setAppBadge?: (contents?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (count > 0 && typeof nav.setAppBadge === 'function') await nav.setAppBadge(count);
    if (count <= 0 && typeof nav.clearAppBadge === 'function') await nav.clearAppBadge();
  } catch {
    // API non supportata o permesso non disponibile.
  }
}

export async function requestCodmNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported' as const;
  if (Notification.permission === 'granted') return 'granted' as const;
  if (Notification.permission === 'denied') return 'denied' as const;
  return await Notification.requestPermission();
}

async function showBrowserNotification(item: CodmLocalNotification) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    const registration = await navigator.serviceWorker?.getRegistration?.();
    if (registration?.showNotification) {
      await registration.showNotification(item.title, {
        body: item.body || 'Apri CLAN MANAGER per i dettagli.',
        icon: '/assets/mirza-app-icon-192.png',
        badge: '/assets/mirza-app-icon-192.png',
        data: { url: item.href || '/notifications' },
        tag: item.id,
      });
    } else {
      new Notification(item.title, { body: item.body || '', icon: '/assets/mirza-app-icon-192.png' });
    }
  } catch {
    // Non bloccare mai flusso evento.
  }
}

export function useLocalNotificationBadge() {
  const [count, setCount] = useState(0);
  const refresh = useCallback(() => {
    const unread = unreadLocalNotifications();
    setCount(unread);
    void setCodmAppBadge(unread);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(CODM_NOTIFICATION_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(CODM_NOTIFICATION_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);

  return { count, refresh };
}
