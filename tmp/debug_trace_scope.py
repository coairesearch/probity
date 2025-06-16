#!/usr/bin/env python3
"""Debug trace scope behavior."""

import torch
from nnsight import LanguageModel

# Load model
model = LanguageModel("openai-community/gpt2", device_map="cpu")

# Test text
texts = ["Hello world", "How are you"]
tokens = model.tokenizer(texts, return_tensors="pt", padding=True)
input_ids = tokens["input_ids"]

print(f"Input shape: {input_ids.shape}")

# Test trace scope
saved_activations = {}

with model.trace(input_ids) as tracer:
    # Inside trace context
    last_layer = model.transformer.h[11].output
    saved = last_layer.save()
    saved_activations['h11'] = saved
    print(f"Inside trace - type of saved: {type(saved)}")
    print(f"Inside trace - is proxy: {'Proxy' in str(type(saved))}")

# Outside trace context
print(f"\nOutside trace - type of saved: {type(saved_activations['h11'])}")

# Check if it has a value attribute or other way to access the actual tensor
proxy = saved_activations['h11']
print(f"Proxy attributes: {[attr for attr in dir(proxy) if not attr.startswith('_')]}")

# Try different ways to get the value
if hasattr(proxy, 'value'):
    print(f"Has .value attribute")
    actual_value = proxy.value
elif hasattr(proxy, 'node') and hasattr(proxy.node, 'value'):
    print(f"Has .node.value attribute")
    actual_value = proxy.node.value
else:
    # Try to access it directly
    print(f"Trying direct access")
    actual_value = proxy

print(f"\nActual value type: {type(actual_value)}")
if isinstance(actual_value, tuple):
    print(f"Is tuple with length: {len(actual_value)}")
    tensor = actual_value[0]
    print(f"Tensor shape: {tensor.shape}")
    cpu_tensor = tensor.cpu()
    print(f"Successfully moved to CPU: {cpu_tensor.shape}")