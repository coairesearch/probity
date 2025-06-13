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
workflows = {}
datasets = {}

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

class WorkflowNode(BaseModel):
    id: str
    type: str  # 'dataset', 'model', 'probe', 'analysis'
    position: Dict[str, float]
    data: Optional[Dict[str, Any]] = {}
    connections: List[str] = []

class WorkflowCreate(BaseModel):
    name: str
    nodes: List[WorkflowNode]
    connections: List[Dict[str, str]]

class ProbeComparison(BaseModel):
    experiment_ids: List[str]
    metrics: List[str] = ["accuracy", "f1_score", "precision", "recall"]

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
    
    # Create dataset and store it
    dataset_id = f"dataset_{len(datasets)}"
    dataset_obj = {
        "id": dataset_id,
        "name": dataset.name,
        "template": dataset.template,
        "variables": dataset.variables,
        "example_count": len(dataset.variables) * 4,  # Simplified calculation
        "createdAt": "2024-01-15T10:00:00Z"
    }
    
    datasets[dataset_id] = dataset_obj
    
    return dataset_obj

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

class InferenceRequest(BaseModel):
    text: str
    experiment_id: str

@app.post("/api/inference")
async def run_inference(request: InferenceRequest):
    # In real app, would load trained probe and run inference
    # For now, return mock results
    tokens = request.text.split()
    predictions = []
    
    # Generate more realistic predictions
    for token in tokens:
        # Positive words get high scores
        if token.lower() in ['amazing', 'wonderful', 'fantastic', 'loved', 'enjoyed', 'great', 'excellent']:
            predictions.append(0.8 + np.random.rand() * 0.2)
        # Negative words get low scores
        elif token.lower() in ['terrible', 'awful', 'horrible', 'hated', 'disliked', 'bad', 'worst']:
            predictions.append(0.1 + np.random.rand() * 0.2)
        # Neutral words
        else:
            predictions.append(0.4 + np.random.rand() * 0.2)
    
    # Calculate overall prediction
    avg_prediction = np.mean(predictions)
    
    return {
        "text": request.text,
        "tokens": tokens,
        "predictions": predictions,
        "overall_prediction": "positive" if avg_prediction > 0.5 else "negative",
        "confidence": abs(avg_prediction - 0.5) * 2
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

# Workflow endpoints
@app.post("/api/workflows/create")
async def create_workflow(workflow: WorkflowCreate):
    """Create a new workflow"""
    workflow_id = f"workflow_{len(workflows)}"
    workflows[workflow_id] = {
        "id": workflow_id,
        "name": workflow.name,
        "nodes": [node.dict() for node in workflow.nodes],
        "connections": workflow.connections,
        "created_at": "2024-01-15T10:00:00Z",
        "status": "draft"
    }
    return {"id": workflow_id, "status": "created"}

@app.get("/api/workflows")
async def list_workflows():
    """List all workflows"""
    return list(workflows.values())

@app.get("/api/workflows/{workflow_id}")
async def get_workflow(workflow_id: str):
    """Get a specific workflow"""
    if workflow_id not in workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflows[workflow_id]

@app.post("/api/workflows/{workflow_id}/run")
async def run_workflow(workflow_id: str):
    """Execute a workflow"""
    if workflow_id not in workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    workflow = workflows[workflow_id]
    workflow["status"] = "running"
    
    # Start workflow execution in background
    asyncio.create_task(execute_workflow_task(workflow_id))
    
    return {"status": "started", "workflow_id": workflow_id}

async def execute_workflow_task(workflow_id: str):
    """Background task to execute workflow"""
    workflow = workflows[workflow_id]
    
    try:
        # Simulate workflow execution
        for i, node in enumerate(workflow["nodes"]):
            # Update node status
            node["status"] = "running"
            await asyncio.sleep(2)  # Simulate processing
            node["status"] = "completed"
            
            # Send updates via websocket if needed
            if workflow_id in active_websockets:
                ws = active_websockets[workflow_id]
                await ws.send_json({
                    "type": "node_update",
                    "node_id": node["id"],
                    "status": "completed"
                })
        
        workflow["status"] = "completed"
        workflow["completed_at"] = "2024-01-15T10:05:00Z"
        
    except Exception as e:
        workflow["status"] = "failed"
        workflow["error"] = str(e)

# Probe comparison endpoints
@app.post("/api/comparison/compare")
async def compare_probes(comparison: ProbeComparison):
    """Compare multiple probes"""
    results = []
    
    # Generate mock comparison data for each experiment
    for exp_id in comparison.experiment_ids:
        # Generate realistic probe performance data
        base_accuracy = 0.85 + np.random.rand() * 0.15
        
        result = {
            "id": exp_id,
            "name": f"Probe {exp_id}",
            "accuracy": base_accuracy,
            "f1_score": base_accuracy - 0.01 + np.random.rand() * 0.02,
            "precision": base_accuracy + 0.02 + np.random.rand() * 0.02,
            "recall": base_accuracy - 0.02 + np.random.rand() * 0.02,
            "loss": 0.2 - base_accuracy * 0.15 + np.random.rand() * 0.05,
            "train_time": 30 + np.random.rand() * 100,
            "model_size": 0.5 + np.random.rand() * 5,
            "layer_performance": [
                {
                    "layer": f"L{i}",
                    "accuracy": 0.5 + (i / 12) * 0.4 + np.random.rand() * 0.1
                }
                for i in range(12)
            ]
        }
        results.append(result)
    
    return {
        "experiment_ids": comparison.experiment_ids,
        "results": results,
        "metrics": comparison.metrics
    }

@app.get("/api/comparison/experiments")
async def get_comparison_experiments():
    """Get all experiments available for comparison"""
    # Return completed experiments with probe results
    completed_experiments = []
    
    # Add some mock completed experiments
    for i in range(4):
        probe_types = ["linear", "logistic", "mlp", "directional"]
        completed_experiments.append({
            "id": f"probe{i+1}",
            "name": f"{probe_types[i].title()} Probe L11",
            "accuracy": 0.9 + np.random.rand() * 0.08,
            "f1Score": 0.89 + np.random.rand() * 0.08,
            "precision": 0.91 + np.random.rand() * 0.07,
            "recall": 0.88 + np.random.rand() * 0.09,
            "trainTime": 30 + i * 30 + np.random.randint(0, 20),
            "modelSize": 0.8 + i * 1.5,
            "status": "completed",
            "probe_type": probe_types[i]
        })
    
    # Add any real completed experiments
    for exp_id, exp in active_experiments.items():
        if exp.get("status") == "completed" and exp.get("results"):
            completed_experiments.append({
                "id": exp_id,
                "name": exp["name"],
                "accuracy": exp["results"].get("final_accuracy", 0.9),
                "status": "completed",
                "probe_type": exp.get("probe_type", "logistic")
            })
    
    return completed_experiments

# Dataset management endpoints
@app.get("/api/datasets")
async def list_datasets():
    """List all datasets"""
    return list(datasets.values())

@app.get("/api/datasets/{dataset_id}")
async def get_dataset(dataset_id: str):
    """Get a specific dataset"""
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return datasets[dataset_id]

@app.post("/api/datasets/{dataset_id}/export")
async def export_dataset(dataset_id: str, format: str = "json"):
    """Export dataset in specified format"""
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    dataset = datasets[dataset_id]
    
    if format == "json":
        return dataset
    elif format == "csv":
        # Convert to CSV format
        import csv
        import io
        
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["text", "label", "label_text"])
        writer.writeheader()
        
        # Mock examples
        examples = [
            {"text": "Example 1", "label": 1, "label_text": "positive"},
            {"text": "Example 2", "label": 0, "label_text": "negative"}
        ]
        writer.writerows(examples)
        
        return {"format": "csv", "data": output.getvalue()}
    else:
        raise HTTPException(status_code=400, detail="Unsupported format")

@app.post("/api/datasets/import")
async def import_dataset(file_data: Dict[str, Any]):
    """Import dataset from file"""
    file_type = file_data.get("type", "json")
    content = file_data.get("content", "")
    name = file_data.get("name", "Imported Dataset")
    
    dataset_id = f"dataset_{len(datasets)}"
    
    if file_type == "json":
        # Parse JSON content
        import json
        data = json.loads(content)
        datasets[dataset_id] = {
            "id": dataset_id,
            "name": name,
            "examples": data.get("examples", []),
            "template": data.get("template", ""),
            "variables": data.get("variables", []),
            "imported_from": file_type
        }
    elif file_type == "csv":
        # Parse CSV content
        import csv
        import io
        
        reader = csv.DictReader(io.StringIO(content))
        examples = list(reader)
        
        datasets[dataset_id] = {
            "id": dataset_id,
            "name": name,
            "examples": examples,
            "imported_from": file_type
        }
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    
    return {"id": dataset_id, "status": "imported", "example_count": len(datasets[dataset_id]["examples"])}

# Model management
@app.post("/api/models/add")
async def add_custom_model(model: ModelInfo):
    """Add a custom model configuration"""
    model_id = model.id or f"custom_{len(AVAILABLE_MODELS)}"
    AVAILABLE_MODELS[model_id] = model
    return {"id": model_id, "status": "added"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)