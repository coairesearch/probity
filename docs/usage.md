# Probity Usage Guide

## Overview
Probity is a library for probing neural networks, now using nnsight for model introspection instead of transformer_lens.

> **📚 Quick Links:**
> - [Testing Guide](testing.md) - How to test the library and verify nnsight integration
> - [Migration Guide](migration_guide.md) - Quick reference for migrating from transformer_lens

## Key Changes from transformer_lens to nnsight

### Hook Point Format
- **Old format (transformer_lens)**: `"blocks.12.hook_resid_post"`
- **New format (nnsight)**: `"transformer.h.12.output"`

### Model Loading
```python
# Old (transformer_lens)
from transformer_lens import HookedTransformer
model = HookedTransformer.from_pretrained_no_processing("gpt2")

# New (nnsight)
from nnsight import LanguageModel
model = LanguageModel("gpt2", device_map="cuda")
```

### Collecting Activations
```python
from probity.collection.collectors import NNsightCollector, NNsightConfig
from probity.datasets.tokenized import TokenizedProbingDataset

# Configure collector
config = NNsightConfig(
    model_name="openai-community/gpt2",
    hook_points=["transformer.h.11.output"],  # Last layer of GPT-2
    batch_size=32,
    device="cuda",
)

# Create collector
collector = NNsightCollector(config)

# Collect activations
activation_stores = collector.collect(tokenized_dataset)
```

### Running Inference
```python
from probity.probes.inference import ProbeInference

# Create inference object
inference = ProbeInference(
    model_name="openai-community/gpt2",
    hook_point="transformer.h.11.output",
    probe=trained_probe,
    device="cuda",
)

# Get activations for text
text = "The capital of France is"
activations = inference.get_activations(text)

# Get probe predictions
probabilities = inference.get_probabilities(text)
```

## Common Hook Points

### GPT-2
- Last layer output: `"transformer.h.11.output"`
- Middle layer output: `"transformer.h.5.output"`
- First layer output: `"transformer.h.0.output"`

### Other Models
Hook points follow the pattern: `"transformer.h.{layer_number}.output"`

## Backward Compatibility

For backward compatibility, the old class names are available as aliases:
- `TransformerLensCollector` → `NNsightCollector`
- `TransformerLensConfig` → `NNsightConfig`

However, you must update hook point formats to the new nnsight convention.

## Example: Complete Pipeline

```python
import torch
from probity.datasets.templated import TemplatedDataset
from probity.datasets.tokenized import TokenizedProbingDataset
from probity.collection.collectors import NNsightCollector, NNsightConfig
from probity.probes import LogisticProbe, LogisticProbeConfig
from probity.training.trainer import SupervisedProbeTrainer, SupervisedTrainerConfig
from probity.pipeline.pipeline import ProbePipeline, ProbePipelineConfig
from transformers import AutoTokenizer

# Create dataset
dataset = TemplatedDataset.from_movie_sentiment_template(
    adjectives={
        "positive": ["amazing", "wonderful"],
        "negative": ["terrible", "awful"],
    },
    verbs={
        "positive": ["loved", "enjoyed"],
        "negative": ["hated", "disliked"],
    }
)

probing_dataset = dataset.to_probing_dataset(
    label_from_attributes="sentiment",
    label_map={"positive": 1, "negative": 0},
    auto_add_positions=True,
)

# Tokenize
tokenizer = AutoTokenizer.from_pretrained("gpt2")
tokenizer.pad_token = tokenizer.eos_token

tokenized_dataset = TokenizedProbingDataset.from_probing_dataset(
    dataset=probing_dataset,
    tokenizer=tokenizer,
    padding=True,
    max_length=50,
)

# Configure pipeline
device = "cuda" if torch.cuda.is_available() else "cpu"

probe_config = LogisticProbeConfig(
    input_size=768,  # GPT-2 hidden size
    output_size=1,
    bias=True,
    device=device,
)

trainer_config = SupervisedTrainerConfig(
    learning_rate=0.001,
    num_epochs=10,
    device=device,
)

pipeline_config = ProbePipelineConfig(
    dataset=tokenized_dataset,
    probe_cls=LogisticProbe,
    probe_config=probe_config,
    trainer_cls=SupervisedProbeTrainer,
    trainer_config=trainer_config,
    position_key="ADJ",
    model_name="openai-community/gpt2",
    hook_points=["transformer.h.11.output"],
    device=device,
)

# Run pipeline
pipeline = ProbePipeline(pipeline_config)
probe, history = pipeline.run()

print(f"Training completed with final accuracy: {history['val_accuracy'][-1]:.3f}")
```

## Testing Your Setup

To verify everything is working correctly:

```bash
# Quick test (< 30 seconds)
python tests/integration/test_nnsight_simple.py

# Comprehensive test (all features)
python tests/integration/test_comprehensive_nnsight.py

# Test backward compatibility
python tests/integration/test_backward_compatibility.py
```

See the [Testing Guide](testing.md) for detailed testing instructions.

## Troubleshooting

### AttributeError: 'GPT2LMHeadModel' object has no attribute 'blocks'
Update your hook point format from `"blocks.X.hook_resid_Y"` to `"transformer.h.X.output"`.

### RuntimeError during backward pass
This can occur if you're trying to compute gradients through nnsight's trace context. Ensure you're using `torch.no_grad()` when collecting activations for inference.

### Proxy object errors
After a trace execution, saved activations might be proxy objects. Access their value using `.value` attribute if needed.