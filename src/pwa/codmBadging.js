export async function setCodmAppBadge(count) {
  const safeCount = Number.isFinite(Number(count)) ? Math.max(0, Number(count)) : 0;

  try {
    if (safeCount > 0 && 'setAppBadge' in navigator) {
      await navigator.setAppBadge(safeCount);
      return true;
    }

    if (safeCount === 0 && 'clearAppBadge' in navigator) {
      await navigator.clearAppBadge();
      return true;
    }
  } catch (error) {
    console.warn('[CODM PWA] Badge icona non disponibile:', error);
  }

  return false;
}

export function updateCodmNotificationBadges(count) {
  const safeCount = Number.isFinite(Number(count)) ? Math.max(0, Number(count)) : 0;
  setCodmAppBadge(safeCount);
  window.dispatchEvent(new CustomEvent('codm:badge-updated', { detail: { count: safeCount } }));
}
