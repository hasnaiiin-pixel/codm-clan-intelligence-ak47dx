import { NextRequest, NextResponse } from "next/server";
import { sendTelegramHtml } from "@/lib/server/codmTelegram";

export async function GET(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    const given =
      request.nextUrl.searchParams.get("secret") ||
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (secret && given !== secret)
      return NextResponse.json(
        { ok: false, error: "Unauthorized cron secret." },
        { status: 401 },
      );
    const now = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" });
    const result = await sendTelegramHtml(
      `✅ <b>AK47DX Telegram collegato</b>\nTest manuale riuscito.\nQuesto messaggio viene inviato sia alla chat privata configurata sia al gruppo clan se TELEGRAM_GROUP_CHAT_ID è presente.\n🕒 ${now}`,
    );
    return NextResponse.json({
      ok: result.ok,
      route: "/api/telegram/test",
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Errore test Telegram.",
      },
      { status: 500 },
    );
  }
}
