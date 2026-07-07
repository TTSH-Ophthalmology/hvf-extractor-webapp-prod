import os
import sys
from pathlib import Path

# Must be set before PaddlePaddle is imported.
#
# FLAGS_use_mkldnn=0  — disables MKL-DNN/oneDNN selection in the inference config.
# FLAGS_enable_pir_api=0 — falls back to the old executor; the new PIR executor
#   routes CPU ops through oneDNN instructions that raise NotImplementedError for
#   pir::ArrayAttribute<pir::DoubleAttribute> on PP-OCRv6 models (PaddlePaddle 3.x bug).
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_enable_pir_api"] = "0"


def _resource_path(*parts: str) -> Path:
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).parent.parent.parent))
    return base.joinpath(*parts)


_DET_DIR = _resource_path("data", "models", "det")
_REC_DIR = _resource_path("data", "models", "rec")


def _check_model(path: Path, name: str) -> None:
    if not (path / "inference.yml").exists():
        raise FileNotFoundError(
            f"PaddleOCR {name} model not found at: {path}\n"
            f"Models must be pre-bundled. Re-run scripts/bundle.ps1 on the developer machine."
        )


_check_model(_DET_DIR, "detection")
_check_model(_REC_DIR, "recognition")

import paddle.inference  # noqa: E402

# PaddleX's paddle_static runner creates its own paddle.inference.Config and
# enables oneDNN/MKL-DNN independently of the FLAGS_use_mkldnn env var.
# Intercepting create_predictor lets us call config.disable_mkldnn() before
# the C++ predictor is built, preventing the pir::ArrayAttribute error.
_orig_create_predictor = paddle.inference.create_predictor


def _create_predictor_no_mkldnn(config: paddle.inference.Config):
    try:
        config.disable_mkldnn()
    except Exception:
        pass
    return _orig_create_predictor(config)


paddle.inference.create_predictor = _create_predictor_no_mkldnn

from paddleocr import PaddleOCR  # noqa: E402

ocr = PaddleOCR(
    text_detection_model_dir=str(_DET_DIR),
    text_recognition_model_dir=str(_REC_DIR),
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=False,
    lang="en",
)
