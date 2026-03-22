import math
import os
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

API_KEY = os.environ.get("API_KEY", "")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_URL = "https://api.brawlstars.com/v1"

headers = {
    "Authorization": f"Bearer {API_KEY}"
}

brawler_data = {}

def load_brawler_data():
    global brawler_data
    try:
        response = requests.get(f"{BASE_URL}/brawlers", headers=headers)
        if response.status_code == 200:
            for b in response.json().get("items", []):
                brawler_data[b["id"]] = {
                    "starPowers": b.get("starPowers", []),
                    "gadgets": b.get("gadgets", []),
                    "gears": b.get("gears", []),
                    "hyperCharges": b.get("hyperCharges", []),
                }
    except Exception:
        pass

load_brawler_data()


def trophy_score(trophies: int) -> float:
    if trophies < 200:
        return 9999

    elif trophies <= 1000:
        t = (trophies - 200) / 800
        return 50 * (1 - t)

    elif trophies <= 1500:
        t = (trophies - 1000) / 500
        return -40 * t

    else:
        overshoot = trophies - 1500
        score = -40 - 28 * (1 - math.exp(-overshoot / 600))
        return max(score, -68)


def score_brawler(brawler: dict) -> float:
    trophies = brawler.get("trophies", 0)
    power = brawler.get("power", 1)
    star_powers = brawler.get("starPowers", [])
    gadgets = brawler.get("gadgets", [])
    gears = brawler.get("gears", [])
    hypercharge = brawler.get("ownedHyperCharges", [])
    all_hypercharges = brawler.get("allHyperCharges", [])
    has_hc_in_game = len(all_hypercharges) > 0
    has_hc_unlocked = len(hypercharge) > 0

    score = 0

    score += trophy_score(trophies)

    if len(star_powers) >= 1:
        score += 15

    if len(gadgets) >= 1:
        score += 15

    score += min(len(gears), 2) * 4

    if not has_hc_in_game or (has_hc_unlocked and power == 11):
        score += 20

    score += ((power - 1) / 10) * 10

    return round(score, 2)


def normalise_scores(brawlers: list) -> list:
    scores = [b["score"] for b in brawlers]
    min_score = min(scores)
    max_score = max(scores)
    effective_max = min(max_score, min_score + 50 + 68)

    for b in brawlers:
        if effective_max == min_score:
            b["displayScore"] = 100.0
        else:
            normalised = (b["score"] - min_score) / (effective_max - min_score)
            capped = min(normalised, 1.0)
            b["displayScore"] = round(max(capped * 100, 0.1), 1)

    return brawlers


@app.get("/player/{tag}")
def get_player(tag: str):
    clean_tag = tag.replace("#", "").upper()

    try:
        response = requests.get(
            f"{BASE_URL}/players/%23{clean_tag}",
            headers=headers
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail="Player not found — check your tag"
        )

    data = response.json()
    brawlers = data.get("brawlers", [])

    scored = []
    for b in brawlers:
        brawler_id = b.get("id")
        info = brawler_data.get(brawler_id, {})
        all_hc = info.get("hyperCharges", [])
        owned_hc = b.get("hyperCharges", [])

        enriched = {
            **b,
            "allHyperCharges": all_hc,
            "ownedHyperCharges": owned_hc,
        }

        s = score_brawler(enriched)
        icon_url = f"https://cdn.brawlify.com/brawlers/borderless/{brawler_id}.png"

        scored.append({
            "id": brawler_id,
            "name": b.get("name"),
            "trophies": b.get("trophies"),
            "power": b.get("power"),
            "allStarPowers": info.get("starPowers", []),
            "ownedStarPowers": [sp["id"] for sp in b.get("starPowers", [])],
            "allGadgets": info.get("gadgets", []),
            "ownedGadgets": [g["id"] for g in b.get("gadgets", [])],
            "allGears": info.get("gears", []),
            "ownedGears": [g["id"] for g in b.get("gears", [])],
            "allHyperCharges": all_hc,
            "ownedHyperCharges": owned_hc,
            "icon": icon_url,
            "score": s,
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    scored = normalise_scores(scored)

    return {
        "name": data.get("name"),
        "tag": data.get("tag"),
        "brawlers": scored
    }


@app.get("/brawlers")
def get_brawlers():
    response = requests.get(f"{BASE_URL}/brawlers", headers=headers)
    return response.json()