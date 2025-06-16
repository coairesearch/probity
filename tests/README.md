# Probity Tests

This directory contains tests for the probity library.

## Structure

```
tests/
├── integration/         # Integration tests with nnsight
│   ├── test_comprehensive_nnsight.py  # Full test suite (21 tests)
│   ├── test_nnsight_simple.py         # Basic functionality test
│   └── test_backward_compatibility.py # Tests old API aliases
├── unit/               # Unit tests for individual components
│   ├── datasets/      # Dataset component tests
│   ├── pipeline/      # Pipeline component tests
│   └── trainer/       # Trainer component tests
└── test_probe_save_load.py  # Probe serialization tests
```

## Running Tests

### Quick Test
```bash
# Test basic functionality (< 30 seconds)
python tests/integration/test_nnsight_simple.py
```

### Full Test Suite
```bash
# Run all integration tests (~2 minutes)
python tests/integration/test_comprehensive_nnsight.py
```

### Specific Tests
```bash
# Test backward compatibility
python tests/integration/test_backward_compatibility.py

# Test probe save/load
python tests/test_probe_save_load.py
```

## What the Tests Cover

### Integration Tests
- **Dataset Creation**: Templates, tokenization, data handling
- **Activation Collection**: Single/multiple hook points with nnsight
- **All Probe Types**: Linear, Logistic, Directional, MultiClass, Sklearn
- **Training**: Different trainers and configurations
- **Save/Load**: All serialization formats
- **Inference**: Real-time predictions
- **Pipeline**: End-to-end workflows with caching
- **Edge Cases**: Error handling and validation

### Unit Tests
- Individual component functionality
- Isolated testing of specific features
- Edge case handling

## Adding New Tests

When adding new features:
1. Add unit tests in `tests/unit/`
2. Update integration tests if the feature affects the overall workflow
3. Ensure all existing tests still pass
4. Document test requirements

## Troubleshooting

If tests fail:
1. Check you're using the correct hook point format (`transformer.h.X.output`)
2. Ensure nnsight is properly installed
3. Verify CUDA availability matches your device settings
4. See the [Testing Guide](../docs/testing.md) for detailed troubleshooting