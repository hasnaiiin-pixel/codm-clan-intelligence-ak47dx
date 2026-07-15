'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCodmAuth } from '@/lib/authRoles';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

type FundCycle = {
  id: string;
  clan_id: string;
  title: string;
  monthly_amount: number;
  currency: string;
  status: 'active' | 'completed' | 'archived';
  started_at: string;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
};

type FundPlayer = {
  id: string;
  nickname: string;
  user_id: string | null;
  clan_name: string | null;
};

type FundParticipant = {
  id: string;
  cycle_id: string;
  player_id: string;
  user_id: string | null;
  preferred_weapon: string | null;
  preferred_rarity: 'Leggendaria' | 'Mitica' | 'Indifferente';
  active: boolean;
  selected_at: string | null;
  selected_draw_id: string | null;
  players?: FundPlayer | null;
};

type FundContribution = {
  id: string;
  cycle_id: string;
  participant_id: string;
  contribution_month: string;
  amount: number;
  status: 'pending' | 'paid' | 'exempt';
  paid_at: string | null;
  notes: string | null;
};

type FundDraw = {
  id: string;
  cycle_id: string;
  draw_month: string;
  winner_participant_id: string;
  prize_type: string;
  preferred_weapon_snapshot: string | null;
  winner_name_snapshot: string;
  eligible_count: number;
  random_proof: string;
  drawn_at: string;
  notes: string | null;
};

function monthValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthDate(value: string) {
  return `${value}-01`;
}

function euro(value: number, currency = 'EUR') {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency }).format(Number(value || 0));
}

function secureRandomIndex(length: number) {
  if (length <= 1) return 0;
  const max = Math.floor(0x100000000 / length) * length;
  const array = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(array);
    value = array[0];
  } while (value >= max);
  return value % length;
}

function proofToken() {
  const array = new Uint32Array(4);
  crypto.getRandomValues(array);
  return Array.from(array).map((value) => value.toString(16).padStart(8, '0')).join('-');
}

export default function FundPage() {
  const auth = useCodmAuth();
  const [cycle, setCycle] = useState<FundCycle | null>(null);
  const [latestCycle, setLatestCycle] = useState<FundCycle | null>(null);
  const [players, setPlayers] = useState<FundPlayer[]>([]);
  const [participants, setParticipants] = useState<FundParticipant[]>([]);
  const [contributions, setContributions] = useState<FundContribution[]>([]);
  const [draws, setDraws] = useState<FundDraw[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(monthValue());
  const [prizeType, setPrizeType] = useState<'Leggendaria' | 'Mitica'>('Leggendaria');
  const [newTitle, setNewTitle] = useState(`Giro estrazioni ${new Date().getFullYear()}`);
  const [newAmount, setNewAmount] = useState('10');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);

  const canManage = auth.role === 'owner' || auth.role === 'coach' || auth.permissions.view_admin_panel || auth.permissions.manage_users;
  const myPlayer = useMemo(() => players.find((player) => player.user_id === auth.user?.id) || null, [players, auth.user?.id]);
  const myParticipant = useMemo(() => participants.find((item) => item.user_id === auth.user?.id || item.player_id === myPlayer?.id) || null, [participants, auth.user?.id, myPlayer?.id]);

  useEffect(() => {
    if (auth.loading || !auth.user || !auth.clanId || !isSupabaseConfigured) {
      if (!auth.loading) setLoading(false);
      return;
    }
    void loadAll();
  }, [auth.loading, auth.user?.id, auth.clanId]);

  async function loadAll() {
    if (!auth.clanId) return;
    setLoading(true);
    setMessage('');
    const [cycleResult, latestResult, playerResult] = await Promise.all([
      supabase.from('codm_fund_cycles').select('*').eq('clan_id', auth.clanId).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('codm_fund_cycles').select('*').eq('clan_id', auth.clanId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('players').select('id,nickname,user_id,clan_name').eq('clan_id', auth.clanId).order('nickname'),
    ]);
    const activeCycle = (cycleResult.data || null) as FundCycle | null;
    setCycle(activeCycle);
    setLatestCycle((latestResult.data || null) as FundCycle | null);
    setPlayers((playerResult.data || []) as FundPlayer[]);
    if (cycleResult.error && !/does not exist/i.test(cycleResult.error.message)) setMessage(cycleResult.error.message);
    if (!activeCycle) {
      setParticipants([]);
      setContributions([]);
      const historyCycleId = latestResult.data?.id;
      if (historyCycleId) {
        const { data } = await supabase.from('codm_fund_draws').select('*').eq('cycle_id', historyCycleId).order('drawn_at', { ascending: false });
        setDraws((data || []) as FundDraw[]);
      } else setDraws([]);
      setLoading(false);
      return;
    }
    const [participantResult, contributionResult, drawResult] = await Promise.all([
      supabase.from('codm_fund_participants').select('*, players(id,nickname,user_id,clan_name)').eq('cycle_id', activeCycle.id).order('created_at'),
      supabase.from('codm_fund_contributions').select('*').eq('cycle_id', activeCycle.id).order('contribution_month', { ascending: false }),
      supabase.from('codm_fund_draws').select('*').eq('cycle_id', activeCycle.id).order('drawn_at', { ascending: false }),
    ]);
    setParticipants((participantResult.data || []) as FundParticipant[]);
    setContributions((contributionResult.data || []) as FundContribution[]);
    setDraws((drawResult.data || []) as FundDraw[]);
    const firstError = participantResult.error || contributionResult.error || drawResult.error;
    if (firstError) setMessage(`${firstError.message}. Esegui lo SQL V13.11 incluso nella build.`);
    setLoading(false);
  }

  async function createCycle(clonePrevious = false) {
    if (!canManage || !auth.clanId || !auth.user) return;
    setMessage('');
    const amount = Number(newAmount.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage('Inserisci una quota mensile valida.');
      return;
    }
    const { data, error } = await supabase.from('codm_fund_cycles').insert({
      clan_id: auth.clanId,
      title: newTitle.trim() || 'Giro estrazioni clan',
      monthly_amount: amount,
      currency: 'EUR',
      status: 'active',
      started_at: new Date().toISOString(),
      created_by: auth.user.id,
      notes: 'Registro gestionale interno. Nessun pagamento viene elaborato dall’app.',
    }).select('*').single();
    if (error || !data) {
      setMessage(error?.message || 'Impossibile creare il giro.');
      return;
    }
    if (clonePrevious && latestCycle?.id) {
      const { data: oldParticipants } = await supabase
        .from('codm_fund_participants')
        .select('player_id,user_id,preferred_weapon,preferred_rarity,active')
        .eq('cycle_id', latestCycle.id)
        .eq('active', true);
      if (oldParticipants?.length) {
        await supabase.from('codm_fund_participants').insert(oldParticipants.map((item) => ({ ...item, cycle_id: data.id, selected_at: null, selected_draw_id: null })));
      }
    }
    setMessage('Nuovo giro creato.');
    await loadAll();
  }

  async function addParticipant(playerId = selectedPlayerId) {
    if (!cycle || !playerId) return;
    const player = players.find((item) => item.id === playerId);
    if (!player) return;
    const { error } = await supabase.from('codm_fund_participants').insert({
      cycle_id: cycle.id,
      player_id: player.id,
      user_id: player.user_id,
      preferred_weapon: '',
      preferred_rarity: 'Indifferente',
      active: true,
    });
    if (error) setMessage(error.message);
    else {
      setMessage(`${player.nickname} aggiunto al giro.`);
      setSelectedPlayerId('');
      await loadAll();
    }
  }

  async function joinMyself() {
    if (!myPlayer) {
      setMessage('Il tuo account deve essere associato a un player CODM prima di partecipare.');
      return;
    }
    await addParticipant(myPlayer.id);
  }

  async function updatePreference(participant: FundParticipant, weapon: string, rarity: FundParticipant['preferred_rarity']) {
    const allowed = canManage || participant.user_id === auth.user?.id || participant.player_id === myPlayer?.id;
    if (!allowed) return;
    const { error } = await supabase.from('codm_fund_participants').update({ preferred_weapon: weapon.trim(), preferred_rarity: rarity }).eq('id', participant.id);
    if (error) setMessage(error.message);
    else {
      setMessage('Preferenza arma aggiornata.');
      await loadAll();
    }
  }

  async function removeParticipant(participant: FundParticipant) {
    if (!canManage || !confirm(`Rimuovere ${participant.players?.nickname || 'il partecipante'} dal giro?`)) return;
    const { error } = await supabase.from('codm_fund_participants').delete().eq('id', participant.id);
    if (error) setMessage(error.message);
    else await loadAll();
  }

  function contributionFor(participantId: string) {
    return contributions.find((item) => item.participant_id === participantId && item.contribution_month.slice(0, 7) === selectedMonth);
  }

  async function setContribution(participant: FundParticipant, status: FundContribution['status']) {
    if (!canManage || !cycle) return;
    const existing = contributionFor(participant.id);
    const payload = {
      cycle_id: cycle.id,
      participant_id: participant.id,
      contribution_month: monthDate(selectedMonth),
      amount: cycle.monthly_amount,
      status,
      paid_at: status === 'paid' ? new Date().toISOString() : null,
    };
    const result = existing
      ? await supabase.from('codm_fund_contributions').update(payload).eq('id', existing.id)
      : await supabase.from('codm_fund_contributions').insert(payload);
    if (result.error) setMessage(result.error.message);
    else await loadAll();
  }

  async function drawWinner() {
    if (!canManage || !cycle || !auth.user) return;
    const eligible = participants.filter((participant) => {
      const contribution = contributionFor(participant.id);
      return participant.active && !participant.selected_at && (contribution?.status === 'paid' || contribution?.status === 'exempt');
    });
    if (!eligible.length) {
      setMessage('Nessun partecipante idoneo: devono risultare pagati/esenti e non ancora estratti nel giro.');
      return;
    }
    if (!confirm(`Eseguire l’estrazione ${prizeType} tra ${eligible.length} partecipanti idonei?`)) return;
    setDrawing(true);
    const winner = eligible[secureRandomIndex(eligible.length)];
    const proof = proofToken();
    const winnerName = winner.players?.nickname || 'Player';
    const { data: draw, error } = await supabase.from('codm_fund_draws').insert({
      cycle_id: cycle.id,
      draw_month: monthDate(selectedMonth),
      winner_participant_id: winner.id,
      prize_type: prizeType,
      preferred_weapon_snapshot: winner.preferred_weapon || null,
      winner_name_snapshot: winnerName,
      eligible_count: eligible.length,
      eligible_snapshot: eligible.map((item) => ({ id: item.id, player: item.players?.nickname || item.player_id })),
      random_proof: proof,
      drawn_by: auth.user.id,
      drawn_at: new Date().toISOString(),
    }).select('id').single();
    if (error || !draw) {
      setMessage(error?.message || 'Estrazione non salvata.');
      setDrawing(false);
      return;
    }
    await supabase.from('codm_fund_participants').update({ selected_at: new Date().toISOString(), selected_draw_id: draw.id }).eq('id', winner.id);
    const remaining = participants.filter((item) => item.active && !item.selected_at && item.id !== winner.id);
    if (!remaining.length) {
      await supabase.from('codm_fund_cycles').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', cycle.id);
    }
    setMessage(`🎉 Estratto: ${winnerName} · ${prizeType}${winner.preferred_weapon ? ` · arma preferita ${winner.preferred_weapon}` : ''}.`);
    setDrawing(false);
    await loadAll();
  }

  const paidParticipants = useMemo(() => participants.filter((item) => ['paid', 'exempt'].includes(contributionFor(item.id)?.status || '')).length, [participants, contributions, selectedMonth]);
  const selectedCount = useMemo(() => participants.filter((item) => item.selected_at).length, [participants]);
  const totalPool = paidParticipants * Number(cycle?.monthly_amount || 0);
  const availablePlayers = players.filter((player) => !participants.some((item) => item.player_id === player.id));

  if (auth.loading || loading) return <main className="container"><section className="card"><p>Caricamento fondo estrazioni...</p></section></main>;
  if (!auth.user) return <main className="container"><section className="card"><h1>Accesso richiesto</h1><p>Il fondo è visibile soltanto agli utenti registrati del clan.</p><a href="/login" className="btn">Login</a></section></main>;

  return (
    <main className="container wide fund-page-v1311">
      <section className="card hero-compact gaming-panel">
        <p className="eyebrow">💰 FONDO ESTRAZIONI CLAN</p>
        <h1>Quota mensile e turnazione Leggendaria/Mitica</h1>
        <p className="muted">L’app registra partecipanti, quote, arma preferita ed estrazioni. Non incassa, custodisce o trasferisce denaro: i pagamenti restano gestiti esternamente dagli amministratori.</p>
        {message && <div className="notice top-gap">{message}</div>}
      </section>

      {!cycle ? (
        <section className="card top-gap">
          <h2>{latestCycle?.status === 'completed' ? '✅ Giro completato' : 'Crea il primo giro'}</h2>
          {latestCycle && <p>Ultimo giro: <b>{latestCycle.title}</b> · {draws.length} estrazioni registrate.</p>}
          {canManage ? (
            <div className="grid grid-3 top-gap">
              <div className="field"><label>Nome giro</label><input className="input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} /></div>
              <div className="field"><label>Quota mensile (€)</label><input className="input" type="number" min="0.01" step="0.01" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} /></div>
              <div className="fund-create-actions-v1311">
                <button className="btn" type="button" onClick={() => void createCycle(false)}>Crea nuovo giro</button>
                {latestCycle && <button className="btn secondary" type="button" onClick={() => void createCycle(true)}>Nuovo giro con stessi partecipanti</button>}
              </div>
            </div>
          ) : <p className="muted">Attendi che Owner/Admin apra un nuovo giro.</p>}
        </section>
      ) : (
        <>
          <section className="grid grid-4 top-gap">
            <div className="kpi"><span>Partecipanti</span><strong>{participants.length}</strong></div>
            <div className="kpi"><span>Pagati {selectedMonth}</span><strong>{paidParticipants}</strong></div>
            <div className="kpi"><span>Fondo mese</span><strong>{euro(totalPool, cycle.currency)}</strong></div>
            <div className="kpi"><span>Già estratti nel giro</span><strong>{selectedCount}/{participants.length}</strong></div>
          </section>

          <section className="card top-gap">
            <div className="section-title">
              <div><h2>{cycle.title}</h2><p className="muted">Quota mensile: {euro(cycle.monthly_amount, cycle.currency)}. Chi è già stato estratto resta escluso fino al completamento del giro.</p></div>
              <input className="input fund-month-v1311" type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
            </div>
            {!myParticipant && myPlayer && <button className="btn top-gap" type="button" onClick={() => void joinMyself()}>Partecipa con {myPlayer.nickname}</button>}
            {!myPlayer && !canManage && <div className="notice warn top-gap">Il tuo account non è ancora associato a un player CODM. Chiedi all’admin di collegarlo.</div>}
            {canManage && (
              <div className="fund-add-player-v1311 top-gap">
                <select className="select" value={selectedPlayerId} onChange={(e) => setSelectedPlayerId(e.target.value)}>
                  <option value="">Seleziona player da aggiungere</option>
                  {availablePlayers.map((player) => <option key={player.id} value={player.id}>{player.nickname}{player.user_id ? ' · account collegato' : ''}</option>)}
                </select>
                <button className="btn secondary" type="button" disabled={!selectedPlayerId} onClick={() => void addParticipant()}>Aggiungi partecipante</button>
              </div>
            )}
          </section>

          <section className="card top-gap">
            <h2>Partecipanti e quote</h2>
            <div className="table-scroll"><table className="table compact fund-table-v1311"><thead><tr><th>Player</th><th>Arma preferita</th><th>Rarità</th><th>Quota {selectedMonth}</th><th>Turno</th><th>Azioni</th></tr></thead><tbody>
              {participants.map((participant) => {
                const contribution = contributionFor(participant.id);
                const editable = canManage || participant.user_id === auth.user?.id || participant.player_id === myPlayer?.id;
                return (
                  <ParticipantRow key={participant.id} participant={participant} contribution={contribution} editable={editable} canManage={canManage} amount={cycle.monthly_amount} currency={cycle.currency} onSave={updatePreference} onContribution={setContribution} onRemove={removeParticipant} />
                );
              })}
              {!participants.length && <tr><td colSpan={6}>Nessun partecipante inserito.</td></tr>}
            </tbody></table></div>
          </section>

          {canManage && (
            <section className="card top-gap fund-draw-panel-v1311">
              <h2>🎲 Estrazione mensile</h2>
              <p className="muted">Sono idonei solo i partecipanti con quota pagata/esente nel mese selezionato e non ancora estratti nel giro corrente.</p>
              <div className="fund-draw-actions-v1311">
                <select className="select" value={prizeType} onChange={(e) => setPrizeType(e.target.value as 'Leggendaria' | 'Mitica')}><option>Leggendaria</option><option>Mitica</option></select>
                <button className="btn" type="button" disabled={drawing} onClick={() => void drawWinner()}>{drawing ? 'Estrazione...' : `Estrai vincitore ${selectedMonth}`}</button>
              </div>
            </section>
          )}
        </>
      )}

      <section className="card top-gap">
        <h2>📜 Storico estrazioni</h2>
        <div className="table-scroll"><table className="table compact"><thead><tr><th>Data</th><th>Mese</th><th>Vincitore</th><th>Tipo</th><th>Arma preferita</th><th>Partecipanti idonei</th><th>Prova casuale</th></tr></thead><tbody>
          {draws.map((draw) => <tr key={draw.id}><td>{new Date(draw.drawn_at).toLocaleString('it-IT')}</td><td>{draw.draw_month.slice(0, 7)}</td><td><b>{draw.winner_name_snapshot}</b></td><td>{draw.prize_type}</td><td>{draw.preferred_weapon_snapshot || '-'}</td><td>{draw.eligible_count}</td><td><code>{draw.random_proof}</code></td></tr>)}
          {!draws.length && <tr><td colSpan={7}>Nessuna estrazione registrata.</td></tr>}
        </tbody></table></div>
      </section>
    </main>
  );
}

function ParticipantRow({ participant, contribution, editable, canManage, amount, currency, onSave, onContribution, onRemove }: {
  participant: FundParticipant;
  contribution?: FundContribution;
  editable: boolean;
  canManage: boolean;
  amount: number;
  currency: string;
  onSave: (participant: FundParticipant, weapon: string, rarity: FundParticipant['preferred_rarity']) => Promise<void>;
  onContribution: (participant: FundParticipant, status: FundContribution['status']) => Promise<void>;
  onRemove: (participant: FundParticipant) => Promise<void>;
}) {
  const [weapon, setWeapon] = useState(participant.preferred_weapon || '');
  const [rarity, setRarity] = useState<FundParticipant['preferred_rarity']>(participant.preferred_rarity || 'Indifferente');
  return (
    <tr>
      <td><b>{participant.players?.nickname || 'Player'}</b>{participant.players?.clan_name && <small className="block muted">{participant.players.clan_name}</small>}</td>
      <td><input className="input compact-input" disabled={!editable} value={weapon} onChange={(e) => setWeapon(e.target.value)} placeholder="Es. AK-47, Locus..." /></td>
      <td><select className="select compact-select" disabled={!editable} value={rarity} onChange={(e) => setRarity(e.target.value as FundParticipant['preferred_rarity'])}><option>Indifferente</option><option>Leggendaria</option><option>Mitica</option></select></td>
      <td><span className={`badge ${contribution?.status === 'paid' ? 'ok' : contribution?.status === 'exempt' ? 'warn' : ''}`}>{contribution?.status === 'paid' ? `Pagato ${euro(contribution.amount, currency)}` : contribution?.status === 'exempt' ? 'Esente' : `Da pagare ${euro(amount, currency)}`}</span></td>
      <td>{participant.selected_at ? <span className="badge ok">Già estratto</span> : <span className="badge">Idoneo dopo pagamento</span>}</td>
      <td><div className="fund-row-actions-v1311">{editable && <button className="btn small secondary" type="button" onClick={() => void onSave(participant, weapon, rarity)}>Salva preferenza</button>}{canManage && <><button className="btn small" type="button" onClick={() => void onContribution(participant, 'paid')}>Pagato</button><button className="btn small secondary" type="button" onClick={() => void onContribution(participant, 'pending')}>Non pagato</button><button className="btn small secondary" type="button" onClick={() => void onContribution(participant, 'exempt')}>Esente</button><button className="btn small danger" type="button" onClick={() => void onRemove(participant)}>Rimuovi</button></>}</div></td>
    </tr>
  );
}
