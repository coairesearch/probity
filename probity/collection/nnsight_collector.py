"""
Activation collection backend for **nnsight**.

Changes in this revision
------------------------
* Pad each per-example activation tensor up to the **dataset’s max
  sequence length**, so `torch.stack()` no longer crashes when sentences
  have different lengths.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List

import torch
import torch.nn.functional as F

from probity.collection.activation_store import ActivationStore
from probity.datasets.tokenized import TokenizedProbingDataset

try:
    from nnsight import LanguageModel  # type: ignore
except ModuleNotFoundError:  # pragma: no cover
    LanguageModel = None  # type: ignore


# --------------------------------------------------------------------------- #
# Config                                                                      #
# --------------------------------------------------------------------------- #
@dataclass
class NNSightConfig:
    model_name: str
    hook_points: List[str]              # native nnsight paths
    device_map: Any = "auto"


# --------------------------------------------------------------------------- #
# Collector                                                                   #
# --------------------------------------------------------------------------- #
class NNSightCollector:
    """Collect activations via nnsight, padding variable-length sequences."""

    # .............................................................
    def __init__(self, config: NNSightConfig):
        if LanguageModel is None:  # pragma: no cover
            raise ImportError(
                "Install `nnsight` to use NNSightCollector:  pip install nnsight"
            )
        self.config = config
        self.model = LanguageModel(config.model_name, device_map=config.device_map)

    # .............................................................
    @staticmethod
    def _parse_attr_path(hook: str) -> List[Any]:
        path: List[Any] = []
        for part in hook.split("."):
            try:
                path.append(int(part))
            except ValueError:
                path.append(part)
        return path

    @staticmethod
    def _navigate(root: Any, path: List[Any]) -> Any:
        node = root
        for p in path:
            node = node[p] if isinstance(p, int) else getattr(node, p)
        return node

    # .............................................................
    def collect(self, dataset: TokenizedProbingDataset) -> Dict[str, ActivationStore]:
        buffers: Dict[str, List[torch.Tensor]] = {h: [] for h in self.config.hook_points}

        # — trace one example at a time —
        for ex in dataset.examples:
            with self.model.trace(ex.text):
                saved: Dict[str, torch.Tensor] = {}
                for hook in self.config.hook_points:
                    proxy = self._navigate(self.model, self._parse_attr_path(hook))
                    saved[hook] = proxy.save()

            for hook, tensor in saved.items():
                if isinstance(tensor, (tuple, list)):
                    tensor = tensor[0]
                buffers[hook].append(tensor.cpu())

        # — pad & stack —
        max_len = dataset.get_max_sequence_length()  # ensures uniform length
        stores: Dict[str, ActivationStore] = {}

        for hook, acts in buffers.items():
            padded: List[torch.Tensor] = []
            for t in acts:
                pad_len = max_len - t.shape[0]
                if pad_len:                                   # left-pad zeros to length
                    t = F.pad(t, (0, 0, 0, pad_len))
                padded.append(t)
            stacked = torch.stack(padded, dim=0)              # [N, max_len, hidden]

            stores[hook] = ActivationStore(
                raw_activations=stacked,
                hook_point=hook,
                example_indices=torch.arange(len(dataset.examples)),
                sequence_lengths=torch.tensor([t.shape[0] for t in acts]),
                hidden_size=stacked.shape[-1],
                dataset=dataset,
                labels=torch.tensor([ex.label for ex in dataset.examples]),
                label_texts=[ex.label_text for ex in dataset.examples],
            )
        return stores
