# NNsight Migration Quick Reference

## Key Changes from transformer_lens to nnsight

### 1. Hook Point Format (MOST IMPORTANT!)
```python
# ❌ OLD (transformer_lens)
hook_point = "blocks.7.hook_resid_pre"
hook_point = "blocks.11.hook_resid_post" 

# ✅ NEW (nnsight)
hook_point = "transformer.h.7.output"
hook_point = "transformer.h.11.output"
```

### 2. Collector Classes
```python
# Both work (backward compatibility):
from probity.collection.collectors import NNsightCollector, NNsightConfig
# OR
from probity.collection.collectors import TransformerLensCollector, TransformerLensConfig

# But you MUST use new hook point format with both!
```

### 3. No Direct Model Access Needed
```python
# ❌ OLD: You had to load the model
from transformer_lens import HookedTransformer
model = HookedTransformer.from_pretrained("gpt2")

# ✅ NEW: Just specify model name in config
config = NNsightConfig(
    model_name="openai-community/gpt2",  # Model loaded internally
    hook_points=["transformer.h.11.output"],
    device="cuda"
)
```

## Common Hook Points

### GPT-2
- Embeddings: `"transformer.wte"`
- Layer outputs: `"transformer.h.{layer}.output"` (layer: 0-11)
- Final layer: `"transformer.h.11.output"`

### Other Models
- Generally follow pattern: `"transformer.h.{layer}.output"`
- Check model architecture for exact structure

## Testing Your Code

### 1. Run Comprehensive Tests
```bash
python tmp/test_comprehensive_nnsight.py
```

### 2. Run Simple Test
```bash
python test_nnsight_simple.py
```

### 3. Test Specific Functionality
```python
# Quick test for activation collection
from probity.collection.collectors import NNsightCollector, NNsightConfig

config = NNsightConfig(
    model_name="openai-community/gpt2",
    hook_points=["transformer.h.11.output"],
    device="cpu"
)
collector = NNsightCollector(config)
# If this works without errors, nnsight is properly integrated
```

## Troubleshooting

### Error: "AttributeError: 'GPT2Model' object has no attribute 'blocks'"
**Solution**: Update your hook point format from `blocks.X.hook_Y` to `transformer.h.X.output`

### Error: "Trying to backward through the graph a second time"
**Solution**: This should be fixed now. Activations are automatically detached.

### Error: "name 'HookedTransformer' is not defined"
**Solution**: Remove HookedTransformer imports. Model loading is handled internally.

## Benefits of nnsight

1. **More flexible**: Works with any HuggingFace model
2. **Cleaner API**: No need to manage model objects directly
3. **Better performance**: Optimized activation collection
4. **Automatic gradient handling**: Prevents common PyTorch errors

## Example: Complete Working Script

```python
from probity.collection.collectors import NNsightCollector, NNsightConfig
from probity.datasets.templated import TemplatedDataset
from probity.datasets.tokenized import TokenizedProbingDataset
from probity.probes import LogisticProbe, LogisticProbeConfig
from transformers import AutoTokenizer

# 1. Create dataset
dataset = TemplatedDataset.from_movie_sentiment_template(
    adjectives={"positive": ["good"], "negative": ["bad"]},
    verbs={"positive": ["liked"], "negative": ["hated"]}
)
probing_dataset = dataset.to_probing_dataset(
    label_from_attributes="sentiment",
    label_map={"positive": 1, "negative": 0}
)

# 2. Tokenize
tokenizer = AutoTokenizer.from_pretrained("gpt2")
tokenizer.pad_token = tokenizer.eos_token
tokenized = TokenizedProbingDataset.from_probing_dataset(probing_dataset, tokenizer)

# 3. Collect activations
config = NNsightConfig(
    model_name="openai-community/gpt2",
    hook_points=["transformer.h.11.output"],  # ← nnsight format!
    device="cpu"
)
collector = NNsightCollector(config)
stores = collector.collect(tokenized)

print("✅ Successfully collected activations with nnsight!")
```