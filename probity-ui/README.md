# Probity Studio - Visual Interface for Neural Network Probing

A React-based UI for the Probity library that enables low-code neural network interpretability research.

## Features

### Phase 1 (Current Implementation)
- **Dataset Builder**: Visual template-based dataset creation with live preview
- **Model Explorer**: Interactive model architecture visualization and layer selection
- **Experiment Setup**: Configure and run probing experiments with various probe types
- **Results Viewer**: Real-time training visualization and analysis
- **Dashboard**: Overview of datasets, models, and experiments

## Tech Stack

### Frontend
- React with TypeScript
- Tailwind CSS for styling
- React Router for navigation
- Zustand for state management
- D3.js and Recharts for visualizations
- Lucide React for icons

### Backend
- FastAPI for REST API
- WebSockets for real-time updates
- Integration with Probity library
- PyTorch for model operations

## Setup

### Prerequisites
- Node.js 16+ and npm
- Python 3.8+
- Probity library installed

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

The frontend will be available at http://localhost:3000

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python main.py
```

The API will be available at http://localhost:8000

## Usage

1. **Create a Dataset**
   - Navigate to the Dataset tab
   - Define your template with variable placeholders
   - Add variables with their values and classes
   - Preview the generated examples
   - Save the dataset

2. **Select a Model**
   - Go to the Model tab
   - Choose from available models (GPT-2, GPT-2 Medium)
   - Select layers to probe by clicking on them
   - View the corresponding hook points

3. **Run an Experiment**
   - Navigate to Experiment Setup
   - Name your experiment
   - Select probe type (Linear, Logistic, Multi-class, Directional)
   - Configure training parameters
   - Click "Run Experiment"

4. **Analyze Results**
   - View real-time training progress
   - Analyze layer-wise performance
   - Test the probe with custom inputs
   - Export results for publication

## Development

### Project Structure
```
probity-ui/
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── store/         # Zustand state management
│   │   └── App.tsx        # Main app component
│   └── package.json
├── backend/
│   ├── main.py           # FastAPI server
│   └── requirements.txt
└── README.md
```

### Adding New Features
1. Create new component in `frontend/src/components/`
2. Add API endpoint in `backend/main.py`
3. Update store if needed in `frontend/src/store/`
4. Add route in `frontend/src/App.tsx`

## Future Enhancements (Phases 2-4)

### Phase 2: Advanced Features
- Batch import/export
- Advanced visualizations
- Visual workflow builder
- Comparative analysis

### Phase 3: Collaboration
- User authentication
- Project sharing
- External integrations
- AutoML capabilities

### Phase 4: Cloud Deployment
- Kubernetes deployment
- GPU cluster support
- Enterprise features
- Developer platform

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Same as Probity library