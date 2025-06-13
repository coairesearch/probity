import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DatasetBuilder } from './components/DatasetBuilder';
import { ModelExplorer } from './components/ModelExplorer';
import { ExperimentSetup } from './components/ExperimentSetup';
import { ResultsViewer } from './components/ResultsViewer';
import { Dashboard } from './components/Dashboard';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dataset" element={<DatasetBuilder />} />
          <Route path="/model" element={<ModelExplorer />} />
          <Route path="/experiment" element={<ExperimentSetup />} />
          <Route path="/results" element={<ResultsViewer />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
