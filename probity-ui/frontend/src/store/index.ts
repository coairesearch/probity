import { create } from 'zustand';

export interface Variable {
  name: string;
  values: { [key: string]: string[] };
  classBound?: boolean;
  classKey?: string;
}

export interface Template {
  id: string;
  template: string;
  variables: Variable[];
}

export interface Dataset {
  id: string;
  name: string;
  templates: Template[];
  examples?: any[];
  createdAt?: Date;
  importedFrom?: string;
}

export interface Model {
  id: string;
  name: string;
  layers: number;
  hiddenSize: number;
  hookPoints: string[];
}

export interface Experiment {
  id: string;
  name: string;
  datasetId: string;
  modelId: string;
  hookPoints: string[];
  probeType: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress?: number;
  results?: any;
}

interface AppState {
  // Datasets
  datasets: Dataset[];
  currentDataset: Dataset | null;
  createDataset: (dataset: Dataset) => void;
  updateDataset: (id: string, dataset: Partial<Dataset>) => void;
  selectDataset: (id: string) => void;
  
  // Models
  models: Model[];
  currentModel: Model | null;
  selectModel: (id: string) => void;
  
  // Experiments
  experiments: Experiment[];
  currentExperiment: Experiment | null;
  createExperiment: (experiment: Experiment) => void;
  updateExperiment: (id: string, experiment: Partial<Experiment>) => void;
  selectExperiment: (id: string) => void;
  
  // UI State
  activeView: 'dataset' | 'model' | 'experiment' | 'results';
  setActiveView: (view: 'dataset' | 'model' | 'experiment' | 'results') => void;
}

export const useStore = create<AppState>((set) => ({
  // Initial state
  datasets: [],
  currentDataset: null,
  models: [
    {
      id: 'gpt2',
      name: 'GPT-2',
      layers: 12,
      hiddenSize: 768,
      hookPoints: Array.from({ length: 12 }, (_, i) => `transformer.h.${i}.output`)
    },
    {
      id: 'gpt2-medium',
      name: 'GPT-2 Medium',
      layers: 24,
      hiddenSize: 1024,
      hookPoints: Array.from({ length: 24 }, (_, i) => `transformer.h.${i}.output`)
    }
  ],
  currentModel: null,
  experiments: [],
  currentExperiment: null,
  activeView: 'dataset',
  
  // Actions
  createDataset: (dataset) => set((state) => ({
    datasets: [...state.datasets, dataset],
    currentDataset: dataset
  })),
  
  updateDataset: (id, updates) => set((state) => ({
    datasets: state.datasets.map(d => d.id === id ? { ...d, ...updates } : d),
    currentDataset: state.currentDataset?.id === id 
      ? { ...state.currentDataset, ...updates } 
      : state.currentDataset
  })),
  
  selectDataset: (id) => set((state) => ({
    currentDataset: state.datasets.find(d => d.id === id) || null
  })),
  
  selectModel: (id) => set((state) => ({
    currentModel: state.models.find(m => m.id === id) || null
  })),
  
  createExperiment: (experiment) => set((state) => ({
    experiments: [...state.experiments, experiment],
    currentExperiment: experiment
  })),
  
  updateExperiment: (id, updates) => set((state) => ({
    experiments: state.experiments.map(e => e.id === id ? { ...e, ...updates } : e),
    currentExperiment: state.currentExperiment?.id === id 
      ? { ...state.currentExperiment, ...updates } 
      : state.currentExperiment
  })),
  
  selectExperiment: (id) => set((state) => ({
    currentExperiment: state.experiments.find(e => e.id === id) || null
  })),
  
  setActiveView: (view) => set({ activeView: view })
}));