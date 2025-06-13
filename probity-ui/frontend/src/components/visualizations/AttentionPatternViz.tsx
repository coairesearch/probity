import React, { useState, useEffect } from 'react';
import * as d3 from 'd3';
import { Eye, Download, ZoomIn, ZoomOut, Layers } from 'lucide-react';

interface AttentionData {
  tokens: string[];
  layers: number[];
  attention: number[][][]; // [layer][from_token][to_token]
}

interface Props {
  experimentId: string;
  selectedLayer?: number;
}

export const AttentionPatternViz: React.FC<Props> = ({ experimentId, selectedLayer = 0 }) => {
  const [attentionData, setAttentionData] = useState<AttentionData | null>(null);
  const [currentLayer, setCurrentLayer] = useState(selectedLayer);
  const [scale, setScale] = useState(1);
  const [colorScheme, setColorScheme] = useState<'blues' | 'viridis' | 'plasma'>('blues');

  useEffect(() => {
    // In real implementation, fetch from API
    // Mock data for demonstration
    const mockData: AttentionData = {
      tokens: ['I', 'thought', 'this', 'movie', 'was', 'amazing', ',', 'I', 'loved', 'it', '.'],
      layers: Array.from({ length: 12 }, (_, i) => i),
      attention: Array.from({ length: 12 }, () =>
        Array.from({ length: 11 }, () =>
          Array.from({ length: 11 }, () => Math.random())
        )
      )
    };
    setAttentionData(mockData);
  }, [experimentId]);

  useEffect(() => {
    if (!attentionData) return;

    const margin = { top: 100, right: 50, bottom: 50, left: 100 };
    const cellSize = 40 * scale;
    const width = attentionData.tokens.length * cellSize + margin.left + margin.right;
    const height = attentionData.tokens.length * cellSize + margin.top + margin.bottom;

    // Clear previous SVG
    d3.select('#attention-heatmap').selectAll('*').remove();

    const svg = d3.select('#attention-heatmap')
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Color scale
    const colorScale = d3.scaleSequential()
      .domain([0, 1])
      .interpolator(
        colorScheme === 'blues' ? d3.interpolateBlues :
        colorScheme === 'viridis' ? d3.interpolateViridis :
        d3.interpolatePlasma
      );

    // Get attention matrix for current layer
    const attentionMatrix = attentionData.attention[currentLayer];

    // Draw cells
    g.selectAll('.cell')
      .data(attentionMatrix.flatMap((row, i) => 
        row.map((value, j) => ({ row: i, col: j, value }))
      ))
      .enter().append('rect')
      .attr('class', 'cell')
      .attr('x', d => d.col * cellSize)
      .attr('y', d => d.row * cellSize)
      .attr('width', cellSize - 2)
      .attr('height', cellSize - 2)
      .attr('fill', d => colorScale(d.value))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .on('mouseover', function(event, d) {
        // Tooltip
        const tooltip = d3.select('body').append('div')
          .attr('class', 'tooltip')
          .style('position', 'absolute')
          .style('background', 'rgba(0, 0, 0, 0.8)')
          .style('color', 'white')
          .style('padding', '8px')
          .style('border-radius', '4px')
          .style('font-size', '12px')
          .style('pointer-events', 'none');

        tooltip.html(`
          <strong>${attentionData.tokens[d.row]} → ${attentionData.tokens[d.col]}</strong><br/>
          Attention: ${d.value.toFixed(3)}
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');

        // Highlight row and column
        d3.selectAll('.cell')
          .style('opacity', (cell: any) => 
            cell.row === d.row || cell.col === d.col ? 1 : 0.3
          );
      })
      .on('mouseout', function() {
        d3.selectAll('.tooltip').remove();
        d3.selectAll('.cell').style('opacity', 1);
      });

    // Add token labels
    g.selectAll('.row-label')
      .data(attentionData.tokens)
      .enter().append('text')
      .attr('class', 'row-label')
      .attr('x', -10)
      .attr('y', (d, i) => i * cellSize + cellSize / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '12px')
      .text(d => d);

    g.selectAll('.col-label')
      .data(attentionData.tokens)
      .enter().append('text')
      .attr('class', 'col-label')
      .attr('x', (d, i) => i * cellSize + cellSize / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('transform', (d, i) => 
        `rotate(-45, ${i * cellSize + cellSize / 2}, -10)`
      )
      .style('font-size', '12px')
      .text(d => d);

    // Add color legend
    const legendWidth = 200;
    const legendHeight = 20;
    
    const legendScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)
      .tickFormat(d3.format('.2f'));

    const legend = svg.append('g')
      .attr('transform', `translate(${width - legendWidth - 50}, 20)`);

    // Create gradient
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'attention-gradient');

    gradient.selectAll('stop')
      .data(d3.range(0, 1.1, 0.1))
      .enter().append('stop')
      .attr('offset', d => `${d * 100}%`)
      .attr('stop-color', d => colorScale(d));

    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#attention-gradient)');

    legend.append('g')
      .attr('transform', `translate(0, ${legendHeight})`)
      .call(legendAxis);

    legend.append('text')
      .attr('x', legendWidth / 2)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text('Attention Weight');

  }, [attentionData, currentLayer, scale, colorScheme]);

  const exportVisualization = () => {
    const svg = document.getElementById('attention-heatmap');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `attention_pattern_layer_${currentLayer}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!attentionData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading attention patterns...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Attention Pattern Visualization</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setScale(Math.max(0.5, scale - 0.1))}
              className="p-2 text-gray-600 hover:text-gray-900"
              title="Zoom Out"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            <span className="text-sm text-gray-500">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale(Math.min(2, scale + 0.1))}
              className="p-2 text-gray-600 hover:text-gray-900"
              title="Zoom In"
            >
              <ZoomIn className="h-5 w-5" />
            </button>
            <button
              onClick={exportVisualization}
              className="p-2 text-gray-600 hover:text-gray-900"
              title="Export"
            >
              <Download className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Layer Selector */}
          <div className="flex items-center space-x-2">
            <Layers className="h-5 w-5 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Layer:</label>
            <select
              value={currentLayer}
              onChange={(e) => setCurrentLayer(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              {attentionData.layers.map(layer => (
                <option key={layer} value={layer}>Layer {layer}</option>
              ))}
            </select>
          </div>

          {/* Color Scheme Selector */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Color:</label>
            <select
              value={colorScheme}
              onChange={(e) => setColorScheme(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="blues">Blues</option>
              <option value="viridis">Viridis</option>
              <option value="plasma">Plasma</option>
            </select>
          </div>
        </div>
      </div>

      {/* Visualization */}
      <div className="bg-white p-4 rounded-lg shadow overflow-auto">
        <svg id="attention-heatmap"></svg>
      </div>

      {/* Info */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex">
          <Eye className="h-5 w-5 text-blue-400 mr-2" />
          <div className="text-sm text-blue-700">
            <p className="font-medium">How to read this visualization:</p>
            <ul className="mt-1 list-disc list-inside">
              <li>Each cell shows attention weight from one token (row) to another (column)</li>
              <li>Darker colors indicate stronger attention</li>
              <li>Hover over cells to see exact values</li>
              <li>Use layer selector to explore different attention heads</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};