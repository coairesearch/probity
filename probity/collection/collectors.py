import torch
from dataclasses import dataclass
from typing import List, Dict
from nnsight import LanguageModel
from probity.datasets.tokenized import TokenizedProbingDataset
from probity.collection.activation_store import ActivationStore


@dataclass
class NNsightConfig:
    """Configuration for NNsightCollector."""

    model_name: str
    hook_points: List[str]  # e.g. ["transformer.h.12.output"]
    batch_size: int = 32
    device: str = "cuda" if torch.cuda.is_available() else "cpu"


class NNsightCollector:
    """Collects activations using NNsight."""

    def __init__(self, config: NNsightConfig):
        self.config = config
        print(f"Initializing collector with device: {config.device}")
        self.model = LanguageModel(config.model_name, device_map=config.device)
        print(f"Model loaded on device: {config.device}")

    @staticmethod
    def get_layer_from_hook_point(hook_point: str) -> int:
        """Extract layer number from hook point string.
        
        Args:
            hook_point: Hook point string (e.g. "transformer.h.12.output")
            
        Returns:
            Layer number
        """
        try:
            # Extract number after "h."
            parts = hook_point.split(".")
            for i, part in enumerate(parts):
                if part == "h" and i + 1 < len(parts):
                    return int(parts[i + 1])
            raise ValueError("Layer number not found")
        except (IndexError, ValueError):
            raise ValueError(f"Could not extract layer from hook point: {hook_point}")

    def collect(
        self,
        dataset: TokenizedProbingDataset,
    ) -> Dict[str, ActivationStore]:
        """Collect activations for each hook point.

        Returns:
            Dictionary mapping hook points to ActivationCache objects
        """
        all_activations = {}

        # Process in batches
        for batch_start in range(0, len(dataset.examples), self.config.batch_size):
            batch_end = min(batch_start + self.config.batch_size, len(dataset.examples))
            batch_indices = list(range(batch_start, batch_end))

            # Get batch tensors
            batch = dataset.get_batch_tensors(batch_indices)
            input_ids = batch["input_ids"].to(self.config.device)

            # Run model with tracing to collect activations
            with self.model.trace(input_ids):
                # Save activations for each hook point
                saved_activations = {}
                for hook in self.config.hook_points:
                    # Navigate to the hook point and save output
                    module = self._get_module_from_hook_point(hook)
                    saved_activations[hook] = module.save()

            # Store activations for each hook point
            for hook in self.config.hook_points:
                if hook not in all_activations:
                    all_activations[hook] = []
                # Get the saved tensor and move to CPU
                activation = saved_activations[hook].value
                if isinstance(activation, tuple):
                    # Take the first element if it's a tuple (hidden states)
                    activation = activation[0]
                all_activations[hook].append(activation.cpu())

        # Create ActivationStore objects
        return {
            hook: ActivationStore(
                raw_activations=torch.cat(activations, dim=0),
                hook_point=hook,
                example_indices=torch.arange(len(dataset.examples)),
                sequence_lengths=torch.tensor(dataset.get_token_lengths()),
                hidden_size=activations[0].shape[-1],
                dataset=dataset,
                labels=torch.tensor([ex.label for ex in dataset.examples]),
                label_texts=[ex.label_text for ex in dataset.examples],
            )
            for hook, activations in all_activations.items()
        }

    def _get_module_from_hook_point(self, hook_point: str):
        """Navigate to the module specified by the hook point.
        
        Args:
            hook_point: Dot-separated path to module (e.g. "transformer.h.12.output")
            
        Returns:
            Module reference
        """
        parts = hook_point.split(".")
        module = self.model
        
        for part in parts:
            if part.isdigit():
                # Handle numeric indices for layer lists
                module = module[int(part)]
            else:
                # Handle named attributes
                module = getattr(module, part)
        
        return module


# Backward compatibility aliases
TransformerLensConfig = NNsightConfig
TransformerLensCollector = NNsightCollector
