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
    const targetParam = request.nextUrl.searchParams.get("target");
    const target =
      targetParam === "group" || targetParam === "private" ? targetParam : "all";
    const result = await sendTelegramHtml(
      `✅ <b>AK47DX Telegram collegato</b>\nTest manuale riuscito.\nTarget richiesto: <b>${target}</b>.\nSe target=group deve apparire nel gruppo Telegram del clan.\n🕒 ${now}`,
      { target },
    );
    return NextResponse.json({
      ok: result.ok,
      route: "/api/telegram/test",
      target,
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
