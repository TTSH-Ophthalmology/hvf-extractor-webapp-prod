import json
import sys
from pathlib import Path

from paddleocr import PaddleOCR


def _resource_path(*parts: str) -> Path:
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).parent.parent.parent))
    return base.joinpath(*parts)


ocr = PaddleOCR(
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=False,
    lang="en",
)

with _resource_path("data", "templates", "vrvf.json").open("r", encoding="utf-8") as f:
    label = json.load(f)
