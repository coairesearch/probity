# Development Scratchpad: Replace transformer_lens with nnsight

## 2025-12-06: Project Started

### Initial Analysis
- Identified transformer_lens usage in:
  - pyproject.toml (dependency)
  - probity/collection/collectors.py (core implementation)
  - probity/probes/inference.py (inference implementation)
  - 3 tutorial files (imports only)

### Plan
1. Update dependencies
2. Replace core implementations
3. Update tutorials
4. Test thoroughly

### Progress Log

#### Step 1: Update Dependencies
- ✅ Updated pyproject.toml: replaced transformer_lens with nnsight
- ✅ Committed changes

#### Step 2: Replace Core Implementation  
- ✅ Updated probity/collection/collectors.py:
  - Renamed TransformerLensCollector to NNsightCollector
  - Renamed TransformerLensConfig to NNsightConfig
  - Replaced HookedTransformer with LanguageModel from nnsight
  - Updated collect() method to use nnsight's trace functionality
  - Added backward compatibility aliases
  - Updated hook point format from "blocks.12.hook_resid_post" to "transformer.h.12.output"
  
- ✅ Updated probity/probes/inference.py:
  - Replaced HookedTransformer with LanguageModel
  - Updated get_activations() to use nnsight's trace context
  - Added _get_module_from_hook_point() helper method

#### Step 3: Update Tutorials
- ✅ Removed transformer_lens imports from:
  - tutorials/1-probity-basics.py
  - tutorials/2-dataset-creation.py  
  - tutorials/4-multiclass-probe.py

#### Step 4: Testing and Debugging
- ✅ Created test script to verify nnsight integration
- ✅ Fixed issue with accessing saved activations (need to use .value on proxy objects)
- ✅ Fixed difference between batch collection (returns proxy) and single inference (returns tuple)
- ✅ All tests passing with toy model (gpt2)

#### Key Learnings:
1. NNsight uses proxy objects inside trace context
2. After trace execution, saved values can be:
   - Proxy objects (need .value) in batch processing
   - Direct tuples in some single inference cases
3. Hook point format changed from "blocks.12.hook_resid_post" to "transformer.h.12.output"

#### Step 5: Documentation and Cleanup
- ✅ Created docs/usage.md with migration guide and examples
- ✅ Fixed test imports and hook point formats
- ✅ Added backward compatibility aliases
- ✅ All core functionality working with nnsight

### Summary
Successfully replaced transformer_lens with nnsight throughout the probity codebase:
- Updated dependencies
- Migrated core implementation (collectors.py and inference.py)
- Removed transformer_lens imports from tutorials
- Updated tests to use new hook point format
- Created comprehensive documentation
- Maintained backward compatibility where possible