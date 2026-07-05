from __future__ import annotations

from pydantic import BaseModel
from typing import Literal, Optional


class OcrBox(BaseModel):
    name: str
    role: str
    team: Optional[Literal["blue", "red"]] = None
    row: Optional[int] = None
    x: int
    y: int
    w: int
    h: int
    x_norm: float
    y_norm: float
    w_norm: float
    h_norm: float
    confidence: float = 0.0


class OcrPlayerRow(BaseModel):
    rank: int
    nickname_ocr: str = ""
    score: int = 0
    kills: int = 0
    deaths: int = 0
    assists: int = 0
    impact: int = 0
    mvp_label: Optional[Literal["MVP_WIN", "MVP_LOSE"]] = None
    confidence: float = 0.0
    boxes: list[OcrBox] = []


class ScoreboardCedResult(BaseModel):
    engine_version: str = "2.0.9-v5-2-template-kda-table-definitivo-ak47dx"
    screen_type: str = "scoreboard_ced"
    result: Optional[Literal["WIN", "LOSE", "DRAW"]] = None
    winning_team: Optional[Literal["blue", "red", "draw"]] = None
    our_team: Optional[Literal["blue", "red"]] = "blue"
    blue_score: Optional[int] = None
    red_score: Optional[int] = None
    mode: str = "CED"
    map: Optional[str] = None
    match_datetime: Optional[str] = None
    layout_confidence: float = 0.0
    ocr_confidence: float = 0.0
    needs_manual_review: bool = True
    ignored: dict = {"player_score": False, "impact": True, "kd_total": True, "accuracy": True, "headshot": True}
    teams: dict[str, list[OcrPlayerRow]]
    boxes: list[OcrBox]
    warnings: list[str] = []
    score_diagnostics: dict = {}
    raw_text: str = ""


class ProfileOcrResult(BaseModel):
    engine_version: str = "2.0.11-v5-6-profile-fastlane-stabile-ak47dx"
    screen_type: str = "profile_base"
    nickname: str = ""
    uid: str = ""
    level: Optional[int] = None
    likes: Optional[int] = None
    rank_text: str = ""
    legendary_mp: Optional[int] = None
    legendary_br: Optional[int] = None
    legendary_dmz: Optional[int] = None
    legendary_zombie: Optional[int] = None
    layout_confidence: float = 0.0
    ocr_confidence: float = 0.0
    needs_manual_review: bool = True
    boxes: list[OcrBox] = []
    warnings: list[str] = []
    diagnostics: dict = {}
    raw_text: str = ""
