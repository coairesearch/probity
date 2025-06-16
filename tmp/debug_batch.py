#!/usr/bin/env python3
"""Debug batch processing with nnsight."""

import torch
from nnsight import LanguageModel

# Load model
model = LanguageModel("openai-community/gpt2", device_map="cpu")

# Test with batch
texts = ["Hello world", "How are you"]
tokens = model.tokenizer(texts, return_tensors="pt", padding=True)
input_ids = tokens["input_ids"]

print(f"Batch input shape: {input_ids.shape}")

# Test getting activations for batch
with model.trace(input_ids) as tracer:
    # Get last layer output
    last_layer = model.transformer.h[11].output
    saved = last_layer.save()

# Check what we got
print(f"Type after trace: {type(saved)}")
print(f"Is tuple: {isinstance(saved, tuple)}")

if isinstance(saved, tuple):
    print(f"Tuple length: {len(saved)}")
    for i, item in enumerate(saved):
        print(f"  Item {i} type: {type(item)}")
        if hasattr(item, 'shape'):
            print(f"  Item {i} shape: {item.shape}")
            
# Try to extract tensor
if isinstance(saved, tuple) and len(saved) > 0:
    tensor = saved[0]
    print(f"\nExtracted tensor type: {type(tensor)}")
    print(f"Extracted tensor shape: {tensor.shape}")
    print(f"Can call .cpu(): {hasattr(tensor, 'cpu')}")