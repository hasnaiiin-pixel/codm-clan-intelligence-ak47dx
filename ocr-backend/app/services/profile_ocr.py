from __future__ import annotations

import json
import re
from typing import Optional

from app.models import OcrBox, ProfileOcrResult
from app.services.detector import make_box
from app.services.image_utils import crop_box, read_image_bytes, resize_long_edge, detect_content_frame
from app.services.ocr_engines import read_text_hybrid, numeric_ocr_candidates, vote_int_from_candidates


def _client_frame_to_pixels(calibration_frame: str | None, img_w: int, img_h: int) -> tuple[int, int, int, int] | None:
    if not calibration_frame:
        return None
    try:
        parsed = json.loads(calibration_frame)
        x = float(parsed.get("x", 0))
        y = float(parsed.get("y", 0))
        w = float(parsed.get("w", 1))
        h = float(parsed.get("h", 1))
        if w <= 0.45 or h <= 0.45:
            return None
        px = max(0, min(img_w - 1, int(round(x * img_w))))
        py = max(0, min(img_h - 1, int(round(y * img_h))))
        pw = max(1, min(img_w - px, int(round(w * img_w))))
        ph = max(1, min(img_h - py, int(round(h * img_h))))
        return px, py, pw, ph
    except Exception:
        return None


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
            boxes.append(make_box(f"profile_cal_{region.get('name', role)}", role, None, None, x, y, w, h, img_w, img_h, 0.99))
        warnings.append(f"Template profilo attivo: {len(boxes)} riquadri applicati ({meta.get('phoneProfile', 'telefono non indicato')}).")
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


def _read_number_box(img, box: OcrBox, min_value: int = 0, max_value: int = 999999, prefer_nonzero: bool = False):
    # V5.9: crop più tollerante per profilo. I numeri piccoli CODM vengono tagliati spesso dal box.
    crop = crop_box(img, (box.x, box.y, box.w, box.h), pad=max(6, int(max(box.w, box.h) * 0.08)))
    cands = numeric_ocr_candidates(crop, "number")
    value, conf, scored = vote_int_from_candidates(cands, min_value, max_value, prefer_nonzero=prefer_nonzero)
    return (value if scored else None), conf, scored[:20]


def parse_profile(image_bytes: bytes, calibration_template: str | None = None, calibration_frame: str | None = None, template_phone: str | None = None, template_slot: str | None = None, import_type: str | None = None) -> ProfileOcrResult:
    original = read_image_bytes(image_bytes)
    # Non toccare import partite: questa modifica è solo profilo.
    img, _ = resize_long_edge(original, target=1920)
    detected_fx, detected_fy, detected_fw, detected_fh, frame_conf, frame_reason = detect_content_frame(img)
    client_frame = _client_frame_to_pixels(calibration_frame, img.shape[1], img.shape[0])
    if client_frame is not None:
        fx, fy, fw, fh = client_frame
        frame_reason = "frontend_profile_frame_v5_9"
        frame_conf = max(frame_conf, 0.99)
    else:
        fx, fy, fw, fh = detected_fx, detected_fy, detected_fw, detected_fh
    boxes, meta, warnings = _boxes_from_template(img.shape[1], img.shape[0], calibration_template, (fx, fy, fw, fh))
    if template_phone or template_slot:
        warnings.append(f"Template profilo selezionato: telefono={template_phone or '-'}, template={template_slot or '-'}.")
    warnings.append(f"Content frame profilo V5.9: x={fx}, y={fy}, w={fw}, h={fh}, conf={frame_conf:.2f}, reason={frame_reason}.")

    raw_parts: list[str] = []
    diagnostics = {"calibration_template": meta, "numeric_candidates": {}}
    confidences: list[float] = []

    nickname = ""
    uid = ""
    level: Optional[int] = None
    likes: Optional[int] = None
    rank_text = ""
    legendary_mp = legendary_br = legendary_dmz = legendary_zombie = None

    box = _find_box(boxes, "nickname")
    if box:
        text, conf, engine = read_text_hybrid(crop_box(img, (box.x, box.y, box.w, box.h), pad=3), prefer_cloud=True)
        nickname = _clean_nickname(text)
        raw_parts.append(f"[nickname {engine}] {text} -> {nickname}")
        confidences.append(conf)

    box = _find_box(boxes, "uid")
    if box:
        value, conf, scored = _read_number_box(img, box, 0, 9999999999999999999999)
        uid = str(value or "")
        diagnostics["numeric_candidates"]["uid"] = scored
        raw_parts.append(f"[uid VOTE] -> {uid} candidates={scored}")
        confidences.append(conf)

    for role in ["level", "likes", "legendary_mp", "legendary_br", "legendary_dmz", "legendary_zombie"]:
        box = _find_box(boxes, role)
        if not box:
            continue
        max_v = 10000 if role.startswith("legendary") else (1000 if role == "level" else 999999)
        value, conf, scored = _read_number_box(img, box, 0, max_v, prefer_nonzero=False)
        diagnostics["numeric_candidates"][role] = scored
        raw_parts.append(f"[{role} VOTE] -> {value} candidates={scored}")
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
        text, conf, engine = read_text_hybrid(crop_box(img, (box.x, box.y, box.w, box.h), pad=3), prefer_cloud=True)
        rank_text = " ".join(text.split())
        raw_parts.append(f"[rank_text {engine}] {rank_text}")
        confidences.append(conf)

    ocr_conf = sum(confidences) / len(confidences) if confidences else 0.0
    if boxes and ocr_conf <= 0.05:
        warnings.append("V5.9: i riquadri sono stati applicati ma Tesseract non ha letto numeri sicuri. Usa centratura manuale o allarga i box in calibrazione; il salvataggio manuale resta disponibile.")
    needs = ocr_conf < 0.55 or not boxes
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
