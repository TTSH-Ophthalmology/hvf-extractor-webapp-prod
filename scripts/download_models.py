"""
scripts/download_models.py — Download PaddleOCR models to backend/data/models/.

Run with the backend venv activated from the repo root:
    python scripts/download_models.py

What it does:
  1. Initialises PaddleOCR without explicit model dirs so PaddleX auto-downloads
     the correct English det/rec models to its default cache (~/.paddlex).
  2. Reads the exact model dirs from the PaddleOCR pipeline internals.
  3. Copies those dirs to backend/data/models/det and backend/data/models/rec.

After this script completes, restart the backend — ocr.py will find the models
at data/models/det and data/models/rec and skip the download on every subsequent start.
"""

import os
import shutil
import sys
from pathlib import Path

# Must be set before PaddlePaddle is imported to avoid oneDNN runtime errors.
os.environ["FLAGS_use_mkldnn"] = "0"

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND = REPO_ROOT / "backend"
TARGET_DET = BACKEND / "data" / "models" / "det"
TARGET_REC = BACKEND / "data" / "models" / "rec"


def _get_model_dirs(ocr_instance) -> tuple[Path, Path]:
    """
    Read the exact model dirs from the initialised PaddleOCR pipeline.

    Internal path (PaddleOCR 3.7 / PaddleX 3.7):
      PaddleOCR
        .paddlex_pipeline          → ParallelPipeline
          ._pipeline               → OCRPipeline
            .text_det_model        → TextDetPredictor (RunnerPredictor)
              .runner              → PaddleStaticRunner
                .model_dir         → Path
    """
    ocr_pipeline = ocr_instance.paddlex_pipeline._pipeline
    det_dir = Path(ocr_pipeline.text_det_model.runner.model_dir)
    rec_dir = Path(ocr_pipeline.text_rec_model.runner.model_dir)
    return det_dir, rec_dir


def _copy(src: Path, dst: Path) -> None:
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst)


def main() -> None:
    try:
        from paddleocr import PaddleOCR
    except ImportError as exc:
        print(f"Import error: {exc}")
        print("Make sure you are running with the backend venv activated.")
        sys.exit(1)

    print("Initialising PaddleOCR — models will be downloaded to the PaddleX cache...")
    ocr_instance = PaddleOCR(
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
        lang="en",
    )

    try:
        det_src, rec_src = _get_model_dirs(ocr_instance)
    except AttributeError as exc:
        print(f"\nERROR: Could not read model dirs from PaddleOCR pipeline: {exc}")
        print("The internal PaddleOCR/PaddleX structure may have changed in this version.")
        sys.exit(1)

    print(f"\ndet model: {det_src.name}  ({det_src})")
    print(f"rec model: {rec_src.name}  ({rec_src})")

    if not det_src.exists() or not rec_src.exists():
        print("\nERROR: One or more resolved model dirs do not exist on disk.")
        sys.exit(1)

    print(f"\nCopying det  → {TARGET_DET}")
    _copy(det_src, TARGET_DET)

    print(f"Copying rec  → {TARGET_REC}")
    _copy(rec_src, TARGET_REC)

    print("\nDone. Restart the backend.")


if __name__ == "__main__":
    sys.path.insert(0, str(BACKEND))
    main()
