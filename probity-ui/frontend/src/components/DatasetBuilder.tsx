import React, { useState } from 'react';
import { Plus, Trash2, Save, Eye, Download, Upload } from 'lucide-react';
import { useStore, Variable } from '../store';
import { DataImportExport } from './DataImportExport';

export const DatasetBuilder: React.FC = () => {
  const { currentDataset, createDataset, updateDataset } = useStore();
  const [activeTab, setActiveTab] = useState<'create' | 'import'>('create');
  const [template, setTemplate] = useState('I thought this movie was {ADJ}, I {VERB} it.');
  const [variables, setVariables] = useState<Variable[]>([
    {
      name: 'ADJ',
      values: {
        positive: ['amazing', 'wonderful', 'fantastic'],
        negative: ['terrible', 'awful', 'horrible']
      },
      classBound: true,
      classKey: 'sentiment'
    },
    {
      name: 'VERB',
      values: {
        positive: ['loved', 'enjoyed'],
        negative: ['hated', 'disliked']
      },
      classBound: true,
      classKey: 'sentiment'
    }
  ]);
  const [datasetName, setDatasetName] = useState('Movie Sentiment Dataset');
  const [previewExamples, setPreviewExamples] = useState<string[]>([]);
  
  // Generate preview examples
  const generatePreview = () => {
    const examples: string[] = [];
    
    if (variables.length === 0) return;
    
    // For class-bound variables, generate examples for each class
    const classes = ['positive', 'negative'];
    
    classes.forEach(cls => {
      // Generate a few examples for each class
      for (let i = 0; i < 3; i++) {
        let example = template;
        
        variables.forEach(variable => {
          const values = variable.classBound && variable.values[cls] 
            ? variable.values[cls] 
            : Object.values(variable.values).flat();
          
          const randomValue = values[Math.floor(Math.random() * values.length)];
          example = example.replace(new RegExp(`{${variable.name}}`, 'g'), randomValue);
        });
        
        examples.push(example);
      }
    });
    
    setPreviewExamples(examples);
  };
  
  const addVariable = () => {
    setVariables([...variables, {
      name: 'VAR',
      values: { default: ['value'] },
      classBound: false
    }]);
  };
  
  const updateVariable = (index: number, updated: Partial<Variable>) => {
    const newVariables = [...variables];
    newVariables[index] = { ...newVariables[index], ...updated };
    setVariables(newVariables);
  };
  
  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };
  
  const saveDataset = () => {
    const dataset = {
      id: Date.now().toString(),
      name: datasetName,
      templates: [{
        id: '1',
        template,
        variables
      }],
      examples: previewExamples.map((text, index) => ({
        text,
        label: index < previewExamples.length / 2 ? 1 : 0,
        label_text: index < previewExamples.length / 2 ? 'positive' : 'negative'
      }))
    };
    
    createDataset(dataset);
    alert('Dataset saved successfully!');
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <div className="px-6 py-4">
            <h2 className="text-2xl font-bold text-gray-900">Dataset Builder</h2>
          </div>
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('create')}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'create'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              Create Template
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'import'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              Import/Export
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'create' ? (
            <div className="space-y-6">
              {/* Dataset Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dataset Name
                </label>
                <input
                  type="text"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              {/* Template Editor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template
                </label>
                <textarea
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  rows={3}
                  placeholder="Enter your template with {VARIABLE} placeholders..."
                />
                <p className="mt-1 text-sm text-gray-500">
                  Use curly braces to define variables, e.g., {'{VARIABLE}'}
                </p>
              </div>
              
              {/* Variables */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Variables</h3>
                  <button
                    onClick={addVariable}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Variable
                  </button>
                </div>
                
                <div className="space-y-4">
                  {variables.map((variable, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <input
                          type="text"
                          value={variable.name}
                          onChange={(e) => updateVariable(index, { name: e.target.value })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Variable name"
                        />
                        <button
                          onClick={() => removeVariable(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="mb-3">
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={variable.classBound || false}
                            onChange={(e) => updateVariable(index, { classBound: e.target.checked })}
                            className="mr-2"
                          />
                          Class-bound variable
                        </label>
                      </div>
                      
                      {variable.classBound ? (
                        <div className="space-y-2">
                          {Object.entries(variable.values).map(([cls, vals]) => (
                            <div key={cls}>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {cls} values:
                              </label>
                              <input
                                type="text"
                                value={(vals as string[]).join(', ')}
                                onChange={(e) => {
                                  const newValues = { ...variable.values };
                                  newValues[cls] = e.target.value.split(',').map(v => v.trim());
                                  updateVariable(index, { values: newValues });
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                placeholder="Enter comma-separated values"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Values:
                          </label>
                          <input
                            type="text"
                            value={Object.values(variable.values).flat().join(', ')}
                            onChange={(e) => {
                              updateVariable(index, {
                                values: { default: e.target.value.split(',').map(v => v.trim()) }
                              });
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Enter comma-separated values"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex justify-between items-center">
                <button
                  onClick={generatePreview}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Generate Preview
                </button>
                
                <button
                  onClick={saveDataset}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Dataset
                </button>
              </div>
              
              {/* Preview */}
              {previewExamples.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Preview</h3>
                    <span className="text-sm text-gray-500">
                      {previewExamples.length} examples generated
                    </span>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                      {previewExamples.map((example, index) => (
                        <div key={index} className="p-3 bg-white rounded-lg text-sm">
                          <span className="text-gray-700">{example}</span>
                          <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            index < previewExamples.length / 2 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {index < previewExamples.length / 2 ? 'positive' : 'negative'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <DataImportExport />
          )}
        </div>
      </div>
    </div>
  );
};