#!/usr/bin/env python3
"""
Simple test script to verify nnsight integration is working.
This demonstrates the key functionality with minimal code.
"""

import torch
from transformers import AutoTokenizer

# Probity imports
from probity.datasets.templated import TemplatedDataset
from probity.datasets.tokenized import TokenizedProbingDataset
from probity.collection.collectors import NNsightCollector, NNsightConfig
from probity.probes import LogisticProbe, LogisticProbeConfig
from probity.probes.inference import ProbeInference

print("🚀 Testing nnsight integration with probity\n")

# Step 1: Create a simple sentiment dataset
print("1️⃣ Creating dataset...")
dataset = TemplatedDataset.from_movie_sentiment_template(
    adjectives={"positive": ["amazing", "wonderful"], "negative": ["terrible", "awful"]},
    verbs={"positive": ["loved"], "negative": ["hated"]}
)

probing_dataset = dataset.to_probing_dataset(
    label_from_attributes="sentiment",
    label_map={"positive": 1, "negative": 0},
    auto_add_positions=True
)

# Step 2: Tokenize the dataset
print("2️⃣ Tokenizing dataset...")
tokenizer = AutoTokenizer.from_pretrained("openai-community/gpt2")
tokenizer.pad_token = tokenizer.eos_token

tokenized_dataset = TokenizedProbingDataset.from_probing_dataset(
    dataset=probing_dataset,
    tokenizer=tokenizer,
    padding=True,
    max_length=50
)
print(f"   Created {len(tokenized_dataset.examples)} tokenized examples")

# Step 3: Collect activations using nnsight
print("3️⃣ Collecting activations with nnsight...")
config = NNsightConfig(
    model_name="openai-community/gpt2",
    hook_points=["transformer.h.11.output"],  # Last layer of GPT-2
    batch_size=4,
    device="cpu"  # Use "cuda" if you have GPU
)

collector = NNsightCollector(config)
activation_stores = collector.collect(tokenized_dataset)

store = activation_stores["transformer.h.11.output"]
print(f"   Collected activations shape: {store.raw_activations.shape}")
print(f"   Hidden size: {store.hidden_size}")

# Step 4: Train a simple probe
print("4️⃣ Training logistic probe...")
X, y = store.get_probe_data(position_key="ADJ")

# Split data
n_train = int(len(X) * 0.8)
X_train, X_test = X[:n_train], X[n_train:]
y_train, y_test = y[:n_train], y[n_train:]

# Create and train probe
probe_config = LogisticProbeConfig(
    input_size=768,  # GPT-2 hidden size
    output_size=1,
    bias=True,
    device="cpu"
)
probe = LogisticProbe(probe_config)

# Simple training loop
optimizer = torch.optim.Adam(probe.parameters(), lr=0.01)
criterion = torch.nn.BCEWithLogitsLoss()

probe.train()
for epoch in range(100):
    optimizer.zero_grad()
    outputs = probe(X_train).squeeze()
    loss = criterion(outputs, y_train.float())
    loss.backward()
    optimizer.step()
    
    if epoch % 20 == 0:
        print(f"   Epoch {epoch}: Loss = {loss.item():.4f}")

# Test accuracy
probe.eval()
with torch.no_grad():
    test_outputs = probe(X_test).squeeze()
    predictions = (torch.sigmoid(test_outputs) > 0.5).float()
    accuracy = (predictions == y_test).float().mean()
    print(f"   Test accuracy: {accuracy:.2%}")

# Step 5: Test inference on new text
print("5️⃣ Testing inference on new text...")
inference = ProbeInference(
    model_name="openai-community/gpt2",
    hook_point="transformer.h.11.output",
    probe=probe,
    device="cpu"
)

test_texts = [
    "This movie was absolutely amazing",
    "The film was terrible and boring"
]

for text in test_texts:
    probs = inference.get_probabilities(text)
    # Get probability at the adjective position (simplified - just take max)
    max_prob = probs.max().item()
    sentiment = "positive" if max_prob > 0.5 else "negative"
    print(f"   '{text}' -> {sentiment} ({max_prob:.2%})")

# Step 6: Test saving and loading
print("6️⃣ Testing save/load functionality...")
probe.save("test_probe.pt")
loaded_probe = LogisticProbe.load("test_probe.pt")
print("   ✅ PyTorch save/load successful")

probe.save_json("test_probe.json")
loaded_probe_json = LogisticProbe.load_json("test_probe.json")
print("   ✅ JSON save/load successful")

# Cleanup
import os
os.remove("test_probe.pt")
os.remove("test_probe.json")

print("\n✨ All tests completed successfully! The nnsight integration is working properly.")
print("\n📝 Key differences from transformer_lens:")
print("   - Hook points: 'blocks.N.hook_resid_pre' → 'transformer.h.N.output'")
print("   - Model loading is handled internally by NNsightCollector")
print("   - Activations are automatically detached to prevent gradient issues")