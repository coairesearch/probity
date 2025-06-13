import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Database, Brain, Microscope, BarChart3, Plus, ArrowRight, Eye, Trash2, Edit } from 'lucide-react';
import { useStore } from '../store';

export const Dashboard: React.FC = () => {
  const { datasets, experiments, models, selectDataset, currentDataset, deleteDataset, createDataset } = useStore();
  const [showDatasets, setShowDatasets] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Fetch datasets from backend on mount
  useEffect(() => {
    fetchDatasets();
  }, []);
  
  const fetchDatasets = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/datasets');
      const data = await response.json();
      
      // Add datasets to store
      data.forEach((dataset: any) => {
        if (!datasets.find(d => d.id === dataset.id)) {
          createDataset(dataset);
        }
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching datasets:', error);
      setLoading(false);
    }
  };
  
  const cards = [
    {
      title: 'Create Dataset',
      description: 'Build template-based datasets for probing',
      icon: Database,
      href: '/dataset',
      color: 'bg-blue-500',
      stats: `${datasets.length} datasets`,
      action: () => setShowDatasets(!showDatasets)
    },
    {
      title: 'Select Model',
      description: 'Choose and explore neural network architectures',
      icon: Brain,
      href: '/model',
      color: 'bg-purple-500',
      stats: `${models.length} models available`
    },
    {
      title: 'Run Experiment',
      description: 'Configure and execute probing experiments',
      icon: Microscope,
      href: '/experiment',
      color: 'bg-green-500',
      stats: `${experiments.length} experiments`
    },
    {
      title: 'View Results',
      description: 'Analyze and visualize probing results',
      icon: BarChart3,
      href: '/results',
      color: 'bg-orange-500',
      stats: `${experiments.filter(e => e.status === 'completed').length} completed`
    }
  ];
  
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome to Probity Studio</h1>
            <p className="mt-2 text-lg text-gray-600">
              A visual interface for neural network interpretability research
            </p>
          </div>
          <Link
            to="/experiment"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Experiment
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card) => (
            <div key={card.title} className="relative">
              <Link
                to={card.href}
                className="block bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors"
              >
                <div className={`inline-flex p-3 rounded-lg ${card.color} text-white mb-4`}>
                  <card.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">{card.title}</h3>
                <p className="mt-2 text-sm text-gray-500">{card.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{card.stats}</span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </div>
              </Link>
              
              {/* Show datasets dropdown for dataset card */}
              {card.title === 'Create Dataset' && datasets.length > 0 && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    card.action?.();
                  }}
                  className="absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-700"
                >
                  <Eye className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Datasets List */}
      {showDatasets && datasets.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Existing Datasets</h2>
            <button
              onClick={() => setShowDatasets(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-3">
            {datasets.map((dataset) => (
              <div
                key={dataset.id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  currentDataset?.id === dataset.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div 
                    className="flex-1"
                    onClick={() => selectDataset(dataset.id)}
                  >
                    <h3 className="text-lg font-medium text-gray-900">{dataset.name}</h3>
                    <div className="mt-1 text-sm text-gray-500">
                      {dataset.examples?.length || 0} examples
                      {dataset.createdAt && (
                        <span className="ml-3">
                          Created: {new Date(dataset.createdAt).toLocaleDateString()}
                        </span>
                      )}
                      {dataset.importedFrom && (
                        <span className="ml-3 text-blue-600">
                          Imported from {dataset.importedFrom}
                        </span>
                      )}
                    </div>
                    {dataset.templates?.[0]?.template && (
                      <div className="mt-2 text-sm font-mono text-gray-600 bg-gray-100 p-2 rounded">
                        {dataset.templates[0].template.substring(0, 100)}...
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Link
                      to="/dataset"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectDataset(dataset.id);
                      }}
                      className="p-2 text-gray-500 hover:text-gray-700"
                      title="Edit dataset"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to delete this dataset?')) {
                          deleteDataset?.(dataset.id);
                        }
                      }}
                      className="p-2 text-red-500 hover:text-red-700"
                      title="Delete dataset"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Recent Experiments */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Experiments</h2>
        {experiments.length === 0 ? (
          <div className="text-center py-8">
            <Microscope className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No experiments yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a dataset and running your first experiment.
            </p>
            <Link
              to="/dataset"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Create Dataset
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {experiments.slice(0, 5).map((experiment) => (
              <Link
                key={experiment.id}
                to="/results"
                className="block p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{experiment.name}</h3>
                    <p className="text-sm text-gray-500">
                      {experiment.probeType} probe • {experiment.status}
                    </p>
                  </div>
                  <div className="text-right">
                    {experiment.status === 'completed' && experiment.results && (
                      <p className="text-sm font-medium text-green-600">
                        {(experiment.results.final_accuracy * 100).toFixed(1)}% accuracy
                      </p>
                    )}
                    {experiment.status === 'running' && (
                      <p className="text-sm text-yellow-600">
                        {experiment.progress}% complete
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};