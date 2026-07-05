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


PROFILE_ENGINE_TAG = "V5.6_PROFILE_FASTLANE"


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
    }
    return mapping.get(upper)


def _boxes_from_template(img_w: int, img_h: int, calibration_template: str | None, content_frame: tuple[int, int, int, int]) -> tuple[list[OcrBox], dict, list[str]]:
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
        warnings.append(f"Template profilo attivo: {len(boxes)} riquadri applicati ({meta.get('phoneProfile', 'telefono non indicato')}).")
        warnings.append("V5.6 Profile FastLane: health non bloccante, lettura numerica rapida per Leggendario/UID/livello/like, niente motore OCR pesante.")
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


def _prep_numeric_variants(crop: np.ndarray, tiny: bool = False) -> list[tuple[str, np.ndarray, float]]:
    if crop.size == 0:
        return []
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    gray = cv2.copyMakeBorder(gray, 4, 4, 4, 4, cv2.BORDER_REPLICATE)
    clahe = cv2.createCLAHE(clipLimit=3.2 if tiny else 2.6, tileGridSize=(8, 8)).apply(gray)
    blur = cv2.GaussianBlur(clahe, (0, 0), 0.8)
    sharp = cv2.addWeighted(clahe, 1.7, blur, -0.7, 0)
    variants: list[tuple[str, np.ndarray, float]] = [("sharp", sharp, 4.8 if tiny else 3.8)]
    # Seconda variante solo per i numeri piccoli Leggendario: migliora precisione senza moltiplicare troppo i tempi.
    if tiny:
        _, bw = cv2.threshold(sharp, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        variants.append(("bw", bw, 5.8))
    return variants


def _read_number_box_fast(img: np.ndarray, box: OcrBox, min_value: int = 0, max_value: int = 999999, prefer_nonzero: bool = False, tiny: bool = False):
    crop = crop_box(img, (box.x, box.y, box.w, box.h), pad=3 if tiny else 2)
    if crop.size == 0 or not TESSERACT_PATH:
        return None, 0.0, []
    config = "--psm 7 -c tessedit_char_whitelist=0123456789OOSSBGZIl|"
    scored: list[dict] = []
    for name, base, scale in _prep_numeric_variants(crop, tiny=tiny):
        proc = cv2.resize(base, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        try:
            text = pytesseract.image_to_string(proc, lang="eng", config=config, timeout=1).strip()
        except Exception as exc:
            scored.append({"text": "", "conf": 0.0, "method": name, "scale": scale, "error": str(exc)[:180]})
            continue
        cleaned = clean_number_text(text)
        nums = [int(x) for x in re.findall(r"\d{1,8}", cleaned)]
        for n in nums:
            if min_value <= n <= max_value:
                conf = 0.62
                if re.fullmatch(r"\s*\d+\s*", cleaned):
                    conf += 0.16
                if tiny and 0 <= n <= 9999:
                    conf += 0.08
                if prefer_nonzero and n == 0:
                    conf -= 0.18
                scored.append({"text": text, "cleaned": cleaned, "value": n, "conf": round(conf, 3), "method": name, "scale": scale})
    valid = [x for x in scored if "value" in x]
    if not valid:
        return None, 0.0, scored[:12]
    # Voto per frequenza, poi confidenza. Non prende automaticamente il numero più alto: evita errori UID/icone.
    by_value: dict[int, list[dict]] = {}
    for item in valid:
        by_value.setdefault(int(item["value"]), []).append(item)
    ranked = []
    for value, items in by_value.items():
        ranked.append((value, len(items), max(float(i.get("conf", 0.0)) for i in items), items))
    ranked.sort(key=lambda x: (x[1], x[2], 1 if x[0] != 0 else 0), reverse=True)
    value, count, best_conf, _items = ranked[0]
    return int(value), min(0.95, max(best_conf, 0.46 + 0.12 * count)), valid[:20]


def _read_text_box_fast(img: np.ndarray, box: OcrBox, role: str):
    crop = crop_box(img, (box.x, box.y, box.w, box.h), pad=3)
    if crop.size == 0:
        return "", 0.0, "none"
    # Solo Tesseract locale: niente Google/Paddle in profilo FastLane, così Render non si blocca.
    text, conf = tesseract_read(crop, "text")
    if role == "nickname":
        text = _clean_nickname(text)
    else:
        text = " ".join(text.split())
    return text, conf, "tesseract_fast"


def parse_profile(image_bytes: bytes, calibration_template: str | None = None) -> ProfileOcrResult:
    original = read_image_bytes(image_bytes)
    # V5.6: profilo più leggero di scoreboard. 1600 mantiene i numeri leggibili e riduce i tempi su Render.
    img, _ = resize_long_edge(original, target=1600)
    fx, fy, fw, fh, frame_conf, frame_reason = detect_content_frame(img)
    boxes, meta, warnings = _boxes_from_template(img.shape[1], img.shape[0], calibration_template, (fx, fy, fw, fh))
    warnings.append(f"Content frame profilo: x={fx}, y={fy}, w={fw}, h={fh}, conf={frame_conf:.2f}, reason={frame_reason}.")

    raw_parts: list[str] = []
    diagnostics = {"calibration_template": meta, "numeric_candidates": {}, "profile_engine": PROFILE_ENGINE_TAG}
    confidences: list[float] = []

    nickname = ""
    uid = ""
    level: Optional[int] = None
    likes: Optional[int] = None
    rank_text = ""
    legendary_mp = legendary_br = legendary_dmz = legendary_zombie = None

    box = _find_box(boxes, "nickname")
    if box:
        text, conf, engine = _read_text_box_fast(img, box, "nickname")
        nickname = text
        raw_parts.append(f"[V5.6 nickname {engine}] -> {nickname}")
        if conf:
            confidences.append(conf)

    box = _find_box(boxes, "uid")
    if box:
        value, conf, scored = _read_number_box_fast(img, box, 0, 999999999999999999, tiny=False)
        uid = str(value or "")
        diagnostics["numeric_candidates"]["uid"] = scored
        raw_parts.append(f"[V5.6 uid FAST] -> {uid} candidates={scored}")
        if conf:
            confidences.append(conf)

    for role in ["level", "likes", "legendary_mp", "legendary_br", "legendary_dmz", "legendary_zombie"]:
        box = _find_box(boxes, role)
        if not box:
            continue
        is_legendary = role.startswith("legendary")
        max_v = 10000 if is_legendary else (1000 if role == "level" else 999999)
        value, conf, scored = _read_number_box_fast(img, box, 0, max_v, prefer_nonzero=False, tiny=is_legendary)
        diagnostics["numeric_candidates"][role] = scored
        raw_parts.append(f"[V5.6 {role} FAST] -> {value} candidates={scored}")
        if conf:
            confidences.append(conf)
        if role == "level":
            level = value
        elif role == "likes":
            likes = value
        elif role == "legendary_mp":
            legendary_mp = value
        elif role == "legendary_br":
            legendary_br = value
        elif role == "legendary_dmz":
            legendary_dmz = value
        elif role == "legendary_zombie":
            legendary_zombie = value

    box = _find_box(boxes, "rank_text")
    if box:
        text, conf, engine = _read_text_box_fast(img, box, "rank_text")
        rank_text = text
        raw_parts.append(f"[V5.6 rank_text {engine}] {rank_text}")
        if conf:
            confidences.append(conf)

    # Leggendario basso non deve bloccare il salvataggio: lo marchiamo come revisione, non come errore.
    ocr_conf = sum(confidences) / len(confidences) if confidences else 0.0
    needs = ocr_conf < 0.45 or not boxes
    return ProfileOcrResult(
        nickname=nickname,
        uid=uid,
        level=level,
        likes=likes,
        rank_text=rank_text,
        legendary_mp=legendary_mp,
        legendary_br=legendary_br,
        legendary_dmz=legendary_dmz,
        legendary_zombie=legendary_zombie,
        layout_confidence=0.92 if boxes else 0.25,
        ocr_confidence=round(ocr_conf, 3),
        needs_manual_review=needs,
        boxes=boxes,
        warnings=warnings,
        diagnostics=diagnostics,
        raw_text="\n".join(raw_parts),
    )
