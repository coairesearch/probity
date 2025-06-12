#!/usr/bin/env python3
"""Debug nnsight behavior."""

import torch
from nnsight import LanguageModel

# Load model
model = LanguageModel("openai-community/gpt2", device_map="cpu")

# Test text
text = "Hello world"
tokens = model.tokenizer(text, return_tensors="pt")
input_ids = tokens["input_ids"]

print(f"Input shape: {input_ids.shape}")

# Test getting activations
with model.trace(input_ids) as tracer:
    # Try different ways to access layers
    last_layer = model.transformer.h[11].output
    saved = last_layer.save()
    print(f"Type of saved: {type(saved)}")

# After trace execution
print(f"Type of saved after trace: {type(saved)}")
print(f"Saved value: {saved}")

if hasattr(saved, 'value'):
    print(f"saved.value: {saved.value}")
    actual_value = saved.value
elif isinstance(saved, tuple):
    print(f"Saved is tuple with length: {len(saved)}")
    actual_value = saved[0]
else:
    print(f"Saved is directly the tensor")
    actual_value = saved

if torch.is_tensor(actual_value):
    print(f"Tensor shape: {actual_value.shape}")
else:
    print(f"Not a tensor, type: {type(actual_value)}")