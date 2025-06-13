import React, { useState, useRef, useCallback } from 'react';
import { Database, Brain, Microscope, BarChart3, Plus, Play, Save } from 'lucide-react';

interface WorkflowNode {
  id: string;
  type: 'dataset' | 'model' | 'probe' | 'analysis';
  position: { x: number; y: number };
  data: any;
  connections: string[];
}

interface Connection {
  from: string;
  to: string;
}

const nodeTypes = [
  { type: 'dataset', icon: Database, color: 'bg-blue-100 border-blue-300', label: 'Dataset' },
  { type: 'model', icon: Brain, color: 'bg-green-100 border-green-300', label: 'Model' },
  { type: 'probe', icon: Microscope, color: 'bg-purple-100 border-purple-300', label: 'Probe' },
  { type: 'analysis', icon: BarChart3, color: 'bg-orange-100 border-orange-300', label: 'Analysis' }
];

export const WorkflowBuilder: React.FC = () => {
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData('nodeType', nodeType);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const nodeType = e.dataTransfer.getData('nodeType') as WorkflowNode['type'];
    
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      type: nodeType,
      position: { x, y },
      data: {},
      connections: []
    };
    
    setNodes([...nodes, newNode]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleNodeDragStart = (e: React.MouseEvent, nodeId: string) => {
    setIsDragging(true);
    setDraggedNode(nodeId);
    setSelectedNode(nodeId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !draggedNode || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setNodes(nodes.map(node => 
      node.id === draggedNode 
        ? { ...node, position: { x, y } }
        : node
    ));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedNode(null);
  };

  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    
    if (e.shiftKey && connectionStart) {
      // Create connection
      if (connectionStart !== nodeId) {
        const newConnection: Connection = {
          from: connectionStart,
          to: nodeId
        };
        setConnections([...connections, newConnection]);
        
        // Update node connections
        setNodes(nodes.map(node => {
          if (node.id === connectionStart) {
            return { ...node, connections: [...node.connections, nodeId] };
          }
          return node;
        }));
      }
      setConnectionStart(null);
    } else if (e.shiftKey) {
      // Start connection
      setConnectionStart(nodeId);
    } else {
      // Select node
      setSelectedNode(nodeId);
      setConnectionStart(null);
    }
  };

  const deleteNode = (nodeId: string) => {
    setNodes(nodes.filter(node => node.id !== nodeId));
    setConnections(connections.filter(conn => 
      conn.from !== nodeId && conn.to !== nodeId
    ));
    setSelectedNode(null);
  };

  const runWorkflow = async () => {
    if (nodes.length === 0) {
      alert('Please add nodes to the workflow before running');
      return;
    }
    
    try {
      const response = await fetch('http://localhost:8000/api/workflows/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Workflow ${new Date().toISOString()}`,
          nodes,
          connections
        })
      });
      
      const result = await response.json();
      
      if (result.id) {
        // Run the workflow
        const runResponse = await fetch(`http://localhost:8000/api/workflows/${result.id}/run`, {
          method: 'POST'
        });
        
        if (runResponse.ok) {
          alert('Workflow started successfully!');
        }
      }
    } catch (error) {
      console.error('Error running workflow:', error);
      alert('Failed to run workflow');
    }
  };

  const saveWorkflow = async () => {
    const workflowName = prompt('Enter workflow name:');
    if (!workflowName) return;
    
    try {
      const response = await fetch('http://localhost:8000/api/workflows/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workflowName,
          nodes,
          connections
        })
      });
      
      if (response.ok) {
        alert('Workflow saved successfully!');
      }
    } catch (error) {
      console.error('Error saving workflow:', error);
      alert('Failed to save workflow');
    }
  };

  const getNodeTypeConfig = (type: WorkflowNode['type']) => {
    return nodeTypes.find(nt => nt.type === type)!;
  };

  return (
    <div className="bg-white shadow rounded-lg" style={{ height: 'calc(100vh - 200px)' }}>
      <div className="h-full flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Components</h3>
        <div className="space-y-2">
          {nodeTypes.map((nodeType) => {
            const Icon = nodeType.icon;
            return (
              <div
                key={nodeType.type}
                draggable
                onDragStart={(e) => handleDragStart(e, nodeType.type)}
                className={`p-3 rounded-lg cursor-move border-2 ${nodeType.color} hover:opacity-80 transition-opacity`}
              >
                <div className="flex items-center">
                  <Icon className="h-5 w-5 mr-2" />
                  <span className="font-medium">{nodeType.label}</span>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-8">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Instructions</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Drag components to canvas</li>
            <li>• Click to select nodes</li>
            <li>• Shift+Click to connect nodes</li>
            <li>• Press Delete to remove</li>
          </ul>
        </div>
        
        <div className="mt-8 space-y-2">
          <button
            onClick={runWorkflow}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Play className="mr-2 h-4 w-4" />
            Run Workflow
          </button>
          <button
            onClick={saveWorkflow}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Workflow
          </button>
        </div>
      </div>
      
      {/* Canvas */}
      <div className="flex-1 bg-gray-50 relative overflow-hidden">
        <div
          ref={canvasRef}
          className="absolute inset-0"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={() => {
            setSelectedNode(null);
            setConnectionStart(null);
          }}
        >
          {/* Grid Background */}
          <svg className="absolute inset-0 w-full h-full">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="#e5e7eb" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          
          {/* Connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {connections.map((conn, idx) => {
              const fromNode = nodes.find(n => n.id === conn.from);
              const toNode = nodes.find(n => n.id === conn.to);
              
              if (!fromNode || !toNode) return null;
              
              return (
                <line
                  key={idx}
                  x1={fromNode.position.x + 60}
                  y1={fromNode.position.y + 30}
                  x2={toNode.position.x + 60}
                  y2={toNode.position.y + 30}
                  stroke="#6b7280"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
            
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#6b7280"
                />
              </marker>
            </defs>
          </svg>
          
          {/* Nodes */}
          {nodes.map((node) => {
            const config = getNodeTypeConfig(node.type);
            const Icon = config.icon;
            const isSelected = selectedNode === node.id;
            const isConnectionStart = connectionStart === node.id;
            
            return (
              <div
                key={node.id}
                className={`absolute w-32 p-3 rounded-lg border-2 cursor-move select-none ${config.color} ${
                  isSelected ? 'ring-2 ring-indigo-500' : ''
                } ${isConnectionStart ? 'ring-2 ring-green-500' : ''}`}
                style={{
                  left: node.position.x - 60,
                  top: node.position.y - 30,
                  transform: 'translate(-50%, -50%)'
                }}
                onMouseDown={(e) => handleNodeDragStart(e, node.id)}
                onClick={(e) => handleNodeClick(e, node.id)}
              >
                <div className="flex items-center justify-center">
                  <Icon className="h-6 w-6 mr-2" />
                  <span className="text-sm font-medium">{config.label}</span>
                </div>
                
                {isSelected && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNode(node.id);
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Selected Node Panel */}
      {selectedNode && (
        <div className="w-64 bg-white border-l border-gray-200 p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Node Properties</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Node ID</label>
              <p className="mt-1 text-sm text-gray-500">{selectedNode}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <p className="mt-1 text-sm text-gray-500">
                {nodes.find(n => n.id === selectedNode)?.type}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Connections</label>
              <p className="mt-1 text-sm text-gray-500">
                {connections.filter(c => c.from === selectedNode).length} outgoing,{' '}
                {connections.filter(c => c.to === selectedNode).length} incoming
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};