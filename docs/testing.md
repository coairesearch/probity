# Testing Guide for Probity

This guide covers how to test the probity library, particularly the nnsight integration.

## Quick Start

Run all integration tests to verify everything is working:

```bash
# Run the comprehensive test suite
python tests/integration/test_comprehensive_nnsight.py

# Run a simple functionality test
python tests/integration/test_nnsight_simple.py

# Test backward compatibility
python tests/integration/test_backward_compatibility.py
```

## Test Organization

```
tests/
├── integration/          # Integration tests with nnsight
│   ├── test_comprehensive_nnsight.py  # Full test suite (21 tests)
│   ├── test_nnsight_simple.py         # Basic functionality test
│   └── test_backward_compatibility.py # Tests old API aliases
├── unit/                 # Unit tests for individual components
│   ├── datasets/        # Dataset tests
│   ├── pipeline/        # Pipeline tests
│   └── trainer/         # Trainer tests
└── test_probe_save_load.py  # Probe serialization tests
```

## Integration Tests

### Comprehensive Test Suite

The main integration test (`test_comprehensive_nnsight.py`) covers:

1. **Dataset Creation** - Templates, tokenization, and data handling
2. **Activation Collection** - Single/multiple hook points, batch processing
3. **Probe Types** - Linear, Logistic, Directional, MultiClass, Sklearn
4. **Training** - Supervised and directional trainers
5. **Save/Load** - PyTorch, JSON, and Neuronpedia formats
6. **Inference** - Real-time predictions on new text
7. **Pipeline** - End-to-end workflow with caching
8. **ProbeSet** - Managing multiple probes
9. **Edge Cases** - Error handling and validation

Expected output:
```
✅ Dataset Creation
✅ Basic Activation Collection
✅ Multiple Hook Points Collection
... (21 tests total)
Test Summary: 21/21 passed
🎉 All tests passed! NNsight integration is working correctly.
```

### Simple Functionality Test

For a quick verification, run `test_nnsight_simple.py`:

```python
python tests/integration/test_nnsight_simple.py
```

This test:
- Creates a small sentiment dataset
- Collects activations using nnsight
- Trains a simple probe
- Tests inference on new text
- Verifies save/load functionality

### Backward Compatibility Test

To ensure old code still works:

```python
python tests/integration/test_backward_compatibility.py
```

This verifies that `TransformerLensCollector` and `TransformerLensConfig` still work as aliases.

## Manual Testing

### 1. Test Activation Collection

```python
from probity.collection.collectors import NNsightCollector, NNsightConfig
from probity.datasets.templated import TemplatedDataset
from probity.datasets.tokenized import TokenizedProbingDataset
from transformers import AutoTokenizer

# Create minimal dataset
dataset = TemplatedDataset.from_movie_sentiment_template(
    adjectives={"positive": ["good"], "negative": ["bad"]},
    verbs={"positive": ["loved"], "negative": ["hated"]}
)

probing_dataset = dataset.to_probing_dataset(
    label_from_attributes="sentiment",
    label_map={"positive": 1, "negative": 0}
)

# Tokenize
tokenizer = AutoTokenizer.from_pretrained("openai-community/gpt2")
tokenizer.pad_token = tokenizer.eos_token
tokenized = TokenizedProbingDataset.from_probing_dataset(probing_dataset, tokenizer)

# Collect activations
config = NNsightConfig(
    model_name="openai-community/gpt2",
    hook_points=["transformer.h.11.output"],  # Note: nnsight format!
    device="cpu"
)

collector = NNsightCollector(config)
stores = collector.collect(tokenized)

print(f"Success! Collected shape: {list(stores.values())[0].raw_activations.shape}")
```

### 2. Test Probe Training

```python
from probity.probes import LogisticProbe, LogisticProbeConfig

# Get activation data
store = list(stores.values())[0]
X, y = store.get_probe_data(position_key="ADJ")

# Create and train probe
probe = LogisticProbe(LogisticProbeConfig(input_size=768, output_size=1))

# Quick training test
import torch.nn.functional as F
outputs = probe(X)
loss = F.binary_cross_entropy_with_logits(outputs.squeeze(), y.float())
print(f"Initial loss: {loss.item():.4f}")
```

### 3. Test Pipeline End-to-End

```python
from probity.pipeline.pipeline import ProbePipeline, ProbePipelineConfig
from probity.training.trainer import SupervisedProbeTrainer, SupervisedTrainerConfig

config = ProbePipelineConfig(
    dataset=tokenized,
    probe_cls=LogisticProbe,
    probe_config=LogisticProbeConfig(input_size=768, output_size=1),
    trainer_cls=SupervisedProbeTrainer,
    trainer_config=SupervisedTrainerConfig(num_epochs=5),
    position_key="ADJ",
    model_name="openai-community/gpt2",
    hook_points=["transformer.h.11.output"],
    device="cpu"
)

pipeline = ProbePipeline(config)
probe, history = pipeline.run()
print(f"Training complete! Final loss: {history['train_loss'][-1]:.4f}")
```

## Testing Different Models

### GPT-2 Family
```python
# Standard GPT-2
config = NNsightConfig(
    model_name="openai-community/gpt2",
    hook_points=["transformer.h.11.output"],
    device="cuda"
)

# GPT-2 Medium
config = NNsightConfig(
    model_name="openai-community/gpt2-medium",
    hook_points=["transformer.h.23.output"],  # Medium has 24 layers
    device="cuda"
)
```

### Other Models
The nnsight integration should work with any HuggingFace model. Hook points generally follow:
- `"transformer.h.{layer}.output"` - For transformer layers
- Check model architecture for specific naming

## Common Test Scenarios

### Test with Multiple Hook Points
```python
config = NNsightConfig(
    model_name="openai-community/gpt2",
    hook_points=[
        "transformer.h.5.output",   # Middle layer
        "transformer.h.7.output",   # Another middle layer
        "transformer.h.11.output"   # Last layer
    ],
    device="cpu"
)
```

### Test with Different Batch Sizes
```python
# Small batches for limited memory
config = NNsightConfig(
    model_name="openai-community/gpt2",
    hook_points=["transformer.h.11.output"],
    batch_size=2,  # Process 2 examples at a time
    device="cpu"
)
```

### Test Caching
```python
pipeline_config = ProbePipelineConfig(
    # ... other config ...
    cache_dir="./activation_cache",  # Enable caching
)

# First run: collects and caches activations
pipeline1 = ProbePipeline(pipeline_config)
probe1, history1 = pipeline1.run()

# Second run: uses cached activations (much faster!)
pipeline2 = ProbePipeline(pipeline_config)
probe2, history2 = pipeline2.run()
```

## Debugging Common Issues

### Issue: Hook Point Not Found
```python
# Wrong (old transformer_lens format)
hook_points=["blocks.11.hook_resid_post"]  # ❌

# Correct (nnsight format)
hook_points=["transformer.h.11.output"]     # ✅
```

### Issue: Gradient Tracking Errors
This should be automatically handled now, but if you see:
```
RuntimeError: Trying to backward through the graph a second time
```

Ensure you're using the latest version where activations are detached.

### Issue: Memory Errors
Reduce batch size:
```python
config = NNsightConfig(
    model_name="openai-community/gpt2",
    hook_points=["transformer.h.11.output"],
    batch_size=1,  # Process one at a time
    device="cpu"   # Or use GPU if available
)
```

## Performance Testing

### Time Activation Collection
```python
import time

start = time.time()
collector = NNsightCollector(config)
stores = collector.collect(tokenized_dataset)
print(f"Collection time: {time.time() - start:.2f}s")
```

### Compare with Cache
```python
# Without cache
start = time.time()
pipeline = ProbePipeline(config_no_cache)
probe1, _ = pipeline.run()
time_no_cache = time.time() - start

# With cache (second run)
start = time.time()
pipeline = ProbePipeline(config_with_cache)
probe2, _ = pipeline.run()
time_with_cache = time.time() - start

print(f"Speedup: {time_no_cache/time_with_cache:.1f}x")
```

## Running Specific Test Categories

### Test Only Dataset Functionality
```python
from tests.integration.test_comprehensive_nnsight import test_dataset_creation, TestResults

results = TestResults()
test_dataset_creation(results)
results.summary()
```

### Test Only Probe Types
```python
# Run specific test functions from the comprehensive suite
from tests.integration.test_comprehensive_nnsight import test_probe_types, TestResults

# You'll need to set up activation_store first
results = TestResults()
test_probe_types(activation_store, results)
results.summary()
```

## Continuous Integration

For CI/CD pipelines, run:
```bash
# Run all tests and exit with appropriate code
python -m pytest tests/ -v

# Or just integration tests
python tests/integration/test_comprehensive_nnsight.py
```

The comprehensive test returns exit code 0 on success, 1 on failure.

## Contributing Tests

When adding new features:

1. Add unit tests in `tests/unit/`
2. Update integration tests if needed
3. Ensure all tests pass before submitting PR
4. Document any new test requirements here

### Test Template
```python
def test_new_feature(results: TestResults):
    """Test description."""
    try:
        # Test implementation
        assert condition, "Error message"
        results.add_result("Feature Name", True)
    except Exception as e:
        results.add_result("Feature Name", False, str(e))
```