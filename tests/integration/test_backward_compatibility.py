#!/usr/bin/env python3
"""
Test backward compatibility with transformer_lens naming.
Shows that old class names still work (but with new hook point format).
"""

from probity.collection.collectors import TransformerLensCollector, TransformerLensConfig
from probity.datasets.templated import TemplatedDataset
from probity.datasets.tokenized import TokenizedProbingDataset
from transformers import AutoTokenizer

print("🔄 Testing backward compatibility aliases\n")

# Create a minimal dataset
dataset = TemplatedDataset.from_movie_sentiment_template(
    adjectives={"positive": ["good"], "negative": ["bad"]},
    verbs={"positive": ["liked"], "negative": ["hated"]}
)

probing_dataset = dataset.to_probing_dataset(
    label_from_attributes="sentiment",
    label_map={"positive": 1, "negative": 0}
)

tokenizer = AutoTokenizer.from_pretrained("openai-community/gpt2")
tokenizer.pad_token = tokenizer.eos_token

tokenized = TokenizedProbingDataset.from_probing_dataset(
    probing_dataset, 
    tokenizer,
    max_length=20
)

# Use the OLD class names (they're aliases to the new ones)
print("Using TransformerLensCollector and TransformerLensConfig (backward compatibility aliases)")
config = TransformerLensConfig(
    model_name="openai-community/gpt2",
    hook_points=["transformer.h.11.output"],  # ⚠️ Must use NEW hook point format!
    batch_size=2,
    device="cpu"
)

collector = TransformerLensCollector(config)
print(f"✅ Created collector: {type(collector).__name__}")
print(f"   (Actually using: {collector.__class__.__bases__[0].__name__})")

# Collect activations
stores = collector.collect(tokenized)
print(f"\n✅ Successfully collected activations!")
print(f"   Shape: {list(stores.values())[0].raw_activations.shape}")

print("\n📝 Important notes:")
print("   - Old class names (TransformerLensCollector/Config) work as aliases")
print("   - But you MUST use the new hook point format!")
print("   - Old format 'blocks.11.hook_resid_post' will NOT work")
print("   - New format 'transformer.h.11.output' is required")