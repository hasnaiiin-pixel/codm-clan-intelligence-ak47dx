from __future__ import annotations

import json
import re
from typing import Optional

import cv2
import numpy as np
import pytesseract

from app.models import OcrBox, ProfileOcrResult
from app.services.detector import make_box
from app.services.image_utils import crop_box, read_image_bytes, resize_long_edge, detect_content_frame
from app.services.ocr_engines import TESSERACT_PATH, clean_number_text, tesseract_read


PROFILE_ENGINE_TAG = "V5.7_PROFILE_TEMPLATE_FRAME_OCR"


def _role_from_profile_name(name: str) -> str | None:
    upper = name.upper()
    mapping = {
        "PROFILE_BASE_NICKNAME": "nickname",
        "PROFILE_BASE_LEVEL": "level",
        "PROFILE_BASE_UID": "uid",
        "PROFILE_BASE_LIKES": "likes",
        "PROFILE_BASE_RANKS": "rank_text",
        "PROFILE_LEGENDARY_MG_COUNT": "legendary_mp",
        "PROFILE_LEGENDARY_BR_COUNT": "legendary_br",
        "PROFILE_LEGENDARY_DMZ_COUNT": "legendary_dmz",
        "PROFILE_LEGENDARY_ZOMBIE_COUNT": "legendary_zombie",
        "PROFILE_STATS_NUMBERS": "stats_numbers",
        "PROFILE_STATS_PANEL": "stats_panel",
    }
    return mapping.get(upper)


def _parse_client_frame(calibration_frame: str | None, img_w: int, img_h: int) -> tuple[int, int, int, int] | None:
    if not calibration_frame:
        return None
    try:
        data = json.loads(calibration_frame)
        if not isinstance(data, dict):
            return None
        x = float(data.get("x", 0))
        y = float(data.get("y", 0))
        w = float(data.get("w", 1))
        h = float(data.get("h", 1))
        if w <= 0.1 or h <= 0.1:
            return None
        ix = max(0, min(img_w - 1, int(round(x * img_w))))
        iy = max(0, min(img_h - 1, int(round(y * img_h))))
        iw = max(1, min(img_w - ix, int(round(w * img_w))))
        ih = max(1, min(img_h - iy, int(round(h * img_h))))
        return (ix, iy, iw, ih)
    except Exception:
        return None


def _boxes_from_template(img_w: int, img_h: int, calibration_template: str | None, content_frame: tuple[int, int, int, int], frame_label: str = "backend") -> tuple[list[OcrBox], dict, list[str]]:
    warnings: list[str] = []
    meta: dict = {}
    boxes: list[OcrBox] = []
    if not calibration_template:
        warnings.append("Template profilo non ricevuto: usa /calibration tipo Profilo base e salva i box Leggendario.")
        return boxes, meta, warnings
    try:
        parsed = json.loads(calibration_template)
        meta = parsed.get("meta", {}) if isinstance(parsed, dict) else {}
        regions = parsed.get("regions", parsed) if isinstance(parsed, dict) else parsed
        if not isinstance(regions, list):
            warnings.append("Template profilo non valido: manca regions.")
            return boxes, meta, warnings
        fx, fy, fw, fh = content_frame
        for region in regions:
            if not isinstance(region, dict):
                continue
            role = _role_from_profile_name(str(region.get("name", "")))
            if not role:
                continue
            x = int(fx + float(region.get("x", 0)) * fw)
            y = int(fy + float(region.get("y", 0)) * fh)
            w = int(float(region.get("w", 0.01)) * fw)
            h = int(float(region.get("h", 0.01)) * fh)
            if w <= 2 or h <= 2:
                continue
            boxes.append(make_box(f"profile_cal_{region.get('name', role)}", role, None, None, x, y, w, h, img_w, img_h, 0.99))
        warnings.append(f"Template profilo V5.7 attivo: {len(boxes)} riquadri applicati ({meta.get('phoneProfile', 'telefono non indicato')}) con frame {frame_label}.")
        warnings.append("V5.7 Profile OCR: usa il content frame frontend quando disponibile; fallback backend/full-frame; retry OCR numerico senza bloccare import partite.")
    except Exception as exc:
        warnings.append(f"Template profilo non applicato: {exc}")
    return boxes, meta, warnings


def _find_box(boxes: list[OcrBox], role: str) -> OcrBox | None:
    return next((b for b in boxes if b.role == role), None)


def _clean_nickname(text: str) -> str:
    lines = [re.sub(r"\s+", " ", x).strip() for x in text.splitlines()]
    candidates = []
    for line in lines:
        if not line or len(line) > 36:
            continue
        if re.search(r"UID|LEVEL|LIVELLO|LIKE|RANK|LEGEND|PARTITE", line, re.I):
            continue
        if re.search(r"[A-Za-z0-9ѦҞঐ]", line):
            candidates.append(line)
    return candidates[0] if candidates else ""


def _prep_numeric_variants(crop: np.ndarray, tiny: bool = False) -> list[tuple[str, np.ndarray, float, str]]:
    if crop.size == 0:
        return []
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    # bordi più grandi: i numeri profilo/leggendario sono piccoli e spesso tagliati dal box calibrato.
    gray = cv2.copyMakeBorder(gray, 10 if tiny else 8, 10 if tiny else 8, 12 if tiny else 8, 12 if tiny else 8, cv2.BORDER_REPLICATE)
    # scala prima e dopo: più robusto per Render/Tesseract.
    clahe = cv2.createCLAHE(clipLimit=3.6 if tiny else 3.0, tileGridSize=(8, 8)).apply(gray)
    blur = cv2.GaussianBlur(clahe, (0, 0), 0.75)
    sharp = cv2.addWeighted(clahe, 1.9, blur, -0.9, 0)
    variants: list[tuple[str, np.ndarray, float, str]] = []
    scales = (5.2, 7.2, 9.0) if tiny else (4.4, 6.2, 7.8)
    for scale in scales:
        variants.append(("gray", clahe, scale, "--psm 7"))
        variants.append(("sharp", sharp, scale, "--psm 7"))
    _, bw = cv2.threshold(sharp, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    inv = cv2.bitwise_not(bw)
    for scale in ((7.2, 9.5) if tiny else (5.8, 7.2)):
        variants.append(("bw", bw, scale, "--psm 7"))
        variants.append(("inv", inv, scale, "--psm 7"))
        variants.append(("bw_single", bw, scale, "--psm 10"))
        variants.append(("inv_single", inv, scale, "--psm 10"))
    return variants


def _score_candidate_text(raw: str, cleaned: str, value: int, conf_base: float, tiny: bool, prefer_nonzero: bool) -> float:
    conf = conf_base
    if re.fullmatch(r"\s*\d+\s*", cleaned):
        conf += 0.18
    if tiny and 0 <= value <= 9999:
        conf += 0.10
    if len(str(value)) >= 2:
        conf += 0.05
    if prefer_nonzero and value == 0:
        conf -= 0.22
    # se Tesseract ha letto solo caratteri simili a zero senza cifre reali, riduci.
    if raw and not re.search(r"\d", raw) and value == 0:
        conf -= 0.25
    return round(max(0.0, min(0.98, conf)), 3)


def _read_number_box_fast(img: np.ndarray, box: OcrBox, min_value: int = 0, max_value: int = 999999, prefer_nonzero: bool = False, tiny: bool = False):
    # Prima lettura sul box normale, poi fallback su box allargato.
    crops: list[tuple[str, np.ndarray]] = []
    crops.append(("box", crop_box(img, (box.x, box.y, box.w, box.h), pad=6 if tiny else 4)))
    ex = int(box.w * (0.38 if tiny else 0.18))
    ey = int(box.h * (0.50 if tiny else 0.25))
    crops.append(("wide", crop_box(img, (box.x - ex, box.y - ey, box.w + 2 * ex, box.h + 2 * ey), pad=2)))
    if not TESSERACT_PATH:
        return None, 0.0, [{"error": "tesseract_not_available"}]
    config_base = "-c tessedit_char_whitelist=0123456789OOSSBGZIl|"
    scored: list[dict] = []
    for crop_name, crop in crops:
        if crop.size == 0:
            continue
        for name, base, scale, psm in _prep_numeric_variants(crop, tiny=tiny):
            proc = cv2.resize(base, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
            config = f"{psm} {config_base}"
            try:
                text = pytesseract.image_to_string(proc, lang="eng", config=config, timeout=2.4).strip()
            except Exception as exc:
                scored.append({"text": "", "conf": 0.0, "method": f"{crop_name}:{name}", "scale": scale, "psm": psm, "error": str(exc)[:160]})
                continue
            cleaned = clean_number_text(text)
            nums = [int(x) for x in re.findall(r"\d{1,8}", cleaned)]
            # fallback: OCR legge spesso O/I/S/B senza convertirli bene se sono separati.
            if not nums and text:
                repaired = text.upper().translate(str.maketrans({"O": "0", "S": "5", "B": "8", "G": "6", "I": "1", "L": "1", "|": "1"}))
                nums = [int(x) for x in re.findall(r"\d{1,8}", repaired)]
                cleaned = repaired
            for n in nums:
                if min_value <= n <= max_value:
                    conf = _score_candidate_text(text, cleaned, n, 0.56, tiny, prefer_nonzero)
                    scored.append({"text": text, "cleaned": cleaned, "value": n, "conf": conf, "method": f"{crop_name}:{name}", "scale": scale, "psm": psm})
    valid = [x for x in scored if "value" in x]
    if not valid:
        return None, 0.0, scored[:24]
    by_value: dict[int, list[dict]] = {}
    for item in valid:
        by_value.setdefault(int(item["value"]), []).append(item)
    ranked = []
    for value, items in by_value.items():
        ranked.append((value, len(items), max(float(i.get("conf", 0.0)) for i in items), items))
    ranked.sort(key=lambda x: (x[1], x[2], 1 if x[0] != 0 else 0), reverse=True)
    value, count, best_conf, _items = ranked[0]
    return int(value), min(0.97, max(best_conf, 0.43 + 0.11 * count)), valid[:28]


def _read_text_box_fast(img: np.ndarray, box: OcrBox, role: str):
    crop = crop_box(img, (box.x, box.y, box.w, box.h), pad=5)
    if crop.size == 0:
        return "", 0.0, "none"
    text, conf = tesseract_read(crop, "text")
    if role == "nickname":
        text = _clean_nickname(text)
    else:
        text = " ".join(text.split())
    return text, conf, "tesseract_fast"


def _read_profile_with_boxes(img: np.ndarray, boxes: list[OcrBox]) -> dict:
    raw_parts: list[str] = []
    diagnostics = {"numeric_candidates": {}, "profile_engine": PROFILE_ENGINE_TAG}
    confidences: list[float] = []
    out: dict = {
        "nickname": "",
        "uid": "",
        "level": None,
        "likes": None,
        "rank_text": "",
        "legendary_mp": None,
        "legendary_br": None,
        "legendary_dmz": None,
        "legendary_zombie": None,
    }

    box = _find_box(boxes, "nickname")
    if box:
        text, conf, engine = _read_text_box_fast(img, box, "nickname")
        out["nickname"] = text
        raw_parts.append(f"[V5.7 nickname {engine}] -> {text}")
        if conf:
            confidences.append(conf)

    box = _find_box(boxes, "uid")
    if box:
        value, conf, scored = _read_number_box_fast(img, box, 0, 999999999999999999, tiny=False)
        out["uid"] = str(value or "")
        diagnostics["numeric_candidates"]["uid"] = scored
        raw_parts.append(f"[V5.7 uid] -> {out['uid']} candidates={scored}")
        if conf:
            confidences.append(conf)

    for role in ["level", "likes", "legendary_mp", "legendary_br", "legendary_dmz", "legendary_zombie"]:
        box = _find_box(boxes, role)
        if not box:
            continue
        is_legendary = role.startswith("legendary")
        max_v = 10000 if is_legendary else (1000 if role == "level" else 999999)
        value, conf, scored = _read_number_box_fast(img, box, 0, max_v, prefer_nonzero=is_legendary, tiny=is_legendary)
        diagnostics["numeric_candidates"][role] = scored
        raw_parts.append(f"[V5.7 {role}] -> {value} candidates={scored}")
        if conf:
            confidences.append(conf)
        out[role] = value

    box = _find_box(boxes, "rank_text")
    if box:
        text, conf, engine = _read_text_box_fast(img, box, "rank_text")
        out["rank_text"] = text
        raw_parts.append(f"[V5.7 rank_text {engine}] {text}")
        if conf:
            confidences.append(conf)

    out["ocr_confidence"] = sum(confidences) / len(confidences) if confidences else 0.0
    out["diagnostics"] = diagnostics
    out["raw_text"] = "\n".join(raw_parts)
    return out


def _value_count(result: dict) -> int:
    count = 0
    for key in ["nickname", "uid", "level", "likes", "rank_text", "legendary_mp", "legendary_br", "legendary_dmz", "legendary_zombie"]:
        v = result.get(key)
        if v not in (None, "", 0):
            count += 1
    return count


def parse_profile(image_bytes: bytes, calibration_template: str | None = None, calibration_frame: str | None = None, template_source: str | None = None) -> ProfileOcrResult:
    original = read_image_bytes(image_bytes)
    img, _ = resize_long_edge(original, target=1800)
    img_h, img_w = img.shape[:2]

    bx, by, bw, bh, frame_conf, frame_reason = detect_content_frame(img)
    client_frame = _parse_client_frame(calibration_frame, img_w, img_h)
    full_frame = (0, 0, img_w, img_h)

    strategies: list[tuple[str, tuple[int, int, int, int], float, str]] = []
    if client_frame:
        strategies.append(("frontend", client_frame, 0.99, "frontend_calibration_frame"))
    strategies.append(("backend", (bx, by, bw, bh), frame_conf, frame_reason))
    strategies.append(("full", full_frame, 0.70, "full_image_fallback"))

    best = None
    best_boxes: list[OcrBox] = []
    best_warnings: list[str] = []
    best_meta: dict = {}
    for label, frame, conf, reason in strategies:
        boxes, meta, warnings = _boxes_from_template(img_w, img_h, calibration_template, frame, label)
        result = _read_profile_with_boxes(img, boxes)
        score = _value_count(result) * 10.0 + float(result.get("ocr_confidence", 0.0))
        if best is None or score > best[0]:
            best = (score, label, frame, conf, reason, result)
            best_boxes = boxes
            best_warnings = warnings
            best_meta = meta
        # Se frontend legge almeno 4 campi, non sprechiamo tempo sugli altri.
        if label == "frontend" and _value_count(result) >= 4:
            break

    if best is None:
        best = (0.0, "none", full_frame, 0.0, "no_strategy", {"ocr_confidence": 0.0, "diagnostics": {}, "raw_text": ""})
    _score, used_label, used_frame, used_conf, used_reason, res = best
    warnings = list(best_warnings)
    warnings.append(f"Content frame profilo scelto: {used_label} x={used_frame[0]}, y={used_frame[1]}, w={used_frame[2]}, h={used_frame[3]}, conf={used_conf:.2f}, reason={used_reason}.")
    if template_source:
        warnings.append(f"Template source frontend: {template_source}.")
    if client_frame:
        warnings.append("V5.7: frame frontend ricevuto e usato come prima scelta; questo evita riquadri scivolati tra calibrazione e import profilo.")
    else:
        warnings.append("V5.7: frame frontend non ricevuto; usato fallback backend/full-frame.")

    diagnostics = dict(res.get("diagnostics", {}) or {})
    diagnostics["calibration_template"] = best_meta
    diagnostics["frame_strategy"] = used_label
    diagnostics["profile_engine"] = PROFILE_ENGINE_TAG

    ocr_conf = float(res.get("ocr_confidence", 0.0) or 0.0)
    needs = ocr_conf < 0.45 or not best_boxes
    return ProfileOcrResult(
        engine_version="2.0.12-v5-7-profile-template-frame-ocr-ak47dx",
        nickname=str(res.get("nickname") or ""),
        uid=str(res.get("uid") or ""),
        level=res.get("level"),
        likes=res.get("likes"),
        rank_text=str(res.get("rank_text") or ""),
        legendary_mp=res.get("legendary_mp"),
        legendary_br=res.get("legendary_br"),
        legendary_dmz=res.get("legendary_dmz"),
        legendary_zombie=res.get("legendary_zombie"),
        layout_confidence=0.94 if best_boxes else 0.25,
        ocr_confidence=round(ocr_conf, 3),
        needs_manual_review=needs,
        boxes=best_boxes,
        warnings=warnings,
        diagnostics=diagnostics,
        raw_text=str(res.get("raw_text") or ""),
    )
