#!/usr/bin/env python3
"""Debug inference behavior."""

import torch
from nnsight import LanguageModel

# Load model
model = LanguageModel("openai-community/gpt2", device_map="cpu")

# Test single text
text = "Hello world"
tokens = model.tokenizer(text, return_tensors="pt", padding=True)
input_ids = tokens["input_ids"]

print(f"Input shape: {input_ids.shape}")

# Test trace for single input
with model.trace(input_ids) as tracer:
    last_layer = model.transformer.h[11].output
    saved = last_layer.save()
    print(f"Inside trace - type: {type(saved)}")

# Check what we get after trace
print(f"\nAfter trace - type: {type(saved)}")
print(f"Has .value: {hasattr(saved, 'value')}")

if hasattr(saved, 'value'):
    value = saved.value
    print(f"Value type: {type(value)}")
    if isinstance(value, tuple):
        print(f"Tuple length: {len(value)}")
        print(f"First element shape: {value[0].shape}")