export type TelegramResult = { ok: boolean; skipped?: boolean; error?: string; telegramMessageId?: number | null };

function env(name: string) {
  return String(process.env[name] || '').trim();
}

export function telegramConfigured() {
  return Boolean(env('TELEGRAM_BOT_TOKEN') && env('TELEGRAM_CHAT_ID'));
}

export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendTelegramHtml(text: string): Promise<TelegramResult> {
  const token = env('TELEGRAM_BOT_TOKEN');
  const chatId = env('TELEGRAM_CHAT_ID');
  if (!token || !chatId) return { ok: false, skipped: true, error: 'TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID mancanti.' };
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.ok) {
      return { ok: false, error: json?.description || `Telegram HTTP ${response.status}` };
    }
    return { ok: true, telegramMessageId: json.result?.message_id ?? null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Errore invio Telegram.' };
  }
}

function formatDate(value: unknown) {
  const date = new Date(String(value || ''));
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Rome' });
}

function teamBName(event: any) {
  return event?.event_plan?.teamBName || event?.event_plan?.opponentName || 'Clan avversario';
}

export async function sendTelegramEventLifecycle(mode: 'created' | 'updated' | 'deleted' | 'result', event: any): Promise<TelegramResult> {
  if (mode !== 'deleted' && event?.telegram_enabled === false) return { ok: true, skipped: true };
  const icon = mode === 'created' ? '🆕' : mode === 'updated' ? '✏️' : mode === 'deleted' ? '🗑️' : '🏆';
  const label = mode === 'created' ? 'Nuovo evento creato' : mode === 'updated' ? 'Evento modificato' : mode === 'deleted' ? 'Evento cancellato' : 'Risultato evento aggiornato';
  const title = escapeHtml(event?.title || 'Evento CODM');
  const opponent = escapeHtml(teamBName(event));
  const date = escapeHtml(formatDate(event?.starts_at));
  const location = escapeHtml(event?.location || 'CODM');
  const text = `${icon} <b>Clan Manager AK47DX</b>\n\n<b>${escapeHtml(label)}</b>\n${title}\n🆚 ${opponent}\n🕒 ${date}\n📍 ${location}`;
  return sendTelegramHtml(text);
}
