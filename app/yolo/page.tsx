const labels = [
  'match_header_result', 'match_score_blue', 'match_score_red', 'match_datetime', 'match_mode_map',
  'blue_table_full', 'red_table_full', 'blue_row_1_kda', 'blue_row_2_kda', 'blue_row_3_kda', 'blue_row_4_kda', 'blue_row_5_kda',
  'red_row_1_kda', 'red_row_2_kda', 'red_row_3_kda', 'red_row_4_kda', 'red_row_5_kda',
  'profile_uid', 'profile_nickname', 'legendary_mg', 'legendary_br', 'legendary_dmz', 'legendary_zombie'
];

export default function YoloPage() {
  return (
    <main className="container wide">
      <section className="clan-hero gaming-panel">
        <div>
          <p className="eyebrow">🧬 YOLO-ready</p>
          <h1>Dataset OCR e box automatici</h1>
          <p className="clan-motto">YOLO reale richiede screenshot corretti e box validati. Questa sezione spiega cosa raccogliere e come l'app salva campioni per il training futuro.</p>
        </div>
        <div className="clan-emblem invite-emblem"><img src="/assets/ak47dx-logo.jpeg" alt="AK47DX" /></div>
      </section>

      <section className="grid grid-2 top-gap">
        <div className="card">
          <h2>Cosa serve per addestrare YOLO</h2>
          <ul className="muted">
            <li>Almeno 100 screenshot per tipo schermata per iniziare.</li>
            <li>Meglio 300-500 screenshot per avere un modello affidabile.</li>
            <li>Schermate diverse: CED, Postazione, profilo, telefono diverso, screenshot WhatsApp e screenshot diretto.</li>
            <li>Per ogni screenshot servono box corretti e valore confermato.</li>
            <li>Le correzioni manuali diventano ground truth.</li>
          </ul>
        </div>
        <div className="card">
          <h2>Struttura dataset inclusa</h2>
          <pre className="code-block">{`datasets/
  yolo/
    images/
    labels/
  ocr/
    crops/
    ground_truth.csv
  exports/
    ak47dx_yolo_export.zip`}</pre>
        </div>
      </section>

      <section className="card top-gap">
        <h2>Label previste</h2>
        <div className="yolo-label-grid">
          {labels.map((label) => <div className="yolo-label-chip" key={label}>🎯 {label}</div>)}
        </div>
      </section>

      <section className="grid grid-3 top-gap">
        <div className="kpi kpi-glow"><span>Minimo iniziale</span><strong>100</strong><small>screenshot / schermata</small></div>
        <div className="kpi kpi-glow"><span>Consigliato</span><strong>300+</strong><small>screenshot vari</small></div>
        <div className="kpi kpi-glow"><span>Target stabile</span><strong>500+</strong><small>con correzioni</small></div>
      </section>
    </main>
  );
}
