# %%
#  GPT2 model

# %%
from transformers import AutoModelForCausalLM, AutoTokenizer
model_id = "gpt2"
AutoModelForCausalLM.from_pretrained(model_id)
AutoTokenizer.from_pretrained(model_id)
print("✅ weights are now downloaded")

# %% [markdown]
# # Setup nnsights with probity

# %%
from probity.collection import NNSightCollector, NNSightConfig
from transformers import AutoTokenizer
from probity.datasets.templated import TemplatedDataset
from probity.datasets.tokenized import TokenizedProbingDataset

# %%
# %% [markdown]
# ## Dataset 3: First-Person vs Third-Person Perspective
# Now we'll create a dataset for distinguishing between first-person and third-person perspectives.
# This method is the same as Dataset 2, but with a different approach to finding the target position.
# %%
from probity.datasets.templated import TemplatedDataset, TemplateVariable, Template
from probity.datasets.tokenized import TokenizedProbingDataset
from probity.datasets.base import ProbingDataset, ProbingExample, CharacterPositions
from probity.datasets.position_finder import Position, PositionFinder
import torch
import numpy as np
import random
import torch.backends
import matplotlib.pyplot as plt

# %%
# Create dataset for first-person vs third-person perspective
first_person_statements = [
    "I think artificial intelligence is fascinating.",
    "I feel excited about the future of technology.",
    "I believe climate change requires immediate action.",
    "I want to learn more about quantum computing.",
    "I remember my first day at college vividly.",
    "I prefer reading books to watching movies.",
    "I hope to travel to Japan someday.",
    "I enjoy solving complex mathematical problems.",
    "I consider philosophy to be essential for critical thinking.",
    "I dream of starting my own company.",
    "I wish people would be kinder to each other.",
    "I need more time to complete this project.",
    "I wonder what the world will be like in 100 years.",
    "I regret not learning to play an instrument.",
    "I understand the importance of regular exercise.",
    "I desire to improve my public speaking skills.",
    "I plan to learn a new language next year.",
    "I question many assumptions about human nature.",
    "I value honesty above all other qualities.",
    "I imagine a world without poverty or hunger.",
]

third_person_statements = [
    "He thinks artificial intelligence is fascinating.",
    "She feels excited about the future of technology.",
    "They believe climate change requires immediate action.",
    "He wants to learn more about quantum computing.",
    "She remembers her first day at college vividly.",
    "He prefers reading books to watching movies.",
    "She hopes to travel to Japan someday.",
    "They enjoy solving complex mathematical problems.",
    "She considers philosophy to be essential for critical thinking.",
    "He dreams of starting his own company.",
    "She wishes people would be kinder to each other.",
    "He needs more time to complete this project.",
    "They wonder what the world will be like in 100 years.",
    "She regrets not learning to play an instrument.",
    "He understands the importance of regular exercise.",
    "She desires to improve her public speaking skills.",
    "They plan to learn a new language next year.",
    "He questions many assumptions about human nature.",
    "She values honesty above all other qualities.",
    "They imagine a world without poverty or hunger.",
]

# Create position finder for the beginning pronoun (I, He, She, They)
pronoun_finder = PositionFinder.from_regex(r"^(I|He|She|They)\b")

# Create ProbingExamples
perspective_examples = []

# Add first-person examples
for text in first_person_statements:
    positions_dict = {}
    pronoun_pos = pronoun_finder(text)
    if pronoun_pos:
        positions_dict["PRONOUN_POSITION"] = pronoun_pos[0]

    perspective_examples.append(
        ProbingExample(
            text=text,
            label=1,  # 1 for first-person
            label_text="first_person",
            character_positions=(
                CharacterPositions(positions_dict) if positions_dict else None
            ),
            attributes={"perspective": "first_person"},
        )
    )

# Add third-person examples
for text in third_person_statements:
    positions_dict = {}
    pronoun_pos = pronoun_finder(text)
    if pronoun_pos:
        positions_dict["PRONOUN_POSITION"] = pronoun_pos[0]

    perspective_examples.append(
        ProbingExample(
            text=text,
            label=0,  # 0 for third-person
            label_text="third_person",
            character_positions=(
                CharacterPositions(positions_dict) if positions_dict else None
            ),
            attributes={"perspective": "third_person"},
        )
    )

# Create the dataset
perspective_dataset = ProbingDataset(
    examples=perspective_examples,
    task_type="classification",
    label_mapping={"third_person": 0, "first_person": 1},
    dataset_attributes={
        "description": "First-person vs third-person perspective classification dataset"
    },
)

# %%

# Display examples from the perspective dataset
print("First-Person vs Third-Person Dataset Examples:")
for i in np.random.choice(
    range(len(perspective_dataset.examples)), size=6, replace=False
):
    ex = perspective_dataset.examples[i]
    label = "first-person" if ex.label == 1 else "third-person"
    print(f"Example {i}: '{ex.text}' (Label: {label})")

# Verify positions
sample_ex = perspective_dataset.examples[0]
print(f"\nPosition types: {perspective_dataset.position_types}")
if perspective_dataset.position_types:
    for key in perspective_dataset.position_types:
        if (
            sample_ex.character_positions
            and key in sample_ex.character_positions.keys()
        ):
            pos = sample_ex.character_positions[key]
            if isinstance(pos, Position):
                print(
                    f"{key} position: {pos.start}-{pos.end} "
                    f"('{sample_ex.text[pos.start:pos.end]}')"
                )
            else:
                for i, p in enumerate(pos):
                    print(
                        f"{key} position {i}: {p.start}-{p.end} "
                        f"('{sample_ex.text[p.start:p.end]}')"
                    )

# %% [markdown]
# ## Tokenization
# Now that we have our datasets, we need to tokenize them for use with our model.

# %%
# Set up tokenizer
tokenizer = AutoTokenizer.from_pretrained("gpt2")
tokenizer.pad_token = tokenizer.eos_token

# %%
# Tokenize the perspective dataset
tokenized_perspective_dataset = TokenizedProbingDataset.from_probing_dataset(
    dataset=perspective_dataset,
    tokenizer=tokenizer,
    padding="max_length",
    max_length=24,
    add_special_tokens=True,
)
print("\nPerspective Dataset:")
print(f"Dataset size: {len(tokenized_perspective_dataset.examples)}")
print(
    f"Max token length: {max(len(ex.tokens) for ex in tokenized_perspective_dataset.examples)}"
)

# %% [markdown]
# ## Probe Training
# Now let's train probes for each dataset to see if we can detect their respective features.
# We'll try multiple model layers to see which ones work best.
# First use TransformerLens to train pribes
from nnsight import LanguageModel
from probity.collection import NNSightCollector, NNSightConfig

# 1. Load GPT-2-small locally
model_path = "gpt2"                # local copy or HF id
lm = LanguageModel(model_path, device_map="cpu")

hook_points = [f"transformer.h.{layer}.mlp.output.0" for layer in [5, 8, 10]]

# 2. Tell the collector the native nnsight path
cfg = NNSightConfig(
    model_name  = model_path,
    hook_points = hook_points,   # ← here
    device_map  = "cpu",
)

stores = NNSightCollector(cfg).collect(tokenized_perspective_dataset)

# 3. Check we really grabbed the right tensor

acts = stores["transformer.h.10.mlp.output.0"]
print(stores.keys())
print(acts.raw_activations.shape)      
# (batch, seq_len, 768)

# %%

# Do the same with Transformerlens
from probity.collection import TransformerLensCollector, TransformerLensConfig

hook_points = [f"blocks.{layer}.hook_mlp_out" for layer in [5, 8, 10]]

cfg = TransformerLensConfig(
    model_name="gpt2",
    hook_points=hook_points,    # ← TL name
    batch_size=4, device="cpu",
)
stores = TransformerLensCollector(cfg).collect(tokenized_perspective_dataset)

acts = stores["blocks.10.hook_mlp_out"]
print(stores.keys())    
print(acts.raw_activations.shape)

# %%
# Prope Training

from probity.probes import (
    LinearProbe,
    LinearProbeConfig,
    LogisticProbe,
    LogisticProbeConfig,
    KMeansProbe,
    KMeansProbeConfig,
    PCAProbe,
    PCAProbeConfig,
    MeanDifferenceProbe,
    MeanDiffProbeConfig,
)
from probity.training.trainer import (
    SupervisedProbeTrainer,
    SupervisedTrainerConfig,
    DirectionalProbeTrainer,
    DirectionalTrainerConfig,
)
from probity.pipeline.pipeline import ProbePipeline, ProbePipelineConfig
from probity.probes.inference import ProbeInference

# %%
# Set torch device consistently
if torch.backends.mps.is_available():
    device = "mps"
elif torch.cuda.is_available():
    device = "cuda"
else:
    device = "cpu"
print(f"Using device: {device}")

# Common configuration
model_name = "gpt2"
hook_point = "transformer.h.10.mlp.output.0"
hidden_size = 768  # GPT-2's hidden size

# Common trainer configuration for supervised probes
supervised_trainer_config = SupervisedTrainerConfig(
    batch_size=32,
    learning_rate=1e-3,
    num_epochs=10,
    weight_decay=0.01,
    train_ratio=0.8,
    handle_class_imbalance=True,
    show_progress=True,
    device=device,
    standardize_activations=True,
)


# Common trainer configuration for directional probes
directional_trainer_config = DirectionalTrainerConfig(
    batch_size=32, device=device, standardize_activations=True
)

# Dictionary to store probes and their training histories
probes = {}
training_histories = {}

# %%

linear_probe_config = LinearProbeConfig(
    input_size=hidden_size,
    normalize_weights=True,
    bias=False,
    model_name=model_name,
    hook_point=hook_point,
    hook_layer=7,
    name="sentiment_linear_probe",
)

linear_pipeline_config = ProbePipelineConfig(
    dataset=tokenized_perspective_dataset,
    probe_cls=LinearProbe,
    probe_config=linear_probe_config,
    trainer_cls=SupervisedProbeTrainer,
    trainer_config=supervised_trainer_config,
    position_key="PRONOUN_POSITION",
    collector_cls=NNSightCollector,
    collector_config=NNSightConfig(
        model_name=model_name,
        hook_points=["transformer.h.10.mlp.output.0"],
        device_map="cpu",
    ),
    cache_dir="./cache/linear_probe_cache",
)

print("Training Linear Probe...")
linear_pipeline = ProbePipeline(linear_pipeline_config)
probe, history = linear_pipeline.run()
probes["linear"] = probe
training_histories["linear"] = history
# %%
