from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import asyncio
import json
import sys
import os
import numpy as np

# Add parent directory to path to import probity
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from probity.datasets.templated import TemplatedDataset, TemplateVariable
from probity.datasets.tokenized import TokenizedProbingDataset
from probity.collection.collectors import NNsightCollector, NNsightConfig
from probity.probes import LogisticProbe, LogisticProbeConfig, LinearProbe, LinearProbeConfig
from probity.training.trainer import SupervisedProbeTrainer, SupervisedTrainerConfig
from probity.pipeline.pipeline import ProbePipeline, ProbePipelineConfig
from transformers import AutoTokenizer
import torch

app = FastAPI(title="Probity Studio API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active experiments
active_experiments = {}
active_websockets = {}

# Models
class DatasetCreate(BaseModel):
    name: str
    template: str
    variables: List[Dict[str, Any]]

class ExperimentCreate(BaseModel):
    name: str
    dataset_id: str
    model_id: str
    hook_points: List[str]
    probe_type: str
    training_config: Dict[str, Any]

class ModelInfo(BaseModel):
    id: str
    name: str
    layers: int
    hidden_size: int
    hook_points: List[str]

# Available models
AVAILABLE_MODELS = {
    "gpt2": ModelInfo(
        id="gpt2",
        name="GPT-2",
        layers=12,
        hidden_size=768,
        hook_points=[f"transformer.h.{i}.output" for i in range(12)]
    ),
    "gpt2-medium": ModelInfo(
        id="gpt2-medium",
        name="GPT-2 Medium",
        layers=24,
        hidden_size=1024,
        hook_points=[f"transformer.h.{i}.output" for i in range(24)]
    )
}

@app.get("/")
async def root():
    return {"message": "Probity Studio API"}

@app.get("/api/models")
async def get_models():
    return list(AVAILABLE_MODELS.values())

@app.get("/api/models/{model_id}")
async def get_model(model_id: str):
    if model_id not in AVAILABLE_MODELS:
        raise HTTPException(status_code=404, detail="Model not found")
    return AVAILABLE_MODELS[model_id]

@app.post("/api/datasets/create")
async def create_dataset(dataset: DatasetCreate):
    # Convert to probity dataset format
    variables = {}
    for var in dataset.variables:
        variables[var['name']] = TemplateVariable(
            name=var['name'],
            values=var['values'],
            attributes=var.get('attributes'),
            class_bound=var.get('classBound', False),
            class_key=var.get('classKey')
        )
    
    # Create dataset (in real app, would save to database)
    return {
        "id": f"dataset_{len(active_experiments)}",
        "name": dataset.name,
        "template": dataset.template,
        "variables": dataset.variables,
        "example_count": len(dataset.variables) * 4  # Simplified calculation
    }

@app.post("/api/datasets/{dataset_id}/preview")
async def preview_dataset(dataset_id: str, limit: int = 10):
    # In real app, would load dataset from database
    # For now, return mock examples
    return {
        "examples": [
            {"text": "I thought this movie was amazing, I loved it.", "label": 1, "label_text": "positive"},
            {"text": "I thought this movie was terrible, I hated it.", "label": 0, "label_text": "negative"}
        ][:limit]
    }

@app.post("/api/experiments/create")
async def create_experiment(experiment: ExperimentCreate):
    experiment_id = f"exp_{len(active_experiments)}"
    active_experiments[experiment_id] = {
        "id": experiment_id,
        "status": "created",
        "progress": 0,
        **experiment.dict()
    }
    return {"id": experiment_id, "status": "created"}

@app.post("/api/experiments/{experiment_id}/run")
async def run_experiment(experiment_id: str):
    if experiment_id not in active_experiments:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    experiment = active_experiments[experiment_id]
    experiment["status"] = "running"
    
    # Start experiment in background
    asyncio.create_task(run_experiment_task(experiment_id))
    
    return {"status": "started"}

async def run_experiment_task(experiment_id: str):
    """Background task to run experiment"""
    experiment = active_experiments[experiment_id]
    
    try:
        # Simulate experiment progress
        for i in range(0, 101, 10):
            experiment["progress"] = i
            
            # Send update via websocket if connected
            if experiment_id in active_websockets:
                ws = active_websockets[experiment_id]
                await ws.send_json({
                    "type": "progress",
                    "progress": i,
                    "status": "running"
                })
            
            await asyncio.sleep(1)  # Simulate work
        
        experiment["status"] = "completed"
        experiment["results"] = {
            "final_accuracy": 0.942,
            "best_layer": 11,
            "training_history": {
                "loss": [0.7, 0.5, 0.3, 0.2, 0.15],
                "accuracy": [0.6, 0.75, 0.85, 0.9, 0.942]
            }
        }
        
        # Send completion via websocket
        if experiment_id in active_websockets:
            ws = active_websockets[experiment_id]
            await ws.send_json({
                "type": "completed",
                "results": experiment["results"]
            })
            
    except Exception as e:
        experiment["status"] = "failed"
        experiment["error"] = str(e)

@app.get("/api/experiments/{experiment_id}/status")
async def get_experiment_status(experiment_id: str):
    if experiment_id not in active_experiments:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    experiment = active_experiments[experiment_id]
    return {
        "id": experiment_id,
        "status": experiment["status"],
        "progress": experiment.get("progress", 0),
        "results": experiment.get("results")
    }

@app.websocket("/ws/experiments/{experiment_id}")
async def websocket_endpoint(websocket: WebSocket, experiment_id: str):
    await websocket.accept()
    active_websockets[experiment_id] = websocket
    
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except:
        del active_websockets[experiment_id]

@app.post("/api/inference")
async def run_inference(text: str, experiment_id: str):
    # In real app, would load trained probe and run inference
    # For now, return mock results
    tokens = text.split()
    predictions = [0.1, 0.2, 0.1, 0.9, 0.95, 0.1][:len(tokens)]
    
    return {
        "text": text,
        "tokens": tokens,
        "predictions": predictions,
        "overall_prediction": "positive",
        "confidence": 0.968
    }

@app.get("/api/experiments/{experiment_id}/attention")
async def get_attention_patterns(experiment_id: str, layer: Optional[int] = None):
    """Get attention patterns for visualization"""
    # Mock data - in real implementation, load from experiment results
    tokens = ["I", "thought", "this", "movie", "was", "amazing", ",", "I", "loved", "it", "."]
    num_layers = 12
    num_tokens = len(tokens)
    
    # Generate mock attention patterns
    attention_data = np.random.rand(num_layers, num_tokens, num_tokens)
    # Make attention patterns more realistic (higher values on diagonal)
    for l in range(num_layers):
        for i in range(num_tokens):
            attention_data[l, i, i] *= 2
            # Normalize rows to sum to 1
            attention_data[l, i] = attention_data[l, i] / attention_data[l, i].sum()
    
    if layer is not None:
        attention_data = attention_data[layer:layer+1]
    
    return {
        "tokens": tokens,
        "layers": list(range(num_layers)) if layer is None else [layer],
        "attention": attention_data.tolist()
    }

@app.get("/api/experiments/{experiment_id}/activations")
async def get_activations(experiment_id: str):
    """Get activation data for heatmap visualization"""
    # Mock data
    tokens = ["I", "thought", "this", "movie", "was", "amazing", ",", "I", "loved", "it", "."]
    layers = [f"Layer {i}" for i in range(12)]
    
    # Generate mock activations
    activations = np.random.randn(len(tokens), len(layers)) * 0.5
    
    # Calculate statistics per layer
    statistics = {
        "mean": activations.mean(axis=0).tolist(),
        "std": activations.std(axis=0).tolist(),
        "max": activations.max(axis=0).tolist(),
        "min": activations.min(axis=0).tolist()
    }
    
    return {
        "tokens": tokens,
        "layers": layers,
        "activations": activations.tolist(),
        "statistics": statistics
    }

@app.get("/api/experiments/{experiment_id}/probe-weights")
async def get_probe_weights(experiment_id: str):
    """Get probe weights for visualization"""
    # Mock data
    num_features = 768  # Hidden size for transformer models
    
    # Generate mock weights with some structure
    weights = np.random.randn(num_features) * 0.1
    # Make some features more important
    important_indices = np.random.choice(num_features, size=50, replace=False)
    weights[important_indices] *= 5
    
    # Calculate importance scores
    importance = np.abs(weights) + np.random.rand(num_features) * 0.05
    
    return {
        "features": [f"dim_{i}" for i in range(num_features)],
        "weights": weights.tolist(),
        "importance": importance.tolist(),
        "layerName": "Layer 11",
        "accuracy": 0.942
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)