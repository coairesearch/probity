import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Download, Maximize2, Grid, BarChart3 } from 'lucide-react';

interface ActivationData {
  tokens: string[];
  layers: string[];
  activations: number[][]; // [token][layer]
  statistics: {
    mean: number[];
    std: number[];
    max: number[];
    min: number[];
  };
}

interface Props {
  experimentId: string;
  normalization?: 'none' | 'layer' | 'global';
}

export const ActivationHeatmap: React.FC<Props> = ({ 
  experimentId, 
  normalization = 'layer' 
}) => {
  const [activationData, setActivationData] = useState<ActivationData | null>(null);
  const [selectedToken, setSelectedToken] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'heatmap' | 'line'>('heatmap');
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Mock data - in real implementation, fetch from API
    const mockData: ActivationData = {
      tokens: ['I', 'thought', 'this', 'movie', 'was', 'amazing', ',', 'I', 'loved', 'it', '.'],
      layers: Array.from({ length: 12 }, (_, i) => `Layer ${i}`),
      activations: Array.from({ length: 11 }, () =>
        Array.from({ length: 12 }, () => Math.random() * 2 - 1)
      ),
      statistics: {
        mean: Array.from({ length: 12 }, () => Math.random()),
        std: Array.from({ length: 12 }, () => Math.random() * 0.5),
        max: Array.from({ length: 12 }, () => Math.random() * 2),
        min: Array.from({ length: 12 }, () => Math.random() * -1)
      }
    };
    setActivationData(mockData);
  }, [experimentId]);

  useEffect(() => {
    if (!activationData || !svgRef.current) return;

    const margin = { top: 50, right: 100, bottom: 100, left: 100 };
    const cellWidth = 50;
    const cellHeight = 30;
    const width = activationData.layers.length * cellWidth + margin.left + margin.right;
    const height = activationData.tokens.length * cellHeight + margin.top + margin.bottom;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Normalize data based on selected mode
    let normalizedData = activationData.activations;
    if (normalization === 'layer') {
      // Normalize per layer
      normalizedData = activationData.activations.map(tokenActivations => {
        return tokenActivations.map((value, layerIdx) => {
          const mean = activationData.statistics.mean[layerIdx];
          const std = activationData.statistics.std[layerIdx];
          return std > 0 ? (value - mean) / std : 0;
        });
      });
    } else if (normalization === 'global') {
      // Global normalization
      const allValues = activationData.activations.flat();
      const globalMin = Math.min(...allValues);
      const globalMax = Math.max(...allValues);
      const range = globalMax - globalMin;
      
      normalizedData = activationData.activations.map(tokenActivations =>
        tokenActivations.map(value => 
          range > 0 ? (value - globalMin) / range : 0
        )
      );
    }

    // Color scale
    const colorScale = d3.scaleSequential()
      .domain([-2, 2]) // Assuming normalized values
      .interpolator(d3.interpolateRdBu)
      .clamp(true);

    if (viewMode === 'heatmap') {
      // Draw heatmap cells
      const cells = g.selectAll('.cell')
        .data(normalizedData.flatMap((row, i) =>
          row.map((value, j) => ({
            token: i,
            layer: j,
            value: value,
            originalValue: activationData.activations[i][j]
          }))
        ))
        .enter().append('g')
        .attr('class', 'cell-group');

      cells.append('rect')
        .attr('class', 'cell')
        .attr('x', d => d.layer * cellWidth)
        .attr('y', d => d.token * cellHeight)
        .attr('width', cellWidth - 2)
        .attr('height', cellHeight - 2)
        .attr('fill', d => colorScale(d.value))
        .attr('stroke', d => d.token === selectedToken ? '#000' : '#fff')
        .attr('stroke-width', d => d.token === selectedToken ? 2 : 1)
        .style('cursor', 'pointer')
        .on('click', (event, d) => setSelectedToken(d.token))
        .on('mouseover', function(event, d) {
          // Show tooltip
          const tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.9)')
            .style('color', 'white')
            .style('padding', '10px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none');

          tooltip.html(`
            <strong>Token:</strong> "${activationData.tokens[d.token]}"<br/>
            <strong>Layer:</strong> ${d.layer}<br/>
            <strong>Activation:</strong> ${d.originalValue.toFixed(4)}<br/>
            <strong>Normalized:</strong> ${d.value.toFixed(4)}
          `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 40) + 'px');
        })
        .on('mouseout', function() {
          d3.selectAll('.tooltip').remove();
        });

      // Add token labels
      g.selectAll('.token-label')
        .data(activationData.tokens)
        .enter().append('text')
        .attr('class', 'token-label')
        .attr('x', -10)
        .attr('y', (d, i) => i * cellHeight + cellHeight / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '12px')
        .style('font-weight', (d, i) => i === selectedToken ? 'bold' : 'normal')
        .text(d => d);

      // Add layer labels
      g.selectAll('.layer-label')
        .data(activationData.layers)
        .enter().append('text')
        .attr('class', 'layer-label')
        .attr('x', (d, i) => i * cellWidth + cellWidth / 2)
        .attr('y', -10)
        .attr('text-anchor', 'start')
        .attr('transform', (d, i) => 
          `rotate(-45, ${i * cellWidth + cellWidth / 2}, -10)`
        )
        .style('font-size', '12px')
        .text(d => d);

    } else {
      // Line chart view
      const xScale = d3.scaleLinear()
        .domain([0, activationData.layers.length - 1])
        .range([0, (activationData.layers.length - 1) * cellWidth]);

      const yScale = d3.scaleLinear()
        .domain(d3.extent(normalizedData.flat()) as [number, number])
        .range([activationData.tokens.length * cellHeight, 0]);

      // Add axes
      const xAxis = d3.axisBottom(xScale)
        .ticks(activationData.layers.length)
        .tickFormat((d, i) => `L${i}`);

      const yAxis = d3.axisLeft(yScale);

      g.append('g')
        .attr('transform', `translate(0, ${activationData.tokens.length * cellHeight})`)
        .call(xAxis);

      g.append('g')
        .call(yAxis);

      // Add lines for each token
      const line = d3.line<number>()
        .x((d, i) => xScale(i))
        .y(d => yScale(d));

      const colorScaleLines = d3.scaleOrdinal(d3.schemeCategory10);

      normalizedData.forEach((tokenActivations, tokenIdx) => {
        g.append('path')
          .datum(tokenActivations)
          .attr('fill', 'none')
          .attr('stroke', colorScaleLines(tokenIdx.toString()))
          .attr('stroke-width', tokenIdx === selectedToken ? 3 : 1.5)
          .attr('opacity', selectedToken === null || tokenIdx === selectedToken ? 1 : 0.3)
          .attr('d', line)
          .style('cursor', 'pointer')
          .on('click', () => setSelectedToken(tokenIdx))
          .on('mouseover', function() {
            d3.select(this).attr('stroke-width', 3);
          })
          .on('mouseout', function() {
            d3.select(this).attr('stroke-width', tokenIdx === selectedToken ? 3 : 1.5);
          });
      });

      // Add legend
      const legend = g.append('g')
        .attr('transform', `translate(${width - margin.right - 100}, 0)`);

      activationData.tokens.forEach((token, idx) => {
        const legendItem = legend.append('g')
          .attr('transform', `translate(0, ${idx * 20})`)
          .style('cursor', 'pointer')
          .on('click', () => setSelectedToken(idx));

        legendItem.append('line')
          .attr('x1', 0)
          .attr('x2', 20)
          .attr('y1', 10)
          .attr('y2', 10)
          .attr('stroke', colorScaleLines(idx.toString()))
          .attr('stroke-width', 2);

        legendItem.append('text')
          .attr('x', 25)
          .attr('y', 10)
          .attr('dominant-baseline', 'middle')
          .style('font-size', '12px')
          .style('font-weight', idx === selectedToken ? 'bold' : 'normal')
          .text(token);
      });
    }

    // Add color scale legend for heatmap
    if (viewMode === 'heatmap') {
      const legendWidth = 20;
      const legendHeight = 200;
      
      const legendScale = d3.scaleLinear()
        .domain([2, -2])
        .range([0, legendHeight]);

      const legendAxis = d3.axisRight(legendScale)
        .ticks(5);

      const legend = svg.append('g')
        .attr('transform', `translate(${width - margin.right + 20}, ${margin.top})`);

      // Create gradient
      const gradientId = 'activation-gradient';
      const defs = svg.append('defs');
      const gradient = defs.append('linearGradient')
        .attr('id', gradientId)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');

      const steps = 20;
      for (let i = 0; i <= steps; i++) {
        const value = 2 - (4 * i / steps);
        gradient.append('stop')
          .attr('offset', `${(i / steps) * 100}%`)
          .attr('stop-color', colorScale(value));
      }

      legend.append('rect')
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', `url(#${gradientId})`);

      legend.append('g')
        .attr('transform', `translate(${legendWidth}, 0)`)
        .call(legendAxis);

      legend.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -30)
        .attr('x', -legendHeight / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .text('Activation Value');
    }

  }, [activationData, normalization, viewMode, selectedToken]);

  const exportVisualization = () => {
    if (!svgRef.current) return;

    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `activation_heatmap_${normalization}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!activationData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading activation data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Activation Heatmap</h3>
          <button
            onClick={exportVisualization}
            className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </button>
        </div>

        <div className="flex items-center space-x-4">
          {/* View Mode */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('heatmap')}
              className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
                viewMode === 'heatmap'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Grid className="h-4 w-4 mr-1" />
              Heatmap
            </button>
            <button
              onClick={() => setViewMode('line')}
              className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
                viewMode === 'line'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Line Chart
            </button>
          </div>

          {/* Normalization */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Normalization:</label>
            <select
              value={normalization}
              onChange={(e) => {/* In real implementation, update normalization */}}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="none">None</option>
              <option value="layer">Per Layer</option>
              <option value="global">Global</option>
            </select>
          </div>

          {/* Selected Token Info */}
          {selectedToken !== null && (
            <div className="flex items-center space-x-2 bg-indigo-50 px-3 py-1 rounded-md">
              <span className="text-sm font-medium text-indigo-700">
                Selected: "{activationData.tokens[selectedToken]}"
              </span>
              <button
                onClick={() => setSelectedToken(null)}
                className="text-indigo-500 hover:text-indigo-700"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Visualization */}
      <div className="bg-white p-4 rounded-lg shadow overflow-auto">
        <svg ref={svgRef}></svg>
      </div>

      {/* Statistics Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Layer Statistics</h4>
        <div className="grid grid-cols-4 gap-4 text-sm">
          {activationData.layers.map((layer, idx) => (
            <div key={idx} className="bg-white p-2 rounded">
              <div className="font-medium">{layer}</div>
              <div className="text-gray-600">
                μ: {activationData.statistics.mean[idx].toFixed(3)}
              </div>
              <div className="text-gray-600">
                σ: {activationData.statistics.std[idx].toFixed(3)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};