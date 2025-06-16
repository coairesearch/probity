#!/usr/bin/env python3
"""Test script to verify nnsight integration works correctly."""

import torch
import sys
sys.path.insert(0, '/Users/sschacht/Documents/Playgrounds/probity')

from probity.datasets.templated import TemplatedDataset, TemplateVariable, Template
from probity.datasets.tokenized import TokenizedProbingDataset, TokenizationConfig
from probity.collection.collectors import NNsightCollector, NNsightConfig
from probity.probes.inference import ProbeInference
from probity.probes import LogisticProbe, LogisticProbeConfig
from transformers import AutoTokenizer

def test_basic_collection():
    """Test basic activation collection with nnsight."""
    print("Testing nnsight activation collection...")
    
    # Create a simple dataset using movie sentiment template
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
    
    # Tokenize dataset
    tokenizer = AutoTokenizer.from_pretrained("openai-community/gpt2")
    tokenizer.pad_token = tokenizer.eos_token
    
    tokenized_dataset = TokenizedProbingDataset.from_probing_dataset(
        dataset=probing_dataset,
        tokenizer=tokenizer,
        padding=True,
        max_length=50,
        add_special_tokens=True,
    )
    
    # Create collector with nnsight
    config = NNsightConfig(
        model_name="openai-community/gpt2",
        hook_points=["transformer.h.11.output"],  # Last layer of GPT-2
        batch_size=4,
        device="cpu",  # Use CPU for testing
    )
    
    collector = NNsightCollector(config)
    
    # Collect activations
    try:
        activation_stores = collector.collect(tokenized_dataset)
    except Exception as e:
        print(f"Error during collection: {e}")
        import traceback
        traceback.print_exc()
        raise
    
    # Verify we got activations
    assert len(activation_stores) == 1
    assert "transformer.h.11.output" in activation_stores
    
    store = activation_stores["transformer.h.11.output"]
    print(f"✓ Collected activations shape: {store.raw_activations.shape}")
    print(f"✓ Hidden size: {store.hidden_size}")
    print(f"✓ Number of examples: {len(store.dataset.examples)}")
    
    return True


def test_inference():
    """Test inference with nnsight."""
    print("\nTesting nnsight inference...")
    
    # Create a simple probe (we'll just use a random one for testing)
    probe_config = LogisticProbeConfig(
        input_size=768,  # GPT-2 hidden size
        output_size=1,   # Binary classification
        device="cpu",
    )
    probe = LogisticProbe(probe_config)
    
    # Create inference object
    inference = ProbeInference(
        model_name="openai-community/gpt2",
        hook_point="transformer.h.11.output",
        probe=probe,
        device="cpu",
    )
    
    # Test getting activations
    test_text = "The capital of France is"
    activations = inference.get_activations(test_text)
    
    print(f"✓ Activation shape: {activations.shape}")
    assert activations.shape[-1] == 768  # GPT-2 hidden size
    
    # Test getting direction activations
    direction_acts = inference.get_direction_activations(test_text)
    print(f"✓ Direction activation shape: {direction_acts.shape}")
    
    return True


if __name__ == "__main__":
    try:
        print("Starting nnsight integration tests...\n")
        
        # Run tests
        test_basic_collection()
        test_inference()
        
        print("\n✅ All tests passed! NNsight integration is working correctly.")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)