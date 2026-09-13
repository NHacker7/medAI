from pathlib import Path
import csv

import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from tqdm import tqdm
from transformers import AutoModel


# ============================================================
# PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parent

DATASET_ROOT = PROJECT_ROOT / "epillid_data" / "ePillID_data"

LABELS_FILE = DATASET_ROOT / "all_labels.csv"

IMAGE_DIRS = [
    DATASET_ROOT / "classification_data" / "fcn_mix_weight" / "dc_224",
    DATASET_ROOT / "classification_data" / "fcn_mix_weight" / "dr_224",
    DATASET_ROOT / "classification_data" / "segmented_nih_pills_224",
]

MODEL_PATH = (
    PROJECT_ROOT
    / "epillid_training"
    / "best_pill_embedding.pt"
)

MODEL_NAME = "facebook/dinov2-base"

IMAGE_SIZE = 224
BATCH_SIZE = 32


# ============================================================
# DEVICE
# ============================================================

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

print("=" * 70)
print("ePillID / DINOv2 Pill Model Evaluation")
print("=" * 70)

print(f"Device: {DEVICE}")

if torch.cuda.is_available():
    print(
        f"GPU: {torch.cuda.get_device_name(0)}"
    )

print(f"Dataset: {DATASET_ROOT}")
print(f"Model:   {MODEL_PATH}")
print()


# ============================================================
# PROJECTION HEAD
# Must match the architecture used during training
# ============================================================

class ProjectionHead(nn.Module):

    def __init__(self):

        super().__init__()

        self.net = nn.Sequential(
            nn.Linear(768, 512),
            nn.ReLU(),
            nn.Linear(512, 256),
        )

    def forward(self, x):

        return self.net(x)


# ============================================================
# IMAGE PREPROCESSING
# Same preprocessing used during training
# ============================================================

IMAGENET_MEAN = np.array(
    [0.485, 0.456, 0.406],
    dtype=np.float32
)

IMAGENET_STD = np.array(
    [0.229, 0.224, 0.225],
    dtype=np.float32
)


def preprocess_image(image_path):

    image = Image.open(
        image_path
    ).convert("RGB")

    image = image.resize(
        (IMAGE_SIZE, IMAGE_SIZE),
        Image.Resampling.BILINEAR
    )

    image = np.asarray(
        image
    ).astype(np.float32) / 255.0

    image = (
        image - IMAGENET_MEAN
    ) / IMAGENET_STD

    image = torch.from_numpy(
        image
    ).permute(2, 0, 1)

    return image


# ============================================================
# BUILD IMAGE INDEX
# ============================================================

def build_image_index():

    print("Building image index...")

    image_index = {}

    for image_dir in IMAGE_DIRS:

        if not image_dir.exists():

            print(
                f"WARNING: directory does not exist: "
                f"{image_dir}"
            )

            continue

        print(
            f"Scanning: {image_dir}"
        )

        for path in image_dir.rglob("*"):

            if path.is_file():

                image_index[path.name] = path

    print(
        f"Indexed {len(image_index)} image files."
    )

    print()

    return image_index


# ============================================================
# LOAD DATASET
# ============================================================

def load_dataset():

    if not LABELS_FILE.exists():

        raise FileNotFoundError(
            f"Could not find labels file:\n"
            f"{LABELS_FILE}"
        )

    image_index = build_image_index()

    records = []
    missing = []

    with open(
        LABELS_FILE,
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as f:

        reader = csv.DictReader(f)

        for row in reader:

            image_name = row["images"]

            pill_type = row["pilltype_id"]

            image_path = image_index.get(
                image_name
            )

            if image_path is None:

                missing.append(
                    image_name
                )

                continue

            records.append(
                {
                    "image_name": image_name,
                    "image_path": image_path,
                    "pill_type": pill_type,
                    "is_ref": (
                        row.get(
                            "is_ref",
                            ""
                        ).lower()
                        == "true"
                    ),
                    "is_front": (
                        row.get(
                            "is_front",
                            ""
                        ).lower()
                        == "true"
                    ),
                }
            )

    print(
        f"Loaded records: {len(records)}"
    )

    if missing:

        print(
            f"WARNING: Missing images: "
            f"{len(missing)}"
        )

        if len(missing) <= 10:

            for name in missing:

                print(
                    f"  {name}"
                )

    print()

    return records


# ============================================================
# LOAD MODEL
# ============================================================

def load_model():

    print(
        "Loading DINOv2 backbone..."
    )

    backbone = AutoModel.from_pretrained(
        MODEL_NAME
    )

    backbone = backbone.to(
        DEVICE
    )

    backbone.eval()

    print(
        "DINOv2 loaded."
    )

    projection = ProjectionHead().to(
        DEVICE
    )

    checkpoint = torch.load(
        MODEL_PATH,
        map_location=DEVICE
    )

    print(
        "Checkpoint keys:"
    )

    if isinstance(
        checkpoint,
        dict
    ):

        for key in checkpoint.keys():

            print(
                f"  {key}"
            )

    # --------------------------------------------------------
    # Get model_state_dict
    # --------------------------------------------------------

    if not isinstance(
        checkpoint,
        dict
    ):

        raise RuntimeError(
            "Checkpoint is not a dictionary."
        )

    if "model_state_dict" not in checkpoint:

        raise RuntimeError(
            "Checkpoint does not contain "
            "'model_state_dict'."
        )

    state = checkpoint[
        "model_state_dict"
    ]

    # --------------------------------------------------------
    # The training checkpoint stores the projection head
    # directly as:
    #
    # 0.weight
    # 0.bias
    # 3.weight
    # 3.bias
    #
    # Our evaluation ProjectionHead uses:
    #
    # net.0.weight
    # net.0.bias
    # net.2.weight
    # net.2.bias
    #
    # So we map the names here.
    # --------------------------------------------------------

    projection_state = {
        "net.0.weight": state[
            "projection.0.weight"
        ],
        "net.0.bias": state[
            "projection.0.bias"
        ],
        "net.2.weight": state[
            "projection.3.weight"
        ],
        "net.2.bias": state[
            "projection.3.bias"
        ],
    }

    projection.load_state_dict(
        projection_state
    )

    projection.eval()

    print(
        "Projection head loaded."
    )

    print()

    return backbone, projection


# ============================================================
# GENERATE EMBEDDINGS
# ============================================================

@torch.no_grad()
def generate_embeddings(
    records,
    backbone,
    projection
):

    embeddings = []

    print(
        "Generating embeddings..."
    )

    print(
        f"Total images: {len(records)}"
    )

    print()

    for start in tqdm(
        range(
            0,
            len(records),
            BATCH_SIZE
        ),
        desc="Embedding"
    ):

        batch_records = records[
            start:start + BATCH_SIZE
        ]

        batch_images = []

        for record in batch_records:

            image = preprocess_image(
                record["image_path"]
            )

            batch_images.append(
                image
            )

        batch = torch.stack(
            batch_images
        ).to(DEVICE)

        outputs = backbone(
            pixel_values=batch
        )

        # DINOv2 CLS token

        features = (
            outputs
            .last_hidden_state[:, 0]
        )

        projected = projection(
            features
        )

        projected = (
            torch.nn.functional.normalize(
                projected,
                p=2,
                dim=1
            )
        )

        embeddings.append(
            projected.cpu()
        )

    embeddings = torch.cat(
        embeddings,
        dim=0
    )

    print()

    print(
        f"Embedding shape: "
        f"{tuple(embeddings.shape)}"
    )

    print()

    return embeddings


# ============================================================
# TOP-K NEAREST NEIGHBOR EVALUATION
# ============================================================

def evaluate_retrieval(
    embeddings,
    records
):

    print("=" * 70)
    print(
        "Nearest-Neighbor Retrieval Evaluation"
    )
    print("=" * 70)

    labels = [
        record["pill_type"]
        for record in records
    ]

    labels_array = np.array(
        labels
    )

    embeddings = embeddings.numpy()

    total = len(records)

    top1_correct = 0
    top5_correct = 0
    top10_correct = 0

    # --------------------------------------------------------
    # Evaluate each image
    # --------------------------------------------------------

    for i in tqdm(
        range(total),
        desc="Retrieval"
    ):

        query = embeddings[i]

        # Because embeddings are normalized,
        # dot product = cosine similarity.

        similarities = (
            embeddings @ query
        )

        # Do not allow the query image
        # to retrieve itself.

        similarities[i] = -np.inf

        ranked_indices = np.argsort(
            -similarities
        )

        top10_indices = ranked_indices[
            :10
        ]

        true_label = labels_array[i]

        # Top 1

        top1_labels = labels_array[
            top10_indices[:1]
        ]

        # Top 5

        top5_labels = labels_array[
            top10_indices[:5]
        ]

        # Top 10

        top10_labels = labels_array[
            top10_indices[:10]
        ]

        if true_label in top1_labels:

            top1_correct += 1

        if true_label in top5_labels:

            top5_correct += 1

        if true_label in top10_labels:

            top10_correct += 1

    top1 = (
        top1_correct
        / total
        * 100
    )

    top5 = (
        top5_correct
        / total
        * 100
    )

    top10 = (
        top10_correct
        / total
        * 100
    )

    return (
        top1,
        top5,
        top10
    )


# ============================================================
# SIMILARITY ANALYSIS
# ============================================================

def similarity_analysis(
    embeddings,
    records,
    max_same_pairs=50000,
    max_different_pairs=50000
):

    print()

    print("=" * 70)
    print(
        "Same-Pill / Different-Pill "
        "Similarity Analysis"
    )
    print("=" * 70)

    embeddings = embeddings.numpy()

    labels = np.array(
        [
            record["pill_type"]
            for record in records
        ]
    )

    rng = np.random.default_rng(
        42
    )

    same_similarities = []
    different_similarities = []

    total = len(records)

    # ========================================================
    # SAME-PILL PAIRS
    # ========================================================

    label_to_indices = {}

    for index, label in enumerate(
        labels
    ):

        label_to_indices.setdefault(
            label,
            []
        ).append(index)

    same_candidates = []

    for indices in (
        label_to_indices.values()
    ):

        if len(indices) < 2:

            continue

        for a in range(
            len(indices)
        ):

            for b in range(
                a + 1,
                len(indices)
            ):

                same_candidates.append(
                    (
                        indices[a],
                        indices[b]
                    )
                )

    if len(
        same_candidates
    ) > max_same_pairs:

        selected = rng.choice(
            len(same_candidates),
            size=max_same_pairs,
            replace=False
        )

        same_candidates = [
            same_candidates[i]
            for i in selected
        ]

    for i, j in tqdm(
        same_candidates,
        desc="Same-pill pairs"
    ):

        similarity = float(
            np.dot(
                embeddings[i],
                embeddings[j]
            )
        )

        same_similarities.append(
            similarity
        )

    # ========================================================
    # DIFFERENT-PILL PAIRS
    # ========================================================

    while len(
        different_similarities
    ) < max_different_pairs:

        i = rng.integers(
            0,
            total
        )

        j = rng.integers(
            0,
            total
        )

        if i == j:

            continue

        if labels[i] == labels[j]:

            continue

        similarity = float(
            np.dot(
                embeddings[i],
                embeddings[j]
            )
        )

        different_similarities.append(
            similarity
        )

    average_same = float(
        np.mean(
            same_similarities
        )
    )

    average_different = float(
        np.mean(
            different_similarities
        )
    )

    return (
        average_same,
        average_different
    )


# ============================================================
# MAIN
# ============================================================

def main():

    # ========================================================
    # CHECK PATHS
    # ========================================================

    if not DATASET_ROOT.exists():

        raise FileNotFoundError(
            f"Dataset directory not found:\n"
            f"{DATASET_ROOT}"
        )

    if not MODEL_PATH.exists():

        raise FileNotFoundError(
            f"Trained model not found:\n"
            f"{MODEL_PATH}"
        )

    # ========================================================
    # LOAD DATASET
    # ========================================================

    records = load_dataset()

    if len(records) == 0:

        raise RuntimeError(
            "No dataset images were resolved."
        )

    # ========================================================
    # LOAD MODEL
    # ========================================================

    backbone, projection = (
        load_model()
    )

    # ========================================================
    # GENERATE EMBEDDINGS
    # ========================================================

    embeddings = generate_embeddings(
        records,
        backbone,
        projection
    )

    # ========================================================
    # RETRIEVAL
    # ========================================================

    top1, top5, top10 = (
        evaluate_retrieval(
            embeddings,
            records
        )
    )

    # ========================================================
    # SIMILARITY
    # ========================================================

    (
        average_same,
        average_different
    ) = similarity_analysis(
        embeddings,
        records
    )

    # ========================================================
    # FINAL RESULT
    # ========================================================

    print()
    print()
    print("=" * 70)
    print(
        "FINAL ePillID SANITY EVALUATION"
    )
    print("=" * 70)

    print()

    print(
        f"Total evaluated images: "
        f"{len(records)}"
    )

    print()

    print(
        f"Top-1 accuracy:  "
        f"{top1:.2f}%"
    )

    print(
        f"Top-5 accuracy:  "
        f"{top5:.2f}%"
    )

    print(
        f"Top-10 accuracy: "
        f"{top10:.2f}%"
    )

    print()

    print(
        "Same-pill similarity analysis"
    )

    print()

    print(
        f"Average same-pill similarity: "
        f"{average_same:.4f}"
    )

    print(
        f"Average different-pill similarity: "
        f"{average_different:.4f}"
    )

    print()

    print("=" * 70)
    print(
        "Evaluation complete."
    )
    print("=" * 70)

    print()

    print(
        "IMPORTANT: This is a sanity test "
        "using the same dataset involved in training."
    )

    print(
        "The results may therefore be optimistic "
        "and are NOT yet a rigorous "
        "consumer-vs-reference benchmark."
    )

    print()


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":
    main()