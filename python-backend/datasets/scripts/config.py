from pathlib import Path

# ============================================================
# Project Paths
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATASETS = PROJECT_ROOT / "datasets"

# ============================================================
# Raw Datasets
# ============================================================

RAW = DATASETS / "medicine_raw"

OPENFDA = RAW / "openfda"
RXNORM = RAW / "rxnorm"
DAILYMED = RAW / "dailymed"
KAGGLE = RAW / "kaggle"
GITHUB = RAW / "github"
MANUAL = RAW / "manual"

# ============================================================
# Processed Datasets
# ============================================================

CLEANED = DATASETS / "medicine_cleaned"

REPORTS = CLEANED / "reports"

# DailyMed enrichment output
ENRICHED = CLEANED / "enriched"

# Final merged database
MASTER = CLEANED / "master"

# ============================================================
# AI Training
# ============================================================

TRAINING = DATASETS / "medicine_training"

YOLO_IMAGES = TRAINING / "images"
YOLO_LABELS = TRAINING / "labels"

# ============================================================
# Models
# ============================================================

MODELS = PROJECT_ROOT / "trained_models"

# ============================================================
# Logs
# ============================================================

LOGS = DATASETS / "logs"

# ============================================================
# ETL Settings
# ============================================================

# Number of medicines to enrich in one run
ENRICH_BATCH_SIZE = 5000

# Save progress every N medicines
CHECKPOINT_INTERVAL = 100

# Delay between API requests (seconds)
REQUEST_DELAY = 0.5

# Number of retry attempts
MAX_RETRIES = 3

# ============================================================
# Create folders automatically
# ============================================================

folders = [
    RAW,
    OPENFDA,
    RXNORM,
    DAILYMED,
    KAGGLE,
    GITHUB,
    MANUAL,
    CLEANED,
    REPORTS,
    ENRICHED,
    MASTER,
    TRAINING,
    YOLO_IMAGES,
    YOLO_LABELS,
    MODELS,
    LOGS,
]

for folder in folders:
    folder.mkdir(parents=True, exist_ok=True)