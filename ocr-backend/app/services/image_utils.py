from __future__ import annotations

import cv2
import numpy as np
from PIL import Image
from io import BytesIO


def read_image_bytes(data: bytes) -> np.ndarray:
    pil = Image.open(BytesIO(data)).convert("RGB")
    arr = np.array(pil)
    return cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)


def trim_black_borders(img: np.ndarray) -> tuple[np.ndarray, tuple[int, int, int, int]]:
    """Rimuove bordi neri/margini, utile per screenshot da telefoni diversi."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    mask = gray > 12
    coords = cv2.findNonZero(mask.astype("uint8"))
    if coords is None:
        h, w = img.shape[:2]
        return img, (0, 0, w, h)
    x, y, w, h = cv2.boundingRect(coords)
    # Evita ritagli troppo aggressivi se immagine già completa.
    if w < img.shape[1] * 0.60 or h < img.shape[0] * 0.60:
        h0, w0 = img.shape[:2]
        return img, (0, 0, w0, h0)
    return img[y:y+h, x:x+w].copy(), (x, y, w, h)



def detect_content_frame(img: np.ndarray) -> tuple[int, int, int, int, float, str]:
    """Rileva il frame utile (non nero/non letterbox) su cui sono salvati i template 0.9E.
    Le coordinate di calibrazione sono riferite a questo frame, così restano stabili
    tra screenshot con bordi neri o crop leggermente diversi.
    """
    if img.size == 0:
        return (0, 0, 0, 0, 0.0, "empty")
    h0, w0 = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Maschera più robusta del solo gray>12: include testo/colori ma scarta bordi neri.
    b, g, r = cv2.split(img)
    maxc = np.maximum(np.maximum(r, g), b)
    minc = np.minimum(np.minimum(r, g), b)
    sat_like = maxc - minc
    mask = ((gray > 35) | ((gray > 14) & (sat_like > 18))).astype("uint8")
    coords = cv2.findNonZero(mask)
    if coords is None:
        return (0, 0, w0, h0, 1.0, "full_image_no_content_detected")
    x, y, w, h = cv2.boundingRect(coords)
    pad_x = max(1, int(w0 * 0.003))
    pad_y = max(1, int(h0 * 0.003))
    x = max(0, x - pad_x)
    y = max(0, y - pad_y)
    w = min(w0 - x, w + pad_x * 2)
    h = min(h0 - y, h + pad_y * 2)
    if w < w0 * 0.55 or h < h0 * 0.55:
        return (0, 0, w0, h0, 1.0, "full_image_frame_too_small")
    if w > w0 * 0.985 and h > h0 * 0.985:
        return (0, 0, w0, h0, 1.0, "full_image_almost_complete")
    conf = float(np.count_nonzero(mask)) / float(mask.size)
    return (x, y, w, h, max(0.55, min(0.99, conf * 4.0)), "detected_non_black_content_frame")


def resize_long_edge(img: np.ndarray, target: int = 1920) -> tuple[np.ndarray, float]:
    h, w = img.shape[:2]
    longest = max(h, w)
    if longest <= 0:
        return img, 1.0
    scale = target / float(longest)
    if 0.9 <= scale <= 1.1:
        return img, 1.0
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))
    return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_CUBIC), scale


def crop_box(img: np.ndarray, box: tuple[int, int, int, int], pad: int = 0) -> np.ndarray:
    h, w = img.shape[:2]
    x, y, bw, bh = box
    x1 = max(0, x - pad)
    y1 = max(0, y - pad)
    x2 = min(w, x + bw + pad)
    y2 = min(h, y + bh + pad)
    return img[y1:y2, x1:x2].copy()


def preprocess_for_ocr(img: np.ndarray, mode: str = "text", scale: float = 3.0) -> np.ndarray:
    if img.size == 0:
        return img
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    if scale and scale != 1.0:
        gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

    # Aumenta contrasto locale per testo chiaro CODM.
    clahe = cv2.createCLAHE(clipLimit=2.4, tileGridSize=(8, 8))
    gray = clahe.apply(gray)

    if mode == "score":
        # Score CODM: con CLAHE + scala alta Tesseract legge meglio 869/752/513.
        return gray

    if mode in ("number", "kda", "impact"):
        # KDA/impatto: soglia fissa mantiene slash e cifre sottili.
        _, th = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
        th = cv2.morphologyEx(th, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, 1)))
        return th

    # Testo/nickname: meno aggressivo per conservare simboli.
    gray = cv2.bilateralFilter(gray, 5, 50, 50)
    return gray
