#!/usr/bin/env python3
"""
Comprehensive test script to ensure all probity functionality works with nnsight
in the same way as it did with transformer_lens.

This tests:
1. Dataset creation and tokenization
2. Activation collection with different batch sizes
3. Multiple hook points
4. Different probe types (Linear, Logistic, DirectionalProbe, MultiClassLogistic)
5. Training with different trainers (Supervised and Unsupervised)
6. Probe saving/loading in multiple formats
7. Inference functionality
8. Pipeline functionality
9. ProbeSet functionality
10. Edge cases and error handling
"""

import torch
import sys
import os
import json
import tempfile
import numpy as np
from pathlib import Path

sys.path.insert(0, '/Users/sschacht/Documents/Playgrounds/probity')

# Probity imports
from probity.datasets.templated import TemplatedDataset, TemplateVariable, Template
from probity.datasets.tokenized import TokenizedProbingDataset, TokenizationConfig
from probity.datasets.base import ProbingExample, ProbingDataset
from probity.collection.collectors import NNsightCollector, NNsightConfig, TransformerLensCollector
from probity.collection.activation_store import ActivationStore
from probity.probes import (
    LinearProbe, LinearProbeConfig,
    LogisticProbe, LogisticProbeConfig,
    DirectionalProbe, MeanDiffProbeConfig,
    MultiClassLogisticProbe, MultiClassLogisticProbeConfig,
    SklearnLogisticProbe, SklearnLogisticProbeConfig,
    ProbeSet,
    MeanDifferenceProbe
)
from probity.probes.inference import ProbeInference
from probity.training.trainer import (
    SupervisedProbeTrainer, SupervisedTrainerConfig,
    DirectionalProbeTrainer, DirectionalTrainerConfig
)
from probity.pipeline.pipeline import ProbePipeline, ProbePipelineConfig

# Third-party imports
from transformers import AutoTokenizer
from sklearn.linear_model import LogisticRegression
import warnings
warnings.filterwarnings('ignore', category=FutureWarning)


class TestResults:
    """Simple test result tracker."""
    def __init__(self):
        self.passed = []
        self.failed = []
        
    def add_result(self, test_name: str, passed: bool, message: str = ""):
        if passed:
            self.passed.append(test_name)
            print(f"✅ {test_name}")
        else:
            self.failed.append((test_name, message))
            print(f"❌ {test_name}: {message}")
            
    def summary(self):
        total = len(self.passed) + len(self.failed)
        print(f"\n{'='*50}")
        print(f"Test Summary: {len(self.passed)}/{total} passed")
        if self.failed:
            print("\nFailed tests:")
            for name, msg in self.failed:
                print(f"  - {name}: {msg}")
        print(f"{'='*50}")
        return len(self.failed) == 0


def test_dataset_creation(results: TestResults):
    """Test dataset creation functionality."""
    print("\n📋 Testing Dataset Creation...")
    
    try:
        # Test templated dataset creation
        adjectives = {
            "positive": ["amazing", "wonderful", "fantastic", "excellent"],
            "negative": ["terrible", "awful", "horrible", "bad"],
        }
        verbs = {
            "positive": ["loved", "enjoyed"],
            "negative": ["hated", "disliked"],
        }
        
        dataset = TemplatedDataset.from_movie_sentiment_template(
            adjectives=adjectives,
            verbs=verbs
        )
        
        # Convert to probing dataset
        probing_dataset = dataset.to_probing_dataset(
            label_from_attributes="sentiment",
            label_map={"positive": 1, "negative": 0},
            auto_add_positions=True,
        )
        
        # Test tokenization
        tokenizer = AutoTokenizer.from_pretrained("openai-community/gpt2")
        tokenizer.pad_token = tokenizer.eos_token
        
        tokenized_dataset = TokenizedProbingDataset.from_probing_dataset(
            dataset=probing_dataset,
            tokenizer=tokenizer,
            padding=True,
            max_length=50,
            add_special_tokens=True,
        )
        
        # Verify dataset properties
        n_examples = len(tokenized_dataset.examples)
        assert n_examples > 0, f"No examples created"
        assert all(ex.label in [0, 1] for ex in tokenized_dataset.examples), "Invalid labels"
        assert all("ADJ" in ex.token_positions.keys() for ex in tokenized_dataset.examples), "Missing ADJ position"
        print(f"  Created {n_examples} examples")
        
        results.add_result("Dataset Creation", True)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        results.add_result("Dataset Creation", False, f"Exception: {type(e).__name__}: {str(e)}")
        return None
        
    return tokenized_dataset


def test_activation_collection(tokenized_dataset, results: TestResults):
    """Test activation collection with different configurations."""
    print("\n🧠 Testing Activation Collection...")
    
    # Test 1: Basic collection
    try:
        config = NNsightConfig(
            model_name="openai-community/gpt2",
            hook_points=["transformer.h.11.output"],
            batch_size=4,
            device="cpu",
        )
        
        collector = NNsightCollector(config)
        activation_stores = collector.collect(tokenized_dataset)
        
        assert len(activation_stores) == 1, "Wrong number of activation stores"
        store = activation_stores["transformer.h.11.output"]
        assert store.raw_activations.shape[0] == len(tokenized_dataset.examples), "Wrong number of activations"
        assert store.hidden_size == 768, f"Wrong hidden size: {store.hidden_size}"
        
        results.add_result("Basic Activation Collection", True)
        
    except Exception as e:
        results.add_result("Basic Activation Collection", False, str(e))
        return None
    
    # Test 2: Multiple hook points
    try:
        config = NNsightConfig(
            model_name="openai-community/gpt2",
            hook_points=["transformer.h.5.output", "transformer.h.7.output", "transformer.h.11.output"],
            batch_size=8,
            device="cpu",
        )
        
        collector = NNsightCollector(config)
        activation_stores = collector.collect(tokenized_dataset)
        
        assert len(activation_stores) == 3, f"Expected 3 stores, got {len(activation_stores)}"
        for hook in config.hook_points:
            assert hook in activation_stores, f"Missing hook point: {hook}"
            
        results.add_result("Multiple Hook Points Collection", True)
        
    except Exception as e:
        results.add_result("Multiple Hook Points Collection", False, str(e))
        
    # Test 3: Backward compatibility alias
    try:
        config = TransformerLensCollector(
            NNsightConfig(
                model_name="openai-community/gpt2",
                hook_points=["transformer.h.11.output"],
                batch_size=16,
                device="cpu",
            )
        )
        
        results.add_result("Backward Compatibility Alias", True)
        
    except Exception as e:
        results.add_result("Backward Compatibility Alias", False, str(e))
        
    return activation_stores


def test_probe_types(activation_store, results: TestResults):
    """Test different probe types."""
    print("\n🔍 Testing Different Probe Types...")
    
    device = "cpu"
    hidden_size = activation_store.hidden_size
    
    # Get training data
    X, y = activation_store.get_probe_data(position_key="ADJ")
    
    # Manual train/val split
    n_train = int(len(X) * 0.7)
    indices = torch.randperm(len(X))
    train_indices = indices[:n_train]
    val_indices = indices[n_train:]
    
    X_train = X[train_indices]
    y_train = y[train_indices]
    X_val = X[val_indices]
    y_val = y[val_indices]
    
    # Test 1: Linear Probe
    try:
        probe_config = LinearProbeConfig(
            input_size=hidden_size,
            output_size=1,
            bias=True,
            device=device,
        )
        probe = LinearProbe(probe_config)
        
        trainer_config = SupervisedTrainerConfig(
            learning_rate=0.001,
            num_epochs=5,
            device=device,
        )
        trainer = SupervisedProbeTrainer(trainer_config)
        
        # Create DataLoaders (trainer expects X, y, X_orig)
        from torch.utils.data import TensorDataset, DataLoader
        train_dataset = TensorDataset(X_train, y_train, X_train.clone())  # X_orig is same as X for our test
        val_dataset = TensorDataset(X_val, y_val, X_val.clone())
        train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
        val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)
        
        history = trainer.train(probe, train_loader, val_loader)
        assert "train_loss" in history, "Missing training history"
        
        results.add_result("Linear Probe", True)
        
    except Exception as e:
        results.add_result("Linear Probe", False, str(e))
    
    # Test 2: Logistic Probe
    logistic_probe = None  # Initialize for later use
    try:
        probe_config = LogisticProbeConfig(
            input_size=hidden_size,
            output_size=1,
            bias=True,
            device=device,
        )
        probe = LogisticProbe(probe_config)
        logistic_probe = probe  # Save reference
        
        trainer = SupervisedProbeTrainer(trainer_config)
        # Create DataLoaders (trainer expects X, y, X_orig)
        from torch.utils.data import TensorDataset, DataLoader
        train_dataset = TensorDataset(X_train, y_train, X_train.clone())  # X_orig is same as X for our test
        val_dataset = TensorDataset(X_val, y_val, X_val.clone())
        train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
        val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)
        
        history = trainer.train(probe, train_loader, val_loader)
        
        # Test predictions
        with torch.no_grad():
            outputs = probe(X_val)
            probs = torch.sigmoid(outputs)
            assert probs.min() >= 0 and probs.max() <= 1, "Invalid probabilities"
            
        results.add_result("Logistic Probe", True)
        
    except Exception as e:
        results.add_result("Logistic Probe", False, str(e))
        
    # Test 3: Mean Difference Probe (a type of directional probe)
    try:
        probe_config = MeanDiffProbeConfig(
            input_size=hidden_size,
            device=device,
        )
        probe = MeanDifferenceProbe(probe_config)
        
        trainer_config = DirectionalTrainerConfig(
            learning_rate=0.001,
            num_epochs=5,
            batch_size=32,
            device=device,
        )
        trainer = DirectionalProbeTrainer(trainer_config)
        
        # Create positive/negative splits for unsupervised training
        positive_indices = [i for i, y in enumerate(y_train) if y == 1]
        negative_indices = [i for i, y in enumerate(y_train) if y == 0]
        
        X_positive = X_train[positive_indices]
        X_negative = X_train[negative_indices]
        
        # For directional probe, it uses fit method on the probe directly
        # and then train method with dataloaders
        probe.fit(X_train, y_train)
        
        # Create DataLoaders for training (trainer expects X, y, X_orig)
        from torch.utils.data import TensorDataset, DataLoader
        train_dataset = TensorDataset(X_train, y_train, X_train.clone())
        train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
        
        history = trainer.train(probe, train_loader)
        
        # Verify direction is normalized
        direction = probe.get_direction()
        assert torch.allclose(direction.norm(), torch.tensor(1.0), atol=1e-5), "Direction not normalized"
        
        results.add_result("Mean Difference Probe", True)
        
    except Exception as e:
        results.add_result("Mean Difference Probe", False, str(e))
        
    # Test 4: MultiClass Logistic Probe
    try:
        # Create multi-class labels (simulate 4 classes)
        y_train_multi = torch.randint(0, 4, (len(y_train),))
        y_val_multi = torch.randint(0, 4, (len(y_val),))
        
        probe_config = MultiClassLogisticProbeConfig(
            input_size=hidden_size,
            output_size=4,
            bias=True,
            device=device,
        )
        probe = MultiClassLogisticProbe(probe_config)
        
        trainer = SupervisedProbeTrainer(trainer_config)
        # Create DataLoaders (trainer expects X, y, X_orig)
        train_dataset = TensorDataset(X_train, y_train_multi, X_train.clone())
        val_dataset = TensorDataset(X_val, y_val_multi, X_val.clone())
        train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
        val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)
        
        history = trainer.train(probe, train_loader, val_loader)
        
        # Test predictions
        with torch.no_grad():
            outputs = probe(X_val)
            probs = torch.softmax(outputs, dim=-1)
            assert probs.shape[1] == 4, "Wrong output shape"
            assert torch.allclose(probs.sum(dim=1), torch.ones(len(probs))), "Probabilities don't sum to 1"
            
        results.add_result("MultiClass Logistic Probe", True)
        
    except Exception as e:
        results.add_result("MultiClass Logistic Probe", False, str(e))
        
    # Test 5: Sklearn Logistic Probe
    try:
        probe_config = SklearnLogisticProbeConfig(
            input_size=hidden_size,
            output_size=1,
            device=device,
        )
        probe = SklearnLogisticProbe(probe_config)
        
        # Sklearn probe has its own fit method (expects torch tensors)
        probe.fit(X_train, y_train)
        
        # Test predictions using forward method
        with torch.no_grad():
            outputs = probe(X_val)
            predictions = (outputs > 0).float()  # Binary predictions
            assert len(predictions) == len(y_val), "Wrong number of predictions"
        
        results.add_result("Sklearn Logistic Probe", True)
        
    except Exception as e:
        results.add_result("Sklearn Logistic Probe", False, str(e))
        
    # Return a fitted logistic probe for further testing
    return logistic_probe if 'logistic_probe' in locals() else probe


def test_save_load_functionality(probe, results: TestResults):
    """Test saving and loading probes in different formats."""
    print("\n💾 Testing Save/Load Functionality...")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        # Test 1: PyTorch format
        try:
            pt_path = os.path.join(temp_dir, "probe.pt")
            probe.save(pt_path)
            
            loaded_probe = LogisticProbe.load(pt_path)
            
            # Verify loaded probe has same parameters
            original_params = {name: param.clone() for name, param in probe.named_parameters()}
            loaded_params = {name: param for name, param in loaded_probe.named_parameters()}
            
            for name in original_params:
                assert torch.allclose(original_params[name], loaded_params[name]), f"Parameter {name} mismatch"
                
            results.add_result("PyTorch Save/Load", True)
            
        except Exception as e:
            results.add_result("PyTorch Save/Load", False, str(e))
            
        # Test 2: JSON format
        try:
            json_path = os.path.join(temp_dir, "probe.json")
            probe.save_json(json_path)
            
            loaded_probe = LogisticProbe.load_json(json_path)
            
            # Verify config matches
            assert probe.config.input_size == loaded_probe.config.input_size, "Input size mismatch"
            assert probe.config.output_size == loaded_probe.config.output_size, "Output size mismatch"
            
            results.add_result("JSON Save/Load", True)
            
        except Exception as e:
            results.add_result("JSON Save/Load", False, str(e))
            
        # Test 3: Neuronpedia format (skip for sklearn probe)
        try:
            if hasattr(probe, 'to_neuronpedia_data'):
                # Test neuronpedia export
                neuronpedia_data = probe.to_neuronpedia_data(
                    dataset_name="test_dataset",
                    layer=11,
                    description="Test probe for nnsight integration"
                )
                
                assert "probe_class" in neuronpedia_data, "Missing probe_class"
                assert "layer" in neuronpedia_data, "Missing layer"
                assert neuronpedia_data["layer"] == 11, "Wrong layer"
                
                results.add_result("Neuronpedia Export", True)
            else:
                results.add_result("Neuronpedia Export", True)  # Skip for probes without this method
            
        except Exception as e:
            results.add_result("Neuronpedia Export", False, str(e))


def test_inference_functionality(probe, results: TestResults):
    """Test inference functionality."""
    print("\n🎯 Testing Inference Functionality...")
    
    try:
        # Create inference object
        inference = ProbeInference(
            model_name="openai-community/gpt2",
            hook_point="transformer.h.11.output",
            probe=probe,
            device="cpu",
        )
        
        # Test single text
        text = "The movie was absolutely amazing"
        
        # Test activations
        activations = inference.get_activations(text)
        assert activations.shape[-1] == 768, f"Wrong activation size: {activations.shape}"
        
        # Test direction activations
        direction_acts = inference.get_direction_activations(text)
        assert direction_acts.dim() == 2, "Wrong dimension for direction activations"
        
        # Test probe outputs
        outputs = inference.get_probe_outputs(text)
        assert outputs.shape[0] == 1, "Wrong batch size"
        
        # Test probabilities
        probs = inference.get_probabilities(text)
        assert probs.min() >= 0 and probs.max() <= 1, "Invalid probabilities"
        
        # Test batch inference
        texts = ["The movie was amazing", "The film was terrible", "It was okay"]
        batch_probs = inference.get_probabilities(texts)
        assert batch_probs.shape[0] == 3, "Wrong batch size"
        
        results.add_result("Inference Functionality", True)
        
    except Exception as e:
        results.add_result("Inference Functionality", False, str(e))
        
    # Test loading from saved probe
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            probe_path = os.path.join(temp_dir, "test_probe.pt")
            probe.save(probe_path)
            
            # Load using class method
            loaded_inference = ProbeInference.from_saved_probe(
                model_name="openai-community/gpt2",
                hook_point="transformer.h.11.output",
                probe_path=probe_path,
                device="cpu",
            )
            
            # Test it works
            test_probs = loaded_inference.get_probabilities("Test text")
            assert test_probs.shape[0] == 1, "Loading failed"
            
        results.add_result("Inference from Saved Probe", True)
        
    except Exception as e:
        results.add_result("Inference from Saved Probe", False, str(e))


def test_pipeline_functionality(tokenized_dataset, results: TestResults):
    """Test end-to-end pipeline functionality."""
    print("\n🔄 Testing Pipeline Functionality...")
    
    try:
        device = "cpu"
        
        probe_config = LogisticProbeConfig(
            input_size=768,
            output_size=1,
            bias=True,
            device=device,
        )
        
        trainer_config = SupervisedTrainerConfig(
            learning_rate=0.001,
            num_epochs=5,
            train_ratio=0.7,
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
            activation_batch_size=8,
            device=device,
        )
        
        # Run pipeline
        pipeline = ProbePipeline(pipeline_config)
        probe, history = pipeline.run()
        
        # Verify results
        assert probe is not None, "No probe returned"
        assert "val_accuracy" in history, "No validation accuracy"
        assert history["val_accuracy"][-1] > 0.5, f"Poor accuracy: {history['val_accuracy'][-1]}"
        
        results.add_result("Pipeline Functionality", True)
        
    except Exception as e:
        results.add_result("Pipeline Functionality", False, str(e))
        
    # Test pipeline with caching
    try:
        with tempfile.TemporaryDirectory() as cache_dir:
            pipeline_config.cache_dir = cache_dir
            
            # First run - should collect activations
            pipeline1 = ProbePipeline(pipeline_config)
            probe1, history1 = pipeline1.run()
            
            # Second run - should use cached activations
            pipeline2 = ProbePipeline(pipeline_config)
            probe2, history2 = pipeline2.run()
            
            # Results should be similar (not identical due to training randomness)
            assert abs(history1["val_accuracy"][-1] - history2["val_accuracy"][-1]) < 0.2, "Cached results too different"
            
        results.add_result("Pipeline with Caching", True)
        
    except Exception as e:
        results.add_result("Pipeline with Caching", False, str(e))


def test_probe_set_functionality(activation_stores, results: TestResults):
    """Test ProbeSet functionality for managing multiple probes."""
    print("\n📦 Testing ProbeSet Functionality...")
    
    try:
        device = "cpu"
        hidden_size = 768
        
        # Create multiple probes
        probes = []
        for i, hook_point in enumerate(["transformer.h.5.output", "transformer.h.7.output", "transformer.h.11.output"]):
            config = LogisticProbeConfig(
                input_size=hidden_size,
                output_size=1,
                bias=True,
                device=device,
            )
            probe = LogisticProbe(config)
            probe.name = f"layer_{5 + i * 2}"  # Set name for identification
            probes.append(probe)
            
        # Create ProbeSet
        probe_set = ProbeSet(probes)
        
        # Test access
        assert len(probe_set) == 3, f"Wrong number of probes: {len(probe_set)}"
        
        # Test iteration (ProbeSet is a list-like object)
        count = 0
        for probe in probe_set.probes:
            count += 1
            assert isinstance(probe, LogisticProbe), "Wrong probe type"
        assert count == 3, "Iteration failed"
        
        # Test saving/loading
        with tempfile.TemporaryDirectory() as temp_dir:
            save_path = os.path.join(temp_dir, "probe_set.pt")
            probe_set.save(save_path)
            
            loaded_set = ProbeSet.load(save_path)
            assert len(loaded_set) == len(probe_set), "Loading failed"
            
        results.add_result("ProbeSet Functionality", True)
        
    except Exception as e:
        results.add_result("ProbeSet Functionality", False, str(e))


def test_edge_cases(results: TestResults):
    """Test edge cases and error handling."""
    print("\n⚠️ Testing Edge Cases...")
    
    # Test 1: Empty dataset handling
    try:
        empty_dataset = ProbingDataset(examples=[])
        tokenizer = AutoTokenizer.from_pretrained("openai-community/gpt2")
        tokenizer.pad_token = tokenizer.eos_token
        
        try:
            tokenized = TokenizedProbingDataset.from_probing_dataset(
                dataset=empty_dataset,
                tokenizer=tokenizer,
            )
            # If it doesn't raise an error, check if it at least creates an empty dataset
            if len(tokenized.examples) == 0:
                results.add_result("Empty Dataset Handling", True)
            else:
                results.add_result("Empty Dataset Handling", False, "Created non-empty dataset from empty input")
        except (ValueError, IndexError, AssertionError) as e:
            # Empty dataset might raise various errors
            results.add_result("Empty Dataset Handling", True)
            
    except Exception as e:
        results.add_result("Empty Dataset Handling", False, str(e))
        
    # Test 2: Invalid hook point
    try:
        config = NNsightConfig(
            model_name="openai-community/gpt2",
            hook_points=["invalid.hook.point"],
            device="cpu",
        )
        collector = NNsightCollector(config)
        
        # This should fail when collecting
        try:
            # Create minimal dataset for testing
            examples = [ProbingExample(text="Test", label=0, label_text="test")]
            dataset = ProbingDataset(examples=examples)
            tokenizer = AutoTokenizer.from_pretrained("openai-community/gpt2")
            tokenizer.pad_token = tokenizer.eos_token
            tokenized = TokenizedProbingDataset.from_probing_dataset(dataset, tokenizer)
            
            collector.collect(tokenized)
            results.add_result("Invalid Hook Point", False, "Should have raised error")
        except (AttributeError, ValueError):
            results.add_result("Invalid Hook Point", True)
            
    except Exception as e:
        results.add_result("Invalid Hook Point", False, str(e))
        
    # Test 3: Mismatched dimensions
    try:
        probe_config = LinearProbeConfig(
            input_size=512,  # Wrong size for GPT-2
            output_size=1,
            device="cpu",
        )
        probe = LinearProbe(probe_config)
        
        # Try to use with GPT-2 activations (768 dim)
        X = torch.randn(10, 768)
        try:
            output = probe(X)
            results.add_result("Dimension Mismatch", False, "Should have raised error")
        except RuntimeError:
            results.add_result("Dimension Mismatch", True)
            
    except Exception as e:
        results.add_result("Dimension Mismatch", False, str(e))


def test_model_compatibility(results: TestResults):
    """Test compatibility with different model architectures."""
    print("\n🤖 Testing Model Compatibility...")
    
    # Note: This test uses small models to keep it fast
    # In real usage, you might test with larger models
    
    try:
        # Create simple dataset
        examples = [
            ProbingExample(text="The capital of France is Paris", label=1, label_text="factual"),
            ProbingExample(text="The capital of France is London", label=0, label_text="incorrect"),
        ]
        dataset = ProbingDataset(examples=examples)
        
        tokenizer = AutoTokenizer.from_pretrained("openai-community/gpt2")
        tokenizer.pad_token = tokenizer.eos_token
        
        tokenized = TokenizedProbingDataset.from_probing_dataset(
            dataset=dataset,
            tokenizer=tokenizer,
            max_length=20,
        )
        
        # Test with GPT-2 (already tested above, but included for completeness)
        config = NNsightConfig(
            model_name="openai-community/gpt2",
            hook_points=["transformer.h.0.output"],
            batch_size=2,
            device="cpu",
        )
        
        collector = NNsightCollector(config)
        stores = collector.collect(tokenized)
        
        assert len(stores) == 1, "Collection failed"
        
        results.add_result("Model Compatibility", True)
        
    except Exception as e:
        results.add_result("Model Compatibility", False, str(e))


def main():
    """Run all tests."""
    print("🚀 Starting Comprehensive NNsight Integration Tests")
    print("=" * 60)
    
    results = TestResults()
    
    # Run tests in sequence
    tokenized_dataset = test_dataset_creation(results)
    
    if tokenized_dataset:
        activation_stores = test_activation_collection(tokenized_dataset, results)
        
        if activation_stores:
            # Use the last activation store for probe testing
            activation_store = list(activation_stores.values())[0]
            probe = test_probe_types(activation_store, results)
            
            if probe:
                test_save_load_functionality(probe, results)
                test_inference_functionality(probe, results)
                
            test_pipeline_functionality(tokenized_dataset, results)
            test_probe_set_functionality(activation_stores, results)
    
    test_edge_cases(results)
    test_model_compatibility(results)
    
    # Print summary
    success = results.summary()
    
    if success:
        print("\n🎉 All tests passed! NNsight integration is working correctly.")
        return 0
    else:
        print("\n❌ Some tests failed. Please check the errors above.")
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)