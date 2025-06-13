import React, { useState } from 'react';
import { Play, Settings, AlertCircle } from 'lucide-react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';

export const ExperimentSetup: React.FC = () => {
  const navigate = useNavigate();
  const { 
    datasets, 
    currentDataset, 
    currentModel, 
    createExperiment,
    updateExperiment,
    setActiveView 
  } = useStore();
  
  const [experimentName, setExperimentName] = useState('');
  const [probeType, setProbeType] = useState('logistic');
  const [trainingConfig, setTrainingConfig] = useState({
    learningRate: 0.001,
    epochs: 10,
    batchSize: 32,
    trainRatio: 0.8
  });
  
  const probeTypes = [
    { id: 'linear', name: 'Linear Probe', description: 'Simple linear transformation' },
    { id: 'logistic', name: 'Logistic Probe', description: 'Binary classification with sigmoid' },
    { id: 'multiclass', name: 'Multi-class Logistic', description: 'Multi-class classification' },
    { id: 'directional', name: 'Directional Probe', description: 'Unsupervised direction finding' }
  ];
  
  const canRunExperiment = currentDataset && currentModel && experimentName;
  
  const runExperiment = () => {
    if (!canRunExperiment) return;
    
    const experiment = {
      id: Date.now().toString(),
      name: experimentName,
      datasetId: currentDataset.id,
      modelId: currentModel.id,
      hookPoints: [`transformer.h.11.output`], // TODO: Get from model explorer
      probeType,
      status: 'idle' as const,
      progress: 0
    };
    
    createExperiment(experiment);
    
    // Start the experiment
    updateExperiment(experiment.id, { status: 'running' });
    
    // Simulate experiment progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      updateExperiment(experiment.id, { progress });
      
      if (progress >= 100) {
        clearInterval(interval);
        // Update experiment status to completed
        updateExperiment(experiment.id, { status: 'completed', progress: 100 });
      }
    }, 500);
    
    // Navigate to results
    navigate('/results');
  };
  
  return (
    <div className="space-y-6">
      {/* Prerequisites Check */}
      {(!currentDataset || !currentModel) && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Please complete the following before running an experiment:
              </p>
              <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                {!currentDataset && <li>Create or select a dataset</li>}
                {!currentModel && <li>Select a model and layers to probe</li>}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Experiment Setup</h2>
        
        {/* Experiment Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Experiment Name
          </label>
          <input
            type="text"
            value={experimentName}
            onChange={(e) => setExperimentName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., Sentiment Analysis GPT-2 Layer 11"
          />
        </div>
        
        {/* Current Configuration Summary */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Dataset</h4>
            <p className="text-sm text-gray-600">
              {currentDataset ? currentDataset.name : 'No dataset selected'}
            </p>
            {currentDataset && (
              <p className="text-xs text-gray-500 mt-1">
                {currentDataset.examples?.length || 0} examples
              </p>
            )}
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Model</h4>
            <p className="text-sm text-gray-600">
              {currentModel ? currentModel.name : 'No model selected'}
            </p>
            {currentModel && (
              <p className="text-xs text-gray-500 mt-1">
                Probing layers: 11 {/* TODO: Get from selection */}
              </p>
            )}
          </div>
        </div>
        
        {/* Probe Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Probe Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {probeTypes.map((type) => (
              <div
                key={type.id}
                onClick={() => setProbeType(type.id)}
                className={`
                  border rounded-lg p-4 cursor-pointer transition-all
                  ${probeType === type.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <h4 className="font-medium text-gray-900">{type.name}</h4>
                <p className="text-sm text-gray-500 mt-1">{type.description}</p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Training Configuration */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Training Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Learning Rate
              </label>
              <input
                type="number"
                value={trainingConfig.learningRate}
                onChange={(e) => setTrainingConfig({
                  ...trainingConfig,
                  learningRate: parseFloat(e.target.value)
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                step="0.0001"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Epochs
              </label>
              <input
                type="number"
                value={trainingConfig.epochs}
                onChange={(e) => setTrainingConfig({
                  ...trainingConfig,
                  epochs: parseInt(e.target.value)
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Size
              </label>
              <input
                type="number"
                value={trainingConfig.batchSize}
                onChange={(e) => setTrainingConfig({
                  ...trainingConfig,
                  batchSize: parseInt(e.target.value)
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Train/Val Split
              </label>
              <input
                type="number"
                value={trainingConfig.trainRatio}
                onChange={(e) => setTrainingConfig({
                  ...trainingConfig,
                  trainRatio: parseFloat(e.target.value)
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                step="0.1"
                min="0.1"
                max="0.9"
              />
            </div>
          </div>
        </div>
        
        {/* Run Button */}
        <div className="flex justify-end">
          <button
            onClick={runExperiment}
            disabled={!canRunExperiment}
            className={`
              inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md
              ${canRunExperiment
                ? 'text-white bg-indigo-600 hover:bg-indigo-700'
                : 'text-gray-400 bg-gray-200 cursor-not-allowed'
              }
            `}
          >
            <Play className="mr-2 h-5 w-5" />
            Run Experiment
          </button>
        </div>
      </div>
    </div>
  );
};