from __future__ import annotations

from typing import Optional
import re
import json

import numpy as np
import cv2
import pytesseract

from app.models import OcrPlayerRow, ScoreboardCedResult
from app.services.detector import detect_ced_layout, find_box, make_box
from app.services.image_utils import crop_box, read_image_bytes, trim_black_borders, resize_long_edge, detect_content_frame
from app.services.ocr_engines import parse_int, parse_kda, read_text_hybrid, read_numeric_hybrid, tesseract_read, engine_status, numeric_ocr_candidates, vote_int_from_candidates, vote_kda_from_candidates, read_numeric_line_candidates, tesseract_read_block


def _box_tuple(box) -> tuple[int, int, int, int]:
    return (box.x, box.y, box.w, box.h)


def _detect_result(text: str, blue_score: Optional[int], red_score: Optional[int]) -> str | None:
    # FIX3: OCR può leggere VITTORIA come VITTODIA / VITTAODIA / VIT.
    if re.search(r"VITT|VICT|WIN", text, re.I):
        return "WIN"
    if re.search(r"SCONF|DEFEAT|LOSE|LOST", text, re.I):
        return "LOSE"
    if blue_score is not None and red_score is not None:
        if blue_score > red_score:
            return "WIN"
        if blue_score < red_score:
            return "LOSE"
        return "DRAW"
    return None



def _score_is_valid_ced(value: Optional[int]) -> bool:
    return value is not None and 0 <= value <= 7


def _extract_ced_score_from_text(text: str) -> tuple[Optional[int], Optional[int]]:
    """Estrae solo punteggi CED plausibili dalla zona header, mai dalle righe player."""
    cleaned = text.upper()
    cleaned = (
        cleaned.replace("O", "0")
        .replace("D", "0")
        .replace("N", "0")
        .replace("C", "6")
        .replace("G", "6")
        .replace("I", "1")
        .replace("L", "1")
        .replace("|", "1")
        .replace("S", "5")
        .replace("B", "8")
        .replace(".", ":")
        .replace(",", ":")
        .replace(";", ":")
    )
    for m in re.finditer(r"\b([0-7])\s*[:]\s*([0-7])\b", cleaned):
        return int(m.group(1)), int(m.group(2))
    # Fallback quando OCR legge VITTORIA come V1TT... e perde il due punti.
    m = re.search(r"(?:V[1I]TT\w*|VICT\w*|WIN|L05E|DEFEAT)\D{0,16}([0-7])\D{0,4}([0-7])", cleaned, re.I)
    if m:
        return int(m.group(1)), int(m.group(2))
    return None, None


def _extract_match_score_from_text(text: str, mode_hint: str = "CED") -> tuple[Optional[int], Optional[int]]:
    """Legge score match dall'header. CED usa 0..7, Postazione/Hardpoint fino a 300."""
    cleaned = text.upper()
    cleaned = (cleaned.replace("O", "0").replace("D", "0").replace("Q", "0")
               .replace("I", "1").replace("L", "1").replace("|", "1")
               .replace("S", "5").replace("B", "8").replace(".", ":")
               .replace(",", ":").replace(";", ":"))
    max_v = 300 if mode_hint == "POSTAZIONE" else 7
    candidates: list[tuple[int, int, int]] = []
    for m in re.finditer(r"(?:VITT\w*|VICT\w*|SCONF\w*|DEFEAT|WIN|LOSE)?\D{0,18}(\d{1,3})\s*[:\-]\s*(\d{1,3})", cleaned):
        b, r = int(m.group(1)), int(m.group(2))
        if 0 <= b <= max_v and 0 <= r <= max_v:
            score = 2 if re.search(r"VITT|VICT|SCONF|DEFEAT|WIN|LOSE", m.group(0), re.I) else 1
            candidates.append((score, b, r))
    if candidates:
        candidates.sort(reverse=True)
        return candidates[0][1], candidates[0][2]
    if mode_hint == "CED":
        return _extract_ced_score_from_text(text)
    return None, None


def _score_is_valid_for_mode(value: Optional[int], mode_hint: str = "CED") -> bool:
    if value is None:
        return False
    if mode_hint == "POSTAZIONE":
        return 0 <= value <= 300
    return 0 <= value <= 7


def _validate_score_pair(mode_hint: str, result_hint: str | None, blue_score: Optional[int], red_score: Optional[int], source: str, diagnostics: dict) -> tuple[Optional[int], Optional[int]]:
    diagnostics.setdefault("accepted_candidates", [])
    diagnostics.setdefault("rejected_candidates", [])
    if not (_score_is_valid_for_mode(blue_score, mode_hint) and _score_is_valid_for_mode(red_score, mode_hint)):
        diagnostics["rejected_candidates"].append({"source": source, "blue": blue_score, "red": red_score, "mode": mode_hint, "reason": "outside_mode_range_or_missing"})
        return None, None
    if result_hint == "WIN" and blue_score <= red_score:
        diagnostics["rejected_candidates"].append({"source": source, "blue": blue_score, "red": red_score, "mode": mode_hint, "reason": "win_result_but_blue_not_greater"})
        return None, None
    if result_hint == "LOSE" and blue_score >= red_score:
        diagnostics["rejected_candidates"].append({"source": source, "blue": blue_score, "red": red_score, "mode": mode_hint, "reason": "lose_result_but_blue_not_lower"})
        return None, None
    diagnostics["accepted_candidates"].append({"source": source, "blue": blue_score, "red": red_score, "mode": mode_hint})
    return blue_score, red_score




def _detect_result_color(img: np.ndarray) -> str | None:
    h, w = img.shape[:2]
    # Area della parola VITTORIA/SCONFITTA, non includere score rosso.
    crop = img[int(h * 0.055): int(h * 0.140), int(w * 0.000): int(w * 0.170)]
    if crop.size == 0:
        return None
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    yellow = cv2.inRange(hsv, np.array([18, 70, 120]), np.array([45, 255, 255]))
    red = cv2.bitwise_or(
        cv2.inRange(hsv, np.array([0, 70, 120]), np.array([15, 255, 255])),
        cv2.inRange(hsv, np.array([160, 70, 120]), np.array([179, 255, 255])),
    )
    yellow_pixels = int(np.count_nonzero(yellow))
    red_pixels = int(np.count_nonzero(red))
    # In CODM la scritta VITTORIA è grande e gialla. La sconfitta tende a essere rossa/scura.
    if yellow_pixels > max(150, red_pixels * 2):
        return "WIN"
    if red_pixels > max(180, yellow_pixels * 2):
        return "LOSE"
    return None


def _classify_ced_score_component(component_mask: np.ndarray) -> Optional[int]:
    """Classificatore leggero per i casi frequenti 6/0 quando Tesseract fallisce.
    Lavora solo sul componente colore del numero CODM.
    """
    if component_mask.size == 0:
        return None
    ys, xs = np.where(component_mask > 0)
    if len(xs) == 0 or len(ys) == 0:
        return None
    crop = component_mask[ys.min():ys.max()+1, xs.min():xs.max()+1]
    crop = cv2.resize(crop, (280, 330), interpolation=cv2.INTER_NEAREST)
    digit = (crop > 0).astype(np.float32)
    h, w = digit.shape
    right_mid = float(digit[int(h*.25):int(h*.70), int(w*.62):w].mean())
    center_low = float(digit[int(h*.55):int(h*.90), int(w*.30):int(w*.70)].mean())
    # 0: verticale destra forte e centro basso vuoto. 6: centro basso pieno e lato destro più aperto.
    if right_mid > 0.82 and center_low < 0.50:
        return 0
    if center_low > 0.62 and right_mid < 0.82:
        return 6
    return None

def _read_ced_score_color(img: np.ndarray) -> tuple[Optional[int], Optional[int], list[str]]:
    """Legge 6:0 dal colore header: blu/ciano = team blu, rosso = team rosso.
    Serve quando Tesseract sul testo completo confonde numeri della tabella.
    """
    h, w = img.shape[:2]
    header = img[int(h * 0.055): int(h * 0.135), int(w * 0.110): int(w * 0.205)]
    debug: list[str] = []
    if header.size == 0:
        return None, None, ["header_color_crop_empty"]
    hsv = cv2.cvtColor(header, cv2.COLOR_BGR2HSV)
    blue_mask = cv2.inRange(hsv, np.array([85, 80, 120]), np.array([120, 255, 255]))
    red_mask = cv2.bitwise_or(
        cv2.inRange(hsv, np.array([0, 80, 120]), np.array([15, 255, 255])),
        cv2.inRange(hsv, np.array([160, 80, 120]), np.array([179, 255, 255])),
    )

    def read_masked(mask: np.ndarray, label: str) -> Optional[int]:
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        mask2 = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        contours, _ = cv2.findContours(mask2, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        rects = []
        for c in contours:
            x, y, ww, hh = cv2.boundingRect(c)
            area = ww * hh
            if area >= 20 and hh >= max(8, header.shape[0] * 0.25):
                rects.append((area, x, y, ww, hh))
        if not rects:
            debug.append(f"{label}:no_color_component")
            return None
        _, x, y, ww, hh = max(rects, key=lambda t: t[0])
        pad = 5
        x1, y1 = max(0, x - pad), max(0, y - pad)
        x2, y2 = min(header.shape[1], x + ww + pad), min(header.shape[0], y + hh + pad)
        crop = header[y1:y2, x1:x2]
        t, c = tesseract_read(crop, "score")
        val = parse_int(t, 0, 7)
        if not (0 <= val <= 7) or (val == 0 and not re.search(r"0", t)):
            val2 = _classify_ced_score_component(mask2[max(0,y-4):min(mask2.shape[0],y+hh+4), max(0,x-4):min(mask2.shape[1],x+ww+4)])
            if val2 is not None:
                val = val2
        debug.append(f"{label}:bbox={x},{y},{ww},{hh} text={t!r} val={val} conf={c:.2f}")
        return val if 0 <= val <= 7 else None

    return read_masked(blue_mask, "blue_color_score"), read_masked(red_mask, "red_color_score"), debug


def _validate_ced_score_pair(result_hint: str | None, blue_score: Optional[int], red_score: Optional[int], source: str, diagnostics: dict) -> tuple[Optional[int], Optional[int]]:
    return _validate_score_pair("CED", result_hint, blue_score, red_score, source, diagnostics)


def _mode_map(text: str) -> tuple[str, str | None]:
    upper = text.upper()
    mode = "CED"
    if "POSTAZIONE" in upper or "HARDPOINT" in upper:
        mode = "POSTAZIONE"
    elif "DOMINIO" in upper or "DOMINATION" in upper:
        mode = "DOMINIO"
    maps = ["TUNISIA", "STANDOFF", "FIRING RANGE", "SUMMIT", "COASTAL", "RAID", "CRASH", "NUKETOWN", "TERMINAL", "HACIENDA", "SLUMS"]
    found = next((m for m in maps if m in upper), None)
    return mode, found.title() if found else None



def _read_score_cell_robust(img: np.ndarray) -> tuple[int, float, str, list[dict]]:
    """1.0 fallback veloce per score cella.
    Massimo 3 chiamate Tesseract, non decine: evita pulsante bloccato.
    """
    if img.size == 0:
        return 0, 0.0, "", []
    all_candidates: list[dict] = []
    for frac in (1.00, 0.90, 0.70):
        w = max(1, int(img.shape[1] * frac))
        crop = img[:, :w]
        for cand in read_numeric_line_candidates(crop):
            text = str(cand.get("text", ""))
            cleaned = text.replace("O", "0").replace("o", "0").replace("I", "1").replace("l", "1")
            nums = [int(x) for x in re.findall(r"\d{1,4}", cleaned)]
            for n in nums:
                if 0 <= n <= 2500:
                    all_candidates.append({**cand, "frac": frac, "value": n, "vote_score": float(cand.get("conf", 0.0)) + (0.04 if n >= 100 else 0.0)})
    if not all_candidates:
        return 0, 0.0, "", []
    by_value: dict[int, list[dict]] = {}
    for item in all_candidates:
        by_value.setdefault(int(item["value"]), []).append(item)
    ranked = sorted(by_value.items(), key=lambda kv: (len(kv[1]), sum(float(x.get("vote_score", 0)) for x in kv[1]) / len(kv[1]), kv[0]), reverse=True)
    value, items = ranked[0]
    best = sorted(items, key=lambda x: float(x.get("vote_score", 0)), reverse=True)[0]
    conf = min(0.90, 0.42 + len(items) * 0.12 + float(best.get("conf", 0.0)) * 0.25)
    return int(value), float(conf), str(best.get("text", "")), all_candidates[:12]

def _read_impact_cell_robust(img: np.ndarray) -> tuple[int, float, str, list[dict]]:
    if img.size == 0:
        return 0, 0.0, "", []
    cands = numeric_ocr_candidates(img, "impact") + numeric_ocr_candidates(img, "number")
    value, conf, scored = vote_int_from_candidates(cands, 0, 320, prefer_nonzero=False)
    raw = str(sorted(scored, key=lambda c: (int(c.get("value", -1)) == value, float(c.get("vote_score", 0))), reverse=True)[0].get("text", "")) if scored else ""
    return int(value), float(conf), raw, scored[:20]


def _read_kda_cell_robust(img: np.ndarray, mode_hint: str = "CED") -> tuple[int, int, int, float, str, list[dict]]:
    """1.0: lettura dedicata solo Kill / Death / Assist.

    Tolti score player e impatto, la cella KDA può essere trattata in modo più aggressivo:
    più preprocess, più crop orizzontali e voto solo su tuple plausibili n/n/n.
    Se non è sicuro, ritorna 0/0/0 con confidenza bassa invece di inventare.
    """
    if img.size == 0:
        return 0, 0, 0, 0.0, "", []
    h, w = img.shape[:2]
    all_candidates: list[dict] = []

    # Crop multipli: molti screenshot hanno la KDA leggermente più a sinistra/destra.
    crops = [
        ("full", img),
        ("center", img[:, int(w * 0.03): int(w * 0.98)]),
        ("wide", img[:, max(0, int(w * -0.03)): int(w * 1.00)]),
        ("right_bias", img[:, int(w * 0.00): int(w * 0.92)]),
    ]
    for crop_name, crop in crops:
        for cand in numeric_ocr_candidates(crop, "kda")[:12]:
            all_candidates.append({**cand, "crop": crop_name})

    (k, d, a), conf, scored = vote_kda_from_candidates(all_candidates)

    if mode_hint == "POSTAZIONE":
        valid = (0 <= k <= 120 and 0 <= d <= 120 and 0 <= a <= 120)
    else:
        valid = (0 <= k <= 30 and 0 <= d <= 12 and 0 <= a <= 30)
    if not valid:
        return 0, 0, 0, 0.0, "", scored[:24]

    # Se il voto è basso e la lettura è tutta zero, è meglio chiedere revisione manuale.
    if conf < 0.38 and (k, d, a) == (0, 0, 0):
        return 0, 0, 0, 0.0, "", scored[:24]

    raw = ""
    if scored:
        try:
            raw = str(sorted(scored, key=lambda c: (tuple(c.get("kda", ())) == (k, d, a), float(c.get("vote_score", 0))), reverse=True)[0].get("text", ""))
        except Exception:
            raw = str(scored[0].get("text", ""))
    return int(k), int(d), int(a), float(conf), raw, scored[:24]




def _parse_row_numeric_candidates(candidates: list[dict]) -> tuple[dict, list[dict]]:
    """1.0: sceglie score / kill / death / assist / impact confrontando più letture della riga.
    Gestisce anche testi uniti tipo 5135/6/0 = score 513 + K/D/A 5/6/0.
    """
    parsed: list[dict] = []
    for cand in candidates:
        raw = str(cand.get("text", ""))
        cleaned = re.sub(r"\s+", " ", raw.strip())
        cleaned = cleaned.replace("\\", "/").replace("|", "/")
        cleaned = cleaned.replace("O", "0").replace("o", "0").replace("I", "1").replace("l", "1")
        cleaned = re.sub(r"[^0-9/ ]+", " ", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        score = None
        impact = None
        kills = deaths = assists = None

        # Caso importante CODM: score e kill attaccati. Esempi:
        # 5135/6/0 -> score 513, K/D/A 5/6/0
        # 8698/1/1 -> score 869, K/D/A 8/1/1
        concat = re.search(r"(?<!\d)(\d{3,4})(\d{1,2})\s*/\s*(\d{1,2})\s*/\s*(\d{1,2})(?!\d)", cleaned)
        if concat:
            score = int(concat.group(1))
            kills, deaths, assists = int(concat.group(2)), int(concat.group(3)), int(concat.group(4))
            after = cleaned[concat.end():]
            after_nums = [int(x) for x in re.findall(r"\d{1,4}", after)]
            impact = after_nums[0] if after_nums else None
        else:
            kda = re.search(r"(?<!\d)(\d{1,2})\s*/\s*(\d{1,2})\s*/\s*(\d{1,2})(?!\d)", cleaned)
            if not kda:
                continue
            before = cleaned[:kda.start()].replace("/", " ")
            after = cleaned[kda.end():]
            before_nums = [int(x) for x in re.findall(r"\d{1,4}", before)]
            after_nums = [int(x) for x in re.findall(r"\d{1,4}", after)]
            score = before_nums[-1] if before_nums else None
            impact = after_nums[0] if after_nums else None
            kills, deaths, assists = int(kda.group(1)), int(kda.group(2)), int(kda.group(3))

        conf = float(cand.get("conf", 0.0))
        if score is not None and not (0 <= score <= 2500):
            score = None
            conf -= 0.15
        if impact is not None and not (0 <= impact <= 350):
            impact = None
            conf -= 0.15
        if kills is None or deaths is None or assists is None or not all(0 <= v <= 40 for v in (kills, deaths, assists)):
            conf -= 0.25
        parsed.append({
            "text": raw,
            "score": score,
            "kills": int(kills or 0),
            "deaths": int(deaths or 0),
            "assists": int(assists or 0),
            "impact": impact,
            "conf": max(0.0, min(0.95, conf)),
            "method": cand.get("method", "row"),
        })
    if not parsed:
        return {"score": 0, "kills": 0, "deaths": 0, "assists": 0, "impact": 0, "conf": 0.0, "text": ""}, []

    def pick_num(key: str, min_v: int, max_v: int, default: int = 0) -> tuple[int, float]:
        values: dict[int, list[float]] = {}
        for item in parsed:
            v = item.get(key)
            if isinstance(v, int) and min_v <= v <= max_v:
                values.setdefault(v, []).append(float(item.get("conf", 0.0)))
        if not values:
            return default, 0.0
        # Voto principale: valore ripetuto da più letture. Per SCORE a parità preferiamo il più alto,
        # perché Tesseract tende a perdere la prima cifra (752 -> 132 / 277 -> 27).
        if key == "score":
            ranked = sorted(values.items(), key=lambda kv: (len(kv[1]), sum(kv[1]) / len(kv[1]), kv[0]), reverse=True)
        else:
            ranked = sorted(values.items(), key=lambda kv: (len(kv[1]), sum(kv[1]) / len(kv[1])), reverse=True)
        value, confs = ranked[0]
        return value, min(0.95, 0.42 + len(confs) * 0.15 + (sum(confs) / len(confs)) * 0.25)

    score, score_conf = pick_num("score", 0, 2500)
    kills, k_conf = pick_num("kills", 0, 40)
    deaths, d_conf = pick_num("deaths", 0, 40)
    assists, a_conf = pick_num("assists", 0, 40)
    impact, impact_conf = pick_num("impact", 0, 350)
    best_text = sorted(parsed, key=lambda x: float(x.get("conf", 0.0)), reverse=True)[0].get("text", "")
    conf_parts = [c for c in [score_conf, k_conf, d_conf, a_conf, impact_conf] if c > 0]
    final_conf = sum(conf_parts) / len(conf_parts) if conf_parts else 0.0
    return {
        "score": score,
        "kills": kills,
        "deaths": deaths,
        "assists": assists,
        "impact": impact,
        "conf": round(final_conf, 3),
        "text": best_text,
    }, parsed

def _read_row_bundle_robust(img: np.ndarray) -> tuple[int, int, int, int, int, float, str, list[dict]]:
    if img.size == 0:
        return 0, 0, 0, 0, 0, 0.0, "", []
    h, w = img.shape[:2]
    # 1.0: stesso rigo letto con tre partenze diverse.
    # Alcuni screenshot attaccano score e K/D/A; altri tagliano la prima cifra.
    # Il voto confronta i risultati e sceglie quello più confermato.
    candidates = []
    for start_frac in (0.32, 0.38, 0.40):
        crop = img[:, int(w * start_frac): int(w * 0.985)]
        for cand in read_numeric_line_candidates(crop):
            candidates.append({**cand, "start_frac": start_frac})
    parsed, details = _parse_row_numeric_candidates(candidates)
    return (
        int(parsed.get("score", 0) or 0),
        int(parsed.get("kills", 0) or 0),
        int(parsed.get("deaths", 0) or 0),
        int(parsed.get("assists", 0) or 0),
        int(parsed.get("impact", 0) or 0),
        float(parsed.get("conf", 0.0) or 0.0),
        str(parsed.get("text", "") or ""),
        details[:12],
    )

def _role_from_calibration_name(name: str) -> tuple[str | None, str | None, int | None]:
    upper = name.upper()
    if upper == "SCOREBOARD_RESULT_LABEL":
        return "result_label", None, None
    if upper == "SCOREBOARD_SCORE_BLUE":
        return "blue_score", "blue", None
    if upper == "SCOREBOARD_SCORE_RED":
        return "red_score", "red", None
    if upper == "SCOREBOARD_MATCH_DATETIME":
        return "match_datetime", None, None
    if upper == "SCOREBOARD_MODE_MAP":
        return "mode_map", None, None
    if upper == "TEAM_BLUE_TABLE_FULL":
        return "team_table", "blue", None
    if upper == "TEAM_RED_TABLE_FULL":
        return "team_table", "red", None
    m = re.match(r"^(BLUE|RED)_R([1-5])_(NICK|SCORE|KDA|IMPACT)$", upper)
    if m:
        team = "blue" if m.group(1) == "BLUE" else "red"
        row = int(m.group(2))
        role = {"NICK": "nickname", "SCORE": "score", "KDA": "kda", "IMPACT": "impact"}[m.group(3)]
        return role, team, row
    return None, None, None



def _client_frame_to_pixels(calibration_frame: str | None, image_w: int, image_h: int) -> tuple[int, int, int, int] | None:
    """Frame normalizzato calcolato dal frontend con lo stesso algoritmo della pagina calibrazione.

    Serve per evitare che Render ricalcoli un content frame leggermente diverso rispetto a quello
    visto dall'utente quando salva il template. I riquadri salvati sono normalizzati sul content frame,
    quindi import e calibrazione devono usare lo stesso frame.
    """
    if not calibration_frame:
        return None
    try:
        parsed = json.loads(calibration_frame)
        x = max(0.0, min(0.995, float(parsed.get("x", 0))))
        y = max(0.0, min(0.995, float(parsed.get("y", 0))))
        w = max(0.01, min(1.0 - x, float(parsed.get("w", 1))))
        h = max(0.01, min(1.0 - y, float(parsed.get("h", 1))))
        return int(x * image_w), int(y * image_h), int(w * image_w), int(h * image_h)
    except Exception:
        return None

def _apply_calibration_template(layout, calibration_template: str | None, content_frame: tuple[int, int, int, int] | None = None):
    if not calibration_template:
        return layout, None
    try:
        parsed = json.loads(calibration_template)
        meta = parsed.get("meta", {}) if isinstance(parsed, dict) else {}
        regions = parsed.get("regions", parsed) if isinstance(parsed, dict) else parsed
        if not isinstance(regions, list):
            layout.warnings.append("Template calibrazione ricevuto ma formato non valido: regions mancante.")
            return layout, meta
        by_key = {(b.role, b.team, b.row): b for b in layout.boxes}
        applied = 0
        for region in regions:
            if not isinstance(region, dict):
                continue
            role, team, row = _role_from_calibration_name(str(region.get("name", "")))
            if not role:
                continue
            fx, fy, fw, fh = content_frame or (0, 0, layout.image_w, layout.image_h)
            x = int(fx + float(region.get("x", 0)) * fw)
            y = int(fy + float(region.get("y", 0)) * fh)
            w = int(float(region.get("w", 0.01)) * fw)
            h = int(float(region.get("h", 0.01)) * fh)
            box = make_box(f"cal_{region.get('name', role)}", role, team, row, x, y, w, h, layout.image_w, layout.image_h, 0.99)
            by_key[(role, team, row)] = box
            applied += 1
        if applied:
            layout.boxes = list(by_key.values())
            layout.layout_confidence = max(layout.layout_confidence, 0.92)
            layout.warnings.append(f"Template calibrazione attivo: {applied} riquadri applicati ({meta.get('phoneProfile', 'telefono non indicato')}). Coordinate 1.0 applicate sullo stesso content frame usato dal frontend/calibrazione, così il template non scivola se Render rileva un frame diverso.")
        return layout, meta
    except Exception as exc:
        layout.warnings.append(f"Template calibrazione non applicato: {exc}")
        return layout, None

def _rebuild_cells_from_team_tables(layout, mode_hint: str = "CED"):
    """0.9E: quando il template è attivo non usiamo 40 celle indipendenti.
    Basta calibrare bene TEAM_BLUE_TABLE_FULL e TEAM_RED_TABLE_FULL: da quelle ricostruiamo
    righe e colonne coerenti. Così se un'immagine è leggermente spostata, non saltano
    singole celle/punteggi/KDA.
    """
    keep_roles = {"nickname", "score", "kda", "impact", "player_row"}
    kept = [b for b in layout.boxes if b.role not in keep_roles]
    added = []
    def table_for(team: str):
        return next((b for b in layout.boxes if b.role == "team_table" and b.team == team), None)
    for team in ("blue", "red"):
        table = table_for(team)
        if not table:
            continue
        tx, ty, tw, th = table.x, table.y, table.w, table.h
        header_h = int(th * (0.205 if mode_hint == "POSTAZIONE" else 0.133))
        usable_y = ty + header_h
        usable_h = max(1, th - header_h)
        row_h = usable_h / 5.0
        if mode_hint == "POSTAZIONE":
            kda_x = 0.610 if team == "blue" else 0.580
            cols = {
                "nickname": (0.095, 0.340),
                "kda": (kda_x, 0.145),
            }
        else:
            cols = {
                "nickname": (0.090, 0.355),
                "kda": (0.545, 0.255),
            }
        for idx in range(5):
            y = int(usable_y + idx * row_h)
            h = max(1, int(row_h))
            added.append(make_box(f"{team}_grid_row_{idx+1}", "player_row", team, idx + 1, tx, y, tw, h, layout.image_w, layout.image_h, 0.98))
            for role, (cx, cw) in cols.items():
                added.append(make_box(f"{team}_grid_{idx+1}_{role}", role, team, idx + 1, int(tx + tw * cx), y, int(tw * cw), h, layout.image_w, layout.image_h, 0.98))
    if added:
        layout.boxes = kept + added
        layout.layout_confidence = max(layout.layout_confidence, 0.94)
        layout.warnings.append(f"2.0 table-lock attivo ({mode_hint}): celle Kill/Death/Assist ricostruite da TEAM_BLUE_TABLE_FULL/TEAM_RED_TABLE_FULL. Score player e impatto non vengono letti.")
    return layout




def _has_priority_template_cells(layout, team: str) -> bool:
    """True quando il template contiene celle calibrate individuali per il team scelto.

    In V4.6 il table-lock ricostruiva le celle da TEAM_*_TABLE_FULL e poteva spostarle
    rispetto ai riquadri salvati dall'utente. In V4.7 diamo priorità assoluta ai box
    BLUE/RED_Rx_NICK e BLUE/RED_Rx_KDA salvati in calibrazione.
    """
    nick_rows = set()
    kda_rows = set()
    for b in layout.boxes:
        if b.team != team or not b.row:
            continue
        if not str(b.name).startswith('cal_'):
            continue
        if b.role == 'nickname':
            nick_rows.add(int(b.row))
        if b.role == 'kda':
            kda_rows.add(int(b.row))
    return len(kda_rows) >= 5 or (len(kda_rows) >= 4 and len(nick_rows) >= 4)


def _debug_overlay_boxes(layout, our_team: str, mode: str = 'all_template'):
    """Restituisce i riquadri da mostrare in overlay frontend.

    Per debug V4.7 mostriamo tutti i riquadri di template applicati, non solo quelli
    usati per leggere. Così si vede subito se il template è allineato o se il frame è sbagliato.
    """
    if mode == 'used_only':
        return []
    out = []
    for b in layout.boxes:
        is_cal = str(b.name).startswith('cal_')
        if not is_cal:
            continue
        if b.team in (None, our_team) or b.role in {'result_label', 'blue_score', 'red_score', 'match_datetime', 'mode_map', 'team_table'}:
            out.append(b)
    return out

def _winner_from_scores(blue_score: Optional[int], red_score: Optional[int], result_hint: str | None = None) -> str | None:
    if blue_score is not None and red_score is not None:
        if blue_score > red_score:
            return "blue"
        if red_score > blue_score:
            return "red"
        return "draw"
    # In schermata CODM, VITTORIA/SCONFITTA è riferita al nostro team a sinistra (blu) salvo scelta utente.
    if result_hint == "WIN":
        return "blue"
    if result_hint == "LOSE":
        return "red"
    return None


def _result_for_our_team(winning_team: str | None, our_team: str) -> str | None:
    if winning_team == "draw":
        return "DRAW"
    if winning_team in ("blue", "red"):
        return "WIN" if winning_team == our_team else "LOSE"
    return None


def _parse_match_datetime(text: str) -> str | None:
    cleaned = text.strip().replace("/", "-").replace(".", "-")
    # CODM spesso mostra: 23:09:36 26-07-01 oppure 23:09 26-07-01
    m = re.search(r"(\d{1,2}:\d{2}(?::\d{2})?)\s+((?:20)?\d{2}-\d{1,2}-\d{1,2})", cleaned)
    if m:
        return f"{m.group(1)} {m.group(2)}"
    # Fallback: solo data o solo ora se OCR ha spezzato la riga.
    time = re.search(r"\d{1,2}:\d{2}(?::\d{2})?", cleaned)
    date = re.search(r"(?:20)?\d{2}-\d{1,2}-\d{1,2}", cleaned)
    if time and date:
        return f"{time.group(0)} {date.group(0)}"
    return None



# -----------------------------
# V4.6 FAST OCR PATH
# -----------------------------
# Render free può essere troppo lento se ogni riga usa 15+ chiamate Tesseract.
# Questa modalità legge SOLO il nostro team e usa massimo 1-2 OCR per riga.
# Obiettivo: niente timeout online, valori K/D/A subito disponibili e revisione manuale chiara.

def _fast_tesseract_text(img: np.ndarray, kind: str = "text", timeout: float = 1.0) -> str:
    if img.size == 0:
        return ""
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.copyMakeBorder(gray, 4, 4, 4, 4, cv2.BORDER_REPLICATE)
        # Per KDA il grigio semplice è più affidabile delle binarizzazioni aggressive.
        proc = cv2.resize(gray, None, fx=5.0 if kind == "kda" else 2.8, fy=5.0 if kind == "kda" else 2.8, interpolation=cv2.INTER_CUBIC)
        if kind == "kda":
            config = "--psm 6 -c tessedit_char_whitelist=0123456789/|IlO"
            lang = "eng"
        elif kind == "number":
            config = "--psm 7 -c tessedit_char_whitelist=0123456789:.-"
            lang = "eng"
        else:
            config = "--psm 7"
            lang = "eng"
        return pytesseract.image_to_string(proc, lang=lang, config=config, timeout=timeout).strip()
    except Exception:
        return ""


def _fast_parse_kda_text(text: str) -> tuple[int, int, int, float]:
    cleaned = (text or "").replace(" ", "").replace("|", "/").replace("\\", "/")
    cleaned = cleaned.replace("I", "1").replace("l", "1").replace("O", "0").replace("o", "0")
    m = re.search(r"(\d{1,3})/(\d{1,3})/(\d{1,3})", cleaned)
    if m:
        k, d, a = [int(x) for x in m.groups()]
        if all(0 <= v <= 120 for v in (k, d, a)):
            return k, d, a, 0.82
    nums = [int(x) for x in re.findall(r"\d{1,3}", cleaned)]
    if len(nums) >= 3:
        k, d, a = nums[:3]
        if all(0 <= v <= 120 for v in (k, d, a)):
            return k, d, a, 0.60
    return 0, 0, 0, 0.0


def _fast_clean_nickname(text: str) -> str:
    text = re.sub(r"\s+", " ", (text or "").strip())
    # Rimuovi artefatti frequenti di OCR su icone/medaglie.
    text = re.sub(r"\b(MVP|400|Gold|Silver|Bronze)\b", "", text, flags=re.I)
    text = re.sub(r"[^\wÀ-ÿ\-.'’#@★☆ঐѦҞ ]+", "", text).strip()
    return text[:40]


def parse_scoreboard_ced_fast(image_bytes: bytes, calibration_template: str | None = None, calibration_frame: str | None = None, calibration_mode: str = "table_lock", our_team: str = "blue", extract_scope: str = "our_only", template_priority: str = "true", debug_boxes: str = "all_template") -> ScoreboardCedResult:
    original = read_image_bytes(image_bytes)
    our_team = "red" if str(our_team).lower() == "red" else "blue"
    calibration_mode = (calibration_mode or "table_lock").strip().lower()

    # Mantieni dimensione simile al template, ma non esagerare: meno pixel = meno timeout Render.
    img, _ = resize_long_edge(original, target=1920)
    layout = detect_ced_layout(img)

    content_frame = None
    template_meta = None
    if calibration_template and calibration_template.strip():
        try:
            client_frame = _client_frame_to_pixels(calibration_frame, img.shape[1], img.shape[0])
            if client_frame is not None:
                content_frame = client_frame
                layout.warnings.append(f"V4.6 template frame frontend applicato: x={client_frame[0]}, y={client_frame[1]}, w={client_frame[2]}, h={client_frame[3]}.")
            elif calibration_mode == "strict_image":
                content_frame = (0, 0, img.shape[1], img.shape[0])
                layout.warnings.append("V4.6 template in strict_image: coordinate applicate sull'immagine intera.")
            else:
                fx, fy, fw, fh, _, _ = detect_content_frame(img)
                content_frame = (fx, fy, fw, fh)
                layout.warnings.append("V4.6 fallback: content frame calcolato dal backend perché il frontend non ha inviato calibration_frame.")
            layout, template_meta = _apply_calibration_template(layout, calibration_template, content_frame=content_frame)
        except Exception as exc:
            layout.warnings.append(f"V4.6 fast: template non applicato: {exc}")

    template_priority_active = False
    if calibration_template and calibration_template.strip() and str(template_priority).strip().lower() not in {"false", "0", "off", "no"}:
        template_priority_active = _has_priority_template_cells(layout, our_team)
        if template_priority_active:
            layout.warnings.append(f"V4.7 TEMPLATE PRIORITY attivo: uso i riquadri salvati BLUE/RED_Rx_NICK e BLUE/RED_Rx_KDA del team {our_team}. Non ricostruisco le celle dalla tabella, quindi import e calibrazione hanno la stessa posizione.")
        else:
            layout.warnings.append(f"V4.7 TEMPLATE PRIORITY richiesto ma celle individuali insufficienti per team {our_team}: fallback table-lock da TEAM_*_TABLE_FULL.")

    # Header rapido: massimo 1 OCR largo, non blocca Render.
    raw_parts: list[str] = []
    mode = "CED"
    map_name = None
    header_text = ""
    try:
        hh, ww = img.shape[:2]
        header_crop = img[int(hh * 0.000): int(hh * 0.245), int(ww * 0.000): int(ww * 0.475)]
        header_text = _fast_tesseract_text(header_crop, "text", timeout=1.2)
        raw_parts.append(f"[V4.6 fast header] {header_text}")
        mode, map_name = _mode_map(header_text)
    except Exception:
        mode, map_name = "CED", None

    # V4.7: se esistono riquadri individuali salvati, hanno priorità assoluta.
    # Solo se mancano, usiamo table-lock per ricostruire celle da TEAM_*_TABLE_FULL.
    if not template_priority_active:
        layout = _rebuild_cells_from_team_tables(layout, mode)
    boxes = layout.boxes

    result_hint = _detect_result_color(img) or _detect_result(header_text, None, None)
    blue_score, red_score = _extract_match_score_from_text(header_text, mode)
    if blue_score is None or red_score is None:
        b2, r2, debug = _read_ced_score_color(img)
        raw_parts.extend(f"[V4.6 score_color] {x}" for x in debug)
        blue_score, red_score = b2, r2
    final_b, final_r = _validate_score_pair(mode, result_hint, blue_score, red_score, "v4_6_fast_header", {"accepted_candidates": [], "rejected_candidates": []})
    blue_score, red_score = final_b, final_r
    winning_team = _winner_from_scores(blue_score, red_score, result_hint)
    result = _result_for_our_team(winning_team, our_team) or result_hint

    teams: dict[str, list[OcrPlayerRow]] = {"blue": [], "red": []}
    confs: list[float] = []
    overlay_boxes = _debug_overlay_boxes(layout, our_team, debug_boxes)
    parsed_boxes = []

    for row in range(1, 6):
        nick = ""
        nick_box = find_box(boxes, "nickname", our_team, row)
        kda_box = find_box(boxes, "kda", our_team, row)
        row_boxes = []

        if nick_box:
            nick_crop = crop_box(img, _box_tuple(nick_box), pad=2)
            # Ritocco leggero: Tesseract sui nickname CODM con simboli non è perfetto, ma se fallisce non blocchiamo import.
            nick = _fast_clean_nickname(_fast_tesseract_text(nick_crop, "text", timeout=0.9))
            row_boxes.append(nick_box)
            parsed_boxes.append(nick_box)
        if not nick or len(nick) < 2:
            nick = f"{('Blu' if our_team == 'blue' else 'Rosso')} {row}"

        k, d, a, conf = 0, 0, 0, 0.0
        kda_raw = ""
        if kda_box:
            kda_crop = crop_box(img, _box_tuple(kda_box), pad=3)
            kda_raw = _fast_tesseract_text(kda_crop, "kda", timeout=1.0)
            k, d, a, conf = _fast_parse_kda_text(kda_raw)
            row_boxes.append(kda_box)
            parsed_boxes.append(kda_box)
        confs.append(conf)
        raw_parts.append(f"[V4.6 fast {our_team} r{row}] nick={nick!r} kda_raw={kda_raw!r} -> {k}/{d}/{a} conf={conf:.2f}")

        mvp_label = None
        if row == 1:
            if winning_team == our_team:
                mvp_label = "MVP_WIN"
            elif winning_team in ("blue", "red"):
                mvp_label = "MVP_LOSE"

        teams[our_team].append(OcrPlayerRow(
            rank=row,
            nickname_ocr=nick,
            score=0,
            kills=k,
            deaths=d,
            assists=a,
            impact=0,
            mvp_label=mvp_label,
            confidence=round(conf, 3),
            boxes=row_boxes,
        ))

    ocr_conf = sum(confs) / len(confs) if confs else 0.0
    warnings = list(layout.warnings)
    warnings.append("V4.6 fast import: lettura solo nostro team, massimo ~10 chiamate OCR. Usa template salvato con frame frontend. Niente lettura avversari, niente score player/impatto.")
    if ocr_conf < 0.45:
        warnings.append("OCR K/D/A a bassa confidenza: controlla manualmente i campi gialli prima di salvare.")

    return ScoreboardCedResult(
        result=result,
        winning_team=winning_team,
        our_team=our_team,
        blue_score=blue_score,
        red_score=red_score,
        mode=mode,
        map=map_name,
        match_datetime=_parse_match_datetime(header_text),
        layout_confidence=round(max(layout.layout_confidence, 0.80), 3),
        ocr_confidence=round(ocr_conf, 3),
        needs_manual_review=ocr_conf < 0.55 or result is None,
        teams=teams,
        boxes=list({(b.name, b.role, b.team, b.row): b for b in (overlay_boxes + parsed_boxes)}.values()),
        warnings=warnings,
        score_diagnostics={"policy": "V4.6 fast-own-team-template-frame", "our_team": our_team, "blue_score": blue_score, "red_score": red_score, "result_hint": result_hint},
        raw_text="\n".join(raw_parts),
    )

def parse_scoreboard_ced(image_bytes: bytes, calibration_template: str | None = None, calibration_frame: str | None = None, calibration_mode: str = "table_lock", our_team: str = "blue", extract_scope: str = "our_only", template_priority: str = "true", debug_boxes: str = "all_template") -> ScoreboardCedResult:
    if (extract_scope or "").strip().lower() in {"our_only", "own_team", "ally_only", "fast_our_only"}:
        return parse_scoreboard_ced_fast(image_bytes, calibration_template=calibration_template, calibration_frame=calibration_frame, calibration_mode=calibration_mode, our_team=our_team, extract_scope=extract_scope, template_priority=template_priority, debug_boxes=debug_boxes)
    original = read_image_bytes(image_bytes)
    has_calibration = bool(calibration_template and calibration_template.strip())
    calibration_mode = (calibration_mode or "table_lock").strip().lower()
    if calibration_mode not in {"table_lock", "content_frame", "strict_image", "auto"}:
        calibration_mode = "table_lock"
    our_team = "red" if str(our_team).lower() == "red" else "blue"
    extract_scope = (extract_scope or "our_only").strip().lower()

    if has_calibration:
        # 0.9E: tre modalità chiare.
        # strict_image = coordinate sul file intero; content_frame = coordinate su content frame;
        # table_lock = usa il template per i riquadri tabella e ricostruisce le celle.
        img, _ = resize_long_edge(original, target=1920)
        client_frame = _client_frame_to_pixels(calibration_frame, img.shape[1], img.shape[0])
        if client_frame is not None:
            fx, fy, fw, fh = client_frame
            frame_conf, frame_reason = (1.0, "client_frontend_frame")
        elif calibration_mode == "strict_image":
            fx, fy, fw, fh, frame_conf, frame_reason = (0, 0, img.shape[1], img.shape[0], 1.0, "strict_full_image")
        else:
            fx, fy, fw, fh, frame_conf, frame_reason = detect_content_frame(img)
        content_frame = (fx, fy, fw, fh)
    else:
        trimmed, _ = trim_black_borders(original)
        img, _ = resize_long_edge(trimmed, target=1920)
        fx, fy, fw, fh, frame_conf, frame_reason = (0, 0, img.shape[1], img.shape[0], 1.0, 'auto_trim')
        content_frame = (fx, fy, fw, fh)

    layout = detect_ced_layout(img)
    layout, template_meta = _apply_calibration_template(layout, calibration_template, content_frame=content_frame)
    if has_calibration and calibration_mode == "table_lock":
        layout = _rebuild_cells_from_team_tables(layout)
    layout.warnings.append(f"Content frame OCR: x={fx}, y={fy}, w={fw}, h={fh}, conf={frame_conf:.2f}, reason={frame_reason}, calibration_mode={calibration_mode}.")
    boxes = layout.boxes
    status = engine_status()
    if not (status.get("tesseract_available") or status.get("google_vision_api_key") or status.get("google_application_credentials") or status.get("paddleocr_available")):
        layout.warnings.append("Nessun motore OCR operativo: installa Tesseract oppure configura Google Vision/PaddleOCR. Il sistema non importerà valori finti.")

    result_box = find_box(boxes, "result_label")
    result_full_box = find_box(boxes, "result_score_full")
    blue_score_box = find_box(boxes, "blue_score", "blue")
    red_score_box = find_box(boxes, "red_score", "red")
    mode_box = find_box(boxes, "mode_map")
    datetime_box = find_box(boxes, "match_datetime")

    raw_parts: list[str] = []

    result_text = ""
    result_conf = 0.0
    if result_box:
        result_crop = crop_box(img, _box_tuple(result_box), pad=4)
        result_text, result_conf, _ = read_text_hybrid(result_crop, prefer_cloud=True)
        raw_parts.append(f"[result_label] {result_text}")

    result_full_text = ""
    result_full_conf = 0.0
    if result_full_box:
        full_crop = crop_box(img, _box_tuple(result_full_box), pad=4)
        result_full_text, result_full_conf, _ = read_text_hybrid(full_crop, prefer_cloud=True)
        raw_parts.append(f"[result_score_full] {result_full_text}")

    blue_score = None
    red_score = None
    score_confs: list[float] = []
    score_diagnostics: dict = {
        "policy": "Score match accepted from header/color or high-confidence boxes. CED uses 0..7; Postazione/Hardpoint uses objective score up to 300. Final winner team is explicit.",
        "calibration_mode": calibration_mode,
        "our_team": our_team,
        "extract_scope": extract_scope,
        "header_text": f"{result_text}\n{result_full_text}",
        "accepted_candidates": [],
        "rejected_candidates": [],
        "ocr_engines": engine_status(),
        "calibration_template": template_meta or {},
    }

    color_result_hint = _detect_result_color(img)
    text_result_hint = _detect_result(f"{result_text}\n{result_full_text}", None, None)
    result_hint = text_result_hint or color_result_hint
    score_diagnostics["result_hint"] = result_hint

    text_blue, text_red = _extract_ced_score_from_text(f"{result_text}\n{result_full_text}")
    cand_b, cand_r = _validate_ced_score_pair(result_hint, text_blue, text_red, "header_text", score_diagnostics)
    if cand_b is not None and cand_r is not None:
        blue_score, red_score = cand_b, cand_r
        raw_parts.append(f"[score_from_header_text ACCEPTED] {blue_score}:{red_score}")
    else:
        color_blue, color_red, color_debug = _read_ced_score_color(img)
        raw_parts.extend(f"[score_color] {x}" for x in color_debug)
        cand_b, cand_r = _validate_ced_score_pair(result_hint, color_blue, color_red, "header_color_components", score_diagnostics)
        if cand_b is not None and cand_r is not None:
            blue_score, red_score = cand_b, cand_r
            raw_parts.append(f"[score_from_header_color ACCEPTED] {blue_score}:{red_score}")

    # Box singoli: solo diagnostica, non devono sovrascrivere lo score se incoerenti.
    box_blue = box_red = None
    if blue_score_box:
        t, c, eng = read_numeric_hybrid(crop_box(img, _box_tuple(blue_score_box), pad=2), "score")
        box_blue = parse_int(t, 0, 7)
        score_confs.append(c)
        raw_parts.append(f"[blue_score_box diagnostic {eng}] {t} -> {box_blue}")
    if red_score_box:
        t, c, eng = read_numeric_hybrid(crop_box(img, _box_tuple(red_score_box), pad=2), "score")
        box_red = parse_int(t, 0, 7)
        score_confs.append(c)
        raw_parts.append(f"[red_score_box diagnostic {eng}] {t} -> {box_red}")
    if blue_score is None or red_score is None:
        box_conf = min(score_confs) if len(score_confs) >= 2 else 0.0
        if box_conf >= 0.62:
            cand_b, cand_r = _validate_ced_score_pair(result_hint, box_blue, box_red, "score_boxes_high_confidence", score_diagnostics)
            if cand_b is not None and cand_r is not None:
                blue_score, red_score = cand_b, cand_r
                raw_parts.append(f"[score_from_boxes ACCEPTED conf={box_conf:.2f}] {blue_score}:{red_score}")
        else:
            score_diagnostics.setdefault("rejected_candidates", []).append({"source": "score_boxes_diagnostic", "blue": box_blue, "red": box_red, "reason": f"low_confidence_{box_conf:.2f}"})

    # 1.0: header largo sotto VITTORIA. Il crop stretto singolo spesso non legge mappa/data.
    header_block_text = ""
    header_block_conf = 0.0
    try:
        hh, ww = img.shape[:2]
        header_block = img[int(hh * 0.000): int(hh * 0.245), int(ww * 0.000): int(ww * 0.475)]
        header_block_text, header_block_conf = tesseract_read_block(header_block)
        if header_block_text:
            raw_parts.append(f"[header_block_1_0] {header_block_text}")
    except Exception:
        header_block_text = ""
        header_block_conf = 0.0

    datetime_text = ""
    datetime_conf = 0.0
    match_datetime = None
    if datetime_box:
        datetime_text, datetime_conf, _ = read_text_hybrid(crop_box(img, _box_tuple(datetime_box), pad=4), prefer_cloud=True)
        match_datetime = _parse_match_datetime(datetime_text) or _parse_match_datetime(header_block_text)
        raw_parts.append(f"[match_datetime] {datetime_text} -> {match_datetime}")

    mode_text = ""
    mode_conf = 0.0
    if mode_box:
        mode_text, mode_conf, _ = read_text_hybrid(crop_box(img, _box_tuple(mode_box), pad=4), prefer_cloud=True)
        raw_parts.append(f"[mode_map] {mode_text}")

    mode, map_name = _mode_map("\n".join([mode_text, header_block_text]))
    if map_name is None:
        _, map_name = _mode_map(result_full_text)

    if mode == "POSTAZIONE":
        layout = _rebuild_cells_from_team_tables(layout, "POSTAZIONE")
        boxes = layout.boxes
        general_b, general_r = _extract_match_score_from_text("\n".join([result_text, result_full_text, header_block_text]), mode)
        cand_b, cand_r = _validate_score_pair(mode, result_hint, general_b, general_r, "postazione_header_score", score_diagnostics)
        if cand_b is not None and cand_r is not None:
            blue_score, red_score = cand_b, cand_r
            raw_parts.append(f"[postazione_score_header ACCEPTED] {blue_score}:{red_score}")

    visual_result_hint = _detect_result(f"{result_text}\n{result_full_text}", blue_score, red_score) or color_result_hint
    if color_result_hint and (visual_result_hint is None or visual_result_hint == "DRAW"):
        visual_result_hint = color_result_hint
        raw_parts.append(f"[result_color] {color_result_hint}")

    final_b, final_r = _validate_score_pair(mode, visual_result_hint, blue_score, red_score, "final_consistency", score_diagnostics)
    if final_b is None or final_r is None:
        blue_score = None
        red_score = None
        layout.warnings.append("Score CED non affidabile: lasciato vuoto per revisione manuale invece di importare un valore falso.")
    else:
        blue_score, red_score = final_b, final_r

    winning_team = _winner_from_scores(blue_score, red_score, visual_result_hint)
    result = _result_for_our_team(winning_team, our_team) or visual_result_hint
    score_diagnostics["winning_team"] = winning_team
    score_diagnostics["result_for_our_team"] = result
    score_diagnostics["player_numeric_policy"] = "2.0: punteggio player e impatto disattivati; importa solo Kill/Death/Assist. Ranking 1-5 preservato; top 1/2/3 diventano Gold/Silver/Bronze."
    layout.warnings.append("2.0 policy: punteggio player e impatto disattivati. Import usa Kill / Death / Assist + classifica 1-5; Gold=1°, Silver=2°, Bronze=3°.")

    teams: dict[str, list[OcrPlayerRow]] = {"blue": [], "red": []}
    numeric_confs: list[float] = score_confs[:]
    text_confs: list[float] = [result_conf, mode_conf, datetime_conf, header_block_conf]
    teams_to_parse = (our_team,) if extract_scope in {"our_only", "own_team", "ally_only"} else ("blue", "red")
    if extract_scope in {"our_only", "own_team", "ally_only"}:
        layout.warnings.append(f"V4.4 fast import: lette solo le statistiche del nostro team ({our_team}); avversari salvati solo come clan/score/esito.")

    for team in teams_to_parse:
        for row in range(1, 6):
            nick = ""
            score = kills = deaths = assists = impact = 0
            row_boxes = []
            confidence_parts: list[float] = []

            nick_box = find_box(boxes, "nickname", team, row)
            score_box = find_box(boxes, "score", team, row)
            kda_box = find_box(boxes, "kda", team, row)
            impact_box = find_box(boxes, "impact", team, row)

            if nick_box:
                nick_text, nick_conf, engine = read_text_hybrid(crop_box(img, _box_tuple(nick_box), pad=4), prefer_cloud=True)
                nick = " ".join(nick_text.splitlines()).strip()
                confidence_parts.append(nick_conf)
                text_confs.append(nick_conf)
                row_boxes.append(nick_box)
                raw_parts.append(f"[{team} r{row} nick {engine}] {nick}")

            # 1.0: lettura SOLO Kill / Death / Assist.
            # Score player e impatto sono ignorati perché confondono OCR e non servono al flusso attuale.
            score = 0
            impact = 0
            if kda_box:
                kda_crop = crop_box(img, _box_tuple(kda_box), pad=3)
                k2, d2, a2, c, kda_raw, kda_candidates = _read_kda_cell_robust(kda_crop, mode)
                kills, deaths, assists = k2, d2, a2
                confidence_parts.append(c)
                numeric_confs.append(c)
                row_boxes.append(kda_box)
                raw_parts.append(f"[{team} r{row} KDA_ONLY_1_0] {kda_raw} -> kill={k2}, death={d2}, assist={a2}, candidates={kda_candidates[:8]}")
            else:
                raw_parts.append(f"[{team} r{row} KDA_ONLY_1_0] kda_box_missing")

            # Coerenza solo CED: in Postazione/Hardpoint le death possono essere alte.
            if mode == "CED" and blue_score is not None and red_score is not None:
                max_round_deaths = max(blue_score, red_score, 1)
                if deaths > max_round_deaths:
                    raw_parts.append(f"[{team} r{row} death_consistency] death {deaths} > rounds {max_round_deaths}: corretto a {max_round_deaths}")
                    deaths = max_round_deaths

            mvp_label = None
            if row == 1:
                if winning_team == team:
                    mvp_label = "MVP_WIN"
                elif winning_team in ("blue", "red"):
                    mvp_label = "MVP_LOSE"

            row_conf = sum(confidence_parts) / len(confidence_parts) if confidence_parts else 0.0
            teams[team].append(OcrPlayerRow(
                rank=row,
                nickname_ocr=nick,
                score=score,
                kills=kills,
                deaths=deaths,
                assists=assists,
                impact=impact,
                mvp_label=mvp_label,
                confidence=round(row_conf, 3),
                boxes=row_boxes,
            ))

    numeric_conf = sum(numeric_confs) / len(numeric_confs) if numeric_confs else 0.0
    ocr_conf = (sum(text_confs) / len(text_confs) if text_confs else 0.0) * 0.35 + numeric_conf * 0.65
    needs_review = layout.layout_confidence < 0.70 or ocr_conf < 0.55 or result is None or blue_score is None or red_score is None

    return ScoreboardCedResult(
        result=result,
        winning_team=winning_team,
        our_team=our_team,
        blue_score=blue_score,
        red_score=red_score,
        mode=mode,
        map=map_name,
        match_datetime=match_datetime,
        layout_confidence=round(layout.layout_confidence, 3),
        ocr_confidence=round(ocr_conf, 3),
        needs_manual_review=needs_review,
        teams=teams,
        boxes=boxes,
        warnings=layout.warnings,
        score_diagnostics=score_diagnostics,
        raw_text="\n".join(raw_parts),
    )
