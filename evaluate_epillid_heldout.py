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

DATASET_ROOT = (
    PROJECT_ROOT
    / "epillid_data"
    / "ePillID_data"
)

LABELS_FILE = (
    DATASET_ROOT
    / "all_labels.csv"
)

IMAGE_DIRS = [
    DATASET_ROOT
    / "classification_data"
    / "fcn_mix_weight"
    / "dc_224",

    DATASET_ROOT
    / "classification_data"
    / "fcn_mix_weight"
    / "dr_224",

    DATASET_ROOT
    / "classification_data"
    / "segmented_nih_pills_224",
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
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)

print("=" * 70)
print("ePillID HELD-OUT CONSUMER vs REFERENCE EVALUATION")
print("=" * 70)

print(f"Device: {DEVICE}")

if torch.cuda.is_available():
    print(
        f"GPU: {torch.cuda.get_device_name(0)}"
    )

print(
    f"Dataset: {DATASET_ROOT}"
)

print(
    f"Model:   {MODEL_PATH}"
)

print()


# ============================================================
# PROJECTION HEAD
# Same architecture used during training
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
        (
            IMAGE_SIZE,
            IMAGE_SIZE
        ),
        Image.Resampling.BILINEAR
    )

    image = (
        np.asarray(image)
        .astype(np.float32)
        / 255.0
    )

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
                f"WARNING: directory does not exist:"
            )

            print(image_dir)

            continue

        print(
            f"Scanning: {image_dir}"
        )

        for path in image_dir.rglob("*"):

            if path.is_file():

                image_index[path.name] = path

    print()

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
            f"Labels file not found:\n"
            f"{LABELS_FILE}"
        )

    image_index = build_image_index()

    reference_records = []

    query_records = []

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

            record = {
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

            if record["is_ref"]:

                reference_records.append(
                    record
                )

            else:

                query_records.append(
                    record
                )

    print(
        f"Reference images: "
        f"{len(reference_records)}"
    )

    print(
        f"Non-reference images: "
        f"{len(query_records)}"
    )

    print(
        f"Missing images: "
        f"{len(missing)}"
    )

    print()

    # --------------------------------------------------------
    # Check how many pill types are represented
    # --------------------------------------------------------

    reference_types = set(
        record["pill_type"]
        for record in reference_records
    )

    query_types = set(
        record["pill_type"]
        for record in query_records
    )

    covered_query_types = (
        reference_types
        & query_types
    )

    print(
        f"Reference pill types: "
        f"{len(reference_types)}"
    )

    print(
        f"Query pill types: "
        f"{len(query_types)}"
    )

    print(
        f"Query pill types with "
        f"reference coverage: "
        f"{len(covered_query_types)}"
    )

    print()

    return (
        reference_records,
        query_records
    )


# ============================================================
# LOAD TRAINED MODEL
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

    projection = (
        ProjectionHead()
        .to(DEVICE)
    )

    checkpoint = torch.load(
        MODEL_PATH,
        map_location=DEVICE
    )

    if not isinstance(
        checkpoint,
        dict
    ):

        raise RuntimeError(
            "Invalid checkpoint format."
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
    # Actual checkpoint structure verified from your model:
    #
    # projection.0.weight
    # projection.0.bias
    # projection.3.weight
    # projection.3.bias
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

    return (
        backbone,
        projection
    )


# ============================================================
# GENERATE EMBEDDINGS
# ============================================================

@torch.no_grad()
def generate_embeddings(
    records,
    backbone,
    projection,
    description
):

    embeddings = []

    print(
        f"Generating embeddings: "
        f"{description}"
    )

    print(
        f"Total images: "
        f"{len(records)}"
    )

    print()

    for start in tqdm(
        range(
            0,
            len(records),
            BATCH_SIZE
        ),
        desc=description
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
# HELD-OUT RETRIEVAL
#
# Queries:
#   3,728 non-reference images
#
# Gallery:
#   9,804 reference images
#
# We NEVER allow a query image to be in the gallery.
# ============================================================

def evaluate_retrieval(
    reference_embeddings,
    reference_records,
    query_embeddings,
    query_records
):

    print("=" * 70)
    print(
        "HELD-OUT REFERENCE → CONSUMER RETRIEVAL"
    )
    print("=" * 70)

    reference_labels = np.array(
        [
            record["pill_type"]
            for record in reference_records
        ]
    )

    query_labels = np.array(
        [
            record["pill_type"]
            for record in query_records
        ]
    )

    reference_embeddings = (
        reference_embeddings.numpy()
    )

    query_embeddings = (
        query_embeddings.numpy()
    )

    total_queries = len(
        query_records
    )

    top1_correct = 0
    top5_correct = 0
    top10_correct = 0

    # --------------------------------------------------------
    # Some query images may theoretically have no reference
    # image. We only count queries whose pill type is present
    # in the reference gallery.
    # --------------------------------------------------------

    reference_types = set(
        reference_labels.tolist()
    )

    evaluated_queries = 0

    for i in tqdm(
        range(total_queries),
        desc="Held-out retrieval"
    ):

        true_label = query_labels[i]

        if true_label not in reference_types:

            continue

        evaluated_queries += 1

        query = query_embeddings[i]

        # Normalized embeddings:
        # dot product = cosine similarity

        similarities = (
            reference_embeddings @ query
        )

        # Highest similarity first

        ranked_indices = np.argsort(
            -similarities
        )

        top10_indices = ranked_indices[
            :10
        ]

        top1_labels = reference_labels[
            top10_indices[:1]
        ]

        top5_labels = reference_labels[
            top10_indices[:5]
        ]

        top10_labels = reference_labels[
            top10_indices[:10]
        ]

        if true_label in top1_labels:

            top1_correct += 1

        if true_label in top5_labels:

            top5_correct += 1

        if true_label in top10_labels:

            top10_correct += 1

    if evaluated_queries == 0:

        raise RuntimeError(
            "No query images had matching "
            "reference images."
        )

    top1 = (
        top1_correct
        / evaluated_queries
        * 100
    )

    top5 = (
        top5_correct
        / evaluated_queries
        * 100
    )

    top10 = (
        top10_correct
        / evaluated_queries
        * 100
    )

    return (
        evaluated_queries,
        top1,
        top5,
        top10
    )


# ============================================================
# SAME / DIFFERENT SIMILARITY
#
# This time we compare:
#
# Query image → Reference images
#
# rather than query-to-itself.
# ============================================================

def similarity_analysis(
    reference_embeddings,
    reference_records,
    query_embeddings,
    query_records,
    max_same_pairs=50000,
    max_different_pairs=50000
):

    print()

    print("=" * 70)
    print(
        "HELD-OUT SIMILARITY ANALYSIS"
    )
    print("=" * 70)

    reference_embeddings = (
        reference_embeddings.numpy()
    )

    query_embeddings = (
        query_embeddings.numpy()
    )

    reference_labels = np.array(
        [
            record["pill_type"]
            for record in reference_records
        ]
    )

    query_labels = np.array(
        [
            record["pill_type"]
            for record in query_records
        ]
    )

    rng = np.random.default_rng(
        42
    )

    # --------------------------------------------------------
    # Build reference indices by pill type
    # --------------------------------------------------------

    label_to_reference_indices = {}

    for index, label in enumerate(
        reference_labels
    ):

        label_to_reference_indices.setdefault(
            label,
            []
        ).append(index)

    same_pairs = []

    for query_index, label in enumerate(
        query_labels
    ):

        reference_indices = (
            label_to_reference_indices.get(
                label,
                []
            )
        )

        for reference_index in (
            reference_indices
        ):

            same_pairs.append(
                (
                    query_index,
                    reference_index
                )
            )

    if len(same_pairs) > max_same_pairs:

        selected = rng.choice(
            len(same_pairs),
            size=max_same_pairs,
            replace=False
        )

        same_pairs = [
            same_pairs[i]
            for i in selected
        ]

    same_similarities = []

    for query_index, reference_index in tqdm(
        same_pairs,
        desc="Query/reference same-pill pairs"
    ):

        similarity = float(
            np.dot(
                query_embeddings[
                    query_index
                ],
                reference_embeddings[
                    reference_index
                ]
            )
        )

        same_similarities.append(
            similarity
        )

    # --------------------------------------------------------
    # Different-pill pairs
    # --------------------------------------------------------

    different_similarities = []

    total_queries = len(
        query_records
    )

    total_references = len(
        reference_records
    )

    while len(
        different_similarities
    ) < max_different_pairs:

        query_index = rng.integers(
            0,
            total_queries
        )

        reference_index = rng.integers(
            0,
            total_references
        )

        if (
            query_labels[
                query_index
            ]
            ==
            reference_labels[
                reference_index
            ]
        ):

            continue

        similarity = float(
            np.dot(
                query_embeddings[
                    query_index
                ],
                reference_embeddings[
                    reference_index
                ]
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
    # CHECK FILES
    # ========================================================

    if not DATASET_ROOT.exists():

        raise FileNotFoundError(
            f"Dataset directory not found:\n"
            f"{DATASET_ROOT}"
        )

    if not MODEL_PATH.exists():

        raise FileNotFoundError(
            f"Model not found:\n"
            f"{MODEL_PATH}"
        )

    # ========================================================
    # LOAD DATASET
    # ========================================================

    (
        reference_records,
        query_records
    ) = load_dataset()

    if len(reference_records) == 0:

        raise RuntimeError(
            "No reference images found."
        )

    if len(query_records) == 0:

        raise RuntimeError(
            "No non-reference images found."
        )

    # ========================================================
    # LOAD MODEL
    # ========================================================

    (
        backbone,
        projection
    ) = load_model()

    # ========================================================
    # REFERENCE EMBEDDINGS
    # ========================================================

    reference_embeddings = (
        generate_embeddings(
            reference_records,
            backbone,
            projection,
            "Reference"
        )
    )

    # ========================================================
    # QUERY EMBEDDINGS
    # ========================================================

    query_embeddings = (
        generate_embeddings(
            query_records,
            backbone,
            projection,
            "Consumer"
        )
    )

    # ========================================================
    # RETRIEVAL
    # ========================================================

    (
        evaluated_queries,
        top1,
        top5,
        top10
    ) = evaluate_retrieval(
        reference_embeddings,
        reference_records,
        query_embeddings,
        query_records
    )

    # ========================================================
    # SIMILARITY
    # ========================================================

    (
        average_same,
        average_different
    ) = similarity_analysis(
        reference_embeddings,
        reference_records,
        query_embeddings,
        query_records
    )

    # ========================================================
    # FINAL RESULTS
    # ========================================================

    print()
    print()
    print("=" * 70)
    print(
        "FINAL HELD-OUT ePillID EVALUATION"
    )
    print("=" * 70)

    print()

    print(
        f"Reference images: "
        f"{len(reference_records)}"
    )

    print(
        f"Consumer/query images: "
        f"{len(query_records)}"
    )

    print(
        f"Evaluated queries: "
        f"{evaluated_queries}"
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
        "Query → Reference similarity"
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
        "Held-out evaluation complete."
    )
    print("=" * 70)

    print()

    print(
        "This evaluation uses reference images "
        "as the gallery and non-reference images "
        "as unseen queries."
    )

    print(
        "It is therefore more meaningful than "
        "the previous same-dataset sanity test."
    )

    print()


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    main()