from pathlib import Path
from app.services.scoreboard_ced import parse_scoreboard_ced

ROOT = Path(__file__).resolve().parents[1]
SAMPLE = ROOT / "samples" / "ced_tunisia_6_0.jpeg"

def check(condition: bool, message: str):
    if not condition:
        raise AssertionError(message)

def main():
    res = parse_scoreboard_ced(SAMPLE.read_bytes())
    print("Engine:", res.engine_version)
    print("Result:", res.result, res.blue_score, res.red_score)
    print("Blue:", [(r.score, r.kills, r.deaths, r.assists, r.impact) for r in res.teams["blue"]])
    print("Red:", [(r.score, r.kills, r.deaths, r.assists, r.impact) for r in res.teams["red"]])
    check(res.engine_version == "0.8.5-fix5-locked", "backend version mismatch")
    check(res.result == "WIN", "expected WIN")
    check(res.blue_score == 6 and res.red_score == 0, "expected score 6:0")
    check(len(res.teams["blue"]) == 5 and len(res.teams["red"]) == 5, "expected 5 blue + 5 red rows")
    expected_blue = [
        (869, 8, 1, 1, 192),
        (752, 6, 1, 1, 161),
        (628, 6, 3, 0, 156),
        (627, 6, 2, 0, 154),
        (425, 4, 2, 1, 127),
    ]
    got_blue = [(r.score, r.kills, r.deaths, r.assists, r.impact) for r in res.teams["blue"]]
    check(got_blue == expected_blue, f"blue rows changed: {got_blue}")
    check(res.teams["blue"][0].mvp_label == "MVP_WIN", "blue row 1 must be MVP_WIN")
    check(res.teams["red"][0].mvp_label == "MVP_LOSE", "red row 1 must be MVP_LOSE")
    print("REGRESSION OK")

if __name__ == "__main__":
    main()
