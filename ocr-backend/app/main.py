from __future__ import annotations

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware

from app.models import ScoreboardCedResult, ProfileOcrResult
from app.services.scoreboard_ced import parse_scoreboard_ced
from app.services.profile_ocr import parse_profile
from app.services.ocr_engines import engine_status

ENGINE_VERSION = "2.0.11-v5-6-profile-fastlane-stabile-ak47dx"

app = FastAPI(title="CODM OCR Hybrid Engine", version=ENGINE_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    status = engine_status()
    ok_engine = bool(status.get("tesseract_available") or status.get("google_vision_api_key") or status.get("google_application_credentials") or status.get("paddleocr_available"))
    return {
        "ok": True,
        "service": "CODM OCR Hybrid Engine",
        "version": ENGINE_VERSION,
        "ready_for_ocr": ok_engine,
        "engines": status,
        "features": [
            "v5_6_profile_fastlane_no_block",
            "v5_6_profile_legendary_fast_numeric",
            "v5_6_profile_stats_page_aligned",
            "dynamic_layout",
            "opencv",
            "google_vision_text",
            "tesseract_numeric",
            "paddleocr_fallback",
            "yolo_ready_structure",
            "v5_2_template_canonical_score_kda",
            "v5_0_score_player_enabled",
            "v4_6_client_frame_template_alignment",
            "v4_6_notification_preferences_ready",
            "v4_5_fast_ocr_no_timeout_import",
            "v4_4_own_team_fast_import",
            "opponent_stats_skipped",
            "no_fake_values",
            "engine_preflight",
            "active_calibration_template",
            "calibration_coordinates_are_original_image_based",
            "match_datetime_reading",
            "login_phone_template_ready",
            "content_frame_template_coordinates",
            "multi_preprocess_numeric_voting",
            "profile_legendary_counts_mp_br_dmz_zombie",
            "template_lock_mode",
            "scoreboard_grid_rebuild_from_table",
            "winner_team_explicit",
            "kda_only_player_stats",
            "player_score_and_impact_ignored",
            "modern_review_ui",
            "kda_multi_preprocess_voting_1_0",
            "simplified_import_single_button",
            "manual_guest_player_stats",
            "clan_affiliation_stats",
            "match_archive_filters_delete",
            "advanced_match_filters",
            "clan_hq_story_leaders_social_notices",
            "clan_player_statistics",
            "analytics_pie_charts",
            "match_detail_delete_screenshot_notes",
            "hardpoint_postazione_scores_0_300",
            "ranking_gold_silver_bronze",
            "average_position_decimals",
            "clan_association_player_stats",
            "pwa_mobile_installable",
            "vercel_supabase_render_deploy_ready",
            "cloud_run_docker_ready",
            "invite_link_qr_production_ready",
            "supabase_storage_match_proof",
            "yolo_dataset_export_structure",
        ],
        "next_action": None if ok_engine else "Installa Tesseract oppure configura GOOGLE_VISION_API_KEY / GOOGLE_APPLICATION_CREDENTIALS oppure PaddleOCR.",
    }


@app.post("/ocr/scoreboard/ced", response_model=ScoreboardCedResult)
async def ocr_scoreboard_ced(
    file: UploadFile = File(...),
    calibration_template: str | None = Form(default=None),
    calibration_frame: str | None = Form(default=None),
    calibration_mode: str = Form(default="table_lock"),
    our_team: str = Form(default="blue"),
    extract_scope: str = Form(default="our_only"),
):
    data = await file.read()
    result = parse_scoreboard_ced(
        data,
        calibration_template=calibration_template,
        calibration_frame=calibration_frame,
        calibration_mode=calibration_mode,
        our_team=our_team,
        extract_scope=extract_scope,
    )
    result.engine_version = ENGINE_VERSION
    return result


@app.post("/ocr/profile", response_model=ProfileOcrResult)
async def ocr_profile(file: UploadFile = File(...), calibration_template: str | None = Form(default=None)):
    data = await file.read()
    result = parse_profile(data, calibration_template=calibration_template)
    result.engine_version = ENGINE_VERSION
    return result
