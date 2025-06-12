import torch
from typing import List, Optional, Union, Any
from nnsight import LanguageModel

from probity.probes import BaseProbe, MultiClassLogisticProbe


class ProbeInference:
    """
    Primary interface for running trained probes on new text.

    This class handles BaseProbe instances in a consistent way.
    It manages the full pipeline of tokenization, model forward pass, activation extraction,
    and probe application with proper handling of standardization and transformations.
    """

    def __init__(
        self,
        model_name: str,
        hook_point: str,
        probe: BaseProbe,
        device: str = "cuda" if torch.cuda.is_available() else "cpu",
    ):
        self.device = device
        self.model_name = model_name
        self.hook_point = hook_point

        # Set up probe
        self.probe = probe.to(device)
        self.probe.eval()
        self.probe_type = "base_probe"
        self.probe_class = probe.__class__.__name__

        # Setup model
        self.model = LanguageModel(model_name, device_map=device)

    def get_activations(self, text: Union[str, List[str]]) -> torch.Tensor:
        """Get model activations for text input.

        Args:
            text: Input text or list of texts

        Returns:
            Tensor of activations (batch_size, seq_len, hidden_size)
        """
        # Ensure text is a list
        if isinstance(text, str):
            text = [text]

        # Tokenize using the model's tokenizer
        tokens = self.model.tokenizer(text, return_tensors="pt", padding=True)
        input_ids = tokens["input_ids"].to(self.device)

        # Get activations using nnsight trace
        with torch.no_grad():
            with self.model.trace(input_ids):
                # Navigate to the hook point and save the output
                module = self._get_module_from_hook_point(self.hook_point)
                saved_activation = module.save()
            
            # Extract the activation value
            activation = saved_activation.value
            if isinstance(activation, tuple):
                # Take the first element if it's a tuple (hidden states)
                activation = activation[0]
                
        return activation

    def __call__(self, text: Union[str, List[str]]) -> torch.Tensor:
        """
        Deprecated: Please use get_direction_activations() for raw activations or
        get_probabilities() for properly transformed outputs.

        Get probe outputs for text.

        Args:
            text: Input text or list of texts

        Returns:
            Tensor of probe outputs (batch_size, seq_len, [n_vectors for VectorSet])
        """
        import warnings

        warnings.warn(
            "Direct calling is deprecated. Use get_direction_activations() for "
            "raw activations or get_probabilities() for properly transformed outputs.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.get_direction_activations(text)

    def get_direction_activations(self, text: Union[str, List[str]]) -> torch.Tensor:
        """Get activations along the probe direction.

        This projects the activations onto the learned probe direction by taking
        the dot product between the activations and the direction vector.

        Args:
            text: Input text or list of texts

        Returns:
            Tensor of direction activations (batch_size, seq_len)
        """
        # Get activations
        activations = self.get_activations(text)
        batch_size, seq_len, hidden_size = activations.shape

        # Reshape for batch calculation
        flat_activations = activations.view(-1, hidden_size)

        # Standardization is handled by the probe itself now
        # #if hasattr(self.probe, '_apply_standardization'):
        # #     flat_activations = self.probe._apply_standardization(flat_activations)

        # Get the probe direction (always normalized for consistency)
        direction = self.probe.get_direction()

        # Calculate dot product with direction
        with torch.no_grad():
            # For multi-dimensional directions (rarely used)
            if direction.dim() > 1:
                # Assuming flat_activations [B*S, D], direction [O, D]
                # Result [B*S, O]
                outputs = torch.matmul(flat_activations, direction.t())
            else:
                # For single vector directions (common case)
                # flat_activations [B*S, D], direction [D]
                # Result [B*S]
                outputs = torch.matmul(flat_activations, direction)

        # Reshape back
        if outputs.dim() > 1 and outputs.size(1) > 1:
            # Multi-dimensional output [B*S, O] -> [B, S, O]
            return outputs.view(batch_size, seq_len, -1).cpu()
        else:
            # Single dimension output [B*S] -> [B, S]
            return outputs.view(batch_size, seq_len).cpu()

    def get_probe_outputs(self, text: Union[str, List[str]]) -> torch.Tensor:
        """Get outputs using the probe's forward method.

        This uses the probe's specific forward implementation which may include
        additional transformations beyond a simple dot product. The probe's forward
        method now handles standardization internally.

        Args:
            text: Input text or list of texts

        Returns:
            Tensor of probe outputs (batch_size, seq_len, [output_dim])
        """
        # Get activations
        activations = self.get_activations(text)
        batch_size, seq_len, hidden_size = activations.shape

        # Reshape for probe
        flat_activations = activations.view(-1, hidden_size)

        # Run probe - the probe's forward method handles all standardization internally
        with torch.no_grad():
            outputs = self.probe(flat_activations)

        # Reshape back
        if outputs.dim() > 1 and outputs.size(1) > 1:
            # Multi-dimensional output [B*S, O] -> [B, S, O]
            return outputs.view(batch_size, seq_len, -1).cpu()
        else:
            # Single dimension output [B*S] -> [B, S]
            return outputs.view(batch_size, seq_len).cpu()

    def get_probabilities(self, text: Union[str, List[str]]) -> torch.Tensor:
        """Get probabilities from the probe.

        Applies sigmoid for binary logistic probes, softmax for multi-class
        logistic probes, and returns raw outputs otherwise.

        Args:
            text: Input text or list of texts

        Returns:
            Tensor of probabilities/outputs (batch_size, seq_len, [num_classes])
        """
        outputs = self.get_probe_outputs(text)

        # Apply sigmoid for binary logistic probes
        logistic_probe_types = ["LogisticProbe", "SklearnLogisticProbe"]
        if self.probe_class in logistic_probe_types:
            return torch.sigmoid(outputs)
        # Apply softmax for multi-class logistic probes
        elif isinstance(self.probe, MultiClassLogisticProbe):
            # Apply softmax along the class dimension (last dimension after reshape)
            return torch.softmax(outputs, dim=-1)
        else:
            # For other probe types, return raw outputs
            return outputs

    @classmethod
    def from_saved_probe(
        cls,
        model_name: str,
        hook_point: str,
        probe_path: str,
        device: str = "cuda" if torch.cuda.is_available() else "cpu",
        probe_class: Optional[Any] = None,
    ) -> "ProbeInference":
        """Create inference instance from saved probe.

        Args:
            model_name: Name of the model
            hook_point: Hook point to use
            probe_path: Path to the saved probe
            device: Device to run on
            probe_class: Optional probe class for custom probe types

        Returns:
            ProbeInference instance
        """
        # Load the probe based on the file extension
        if probe_path.endswith(".json"):
            # JSON format
            if probe_class is None:
                # Rely on BaseProbe.load_json to determine the class
                # from probity.probes import LogisticProbe # Example fallback removed
                # probe_class = LogisticProbe
                probe = BaseProbe.load_json(probe_path)
            else:
                probe = probe_class.load_json(probe_path)
        else:
            # PyTorch format
            if probe_class is None:
                # Rely on BaseProbe.load to determine the class
                # from probity.probes import LogisticProbe # Example fallback removed
                # probe_class = LogisticProbe
                probe = BaseProbe.load(probe_path)
            else:
                probe = probe_class.load(probe_path)

        return cls(model_name, hook_point, probe, device=device)

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
