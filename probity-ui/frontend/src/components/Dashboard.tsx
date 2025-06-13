import React from 'react';
import { Link } from 'react-router-dom';
import { Database, Brain, Microscope, BarChart3, Plus, ArrowRight } from 'lucide-react';
import { useStore } from '../store';

export const Dashboard: React.FC = () => {
  const { datasets, experiments, models } = useStore();
  
  const cards = [
    {
      title: 'Create Dataset',
      description: 'Build template-based datasets for probing',
      icon: Database,
      href: '/dataset',
      color: 'bg-blue-500',
      stats: `${datasets.length} datasets`
    },
    {
      title: 'Select Model',
      description: 'Choose and explore neural network architectures',
      icon: Brain,
      href: '/model',
      color: 'bg-green-500',
      stats: `${models.length} models available`
    },
    {
      title: 'Run Experiment',
      description: 'Configure and execute probing experiments',
      icon: Microscope,
      href: '/experiment',
      color: 'bg-purple-500',
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
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome to Probity Studio</h1>
        <p className="mt-2 text-lg text-gray-600">
          A visual interface for neural network interpretability research
        </p>
      </div>
      
      {/* Quick Start Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {cards.map((card) => (
          <Link
            key={card.title}
            to={card.href}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 rounded-md p-3 ${card.color}`}>
                  <card.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {card.title}
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {card.stats}
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600">{card.description}</p>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="font-medium text-indigo-600 hover:text-indigo-500 flex items-center">
                  Get started <ArrowRight className="ml-1 h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      {/* Recent Experiments */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Recent Experiments
          </h3>
        </div>
        <div className="px-4 py-5 sm:p-6">
          {experiments.length === 0 ? (
            <div className="text-center py-12">
              <Microscope className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No experiments yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a dataset and running your first experiment.
              </p>
              <div className="mt-6">
                <Link
                  to="/dataset"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Dataset
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {experiments.slice(0, 5).map((experiment) => (
                <div key={experiment.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{experiment.name}</h4>
                    <p className="text-sm text-gray-500">
                      {experiment.probeType} probe on {experiment.modelId}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`
                      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${experiment.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        experiment.status === 'running' ? 'bg-blue-100 text-blue-800' :
                        experiment.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'}
                    `}>
                      {experiment.status}
                    </span>
                    <Link
                      to="/results"
                      className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};