import React, { useState } from 'react';
import { Brain, Layers, Info, Check } from 'lucide-react';
import { useStore } from '../store';

export const ModelExplorer: React.FC = () => {
  const { models, currentModel, selectModel } = useStore();
  const [selectedLayers, setSelectedLayers] = useState<number[]>([]);
  
  const handleModelSelect = (modelId: string) => {
    selectModel(modelId);
    setSelectedLayers([]);
  };
  
  const toggleLayer = (layer: number) => {
    if (selectedLayers.includes(layer)) {
      setSelectedLayers(selectedLayers.filter(l => l !== layer));
    } else {
      setSelectedLayers([...selectedLayers, layer]);
    }
  };
  
  const selectAllLayers = () => {
    if (currentModel) {
      setSelectedLayers(Array.from({ length: currentModel.layers }, (_, i) => i));
    }
  };
  
  const clearSelection = () => {
    setSelectedLayers([]);
  };
  
  return (
    <div className="space-y-6">
      {/* Model Selection */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Model Explorer</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {models.map((model) => (
            <div
              key={model.id}
              onClick={() => handleModelSelect(model.id)}
              className={`
                border-2 rounded-lg p-4 cursor-pointer transition-all
                ${currentModel?.id === model.id 
                  ? 'border-indigo-500 bg-indigo-50' 
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <Brain className="h-8 w-8 text-indigo-600" />
                {currentModel?.id === model.id && (
                  <Check className="h-5 w-5 text-indigo-600" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{model.name}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {model.layers} layers • {model.hiddenSize} hidden size
              </p>
            </div>
          ))}
        </div>
        
        {/* Add more models button */}
        <div className="text-center">
          <button className="text-sm text-indigo-600 hover:text-indigo-500">
            + Add custom model
          </button>
        </div>
      </div>
      
      {/* Layer Selection */}
      {currentModel && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Select Layers to Probe</h3>
            <div className="space-x-2">
              <button
                onClick={selectAllLayers}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                Select All
              </button>
              <span className="text-gray-400">|</span>
              <button
                onClick={clearSelection}
                className="text-sm text-gray-600 hover:text-gray-500"
              >
                Clear
              </button>
            </div>
          </div>
          
          {/* Visual Layer Representation */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 overflow-x-auto pb-4">
              <div className="flex-shrink-0 w-24 h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-xs text-gray-500">Input</span>
              </div>
              
              {Array.from({ length: currentModel.layers }, (_, i) => (
                <React.Fragment key={i}>
                  <div className="flex-shrink-0 w-1 h-16 bg-gray-300"></div>
                  <div
                    onClick={() => toggleLayer(i)}
                    className={`
                      flex-shrink-0 w-20 h-32 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all
                      ${selectedLayers.includes(i)
                        ? 'bg-indigo-500 text-white shadow-lg transform scale-105'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }
                    `}
                  >
                    <Layers className="h-6 w-6 mb-1" />
                    <span className="text-xs font-medium">Layer {i}</span>
                  </div>
                </React.Fragment>
              ))}
              
              <div className="flex-shrink-0 w-1 h-16 bg-gray-300"></div>
              <div className="flex-shrink-0 w-24 h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-xs text-gray-500">Output</span>
              </div>
            </div>
          </div>
          
          {/* Selected Layers Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start">
              <Info className="h-5 w-5 text-gray-400 mt-0.5" />
              <div className="ml-3">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">{selectedLayers.length} layers selected</span>
                  {selectedLayers.length > 0 && (
                    <span className="text-gray-500">
                      : {selectedLayers.map(l => `Layer ${l}`).join(', ')}
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Each selected layer will have its activations collected and analyzed during the experiment.
                </p>
              </div>
            </div>
          </div>
          
          {/* Hook Points */}
          {selectedLayers.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Hook Points</h4>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-green-400">
                  <code>
{`hook_points = [
${selectedLayers.map(l => `  "transformer.h.${l}.output"`).join(',\n')}
]`}
                  </code>
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};