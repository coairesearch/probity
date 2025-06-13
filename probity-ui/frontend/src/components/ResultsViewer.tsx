import React, { useState } from 'react';
import { Download, RefreshCw, TrendingUp, BarChart2, Brain, Activity, Weight } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useStore } from '../store';
import { AttentionPatternViz, ActivationHeatmap, ProbeWeightsViz } from './visualizations';

export const ResultsViewer: React.FC = () => {
  const { experiments, currentExperiment } = useStore();
  const [activeTab, setActiveTab] = useState<'training' | 'analysis' | 'inference' | 'attention' | 'activations' | 'weights'>('training');
  
  // Mock data for visualization
  const trainingData = Array.from({ length: 10 }, (_, i) => ({
    epoch: i + 1,
    trainLoss: 0.7 - (i * 0.05) + Math.random() * 0.02,
    valLoss: 0.68 - (i * 0.04) + Math.random() * 0.03,
    accuracy: 0.5 + (i * 0.04) + Math.random() * 0.02
  }));
  
  const layerData = Array.from({ length: 12 }, (_, i) => ({
    layer: `Layer ${i}`,
    accuracy: 0.5 + Math.random() * 0.4
  }));
  
  const tabs = [
    { id: 'training', name: 'Training Metrics', icon: TrendingUp },
    { id: 'analysis', name: 'Layer Analysis', icon: BarChart2 },
    { id: 'inference', name: 'Interactive Inference', icon: RefreshCw },
    { id: 'attention', name: 'Attention Patterns', icon: Brain },
    { id: 'activations', name: 'Activation Heatmap', icon: Activity },
    { id: 'weights', name: 'Probe Weights', icon: Weight }
  ];
  
  if (!currentExperiment && experiments.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-12">
          <BarChart2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No experiments yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Run your first experiment to see results here.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Experiment Selector */}
      {experiments.length > 0 && (
        <div className="bg-white shadow rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Experiment
          </label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
            {experiments.map((exp) => (
              <option key={exp.id} value={exp.id}>
                {exp.name} - {exp.status}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {/* Results Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm flex items-center
                  ${activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <tab.icon className="mr-2 h-4 w-4" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="p-6">
          {/* Training Metrics Tab */}
          {activeTab === 'training' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Loss Curves</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trainingData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="epoch" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="trainLoss" stroke="#8884d8" name="Train Loss" />
                    <Line type="monotone" dataKey="valLoss" stroke="#82ca9d" name="Val Loss" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Accuracy</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trainingData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="epoch" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="accuracy" stroke="#ff7300" name="Accuracy" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="flex justify-between items-center pt-4">
                <div className="text-sm text-gray-600">
                  Final accuracy: <span className="font-medium">94.2%</span>
                </div>
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  <Download className="mr-2 h-4 w-4" />
                  Export Results
                </button>
              </div>
            </div>
          )}
          
          {/* Layer Analysis Tab */}
          {activeTab === 'analysis' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Layer-wise Performance</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={layerData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="layer" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="accuracy" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Key Insights</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Best performance at Layer 11 (94.2% accuracy)</li>
                  <li>• Sentiment information emerges strongly after Layer 7</li>
                  <li>• Early layers show minimal task-specific information</li>
                </ul>
              </div>
            </div>
          )}
          
          {/* Interactive Inference Tab */}
          {activeTab === 'inference' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Test Your Probe</h3>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  rows={3}
                  placeholder="Enter text to analyze..."
                  defaultValue="This movie was absolutely fantastic!"
                />
                <button className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Run Inference
                </button>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Prediction</h4>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium text-green-600">Positive</span>
                  <span className="text-sm text-gray-500">Confidence: 96.8%</span>
                </div>
                
                <div className="mt-4">
                  <h5 className="text-xs font-medium text-gray-700 mb-1">Token-level predictions</h5>
                  <div className="flex flex-wrap gap-1">
                    {['This', 'movie', 'was', 'absolutely', 'fantastic', '!'].map((token, i) => (
                      <span
                        key={i}
                        className={`
                          px-2 py-1 rounded text-xs
                          ${i === 4 ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-700'}
                        `}
                      >
                        {token}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Attention Patterns Tab */}
          {activeTab === 'attention' && (
            <AttentionPatternViz 
              experimentId={currentExperiment?.id || experiments[0]?.id || 'demo'} 
            />
          )}

          {/* Activation Heatmap Tab */}
          {activeTab === 'activations' && (
            <ActivationHeatmap 
              experimentId={currentExperiment?.id || experiments[0]?.id || 'demo'}
              normalization="layer"
            />
          )}

          {/* Probe Weights Tab */}
          {activeTab === 'weights' && (
            <ProbeWeightsViz 
              experimentId={currentExperiment?.id || experiments[0]?.id || 'demo'}
              probeType="logistic"
            />
          )}
        </div>
      </div>
    </div>
  );
};