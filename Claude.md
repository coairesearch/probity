# Claude.md

# Rules to follow:
This file provides guidance to Claude Code when working with code in this repository.

## Rules to Follow:
1. ALWAYS write secure best practice Python code.
2. Always try to write as lean as possible code. Don't blow up the repo. 
4 Iterate function based on test results
5. MOVE Test scripts to the tests folder if they are not already there and ensure that they could be reused for later Tests for code coverage or reruns.
6. ALWAYS commit after each new function is added to our codebase
7. Ensure that you are using uv for isolating environments and packagemanagement
8. Use tree command for project structure. If tree comand not exist install it with command: brew install tree
9. For new and open git issues which should be implemented create first a new branch and work in this branch
10. Ensure that always if a issue is completed pull requests are created.
11. Create a tmp folder for development. And create a scratchpad.md file in this folder to chronologically document the development process.
12. Give the user after each finished step a short advise how to test your implementation. 
13. Always update or create the docs/usage.md file with the newly changed functionality to know how to use the actual implementation.
14. Absolut important keep the repo lean and clean, don't add unnecessary files, don't overengineer.
15. If the tasks has to do to interact with models, make yourself always comfortable with the documentation of the nnsights library, before you start to implement.
16. All development should be done first on small toy models openai-community/gpt2. 
17. Don't use the remote ndif server at the moment. Use the local model by utilising nnsights library.
18. USe Playwright for testing the frontend application.

# Design Decisions:
We haveily use nnsigts library for all interpretabilit and model insight tasks:
- Documentaiton could be found here: https://nnsight.net/documentation/
- Feature overview: https://nnsight.net/features/
- Tutorials: https://nnsight.net/tutorials/
- Github: https://github.com/ndif-team/nnsight


## Design Perspective for UI No Code Low Code system
Vision for a Low-Code UI for Neural Network Probing                                                                        
                                                                                                                           
After analyzing the probity library deeply, I believe a low-code UI would be transformative for democratizing neural       
network interpretability research. Here's my comprehensive vision:                                                         
                                                                                                                           
🎯 Core UI Components                                                                                                      
                                                                                                                           
1. Dataset Builder - Visual Template Designer                                                                              
                                                                                                                           
- Drag-and-drop template builder with variable placeholders                                                                
- Variable library with pre-defined categories (adjectives, verbs, nouns, etc.)                                            
- Live preview showing generated examples as you build                                                                     
- Smart suggestions based on common probing patterns                                                                       
- Batch import from CSV/Excel for custom word lists                                                                        
                                                                                                                           
Example UI:                                                                                                                
Template: "I thought this movie was [ADJECTIVE], I [VERB] it."                                                             
Variables:                                                                                                                 
  - ADJECTIVE: [+] positive: amazing, wonderful [-] negative: terrible, awful                                              
  - VERB: [+] positive: loved, enjoyed [-] negative: hated, disliked                                                       
Preview: ✓ 8 examples will be generated                                                                                    
                                                                                                                           
2. Model Explorer - Interactive Architecture Viewer                                                                        
                                                                                                                           
- Visual model graph showing layers as clickable nodes                                                                     
- Layer information panel with dimensions and descriptions                                                                 
- Hook point selector with visual highlighting                                                                             
- Activation heatmaps showing where information flows                                                                      
- Model zoo with pre-configured popular models                                                                             
                                                                                                                           
3. Experiment Designer - Visual Workflow Builder                                                                           
                                                                                                                           
- Drag-and-drop workflow connecting:                                                                                       
  - Dataset → Model → Hook Points → Probe Type → Training                                                                  
- Parameter cards for each component with sliders/dropdowns                                                                
- Experiment templates for common analyses (sentiment, syntax, factual knowledge)                                          
- Multi-experiment comparison setup                                                                                        
                                                                                                                           
4. Training Dashboard - Real-time Visualization                                                                            
                                                                                                                           
- Live loss curves with train/validation splits                                                                            
- Accuracy meters and confusion matrices                                                                                   
- Layer-wise performance comparison graphs                                                                                 
- Early stopping indicators                                                                                                
- Resource monitoring (GPU usage, time remaining)                                                                          
                                                                                                                           
5. Analysis Workspace - Interactive Results Explorer                                                                       
                                                                                                                           
- Probe weight visualizations (which tokens matter most)                                                                   
- Layer attribution graphs (which layers encode what)                                                                      
- Interactive inference playground - type text and see predictions                                                         
- Exportable reports with publication-ready figures                                                                        
- Comparative analysis across different probes/models                                                                      
                                                                                                                           
🏗️ Technical Architecture                                                                                                 
                                                                                                                           
Frontend Options:                                                                                                          
                                                                                                                           
1. React + D3.js - Quick prototype, Python-native                                                                       
2. React + D3.js - Production-quality, highly interactive                                                                  
3. Jupyter Widgets - Notebook-integrated experience                                                                        
                                                                                                                           
Backend Design:                                                                                                            
                                                                                                                           
# API endpoints structure                                                                                                  
/api/datasets/create          # Create templated datasets                                                                  
/api/datasets/preview         # Live preview generation                                                                    
/api/models/list             # Available models                                                                            
/api/models/{id}/layers      # Model architecture info                                                                     
/api/experiments/create      # Setup new experiment                                                                        
/api/experiments/{id}/run    # Execute experiment                                                                          
/api/experiments/{id}/status # Real-time progress                                                                          
/api/analysis/inference      # Interactive predictions                                                                     
                                                                                                                           
📊 Example User Flows                                                                                                      
                                                                                                                           
Flow 1: Sentiment Analysis Probe                                                                                           
                                                                                                                           
1. User selects "Sentiment Analysis" template                                                                              
2. Customizes adjectives/verbs or uses defaults                                                                            
3. Picks GPT-2 from model dropdown                                                                                         
4. Clicks layers 5-11 on visual graph                                                                                      
5. Hits "Run Experiment"                                                                                                   
6. Watches training progress                                                                                               
7. Explores which layers best capture sentiment                                                                            
                                                                                                                           
Flow 2: Factual Knowledge Probe                                                                                            
                                                                                                                           
1. User creates template: "The capital of [COUNTRY] is [CITY]"                                                             
2. Uploads CSV with country-capital pairs                                                                                  
3. Selects multiple models for comparison                                                                                  
4. Runs probe across all layers                                                                                            
5. Discovers knowledge is stored in middle layers                                                                          
                                                                                                                           
🚀 Advanced Features                                                                                                       
                                                                                                                           
1. AutoML for Probes - Automatically try different probe types and hyperparameters                                         
2. Collaborative Experiments - Share and reproduce analyses                                                                
3. Plugin System - Add custom probe types or visualizations                                                                
4. Export to Code - Generate Python scripts from UI experiments                                                            
5. Batch Processing - Run multiple experiments overnight                                                                   
6. Integration Hub - Connect to Weights & Biases, TensorBoard, etc.                                                        
                                                                                                                           
💡 Unique UI Innovations                                                                                                   
                                                                                                                           
1. Probe Composer - Visual programming for complex probe combinations                                                      
2. Hypothesis Builder - Natural language → experiment setup                                                                
3. Discovery Mode - AI suggests interesting patterns to investigate                                                        
4. Teaching Mode - Interactive tutorials within the UI                                                                     
5. Paper Mode - Generate methodology sections automatically                                                                
                                                                                                                           
🎨 Mock UI Layout                                                                                                          
                                                                                                                           
┌─────────────────────────────────────────────────────────┐                                                                
│ 🧠 Probity Studio                      [New] [Open] [Save]│                                                              
├─────────────┬───────────────────────┬───────────────────┤                                                                
│ Dataset     │ Model Explorer        │ Results           │                                                                
│ Builder     │                       │                   │                                                                
│             │    ┌─────┐            │ 📊 Layer 7: 89%   │                                                                
│ Template:   │    │ L0  │            │ 📊 Layer 8: 92%   │                                                                
│ [_______]   │    └──┬──┘            │ 📊 Layer 9: 94%   │                                                                
│             │       │                │                   │                                                               
│ Variables:  │    ┌──┴──┐            │ Best: Layer 11    │                                                                
│ + Add       │    │ L1  │← Selected  │                   │                                                                
│             │    └──┬──┘            │ [View Details]    │                                                                
│             │       │                │                   │                                                               
│ Preview:    │    [...]              │                   │                                                                
│ ✓ 16 items  │                       │                   │                                                                
└─────────────┴───────────────────────┴───────────────────┘                                                                
                                                                                                                           
Implementation Plan                                                                                                        
                                                                                                                           
1. Phase 1: React prototype with core features                                                                         
2. Phase 2: React production UI with full interactivity                                                                    
3. Phase 3: Advanced features and integrations                                                                             
4. Phase 4: Cloud deployment and collaboration features                                                                    
                                                                                                                           
This UI would make neural network probing accessible to:                                                                   
- Researchers without coding skills                                                                                        
- Educators teaching interpretability                                                                                      
- Engineers debugging models                                                                                               
- Anyone curious about how AI works                                                                                        
                                                                                                                           
Would you like me to create a prototype of any specific component?  
 