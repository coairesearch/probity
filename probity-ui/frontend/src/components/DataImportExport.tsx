import React, { useState, useRef } from 'react';
import { Upload, Download, FileJson, FileText, AlertCircle, Check, X } from 'lucide-react';
import { useStore } from '../store';

interface ImportPreview {
  valid: boolean;
  data: any[];
  errors: string[];
  warnings: string[];
}

export const DataImportExport: React.FC = () => {
  const { datasets, createDataset, currentDataset } = useStore();
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    
    try {
      const content = await file.text();
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      let data;
      let preview: ImportPreview = {
        valid: true,
        data: [],
        errors: [],
        warnings: []
      };

      // Parse file based on extension
      if (fileExtension === 'json' || fileExtension === 'jsonl') {
        try {
          if (fileExtension === 'jsonl') {
            // Parse JSONL (newline-delimited JSON)
            data = content.split('\n')
              .filter(line => line.trim())
              .map((line, idx) => {
                try {
                  return JSON.parse(line);
                } catch (e) {
                  preview.errors.push(`Line ${idx + 1}: Invalid JSON`);
                  preview.valid = false;
                  return null;
                }
              })
              .filter(Boolean);
          } else {
            // Parse regular JSON
            data = JSON.parse(content);
            if (!Array.isArray(data)) {
              data = [data];
            }
          }
          preview.data = data;
        } catch (e) {
          preview.errors.push('Invalid JSON format');
          preview.valid = false;
        }
      } else if (fileExtension === 'csv') {
        // Parse CSV
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          preview.errors.push('CSV file must have headers and at least one data row');
          preview.valid = false;
        } else {
          const headers = lines[0].split(',').map(h => h.trim());
          data = lines.slice(1).map((line, idx) => {
            const values = line.split(',').map(v => v.trim());
            if (values.length !== headers.length) {
              preview.warnings.push(`Line ${idx + 2}: Column count mismatch`);
            }
            return headers.reduce((obj, header, i) => {
              obj[header] = values[i] || '';
              return obj;
            }, {} as any);
          });
          preview.data = data;
        }
      } else {
        preview.errors.push('Unsupported file format. Please use JSON, JSONL, or CSV.');
        preview.valid = false;
      }

      // Validate data structure
      if (preview.valid && preview.data.length > 0) {
        // Check for required fields
        const requiredFields = ['text', 'label'];
        const hasRequiredFields = preview.data.every(item => 
          requiredFields.every(field => field in item)
        );
        
        if (!hasRequiredFields) {
          preview.errors.push('Data must contain "text" and "label" fields');
          preview.valid = false;
        }

        // Check data types
        preview.data.forEach((item, idx) => {
          if (typeof item.text !== 'string') {
            preview.warnings.push(`Row ${idx + 1}: "text" should be a string`);
          }
          if (item.label !== undefined && typeof item.label !== 'number' && typeof item.label !== 'string') {
            preview.warnings.push(`Row ${idx + 1}: "label" should be a number or string`);
          }
        });

        // Add statistics
        const labelCounts = preview.data.reduce((acc, item) => {
          const label = item.label?.toString() || 'undefined';
          acc[label] = (acc[label] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        preview.warnings.unshift(`Found ${preview.data.length} examples with labels: ${JSON.stringify(labelCounts)}`);
      }

      setImportPreview(preview);
    } catch (error) {
      setImportPreview({
        valid: false,
        data: [],
        errors: [`Failed to read file: ${error}`],
        warnings: []
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImport = () => {
    if (!importPreview?.valid || !importPreview.data.length) return;

    // Create a new dataset from imported data
    const newDataset = {
      id: `imported_${Date.now()}`,
      name: `Imported Dataset ${new Date().toLocaleString()}`,
      templates: [{
        id: 'imported',
        template: '{text}',
        variables: []
      }],
      examples: importPreview.data
    };

    createDataset(newDataset);
    setImportPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExport = (format: 'json' | 'csv') => {
    if (!currentDataset?.examples?.length) return;

    let content: string;
    let filename: string;

    if (format === 'json') {
      content = JSON.stringify(currentDataset.examples, null, 2);
      filename = `${currentDataset.name.replace(/\s+/g, '_')}.json`;
    } else {
      // CSV export
      const examples = currentDataset.examples;
      const headers = Object.keys(examples[0]);
      const rows = [
        headers.join(','),
        ...examples.map(ex => 
          headers.map(h => {
            const value = ex[h];
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ];
      content = rows.join('\n');
      filename = `${currentDataset.name.replace(/\s+/g, '_')}.csv`;
    }

    // Create and trigger download
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Import Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Import Dataset</h3>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            Upload a JSON, JSONL, or CSV file containing your dataset
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.jsonl,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Choose File
          </button>
        </div>

        {/* Import Preview */}
        {importPreview && (
          <div className="mt-6 space-y-4">
            <div className={`rounded-lg p-4 ${importPreview.valid ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center">
                {importPreview.valid ? (
                  <Check className="h-5 w-5 text-green-400" />
                ) : (
                  <X className="h-5 w-5 text-red-400" />
                )}
                <h4 className="ml-2 text-sm font-medium">
                  {importPreview.valid ? 'Ready to Import' : 'Import Failed'}
                </h4>
              </div>
            </div>

            {importPreview.errors.length > 0 && (
              <div className="bg-red-50 p-4 rounded-lg">
                <h5 className="text-sm font-medium text-red-800 mb-2">Errors:</h5>
                <ul className="list-disc list-inside text-sm text-red-700">
                  {importPreview.errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {importPreview.warnings.length > 0 && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h5 className="text-sm font-medium text-yellow-800 mb-2">Warnings:</h5>
                <ul className="list-disc list-inside text-sm text-yellow-700">
                  {importPreview.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {importPreview.valid && importPreview.data.length > 0 && (
              <>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Preview (first 5 examples):</h5>
                  <div className="space-y-2">
                    {importPreview.data.slice(0, 5).map((item, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium">Text:</span> {item.text?.substring(0, 100)}...
                        <br />
                        <span className="font-medium">Label:</span> {item.label}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleImport}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  Import {importPreview.data.length} Examples
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Export Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Export Dataset</h3>
        
        {currentDataset?.examples?.length ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Export "{currentDataset.name}" ({currentDataset.examples.length} examples)
            </p>
            
            <div className="flex space-x-4">
              <button
                onClick={() => handleExport('json')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <FileJson className="mr-2 h-4 w-4" />
                Export as JSON
              </button>
              
              <button
                onClick={() => handleExport('csv')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <FileText className="mr-2 h-4 w-4" />
                Export as CSV
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">
              No dataset selected. Create or select a dataset first.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};