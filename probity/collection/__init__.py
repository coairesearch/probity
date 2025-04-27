"""
Public API for the *collection* sub-package.

Two interchangeable back-ends are exposed:

* **TransformerLensCollector** – the legacy implementation (unchanged).
* **NNSightCollector** – new implementation that streams activations via the
  *nnsight* / NDIF tracing interface.

Both collectors return exactly the same
`Dict[str, ActivationStore]`, so the rest of *probity* never needs to know
which one you picked.
"""

# ──────────────────────────────────────────────────────────────────────────────
# Legacy backend (already present in your code base)
# ──────────────────────────────────────────────────────────────────────────────
from .collectors import TransformerLensCollector, TransformerLensConfig

# ──────────────────────────────────────────────────────────────────────────────
# New nnsight backend
#   (file probity/collection/nnsight_collector.py was added in the previous
#    response – drop it into the same directory)
# ──────────────────────────────────────────────────────────────────────────────
from .nnsight_collector import NNSightCollector, NNSightConfig

__all__ = [
    # TransformerLens
    "TransformerLensCollector",
    "TransformerLensConfig",
    # NNSight
    "NNSightCollector",
    "NNSightConfig",
]
