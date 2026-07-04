export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEPLOY_VERSION = 'CODM_AUTH_ROLE_MOBILE_UPDATE_VISIBLE_FIX_2026_07_04';
const PATCH_NAME = 'Auth roles + mobile sidebar + visible version check';

export default function VersionPage() {
  const buildTime = new Date().toISOString();

  return (
    <main className="min-h-screen bg-[#09090f] text-white px-5 py-8">
      <section className="mx-auto max-w-3xl rounded-3xl border border-red-500/30 bg-black/40 p-6 shadow-2xl shadow-red-950/30">
        <p className="text-xs uppercase tracking-[0.35em] text-red-300">AK47DX CODM</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Deploy version check</h1>
        <p className="mt-3 text-zinc-300">
          Se vedi questa pagina, Vercel sta servendo la versione aggiornata del progetto.
        </p>

        <div className="mt-6 grid gap-3 text-sm">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="text-zinc-500">Versione</div>
            <div className="mt-1 break-all font-mono text-red-200">{DEPLOY_VERSION}</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="text-zinc-500">Patch</div>
            <div className="mt-1 text-zinc-100">{PATCH_NAME}</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="text-zinc-500">Build render time</div>
            <div className="mt-1 font-mono text-zinc-100">{buildTime}</div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a className="rounded-2xl bg-red-600 px-5 py-3 text-center font-bold text-white hover:bg-red-500" href="/cache-reset">
            Apri reset cache / PWA
          </a>
          <a className="rounded-2xl border border-zinc-700 px-5 py-3 text-center font-bold text-zinc-100 hover:bg-zinc-900" href="/dashboard">
            Torna alla dashboard
          </a>
        </div>
      </section>
    </main>
  );
}
