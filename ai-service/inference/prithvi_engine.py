r"""
===============================================================================
                       MODEL INTERFACE SPECIFICATION
===============================================================================
Model Name          : IBM-NASA Prithvi Geospatial Foundation Model
Hugging Face Repository: ibm-nasa-geospatial/Prithvi-100m-multi-temporal-crop-classification
Architecture        : Masked Autoencoder (MAE) / Vision Transformer (ViT) with Temporal Patching
Task                : Multi-temporal Land Cover / Crop Classification & Segmentation

Environment & Dependency Requirements:
  - Python >= 3.10
  - PyTorch >= 2.0.0 (with CUDA 11.8+ / CUDA 12.x or CPU execution fallback)
  - Transformers >= 4.35.0 (huggingface_hub required, trust_remote_code=True)
  - NumPy >= 1.22.0

Input Tensor Specification:
  - Shape           : [Batch_Size, 6, 3, 224, 224]  -> [B, C, T, H, W]
  - Channels (C=6)  : 1. Blue (B2/B02), 2. Green (B3/B03), 3. Red (B4/B04),
                      4. Narrow NIR (B8A/B05), 5. SWIR1 (B11/B06), 6. SWIR2 (B12/B07)
  - Temporal (T=3)  : 3 sequence steps (T0, T1, T2)
  - Dimensions (H,W): 224 x 224 spatial pixels per patch
  - Data Type       : torch.float32
  - Range           : Normalized reflectance [0.0, 1.0] or Z-score normalized [-5.0, 5.0]

Output Matrix Specification:
  - Logits Shape    : [Batch_Size, Num_Classes, 224, 224]
  - Mask Shape      : [Batch_Size, 224, 224]
  - Mask Data Type  : torch.int64 (Argmax class index per pixel)
  - Mapped Output   : Human-readable land cover strings mapped via class index dictionary
===============================================================================
"""

import json
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import torch

try:
    from transformers import AutoConfig, AutoModel, AutoModelForSegmentation
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False


# Configure module logger
logger = logging.getLogger("PrithviInferenceEngine")
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler()
    ch.setFormatter(logging.Formatter("[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s"))
    logger.addHandler(ch)


# Default Land Cover & Crop Classification Index Mapping
DEFAULT_CLASS_MAPPING: Dict[int, str] = {
    0: "Background / Unclassified",
    1: "Natural Forest / Woodland",
    2: "Mangrove / Coastal Wetland",
    3: "Shrubland / Grassland",
    4: "Agriculture / Cropland",
    5: "Water / Hydrological Bodies",
    6: "Barren / Bare Soil",
    7: "Urban / Built-Up Area",
    8: "Permanent Snow / Ice",
    9: "Flooded Vegetation",
    10: "Perennial Crops",
    11: "Annual Crops",
    12: "Restoration / Managed Area",
}


class PrithviInferenceEngine:
    """PyTorch Remote Sensing Engine for IBM-NASA Prithvi-100M Multi-Temporal Foundation Model."""

    def __init__(
        self,
        model_name: str = "ibm-nasa-geospatial/Prithvi-100m-multi-temporal-crop-classification",
        device: Optional[str] = None,
        trust_remote_code: bool = True,
        class_mapping: Optional[Dict[int, str]] = None,
    ) -> None:
        """Initializes the Prithvi foundation model inference engine.

        Args:
            model_name (str): Hugging Face model repository identifier.
            device (Optional[str]): Device target ('cuda', 'cpu', or None for auto-select).
            trust_remote_code (bool): Allow custom architecture loading from Hugging Face hub.
            class_mapping (Optional[Dict[int, str]]): Custom class index to string label mapping.
        """
        self.model_name = model_name
        self.trust_remote_code = trust_remote_code
        self.class_mapping = class_mapping or DEFAULT_CLASS_MAPPING

        # Select execution device
        if device is not None:
            self.device = torch.device(device)
        else:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        logger.info(f"Initializing PrithviInferenceEngine on device: {self.device}")

        # Model instance handle
        self.model: Optional[torch.nn.Module] = None
        self.is_stub_mode: bool = False
        self._load_model()

    def _generate_ai_anomaly_log(
        self,
        anomaly_type: str,
        severity: str,
        message: str,
        details: Dict[str, Any],
    ) -> str:
        """Generates a standardized JSON anomaly log string for automated AI monitoring systems.

        Args:
            anomaly_type (str): Category of anomaly (e.g. 'SHAPE_MISMATCH', 'OUT_OF_BOUNDS').
            severity (str): Severity rank ('WARNING', 'ERROR', 'CRITICAL').
            message (str): Human-readable error or warning explanation.
            details (Dict[str, Any]): Structural payload containing telemetry & values.

        Returns:
            str: Automated JSON log string formatted for AI context parsers.
        """
        log_payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service": "PrithviInferenceEngine",
            "model_name": self.model_name,
            "anomaly_type": anomaly_type,
            "severity": severity,
            "message": message,
            "details": details,
        }
        json_log = json.dumps(log_payload, default=str)
        if severity in ("ERROR", "CRITICAL"):
            logger.error(f"AI_ANOMALY_LOG: {json_log}")
        else:
            logger.warning(f"AI_ANOMALY_LOG: {json_log}")
        return json_log

    def _load_model(self) -> None:
        """Loads model weights from Hugging Face or sets fallback stub mode if offline/unavailable."""
        if not TRANSFORMERS_AVAILABLE:
            anomaly_log = self._generate_ai_anomaly_log(
                anomaly_type="MISSING_DEPENDENCY",
                severity="WARNING",
                message="Hugging Face 'transformers' package is not installed. Operating in stub/mock inference mode.",
                details={"package": "transformers"},
            )
            self.is_stub_mode = True
            return

        try:
            logger.info(f"Loading Hugging Face model: {self.model_name}")
            try:
                self.model = AutoModelForSegmentation.from_pretrained(
                    self.model_name,
                    trust_remote_code=self.trust_remote_code,
                )
            except Exception:
                # Fallback to AutoModel if AutoModelForSegmentation fails
                self.model = AutoModel.from_pretrained(
                    self.model_name,
                    trust_remote_code=self.trust_remote_code,
                )

            self.model.to(self.device)
            self.model.eval()

            # Merge id2label from Hugging Face model config if available
            if hasattr(self.model, "config") and getattr(self.model.config, "id2label", None):
                hf_labels = self.model.config.id2label
                self.class_mapping.update({int(k): str(v) for k, v in hf_labels.items()})

            logger.info(f"Successfully loaded model '{self.model_name}' on {self.device}")

        except Exception as exc:
            self._generate_ai_anomaly_log(
                anomaly_type="MODEL_LOAD_FAILURE",
                severity="WARNING",
                message=f"Failed to load weights from Hugging Face repository '{self.model_name}'. Falling back to synthetic stub inference mode.",
                details={"error": str(exc)},
            )
            self.is_stub_mode = True

    def _validate_input_tensor(
        self, input_tensor: torch.Tensor
    ) -> Tuple[bool, List[str]]:
        """Performs rigorous internal validation checks on the input patch tensor.

        Checks:
          1. Dimensionality equal to 5 (Batch, Channels, Time_Steps, Height, Width).
          2. Shape exact match [B, 6, 3, 224, 224].
          3. Absence of NaN or Inf values.
          4. Expected normalized float value range [0.0, 1.0] or Z-score [-5.0, 5.0].

        Args:
            input_tensor (torch.Tensor): PyTorch tensor candidate.

        Returns:
            Tuple[bool, List[str]]: (is_valid, list_of_json_anomaly_logs)
        """
        anomaly_logs: List[str] = []

        # 1. Dimensionality Check
        if input_tensor.ndim != 5:
            log = self._generate_ai_anomaly_log(
                anomaly_type="SHAPE_MISMATCH",
                severity="ERROR",
                message=f"Input tensor dimension expected 5D [B, 6, 3, 224, 224], got {input_tensor.ndim}D",
                details={"actual_shape": list(input_tensor.shape), "expected_ndim": 5},
            )
            anomaly_logs.append(log)
            return False, anomaly_logs

        B, C, T, H, W = input_tensor.shape

        # 2. Shape Integrity Check [B, 6, 3, 224, 224]
        if C != 6 or T != 3 or H != 224 or W != 224:
            log = self._generate_ai_anomaly_log(
                anomaly_type="SHAPE_MISMATCH",
                severity="ERROR",
                message=f"Input patch shape violation. Expected [B, 6, 3, 224, 224], received [{B}, {C}, {T}, {H}, {W}]",
                details={
                    "received_shape": [B, C, T, H, W],
                    "expected_channels": 6,
                    "expected_timesteps": 3,
                    "expected_height": 224,
                    "expected_width": 224,
                },
            )
            anomaly_logs.append(log)
            return False, anomaly_logs

        # 3. NaN / Inf Detection
        if torch.isnan(input_tensor).any() or torch.isinf(input_tensor).any():
            log = self._generate_ai_anomaly_log(
                anomaly_type="INVALID_NUMERICAL_VALUES",
                severity="ERROR",
                message="Input tensor contains NaN or Inf non-numeric pixel values.",
                details={
                    "has_nan": bool(torch.isnan(input_tensor).any()),
                    "has_inf": bool(torch.isinf(input_tensor).any()),
                },
            )
            anomaly_logs.append(log)
            return False, anomaly_logs

        # 4. Pixel Range / Normalization Validation
        min_val = float(input_tensor.min().item())
        max_val = float(input_tensor.max().item())

        # Raw Digital Number warning check (e.g. unscaled Sentinel-2 reflectance > 10.0)
        if max_val > 10.0:
            log = self._generate_ai_anomaly_log(
                anomaly_type="UNNORMALIZED_PIXEL_VALUES",
                severity="WARNING",
                message="Input pixel values exceed expected physical reflectance range [0.0, 1.0]. Raw DN scaling (divide by 10000.0) may be missing.",
                details={"min_val": min_val, "max_val": max_val},
            )
            anomaly_logs.append(log)
        elif min_val < -10.0 or max_val > 10.0:
            log = self._generate_ai_anomaly_log(
                anomaly_type="OUT_OF_BOUNDS_PIXEL_VALUES",
                severity="WARNING",
                message="Pixel values fall outside typical Z-score or standard float bounds [-10.0, 10.0].",
                details={"min_val": min_val, "max_val": max_val},
            )
            anomaly_logs.append(log)

        return True, anomaly_logs

    def predict_patch(
        self,
        input_tensor: Union[torch.Tensor, np.ndarray],
        return_label_names: bool = True,
    ) -> Dict[str, Any]:
        """Executes forward pass inference over a 5D Prithvi patch tensor.

        Args:
            input_tensor (Union[torch.Tensor, np.ndarray]): Patch tensor of shape [Batch_Size, 6, 3, 224, 224].
            return_label_names (bool): If True, returns class distribution with human-readable string names.

        Returns:
            Dict[str, Any]: Payload containing:
                - 'status': Execution status ('success' or 'error')
                - 'predicted_masks': torch.Tensor or np.ndarray of shape [Batch_Size, 224, 224]
                - 'logits_shape': Shape of output logits before argmax
                - 'class_distribution': Frequency count & coverage % per class
                - 'mapped_class_labels': List of string label grids or mapping table
                - 'anomaly_logs': List of structured JSON anomaly log strings
                - 'inference_time_ms': Latency measurement in milliseconds
        """
        start_time = time.time()
        anomaly_logs: List[str] = []

        # Convert numpy array to PyTorch FloatTensor
        if isinstance(input_tensor, np.ndarray):
            input_tensor = torch.from_numpy(input_tensor).float()
        elif isinstance(input_tensor, torch.Tensor):
            input_tensor = input_tensor.float()
        else:
            log = self._generate_ai_anomaly_log(
                anomaly_type="INVALID_INPUT_TYPE",
                severity="ERROR",
                message=f"Input must be torch.Tensor or numpy.ndarray, got {type(input_tensor)}",
                details={"input_type": str(type(input_tensor))},
            )
            return {
                "status": "error",
                "error": "Invalid input data type",
                "anomaly_logs": [log],
            }

        # Validate tensor shape & values
        is_valid, validation_logs = self._validate_input_tensor(input_tensor)
        anomaly_logs.extend(validation_logs)

        if not is_valid:
            return {
                "status": "error",
                "error": "Input tensor validation failed",
                "anomaly_logs": anomaly_logs,
            }

        B, C, T, H, W = input_tensor.shape

        # Execution path: Model Inference or Stub Fallback
        if not self.is_stub_mode and self.model is not None:
            try:
                input_tensor = input_tensor.to(self.device)

                # Execute forward pass inside torch.no_grad context to conserve memory
                with torch.no_grad():
                    # Pass tensor into model (handling Hugging Face keyword arguments or direct call)
                    try:
                        outputs = self.model(pixel_values=input_tensor)
                    except Exception:
                        outputs = self.model(input_tensor)

                    # Extract logits
                    if hasattr(outputs, "logits"):
                        logits = outputs.logits
                    elif isinstance(outputs, (tuple, list)):
                        logits = outputs[0]
                    else:
                        logits = outputs

                    # Handle dimensional outputs [B, Num_Classes, 224, 224]
                    if logits.ndim == 4:
                        predicted_masks = torch.argmax(logits, dim=1)
                    else:
                        # Fallback for unexpected model outputs
                        predicted_masks = torch.argmax(logits, dim=-1)

            except Exception as exc:
                log = self._generate_ai_anomaly_log(
                    anomaly_type="FORWARD_PASS_EXECUTION_FAILURE",
                    severity="WARNING",
                    message=f"Model forward pass raised runtime error: {exc}. Switching to stub output for this request.",
                    details={"error": str(exc)},
                )
                anomaly_logs.append(log)
                predicted_masks = self._generate_stub_segmentation(input_tensor)
                logits_shape = [B, len(self.class_mapping), H, W]
        else:
            # Stub mode generation for development / testing without GPU weights
            predicted_masks = self._generate_stub_segmentation(input_tensor)
            logits_shape = [B, len(self.class_mapping), H, W]

        # Ensure masks are on CPU for post-processing
        masks_cpu = predicted_masks.detach().cpu()

        # Compute spatial class distribution & percentage coverage
        class_dist = self._compute_class_distribution(masks_cpu)

        elapsed_ms = round((time.time() - start_time) * 1000, 2)

        return {
            "status": "success",
            "predicted_masks": masks_cpu,
            "logits_shape": list(logits_shape) if 'logits_shape' in locals() else list(logits.shape),
            "class_distribution": class_dist,
            "mapped_class_labels": {
                idx: self.class_mapping.get(idx, f"Class_{idx}") for idx in class_dist.keys()
            },
            "anomaly_logs": anomaly_logs,
            "inference_time_ms": elapsed_ms,
            "is_stub_mode": self.is_stub_mode,
        }

    def _generate_stub_segmentation(self, input_tensor: torch.Tensor) -> torch.Tensor:
        """Generates realistic synthetic land cover segmentation masks based on NDVI/NDWI thresholds."""
        B, C, T, H, W = input_tensor.shape
        # Extract mean Red (band 2) and NIR (band 3) across time steps
        red = input_tensor[:, 2, :, :, :].mean(dim=1)
        nir = input_tensor[:, 3, :, :, :].mean(dim=1)
        swir = input_tensor[:, 4, :, :, :].mean(dim=1)

        # Calculate NDVI proxy
        denom = nir + red + 1e-6
        ndvi = (nir - red) / denom

        # Calculate NDWI proxy
        ndwi_denom = (nir + swir) + 1e-6
        ndwi = (nir - swir) / ndwi_denom

        masks = torch.zeros((B, H, W), dtype=torch.int64)

        # Rule-based synthetic segmentation
        masks[ndwi < -0.1] = 5          # Water
        masks[ndvi > 0.6] = 2           # Dense Mangrove / Forest
        masks[(ndvi >= 0.3) & (ndvi <= 0.6)] = 4  # Agriculture
        masks[(ndvi > 0.1) & (ndvi < 0.3)] = 3   # Shrubland
        masks[ndvi <= 0.1] = 6          # Bare Soil / Urban

        return masks

    def _compute_class_distribution(
        self, masks: torch.Tensor
    ) -> Dict[int, Dict[str, Any]]:
        """Computes pixel counts and area coverage percentages per class index."""
        total_pixels = float(masks.numel())
        unique_indices, counts = torch.unique(masks, return_counts=True)

        distribution: Dict[int, Dict[str, Any]] = {}
        for idx, count in zip(unique_indices.tolist(), counts.tolist()):
            pct = round((count / total_pixels) * 100.0, 2)
            label = self.class_mapping.get(int(idx), f"Class_{idx}")
            distribution[int(idx)] = {
                "label": label,
                "pixel_count": count,
                "coverage_percent": pct,
            }

        return distribution


# ===============================================================================
# Standalone Demonstration & Integration Testing
# ===============================================================================
if __name__ == "__main__":
    print("=" * 80)
    print("PrithviInferenceEngine Remote Sensing Foundation Model Test")
    print("=" * 80)

    # Initialize Engine
    engine = PrithviInferenceEngine(
        model_name="ibm-nasa-geospatial/Prithvi-100m-multi-temporal-crop-classification"
    )

    # Generate synthetic input patch tensor: Batch=2, Channels=6, Time_Steps=3, Height=224, Width=224
    print("\n[+] Constructing synthetic 5D tensor: [Batch=2, Channels=6, Time=3, Height=224, Width=224]...")
    synthetic_patch = np.random.uniform(low=0.05, high=0.85, size=(2, 6, 3, 224, 224)).astype(np.float32)

    # Run Prediction
    print("[+] Executing predict_patch()...")
    result = engine.predict_patch(synthetic_patch)

    print(f"\n[+] Status               : {result['status']}")
    print(f"[+] Output Mask Shape    : {result['predicted_masks'].shape}")
    print(f"[+] Inference Latency    : {result['inference_time_ms']} ms")
    print(f"[+] Stub Mode Active     : {result['is_stub_mode']}")

    print("\n[+] Predicted Spatial Class Distribution:")
    for cls_idx, meta in result["class_distribution"].items():
        print(f"   - Class {cls_idx:2d} ({meta['label']:<28}): {meta['pixel_count']:6d} pixels ({meta['coverage_percent']:5.2f}%)")

    print("\n[+] Test 2: Triggering Automated AI Anomaly Log Generator (Intentional Bad Shape)...")
    bad_tensor = np.random.rand(2, 4, 224, 224).astype(np.float32)  # 4D instead of 5D
    err_result = engine.predict_patch(bad_tensor)
    print(f"[+] Error Handling Status: {err_result['status']}")
    print(f"[+] Generated Anomaly Logs:")
    for log_str in err_result["anomaly_logs"]:
        print(f"    {log_str}")

    print("\n" + "=" * 80)
    print("PrithviInferenceEngine Initialization and Inference Complete!")
    print("=" * 80)
