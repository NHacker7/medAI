import torch
from PIL import Image
from transformers import AutoImageProcessor, AutoModel

MODEL_NAME = "facebook/dinov2-base"

print("Loading model...")
print("Model:", MODEL_NAME)

device = "cuda" if torch.cuda.is_available() else "cpu"
print("Device:", device)

processor = AutoImageProcessor.from_pretrained(MODEL_NAME)
model = AutoModel.from_pretrained(MODEL_NAME)
model = model.to(device)
model.eval()

print("Model loaded successfully.")

# Change this later to one of your actual pill images.
IMAGE_PATH = "test_pill.jpg"

image = Image.open(IMAGE_PATH).convert("RGB")

inputs = processor(images=image, return_tensors="pt")
inputs = {k: v.to(device) for k, v in inputs.items()}

with torch.no_grad():
    outputs = model(**inputs)

# CLS token = global image representation
embedding = outputs.last_hidden_state[:, 0, :]

# Normalize for cosine similarity
embedding = torch.nn.functional.normalize(embedding, p=2, dim=1)

print("Embedding shape:", tuple(embedding.shape))
print("Embedding device:", embedding.device)
print("Inference successful.")