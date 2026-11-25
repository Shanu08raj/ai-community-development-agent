from app.services.language_registry import LANGUAGE_CAPABILITIES

CATEGORIES = [
    "Water Supply",
    "Roads and Infrastructure",
    "Waste Management",
    "Drainage and Sanitation",
    "Streetlights",
    "Other",
]

AI_CATEGORIES = CATEGORIES + ["Out of Scope"]

PRIORITIES = ["High", "Medium", "Low"]

SUPPORTED_LANGUAGES = {
    entry["code"]: {
        "name": entry["name"],
        "native": entry["nativeName"],
        "mode": entry["textAnalysisMode"],
        "rtl": entry["rtl"],
    }
    for entry in LANGUAGE_CAPABILITIES
}

LANGUAGE_CODES = list(SUPPORTED_LANGUAGES.keys()) + ["und"]
LANGUAGE_NAMES = [v["name"] for v in SUPPORTED_LANGUAGES.values()] + ["Undetermined"]
NAME_TO_CODE = {v["name"].lower(): k for k, v in SUPPORTED_LANGUAGES.items()}

AUTHORITY_DIRECTORY = {
    "Water Supply": {
        "id": "AUTH-01",
        "name": "Municipal Water Supply & Sewerage Board",
        "department": "Water Supply",
        "jurisdiction": "Metro Municipal Corporation (All Wards)",
    },
    "Roads and Infrastructure": {
        "id": "AUTH-02",
        "name": "Public Works Department (PWD - Roads Wing)",
        "department": "Roads and Infrastructure",
        "jurisdiction": "Central & Highway Division",
    },
    "Waste Management": {
        "id": "AUTH-03",
        "name": "Solid Waste Management & Sanitation Board",
        "department": "Waste Management",
        "jurisdiction": "North & East Municipal Zones",
    },
    "Streetlights": {
        "id": "AUTH-04",
        "name": "Municipal City Electrical & Street Lighting Cell",
        "department": "Streetlights",
        "jurisdiction": "Metropolitan Grid Divisions",
    },
    "Drainage and Sanitation": {
        "id": "AUTH-05",
        "name": "Drainage & Stormwater Infrastructure Wing",
        "department": "Drainage and Sanitation",
        "jurisdiction": "Lowland & River Basin Sectors",
    },
    "Other": {
        "id": "AUTH-06",
        "name": "Department of Public Parks & Urban Horticulture",
        "department": "Other",
        "jurisdiction": "Civic Gardens & Public Grounds",
    },
}

EMERGENCY_GUIDANCE_TEXT = (
    "CRITICAL NOTICE: For immediate police, fire, or medical emergencies, please dial 112 directly. "
    "JanSetu AI is an independent community intelligence system and does NOT dispatch emergency services."
)
