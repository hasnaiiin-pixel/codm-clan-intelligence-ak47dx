from __future__ import annotations

import base64
import json
import os
import re
import shutil
from functools import lru_cache
from typing import Optional

import cv2
import numpy as np
import pytesseract
import requests
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

from app.services.image_utils import preprocess_for_ocr

COMMON_TESSERACT_PATHS = [
    r"C:\\Program Files\\Tesseract-OCR\\tesseract.exe",
    r"C:\\Program Files (x86)\\Tesseract-OCR\\tesseract.exe",
]


def configure_tesseract() -> Optional[str]:
    """Trova Tesseract su Windows senza pretendere che sia nel PATH."""
    explicit = os.environ.get("TESSERACT_CMD") or os.environ.get("TESSERACT_EXE")
    candidates = [explicit] if explicit else []
    candidates.extend(COMMON_TESSERACT_PATHS)
    path_from_env = shutil.which("tesseract")
    if path_from_env:
        candidates.insert(0, path_from_env)

    for candidate in candidates:
        if candidate and os.path.exists(candidate):
            pytesseract.pytesseract.tesseract_cmd = candidate
            return candidate
    return None


TESSERACT_PATH = configure_tesseract()


def engine_status() -> dict:
    return {
        "tesseract_available": bool(TESSERACT_PATH),
        "tesseract_path": TESSERACT_PATH,
        "google_vision_api_key": bool(os.environ.get("GOOGLE_VISION_API_KEY")),
        "google_application_credentials": bool(os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")),
        "paddleocr_available": _paddle_available(),
        "engine_order_text": ["google_vision", "paddleocr", "tesseract"],
        "engine_order_numeric": ["tesseract", "google_vision", "paddleocr"],
    }


def _tesseract_config(kind: str) -> str:
    if kind == "kda":
        return "--psm 6 -c tessedit_char_whitelist=0123456789/|IlOOSSBGZ"
    if kind in ("number", "score", "impact"):
        return "--psm 7 -c tessedit_char_whitelist=0123456789OOSSBGZIl"
    return "--psm 7"


def _safe_error(exc: Exception) -> str:
    return str(exc).replace("\n", " ")[:240]



def _tess_data_on_image(processed: np.ndarray, kind: str) -> tuple[str, float]:
    config = _tesseract_config(kind)
    lang = "eng+ita" if kind == "text" else "eng"
    data = pytesseract.image_to_data(processed, lang=lang, config=config, output_type=pytesseract.Output.DICT, timeout=2)
    words = [str(w).strip() for w in data.get("text", []) if str(w).strip()]
    confs: list[float] = []
    for c in data.get("conf", []):
        try:
            cf = float(c)
            if cf >= 0:
                confs.append(cf)
        except Exception:
            pass
    text_data = " ".join(words).strip()
    if text_data:
        return text_data, (sum(confs) / len(confs) / 100.0 if confs else 0.45)
    text_fallback = pytesseract.image_to_string(processed, lang=lang, config=config, timeout=2).strip()
    return text_fallback, (0.35 if text_fallback else 0.0)


def numeric_ocr_candidates(img: np.ndarray, kind: str = "number") -> list[dict]:
    """Legge un crop numerico in molte modalità e restituisce candidati reali.

    0.9D aveva un bug: la lista varianti veniva creata, ma il loop usava variabili
    non definite (base/name), quindi molti crop numerici tornavano senza candidati.
    0.9E ripristina il voto vero: più preprocess, più scale, normalizzazione e deduplica.
    """
    if img.size == 0 or not TESSERACT_PATH:
        return []
    candidates: list[dict] = []
    try:
        gray0 = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # Piccola pulizia bordi/scia; non tagliamo troppo perché slash KDA è sottile.
        gray0 = cv2.copyMakeBorder(gray0, 4, 4, 4, 4, cv2.BORDER_REPLICATE)
        clahe = cv2.createCLAHE(clipLimit=2.8, tileGridSize=(8, 8))
        clahe_gray = clahe.apply(gray0)
        blur = cv2.GaussianBlur(clahe_gray, (0, 0), 1.0)
        sharp = cv2.addWeighted(clahe_gray, 1.55, blur, -0.55, 0)
        # V4.3: K/D/A più robusto su screenshot mobile e Render.
        # Prima erano solo gray+sharp a scala singola: veloce, ma perdeva molte righe.
        # Ora usiamo anche soglie binarie/invertite e due scale, senza leggere score/impact.
        variants = [("gray", clahe_gray), ("sharp", sharp)]
        _, bw_otsu = cv2.threshold(clahe_gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        variants.append(("bin_otsu", bw_otsu))
        variants.append(("inv_otsu", cv2.bitwise_not(bw_otsu)))
        adaptive = cv2.adaptiveThreshold(clahe_gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 7)
        variants.append(("adaptive", adaptive))
        if kind == "kda":
            scales = (3.6, 4.8, 5.8)
        else:
            scales = (3.2, 4.8) if kind in ("score", "impact") else (3.2, 4.2)
        seen = set()
        for name, base in variants:
            for scale in scales:
                proc = cv2.resize(base, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC) if scale != 1.0 else base
                text, conf = _tess_data_on_image(proc, kind)
                text = (text or "").strip()
                if not text:
                    continue
                # Non scartare testo sporco: parse/vote decide. Dedup per testo e metodo.
                key = (name, round(scale, 2), text)
                if key in seen:
                    continue
                seen.add(key)
                candidates.append({"text": text, "conf": float(conf), "method": name, "scale": float(scale)})
    except Exception as exc:
        candidates.append({"text": "", "conf": 0.0, "method": "error", "scale": 0.0, "error": _safe_error(exc)})
    return candidates

def vote_int_from_candidates(candidates: list[dict], min_value: int = 0, max_value: int = 99999, prefer_nonzero: bool = False) -> tuple[int, float, list[dict]]:
    scored: list[dict] = []
    for cand in candidates:
        raw = str(cand.get("text", ""))
        cleaned = clean_number_text(raw)
        nums = [int(x) for x in re.findall(r"\d{1,6}", cleaned)]
        for n in nums:
            if min_value <= n <= max_value:
                score = float(cand.get("conf", 0.0))
                score += 0.10 if re.fullmatch(r"\s*\d+\s*", cleaned) else 0.0
                score += 0.04 if len(str(n)) >= 2 else 0.0
                if prefer_nonzero and n == 0:
                    score -= 0.10
                scored.append({**cand, "value": n, "vote_score": round(score, 4)})
    if not scored:
        return 0, 0.0, []
    # voto: stesso valore letto da più preprocess vince, poi confidence.
    by_value: dict[int, list[dict]] = {}
    for s in scored:
        by_value.setdefault(int(s["value"]), []).append(s)
    ranked = []
    for value, items in by_value.items():
        ranked.append((value, len(items), sum(float(i.get("vote_score", 0)) for i in items) / len(items), max(float(i.get("conf", 0)) for i in items), items))
    ranked.sort(key=lambda x: (x[1], x[2], x[3], x[0]), reverse=True)
    value, count, avg_score, best_conf, items = ranked[0]
    return int(value), max(float(best_conf), min(0.95, 0.38 + count * 0.08 + avg_score * 0.28)), scored


def vote_kda_from_candidates(candidates: list[dict]) -> tuple[tuple[int, int, int], float, list[dict]]:
    scored: list[dict] = []

    def normalize_kda_groups(k_txt: str, d_txt: str, a_txt: str) -> tuple[int, int, int] | None:
        """CODM spesso attacca il primo numero della colonna TIME alla terza cifra Assist.
        Esempi reali Postazione: 34/23/140 -> 34/23/14, 39/26/280 -> 39/26/28.
        """
        try:
            k = int(k_txt)
            d = int(d_txt)
            assist_options = [a_txt]
            if len(a_txt) >= 3:
                assist_options.extend([a_txt[:2], a_txt[:1]])
            for opt in assist_options:
                if not opt:
                    continue
                a = int(opt)
                if 0 <= k <= 120 and 0 <= d <= 120 and 0 <= a <= 120:
                    return k, d, a
        except Exception:
            return None
        return None

    for cand in candidates:
        raw = str(cand.get("text", ""))
        cleaned = clean_number_text(raw).replace("\\", "/").replace("|", "/").replace(" ", "")
        direct = re.search(r"(\d{1,3})/(\d{1,3})/(\d{1,4})", cleaned)
        if direct:
            kda = normalize_kda_groups(direct.group(1), direct.group(2), direct.group(3))
            if kda:
                scored.append({**cand, "kda": kda, "vote_score": float(cand.get("conf", 0.0)) + 0.24})
                continue
        nums = re.findall(r"\d{1,4}", cleaned)
        if len(nums) >= 3:
            kda = normalize_kda_groups(nums[0], nums[1], nums[2])
            if kda:
                scored.append({**cand, "kda": kda, "vote_score": float(cand.get("conf", 0.0))})
    if not scored:
        return (0, 0, 0), 0.0, []
    by_value: dict[tuple[int, int, int], list[dict]] = {}
    for s in scored:
        by_value.setdefault(tuple(s["kda"]), []).append(s)
    ranked = []
    for kda, items in by_value.items():
        ranked.append((kda, len(items), sum(float(i.get("vote_score", 0)) for i in items) / len(items), max(float(i.get("conf", 0)) for i in items), items))
    ranked.sort(key=lambda x: (x[1], x[2], x[3]), reverse=True)
    kda, count, avg_score, best_conf, items = ranked[0]
    return kda, max(float(best_conf), min(0.95, 0.40 + count * 0.08 + avg_score * 0.25)), scored


def tesseract_read(img: np.ndarray, kind: str = "text") -> tuple[str, float]:
    """OCR Tesseract sicuro: se non è installato non ritorna OCR_ERROR come testo giocatore."""
    if img.size == 0:
        return "", 0.0
    if not TESSERACT_PATH:
        return "", 0.0

    config = _tesseract_config(kind)
    lang = "eng+ita" if kind == "text" else "eng"

    def run_once(scale: float) -> tuple[str, float]:
        processed = preprocess_for_ocr(img, mode=kind, scale=scale)
        data = pytesseract.image_to_data(processed, lang=lang, config=config, output_type=pytesseract.Output.DICT, timeout=2)
        words = [w for w in data.get("text", []) if str(w).strip()]
        confs = []
        for c in data.get("conf", []):
            try:
                cf = float(c)
                if cf >= 0:
                    confs.append(cf)
            except Exception:
                pass
        text_data = " ".join(words).strip()
        if text_data:
            return text_data, (sum(confs) / len(confs) / 100.0 if confs else 0.45)
        text_fallback = pytesseract.image_to_string(processed, lang=lang, config=config, timeout=2).strip()
        return text_fallback, (0.35 if text_fallback else 0.0)

    try:
        if kind == "score":
            best_text, best_conf = "", 0.0
            for sc in (3.2, 4.0, 5.2):
                txt, conf = run_once(sc)
                if conf > best_conf or (not best_text and txt):
                    best_text, best_conf = txt, conf
                if re.search(r"\d", txt) and conf >= 0.45:
                    return txt, max(conf, 0.55)
            return best_text, best_conf

        scale = 4.0 if kind == "kda" else (3.2 if kind != "text" else 2.4)
        return run_once(scale)
    except Exception:
        return "", 0.0


def _encode_png_b64(img: np.ndarray) -> str:
    ok, png = cv2.imencode(".png", img)
    if not ok:
        return ""
    return base64.b64encode(png.tobytes()).decode("ascii")


def google_vision_read(img: np.ndarray) -> tuple[str, float]:
    """Google Vision diretto: supporta API key REST o service account ufficiale."""
    if img.size == 0:
        return "", 0.0

    api_key = os.environ.get("GOOGLE_VISION_API_KEY")
    if api_key:
        try:
            content = _encode_png_b64(img)
            if not content:
                return "", 0.0
            url = f"https://vision.googleapis.com/v1/images:annotate?key={api_key}"
            payload = {
                "requests": [{
                    "image": {"content": content},
                    "features": [{"type": "TEXT_DETECTION"}],
                    "imageContext": {"languageHints": ["it", "en"]}
                }]
            }
            resp = requests.post(url, json=payload, timeout=25)
            if resp.status_code >= 400:
                return "", 0.0
            data = resp.json()
            responses = data.get("responses") or []
            if not responses:
                return "", 0.0
            annotations = responses[0].get("textAnnotations") or []
            if annotations:
                return str(annotations[0].get("description") or "").strip(), 0.85
        except Exception:
            return "", 0.0

    if os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        try:
            from google.cloud import vision
            ok, png = cv2.imencode(".png", img)
            if not ok:
                return "", 0.0
            client = vision.ImageAnnotatorClient()
            image = vision.Image(content=png.tobytes())
            response = client.text_detection(image=image, image_context={"language_hints": ["it", "en"]})
            if response.error.message:
                return "", 0.0
            if response.text_annotations:
                return response.text_annotations[0].description.strip(), 0.85
        except Exception:
            return "", 0.0

    return "", 0.0


@lru_cache(maxsize=1)
def _paddle_reader():
    try:
        from paddleocr import PaddleOCR
        return PaddleOCR(use_angle_cls=False, lang="en", show_log=False)
    except Exception:
        return None


def _paddle_available() -> bool:
    try:
        import paddleocr  # noqa: F401
        import paddle  # noqa: F401
        return True
    except Exception:
        return False


def paddleocr_read(img: np.ndarray) -> tuple[str, float]:
    if img.size == 0:
        return "", 0.0
    reader = _paddle_reader()
    if reader is None:
        return "", 0.0
    try:
        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        result = reader.ocr(rgb, cls=False)
        lines: list[str] = []
        confs: list[float] = []
        for block in result or []:
            for item in block or []:
                if len(item) >= 2:
                    txt = item[1][0]
                    conf = float(item[1][1])
                    if txt:
                        lines.append(str(txt))
                        confs.append(conf)
        if lines:
            return " ".join(lines).strip(), (sum(confs) / len(confs) if confs else 0.70)
    except Exception:
        return "", 0.0
    return "", 0.0



def read_numeric_line_candidates(img: np.ndarray) -> list[dict]:
    """0.9F: legge in una sola passata la parte numerica della riga player.
    Output atteso: "869 8/1/1 192". È molto più stabile e veloce di 3 celle
    lette separatamente con decine di tentativi.
    """
    if img.size == 0 or not TESSERACT_PATH:
        return []
    results: list[dict] = []
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.copyMakeBorder(gray, 4, 4, 4, 4, cv2.BORDER_REPLICATE)
        clahe = cv2.createCLAHE(clipLimit=2.8, tileGridSize=(8, 8)).apply(gray)
        # Velocità: una sola variante per start_frac. Il confronto avviene fra start_frac diversi.
        variants = [("row_gray", clahe)]
        config = "--psm 7 -c tessedit_char_whitelist=0123456789/ "
        seen = set()
        for name, base in variants:
            proc = cv2.resize(base, None, fx=3.2, fy=3.2, interpolation=cv2.INTER_CUBIC)
            try:
                text = pytesseract.image_to_string(proc, lang="eng", config=config, timeout=2).strip()
            except Exception as exc:
                results.append({"text": "", "conf": 0.0, "method": name, "error": _safe_error(exc)})
                continue
            if text and text not in seen:
                seen.add(text)
                # image_to_string non dà conf; assegniamo base conf poi il parser alza/abbassa.
                results.append({"text": text, "conf": 0.62 if "/" in text else 0.42, "method": name, "scale": 3.2})
    except Exception as exc:
        results.append({"text": "", "conf": 0.0, "method": "row_error", "error": _safe_error(exc)})
    return results

def clean_number_text(text: str) -> str:
    return (
        text.replace("O", "0")
        .replace("o", "0")
        .replace("Q", "0")
        .replace("S", "5")
        .replace("B", "8")
        .replace("G", "6")
        .replace("Z", "2")
        .replace("I", "1")
        .replace("l", "1")
        .replace("|", "1")
    )


def parse_int(text: str, min_value: int = 0, max_value: int = 99999) -> int:
    cleaned = clean_number_text(text)
    nums = [int(x) for x in re.findall(r"\d{1,6}", cleaned)]
    nums = [n for n in nums if min_value <= n <= max_value]
    if not nums:
        return 0
    return max(nums)


def parse_kda(text: str) -> tuple[int, int, int]:
    cleaned = clean_number_text(text).replace("\\", "/").replace("|", "/").replace(" ", "")
    match = re.search(r"(\d{1,3})/(\d{1,3})/(\d{1,3})", cleaned)
    if match:
        return int(match.group(1)), int(match.group(2)), int(match.group(3))
    nums = [int(x) for x in re.findall(r"\d{1,3}", cleaned)]
    if len(nums) >= 3:
        return nums[0], nums[1], nums[2]
    return 0, 0, 0



def tesseract_read_block(img: np.ndarray) -> tuple[str, float]:
    """OCR testo su blocchi multi-riga, utile per data + modalità + mappa sotto VITTORIA."""
    if img.size == 0 or not TESSERACT_PATH:
        return "", 0.0
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8)).apply(gray)
        proc = cv2.resize(clahe, None, fx=3.0, fy=3.0, interpolation=cv2.INTER_CUBIC)
        parts = []
        for psm in (6, 11):
            try:
                txt = pytesseract.image_to_string(proc, lang="eng+ita", config=f"--psm {psm}", timeout=2).strip()
                if txt and txt not in parts:
                    parts.append(txt)
            except Exception:
                pass
        text = "\n".join(parts).strip()
        return text, 0.66 if text else 0.0
    except Exception:
        return "", 0.0

def read_text_hybrid(img: np.ndarray, prefer_cloud: bool = True) -> tuple[str, float, str]:
    engines = []
    if prefer_cloud:
        engines.extend([("google_vision", google_vision_read), ("paddleocr", paddleocr_read), ("tesseract", lambda im: tesseract_read(im, "text"))])
    else:
        engines.extend([("tesseract", lambda im: tesseract_read(im, "text")), ("google_vision", google_vision_read), ("paddleocr", paddleocr_read)])

    for name, fn in engines:
        text, conf = fn(img)
        if text and not text.startswith("OCR_ERROR"):
            return text, conf, name
    return "", 0.0, "none"


def read_numeric_hybrid(img: np.ndarray, kind: str = "number") -> tuple[str, float, str]:
    # Numeri: Tesseract se disponibile; altrimenti Google/Paddle sul crop già piccolo.
    for name, fn in [
        ("tesseract", lambda im: tesseract_read(im, kind)),
        ("google_vision", google_vision_read),
        ("paddleocr", paddleocr_read),
    ]:
        text, conf = fn(img)
        if text and not text.startswith("OCR_ERROR"):
            return text, conf, name
    return "", 0.0, "none"
