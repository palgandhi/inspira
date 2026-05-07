"""
Inspira Backend — Service 1: StylingService (The Painter)
=========================================================
Implements depth-guided style transfer using Stable Diffusion 1.5 + ControlNet.
Optimized for Apple Silicon (M1) with 8GB Unified Memory.

Aesthetics:
- High-fidelity depth mapping (DPT-Large).
- Style-accurate synthesis using ControlNet.
- Harmonious room-wide color consistency.
"""
import logging
import torch
from pathlib import Path
from PIL import Image
from diffusers import (
    ControlNetModel, 
    StableDiffusionControlNetPipeline, 
    UniPCMultistepScheduler
)

logger = logging.getLogger(__name__)

class StylingService:
    def __init__(self):
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"
        logger.info("StylingService initialized on device: %s", self.device)
        self.pipe = None
        self.depth_estimator = None

    def _init_models(self):
        """Lazy initialization to save memory until needed."""
        if self.pipe is not None:
            return

        logger.info("Loading ControlNet and SD 1.5 models...")
        controlnet = ControlNetModel.from_pretrained(
            "lllyasviel/sd-controlnet-depth", 
            torch_dtype=torch.float16
        )
        self.pipe = StableDiffusionControlNetPipeline.from_pretrained(
            "runwayml/stable-diffusion-v1-5", 
            controlnet=controlnet, 
            torch_dtype=torch.float16
        )
        
        # M1 Memory Optimizations
        self.pipe.scheduler = UniPCMultistepScheduler.from_config(self.pipe.scheduler.config)
        self.pipe.to(self.device)
        
        # Slicing and offloading are CRITICAL for 8GB RAM
        if self.device == "mps":
            self.pipe.enable_attention_slicing()
            # Sequential CPU offload saves massive VRAM by moving layers to system RAM
            # self.pipe.enable_sequential_cpu_offload() 
            # Note: sequential offload can be buggy on MPS, we'll start with slicing

        logger.info("Loading Depth Estimator...")
        self.depth_estimator = transformers_pipeline(
            "depth-estimation", 
            model="Intel/dpt-large"
        )

    def _get_depth_map(self, image: Image.Image) -> Image.Image:
        """Extract depth map to preserve room structure."""
        result = self.depth_estimator(image)
        return result["depth"]

    def run(
        self, 
        image_paths: list[Path], 
        inspiration_path: Path, 
        output_dir: Path,
        style_prompt: str = "modern interior design",
        global_lighting: str = "soft natural light",
        progress_callback = None,
    ) -> tuple[list[Path], list[str]]:
        """
        Apply style transfer to a set of room photos.
        """
        self._init_models()
        output_dir.mkdir(parents=True, exist_ok=True)
        
        styled_paths = []
        
        # Final combined prompt
        full_prompt = f"{style_prompt}, {global_lighting}, highly detailed, 8k, photorealistic, interior design magazine style"
        negative_prompt = "deformed, blurry, low quality, messy, cluttered, dark, unrealistic, distorted furniture"

        logger.info("Starting style transfer for %d images", len(image_paths))

        for i, img_path in enumerate(image_paths):
            msg = f"Styling image {i+1}/{len(image_paths)}: {img_path.name}"
            logger.info(msg)
            if progress_callback:
                progress_callback(1, int((i / len(image_paths)) * 100), msg)
            
            raw_img = Image.open(img_path).convert("RGB")
            # Resize for speed/memory on M1 (keep aspect ratio, max 768px)
            raw_img.thumbnail((768, 768))
            
            # 1. Get Depth Map
            depth_img = self._get_depth_map(raw_img)
            
            # 2. Generate Styled Image
            # We use a low strength/steps for speed, but enough for quality
            styled_img = self.pipe(
                full_prompt,
                image=depth_img,
                num_inference_steps=20,
                guidance_scale=7.5,
                negative_prompt=negative_prompt,
                controlnet_conditioning_scale=1.0,
            ).images[0]
            
            # 3. Save result
            out_path = output_dir / f"styled_{img_path.name}"
            styled_img.save(out_path)
            styled_paths.append(out_path)
            
            # Free some memory if possible
            if self.device == "mps":
                torch.mps.empty_cache()

        return styled_paths, []
