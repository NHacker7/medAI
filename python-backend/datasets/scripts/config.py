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

# Test Mode
TEST_MODE =False
TEST_LIMIT = 10

# Batch Size
ENRICH_BATCH_SIZE = 5000

# Save checkpoint every N medicines
CHECKPOINT_INTERVAL = 50

# Delay between API requests (seconds)
REQUEST_DELAY = 0.25

# Network timeout
REQUEST_TIMEOUT = 30

# Retry settings
MAX_RETRIES = 5

# Retry delay (seconds)
RETRY_DELAY = 2
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