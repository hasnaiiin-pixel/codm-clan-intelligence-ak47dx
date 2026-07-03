from __future__ import annotations

import cv2
import numpy as np
from dataclasses import dataclass
from app.models import OcrBox


@dataclass
class Layout:
    image_w: int
    image_h: int
    boxes: list[OcrBox]
    layout_confidence: float
    warnings: list[str]


def make_box(name: str, role: str, team: str | None, row: int | None, x: int, y: int, w: int, h: int, iw: int, ih: int, confidence: float = 0.0) -> OcrBox:
    x = max(0, min(x, iw - 1))
    y = max(0, min(y, ih - 1))
    w = max(1, min(w, iw - x))
    h = max(1, min(h, ih - y))
    return OcrBox(
        name=name,
        role=role,
        team=team,
        row=row,
        x=x,
        y=y,
        w=w,
        h=h,
        x_norm=round(x / iw, 6),
        y_norm=round(y / ih, 6),
        w_norm=round(w / iw, 6),
        h_norm=round(h / ih, 6),
        confidence=confidence,
    )


def _largest_rect_from_mask(mask: np.ndarray, min_area: int) -> tuple[int, int, int, int] | None:
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    candidates: list[tuple[int, int, int, int, int]] = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        area = w * h
        if area >= min_area:
            candidates.append((area, x, y, w, h))
    if not candidates:
        return None
    _, x, y, w, h = max(candidates, key=lambda t: t[0])
    return x, y, w, h


def _find_team_tables(img: np.ndarray) -> tuple[tuple[int, int, int, int], tuple[int, int, int, int], float, list[str]]:
    h, w = img.shape[:2]
    warnings: list[str] = []
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    # CODM scoreboard: pannello blu/ciano a sinistra, rosso a destra.
    # FIX3: non cerchiamo più su tutta l'immagine, perché il background CODM può essere blu/rosso
    # e faceva partire la tabella da y=0. Cerchiamo solo nella fascia reale scoreboard.
    y_search0 = int(h * 0.20)
    y_search1 = int(h * 0.86)

    blue_mask = cv2.inRange(hsv, np.array([82, 35, 25]), np.array([122, 255, 255]))
    red_mask_1 = cv2.inRange(hsv, np.array([0, 35, 25]), np.array([15, 255, 255]))
    red_mask_2 = cv2.inRange(hsv, np.array([160, 35, 25]), np.array([179, 255, 255]))
    red_mask = cv2.bitwise_or(red_mask_1, red_mask_2)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 9))
    blue_mask = cv2.morphologyEx(blue_mask, cv2.MORPH_CLOSE, kernel)
    red_mask = cv2.morphologyEx(red_mask, cv2.MORPH_CLOSE, kernel)

    min_area = int(w * h * 0.010)
    blue_rect = _largest_rect_from_mask(blue_mask[y_search0:y_search1, : int(w * 0.58)], min_area)
    red_rect = _largest_rect_from_mask(red_mask[y_search0:y_search1, int(w * 0.42):], min_area)

    confidence = 0.35
    if blue_rect:
        bx, by, bw, bh = blue_rect
        by += y_search0
        blue_raw = (max(0, bx - int(w * 0.010)), max(0, by - int(h * 0.010)), min(int(w * 0.58), bw + int(w * 0.025)), min(int(h * 0.70), bh + int(h * 0.025)))
        confidence += 0.25
    else:
        warnings.append("Tabella blu non trovata con colore: uso fallback proporzionale.")
        blue_raw = (0, int(h * 0.23), int(w * 0.50), int(h * 0.60))

    if red_rect:
        rx, ry, rw, rh = red_rect
        rx += int(w * 0.42)
        ry += y_search0
        red_raw = (max(int(w * 0.45), rx - int(w * 0.010)), max(0, ry - int(h * 0.010)), min(int(w * 0.55), rw + int(w * 0.025)), min(int(h * 0.70), rh + int(h * 0.025)))
        confidence += 0.25
    else:
        warnings.append("Tabella rossa non trovata con colore: uso fallback proporzionale.")
        red_raw = (int(w * 0.50), int(h * 0.23), int(w * 0.50), int(h * 0.60))

    # FIX3: allinea tabella sulle intestazioni vere. Se un colore parte troppo in alto,
    # usa il top più basso tra blu/rosso perché è più probabile che corrisponda all'header tabella.
    top = max(blue_raw[1], red_raw[1])
    bottom = min(blue_raw[1] + blue_raw[3], red_raw[1] + red_raw[3])
    if bottom - top < int(h * 0.45):
        top = int(h * 0.235)
        bottom = int(h * 0.825)

    blue = (0, top, int(w * 0.50), bottom - top)
    red = (int(w * 0.50), top, int(w * 0.50), bottom - top)

    return blue, red, min(confidence, 0.95), warnings

def detect_ced_layout(img: np.ndarray) -> Layout:
    ih, iw = img.shape[:2]
    blue_table, red_table, confidence, warnings = _find_team_tables(img)
    boxes: list[OcrBox] = []

    # Header risultato: rimane vicino alto sinistra ma relativo al gioco normalizzato.
    boxes.append(make_box("result_label", "result_label", None, None, int(iw * 0.006), int(ih * 0.02), int(iw * 0.13), int(ih * 0.10), iw, ih, 0.70))
    boxes.append(make_box("result_score_full", "result_score_full", None, None, int(iw * 0.000), int(ih * 0.018), int(iw * 0.265), int(ih * 0.115), iw, ih, 0.78))
    boxes.append(make_box("blue_score", "blue_score", "blue", None, int(iw * 0.112), int(ih * 0.040), int(iw * 0.050), int(ih * 0.070), iw, ih, 0.70))
    boxes.append(make_box("red_score", "red_score", "red", None, int(iw * 0.178), int(ih * 0.040), int(iw * 0.050), int(ih * 0.070), iw, ih, 0.70))
    boxes.append(make_box("match_datetime", "match_datetime", None, None, int(iw * 0.004), int(ih * 0.104), int(iw * 0.260), int(ih * 0.038), iw, ih, 0.65))
    boxes.append(make_box("mode_map", "mode_map", None, None, int(iw * 0.002), int(ih * 0.136), int(iw * 0.33), int(ih * 0.075), iw, ih, 0.65))

    bx, by, bw, bh = blue_table
    rx, ry, rw, rh = red_table
    boxes.append(make_box("blue_table", "team_table", "blue", None, bx, by, bw, bh, iw, ih, confidence))
    boxes.append(make_box("red_table", "team_table", "red", None, rx, ry, rw, rh, iw, ih, confidence))

    def add_team_cells(team: str, table: tuple[int, int, int, int]) -> None:
        tx, ty, tw, th = table
        # FIX3: l'header della tabella CODM CED è alto circa 14-16% della tabella rilevata.
        header_h = int(th * 0.145)
        usable_y = ty + header_h
        usable_h = th - header_h
        row_h = usable_h / 5.0
        # Fractions derived from CODM CED scoreboard columns.
        col = {
            "nickname": (0.115, 0.270),
            "score": (0.435, 0.125),
            "kda": (0.610, 0.145),
            # FIX3: il vecchio crop partiva troppo a destra e leggeva solo l'ultima cifra di IMPATTO.
            "impact": (0.770, 0.205),
        }
        for idx in range(5):
            y = int(usable_y + idx * row_h)
            h = int(row_h)
            boxes.append(make_box(f"{team}_row_{idx+1}", "player_row", team, idx + 1, tx, y, tw, h, iw, ih, confidence))
            for role, (cx, cw) in col.items():
                boxes.append(make_box(f"{team}_{idx+1}_{role}", role, team, idx + 1, int(tx + tw * cx), y, int(tw * cw), h, iw, ih, confidence))

    add_team_cells("blue", blue_table)
    add_team_cells("red", red_table)

    return Layout(image_w=iw, image_h=ih, boxes=boxes, layout_confidence=confidence, warnings=warnings)


def find_box(boxes: list[OcrBox], role: str, team: str | None = None, row: int | None = None) -> OcrBox | None:
    for b in boxes:
        if b.role == role and (team is None or b.team == team) and (row is None or b.row == row):
            return b
    return None
