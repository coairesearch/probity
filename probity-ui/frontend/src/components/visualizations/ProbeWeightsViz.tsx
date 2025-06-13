import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { Download, Filter, TrendingUp, Target } from 'lucide-react';

interface ProbeWeights {
  features: string[];
  weights: number[];
  importance: number[];
  layerName: string;
  accuracy: number;
}

interface Props {
  experimentId: string;
  probeType: 'linear' | 'logistic' | 'directional';
}

export const ProbeWeightsViz: React.FC<Props> = ({ experimentId, probeType }) => {
  const [weightsData, setWeightsData] = useState<ProbeWeights | null>(null);
  const [viewType, setViewType] = useState<'bar' | 'radar' | 'sorted'>('bar');
  const [filterThreshold, setFilterThreshold] = useState(0);
  const [showTopK, setShowTopK] = useState(20);

  useEffect(() => {
    // Mock data - in real implementation, fetch from API
    const mockFeatures = Array.from({ length: 768 }, (_, i) => `dim_${i}`);
    const mockWeights = mockFeatures.map(() => (Math.random() - 0.5) * 2);
    const mockImportance = mockWeights.map(w => Math.abs(w) + Math.random() * 0.1);
    
    setWeightsData({
      features: mockFeatures,
      weights: mockWeights,
      importance: mockImportance,
      layerName: 'Layer 11',
      accuracy: 0.942
    });
  }, [experimentId]);

  if (!weightsData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading probe weights...</div>
      </div>
    );
  }

  // Prepare data for visualization
  const prepareData = () => {
    let data = weightsData.features.map((feature, idx) => ({
      feature,
      weight: weightsData.weights[idx],
      importance: weightsData.importance[idx],
      absWeight: Math.abs(weightsData.weights[idx])
    }));

    // Apply threshold filter
    if (filterThreshold > 0) {
      data = data.filter(d => d.absWeight >= filterThreshold);
    }

    // Sort if needed
    if (viewType === 'sorted' || viewType === 'radar') {
      data.sort((a, b) => b.importance - a.importance);
    }

    // Limit to top K
    return data.slice(0, showTopK);
  };

  const chartData = prepareData();

  // Custom bar shape to handle colors based on value
  const CustomBar = (props: any) => {
    const { fill, x, y, width, height, payload } = props;
    const barFill = payload.weight > 0 ? '#10b981' : '#ef4444';
    return <rect x={x} y={y} width={width} height={height} fill={barFill} />;
  };

  const exportData = () => {
    const csv = [
      ['Feature', 'Weight', 'Importance'],
      ...chartData.map(d => [d.feature, d.weight, d.importance])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `probe_weights_${experimentId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getPositiveNegativeSummary = () => {
    const positive = weightsData.weights.filter(w => w > 0).length;
    const negative = weightsData.weights.filter(w => w < 0).length;
    const zero = weightsData.weights.filter(w => Math.abs(w) < 0.001).length;
    
    return { positive, negative, zero };
  };

  const summary = getPositiveNegativeSummary();

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Probe Weights Analysis</h3>
            <p className="text-sm text-gray-500">
              {weightsData.layerName} - Accuracy: {(weightsData.accuracy * 100).toFixed(1)}%
            </p>
          </div>
          <button
            onClick={exportData}
            className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* View Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">View Type</label>
            <select
              value={viewType}
              onChange={(e) => setViewType(e.target.value as any)}
              className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="bar">Bar Chart</option>
              <option value="sorted">Sorted by Importance</option>
              <option value="radar">Radar Chart</option>
            </select>
          </div>

          {/* Top K Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Show Top Features
            </label>
            <input
              type="number"
              value={showTopK}
              onChange={(e) => setShowTopK(Number(e.target.value))}
              min={5}
              max={100}
              className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
            />
          </div>

          {/* Threshold Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Weight Threshold
            </label>
            <input
              type="number"
              value={filterThreshold}
              onChange={(e) => setFilterThreshold(Number(e.target.value))}
              min={0}
              max={2}
              step={0.1}
              className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-green-600 mr-2" />
              <span className="text-green-700 font-medium">
                Positive: {summary.positive} features
              </span>
            </div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-red-600 mr-2 transform rotate-180" />
              <span className="text-red-700 font-medium">
                Negative: {summary.negative} features
              </span>
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center">
              <Target className="h-4 w-4 text-gray-600 mr-2" />
              <span className="text-gray-700 font-medium">
                Near-zero: {summary.zero} features
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Visualization */}
      <div className="bg-white p-4 rounded-lg shadow">
        {viewType === 'bar' && (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="feature" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                interval={Math.floor(chartData.length / 20)}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar 
                dataKey="weight" 
                fill="#8884d8"
                name="Weight"
                shape={CustomBar}
              />
              <Bar 
                dataKey="importance" 
                fill="#6366f1" 
                opacity={0.6}
                name="Importance"
              />
            </BarChart>
          </ResponsiveContainer>
        )}

        {viewType === 'sorted' && (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="feature" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                interval={Math.floor(chartData.length / 10)}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="weight" 
                stroke="#8884d8" 
                strokeWidth={2}
                name="Weight"
              />
              <Line 
                type="monotone" 
                dataKey="importance" 
                stroke="#82ca9d" 
                strokeWidth={2}
                name="Importance"
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {viewType === 'radar' && (
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={chartData.slice(0, 15)}>
              <PolarGrid />
              <PolarAngleAxis dataKey="feature" />
              <PolarRadiusAxis />
              <Radar 
                name="Weight" 
                dataKey="absWeight" 
                stroke="#8884d8" 
                fill="#8884d8" 
                fillOpacity={0.6} 
              />
              <Radar 
                name="Importance" 
                dataKey="importance" 
                stroke="#82ca9d" 
                fill="#82ca9d" 
                fillOpacity={0.6} 
              />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Feature Importance Table */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          Top 10 Most Important Features
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Feature
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Weight
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Importance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {chartData.slice(0, 10).map((item, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {idx + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.feature}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={item.weight > 0 ? 'text-green-600' : 'text-red-600'}>
                      {item.weight.toFixed(4)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${(item.importance / Math.max(...chartData.map(d => d.importance))) * 100}%` }}
                        />
                      </div>
                      <span>{item.importance.toFixed(3)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};