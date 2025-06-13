#!/usr/bin/env python3
"""Test script to verify all backend endpoints are working"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_models():
    """Test model endpoints"""
    print("\n=== Testing Model Endpoints ===")
    
    # List models
    response = requests.get(f"{BASE_URL}/api/models")
    print(f"GET /api/models: {response.status_code}")
    models = response.json()
    print(f"Found {len(models)} models")
    
    # Get specific model
    if models:
        model_id = models[0]['id']
        response = requests.get(f"{BASE_URL}/api/models/{model_id}")
        print(f"GET /api/models/{model_id}: {response.status_code}")
    
    # Add custom model
    custom_model = {
        "id": "custom_test",
        "name": "Test Model",
        "layers": 6,
        "hidden_size": 512,
        "hook_points": ["transformer.h.0.output", "transformer.h.5.output"]
    }
    response = requests.post(f"{BASE_URL}/api/models/add", json=custom_model)
    print(f"POST /api/models/add: {response.status_code}")

def test_datasets():
    """Test dataset endpoints"""
    print("\n=== Testing Dataset Endpoints ===")
    
    # Create dataset
    dataset = {
        "name": "Test Dataset",
        "template": "This is a {ADJ} test.",
        "variables": [
            {
                "name": "ADJ",
                "values": {"positive": ["good", "great"], "negative": ["bad", "terrible"]},
                "classBound": True,
                "classKey": "sentiment"
            }
        ]
    }
    response = requests.post(f"{BASE_URL}/api/datasets/create", json=dataset)
    print(f"POST /api/datasets/create: {response.status_code}")
    created_dataset = response.json()
    dataset_id = created_dataset['id']
    
    # List datasets
    response = requests.get(f"{BASE_URL}/api/datasets")
    print(f"GET /api/datasets: {response.status_code}")
    print(f"Found {len(response.json())} datasets")
    
    # Get specific dataset
    response = requests.get(f"{BASE_URL}/api/datasets/{dataset_id}")
    print(f"GET /api/datasets/{dataset_id}: {response.status_code}")
    
    return dataset_id

def test_experiments(dataset_id):
    """Test experiment endpoints"""
    print("\n=== Testing Experiment Endpoints ===")
    
    # Create experiment
    experiment = {
        "name": "Test Experiment",
        "dataset_id": dataset_id,
        "model_id": "gpt2",
        "hook_points": ["transformer.h.11.output"],
        "probe_type": "logistic",
        "training_config": {
            "learning_rate": 0.001,
            "epochs": 10,
            "batch_size": 32
        }
    }
    response = requests.post(f"{BASE_URL}/api/experiments/create", json=experiment)
    print(f"POST /api/experiments/create: {response.status_code}")
    experiment_id = response.json()['id']
    
    # Run experiment
    response = requests.post(f"{BASE_URL}/api/experiments/{experiment_id}/run")
    print(f"POST /api/experiments/{experiment_id}/run: {response.status_code}")
    
    # Check status
    time.sleep(2)
    response = requests.get(f"{BASE_URL}/api/experiments/{experiment_id}/status")
    print(f"GET /api/experiments/{experiment_id}/status: {response.status_code}")
    print(f"Status: {response.json()['status']}")
    
    return experiment_id

def test_inference():
    """Test inference endpoint"""
    print("\n=== Testing Inference Endpoint ===")
    
    inference_request = {
        "text": "This movie was absolutely fantastic!",
        "experiment_id": "test"
    }
    response = requests.post(f"{BASE_URL}/api/inference", json=inference_request)
    print(f"POST /api/inference: {response.status_code}")
    result = response.json()
    print(f"Prediction: {result['overall_prediction']} (confidence: {result['confidence']:.2f})")

def test_visualizations(experiment_id):
    """Test visualization endpoints"""
    print("\n=== Testing Visualization Endpoints ===")
    
    # Attention patterns
    response = requests.get(f"{BASE_URL}/api/experiments/{experiment_id}/attention")
    print(f"GET /api/experiments/{experiment_id}/attention: {response.status_code}")
    
    # Activations
    response = requests.get(f"{BASE_URL}/api/experiments/{experiment_id}/activations")
    print(f"GET /api/experiments/{experiment_id}/activations: {response.status_code}")
    
    # Probe weights
    response = requests.get(f"{BASE_URL}/api/experiments/{experiment_id}/probe-weights")
    print(f"GET /api/experiments/{experiment_id}/probe-weights: {response.status_code}")

def test_workflows():
    """Test workflow endpoints"""
    print("\n=== Testing Workflow Endpoints ===")
    
    # Create workflow
    workflow = {
        "name": "Test Workflow",
        "nodes": [
            {
                "id": "node1",
                "type": "dataset",
                "position": {"x": 100, "y": 100},
                "data": {},
                "connections": ["node2"]
            },
            {
                "id": "node2",
                "type": "model",
                "position": {"x": 300, "y": 100},
                "data": {},
                "connections": []
            }
        ],
        "connections": [{"from": "node1", "to": "node2"}]
    }
    response = requests.post(f"{BASE_URL}/api/workflows/create", json=workflow)
    print(f"POST /api/workflows/create: {response.status_code}")
    workflow_id = response.json()['id']
    
    # List workflows
    response = requests.get(f"{BASE_URL}/api/workflows")
    print(f"GET /api/workflows: {response.status_code}")
    
    # Get specific workflow
    response = requests.get(f"{BASE_URL}/api/workflows/{workflow_id}")
    print(f"GET /api/workflows/{workflow_id}: {response.status_code}")
    
    # Run workflow
    response = requests.post(f"{BASE_URL}/api/workflows/{workflow_id}/run")
    print(f"POST /api/workflows/{workflow_id}/run: {response.status_code}")

def test_comparison():
    """Test probe comparison endpoints"""
    print("\n=== Testing Probe Comparison Endpoints ===")
    
    # Get comparison experiments
    response = requests.get(f"{BASE_URL}/api/comparison/experiments")
    print(f"GET /api/comparison/experiments: {response.status_code}")
    experiments = response.json()
    print(f"Found {len(experiments)} experiments for comparison")
    
    # Compare probes
    if len(experiments) >= 2:
        comparison = {
            "experiment_ids": [exp['id'] for exp in experiments[:2]],
            "metrics": ["accuracy", "f1_score", "precision", "recall"]
        }
        response = requests.post(f"{BASE_URL}/api/comparison/compare", json=comparison)
        print(f"POST /api/comparison/compare: {response.status_code}")

def main():
    """Run all tests"""
    print("Testing Probity Backend API...")
    print(f"Base URL: {BASE_URL}")
    
    try:
        # Test root endpoint
        response = requests.get(f"{BASE_URL}/")
        print(f"GET /: {response.status_code}")
        
        # Run tests
        test_models()
        dataset_id = test_datasets()
        experiment_id = test_experiments(dataset_id)
        test_inference()
        test_visualizations(experiment_id)
        test_workflows()
        test_comparison()
        
        print("\n✅ All tests completed!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("Make sure the backend is running: uvicorn main:app --reload")

if __name__ == "__main__":
    main()