"""
services/pipeline.py — HVF PDF extraction pipeline.

Ported from the original working app (core/pipeline.py).
Reads a Humphrey Visual Field PDF using PyMuPDF text blocks and maps
extracted values onto LE/RE templates defined in data/templates/HVF.json.

Public surface:
    extract_pdf(file, eye, template_path, *, strict) -> {eye: {field: value}}
    extract_pdf_stream(bytes, eye, template_path, *, strict) -> {eye: {field: value}}
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any, Iterable
import numpy as np
import cv2

from app.services.normalise_pdf import normalise_pdf_header


def _resource_path(*parts: str) -> Path:
    # When bundled with PyInstaller, files live in _MEIPASS.
    # Otherwise resolve relative to backend/ (three levels up from this file).
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).parent.parent.parent))
    return base.joinpath(*parts)


DEFAULT_TEMPLATE_PATH = _resource_path("data", "templates", "HVF.json")
DEFAULT_VRVF_TEMPLATE_PATH = _resource_path("data", "templates", "vrvf.json")
SUPPORTED_EYES = {"LE", "RE"}


class HVFExtractionError(RuntimeError):
    """Raised when a PDF cannot be parsed as the expected HVF export layout."""


def _load_template(template_path: str | Path, eye: str) -> dict[str, Any]:
    path = Path(template_path)
    if not path.exists():
        raise FileNotFoundError(f"Template file does not exist: {path}")

    with path.open("r", encoding="utf-8") as f:
        template_full = json.load(f)

    if eye not in template_full:
        valid = ", ".join(sorted(template_full))
        raise ValueError(f"Unsupported eye {eye!r}. Expected one of: {valid}")

    return template_full[eye]


def _open_pdf(path: Path):
    try:
        import pymupdf
    except ModuleNotFoundError as exc:
        raise ModuleNotFoundError(
            "PyMuPDF is required. Install with: pip install -r requirements.txt"
        ) from exc
    return pymupdf.open(path)


def _split_block_lines(block: tuple[Any, ...]) -> list[str]:
    return [line.strip() for line in block[4].splitlines() if line.strip()]


def _values_from_blocks(blocks: Iterable[tuple[Any, ...]]) -> list[str]:
    values: list[str] = []
    for block in blocks:
        values.extend(_split_block_lines(block))
    return values


def _extract_header(blocks: list[tuple[Any, ...]], labels: list[str]) -> dict[str, str]:
    required_indexes = [8, 10, 11, 13]
    if len(blocks) <= max(required_indexes):
        raise HVFExtractionError(
            f"Expected at least {max(required_indexes) + 1} text blocks, found {len(blocks)}"
        )

    values = []
    values.extend(_split_block_lines(blocks[8]))
    values.extend(_values_from_blocks(blocks[10:12]))
    values.extend(_split_block_lines(blocks[13]))
    return normalise_pdf_header(values, labels)


def _extract_map_values(blocks: list[tuple[Any, ...]], eye: str) -> list[str]:
    values: list[str] = []
    if eye == "RE":
        for block in blocks[15:39]:
            values.extend(re.findall(r"[<>]?-?\d+", block[4]))
    elif eye == "LE":
        for block in blocks[15:39]:
            values.extend(re.findall(r"[<>]?-?\d+", block[4])[::-1])
    return values


def _assign_map_values(
    result: dict[str, str],
    values: list[str],
    template: dict[str, Any],
    strict: bool,
) -> None:
    sections = ["threshold_map", "total_deviation", "pattern_deviation"]
    expected_count = sum(len(template[section]["labels"])
                         for section in sections)

    if len(values) < expected_count:
        message = f"Expected {expected_count} map values, found {len(values)}"
        if strict:
            raise HVFExtractionError(message)

    offset = 0
    for section in sections:
        labels = template[section]["labels"]
        for index, label in enumerate(labels):
            value_index = offset + index
            if value_index < len(values):
                result[f"{section}_{label}"] = values[value_index]
            elif not strict:
                result[f"{section}_{label}"] = ""
        offset += len(labels)


def _extract_ght_vfi(
    result: dict[str, str],
    blocks: list[tuple[Any, ...]],
    labels: list[str],
    strict: bool,
) -> None:
    values = [
        value
        for value in _values_from_blocks(blocks[40:42])
        if not value.endswith(":")
    ]

    if len(values) < len(labels) and strict:
        raise HVFExtractionError(
            f"Expected {len(labels)} GHT/VFI values, found {len(values)}"
        )

    for index, label in enumerate(labels):
        result[f"ght_vfi_{label}"] = values[index] if index < len(
            values) else ""


def extract_pdf(
    file: str | Path,
    eye: str,
    template_path: str | Path = DEFAULT_TEMPLATE_PATH,
    *,
    strict: bool = False,
) -> dict[str, dict[str, str]]:
    """
    Extract structured data from a Humphrey Visual Field PDF file on disk.

    Args:
        file:          Path to the PDF file.
        eye:           'LE' or 'RE'.
        template_path: Path to HVF.json template. Defaults to data/templates/HVF.json.
        strict:        If True, raise on unexpected missing values instead of leaving blank.

    Returns:
        {eye: {field_name: value, ...}}
    """
    eye = eye.upper()
    if eye not in SUPPORTED_EYES:
        raise ValueError(f"Unsupported eye {eye!r}. Expected 'LE' or 'RE'.")

    path = Path(file)
    if path.suffix.lower() != ".pdf":
        raise ValueError(f"Expected a PDF file: {path}")
    if not path.exists():
        raise FileNotFoundError(f"PDF file does not exist: {path}")

    template = _load_template(template_path, eye)

    with _open_pdf(path) as doc:
        if len(doc) == 0:
            raise HVFExtractionError(f"PDF has no pages: {path}")
        blocks = doc[0].get_text_blocks()

    result: dict[str, str] = {}
    result.update(_extract_header(blocks, template["header"]["labels"]))
    _assign_map_values(result, _extract_map_values(
        blocks, eye), template, strict)
    _extract_ght_vfi(result, blocks, template["ght_vfi"]["labels"], strict)

    return {eye: result}


def extract_pdf_stream(
    file: bytes,
    eye: str,
    template_path: str | Path = DEFAULT_TEMPLATE_PATH,
    *,
    strict: bool = False,
) -> dict[str, dict[str, str]]:
    """
    Extract structured data from a Humphrey Visual Field PDF provided as bytes.

    Args:
        file:          Raw PDF bytes.
        eye:           'LE' or 'RE'.
        template_path: Path to HVF.json template. Defaults to data/templates/HVF.json.
        strict:        If True, raise on unexpected missing values instead of leaving blank.

    Returns:
        {eye: {field_name: value, ...}}
    """
    eye = eye.upper()
    if eye not in SUPPORTED_EYES:
        raise ValueError(f"Unsupported eye {eye!r}. Expected 'LE' or 'RE'.")

    template = _load_template(template_path, eye)

    try:
        import pymupdf
    except ModuleNotFoundError as exc:
        raise ModuleNotFoundError(
            "PyMuPDF is required. Install with: pip install -r requirements.txt"
        ) from exc

    doc = pymupdf.open(stream=file, filetype="pdf")

    if len(doc) == 0:
        raise HVFExtractionError("PDF has no pages")

    blocks = doc[0].get_text_blocks()
    result: dict[str, str] = {}
    result.update(_extract_header(blocks, template["header"]["labels"]))
    _assign_map_values(result, _extract_map_values(
        blocks, eye), template, strict)
    _extract_ght_vfi(result, blocks, template["ght_vfi"]["labels"], strict)

    return {eye: result}


def _iter_crop_boxes(coordinates: list[Any]) -> Iterable[tuple[int, int, int, int]]:
    if len(coordinates) % 2 != 0:
        raise HVFExtractionError(
            "VRVF crop template contains an odd number of coordinates")

    for index in range(0, len(coordinates), 2):
        x1, y1 = coordinates[index]
        x2, y2 = coordinates[index + 1]
        x_min, x_max = sorted((int(x1), int(x2)))
        y_min, y_max = sorted((int(y1), int(y2)))
        yield x_min, y_min, x_max, y_max


def _ocr_texts(ocr_engine: Any, image: np.ndarray, box: tuple[int, int, int, int]) -> list[str]:
    x_min, y_min, x_max, y_max = box
    crop = image[y_min:y_max, x_min:x_max]
    if crop.size == 0:
        return []

    prediction = ocr_engine.predict(crop)
    texts: list[str] = []
    for item in prediction or []:
        if isinstance(item, dict):
            texts.extend(str(text) for text in item.get(
                "rec_texts", []) if str(text).strip())
            continue

        # PaddleOCR v2 returns nested line tuples; keep this tolerant so the
        # extraction code does not care which PaddleOCR result shape is active.
        for line in item or []:
            if (
                isinstance(line, (list, tuple))
                and len(line) >= 2
                and isinstance(line[1], (list, tuple))
                and line[1]
            ):
                text = str(line[1][0]).strip()
                if text:
                    texts.append(text)

    return texts


def _normalise_ocr_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _normalise_ocr_text_value(texts: Iterable[str], label: str) -> str:
    value = _normalise_ocr_whitespace(" ".join(texts))
    if not value:
        return ""

    label_pattern = re.escape(label).replace(r"\ ", r"\s+")
    value = re.sub(rf"^\s*{label_pattern}\s*:?\s*",
                   "", value, flags=re.IGNORECASE)

    aliases = {
        "VFI": r"(?:VFI|FI)",
        "MD": r"(?:MD|ID)",
        "PSD": r"(?:PSD|SD)",
    }
    alias = aliases.get(label)
    if alias:
        value = re.sub(rf"^\s*{alias}\s*:?\s*", "", value, flags=re.IGNORECASE)

    return _normalise_ocr_whitespace(value)


def _normalise_ocr_map_value(texts: Iterable[str]) -> str:
    value = _normalise_ocr_whitespace(" ".join(texts))
    if not value:
        return ""

    value = value.replace("−", "-").replace("–", "-").replace("—", "-")
    value = re.sub(r"(?<!\S)4\s+(\d+(?:\.\d+)?)", r"<\1", value)
    value = re.sub(r"[^ <0-9-]+", "", value)
    tokens = re.findall(r"[<>]?-?\d+", value)
    return tokens[0] if tokens else _normalise_ocr_whitespace(value)


def _assign_ocr_section(
    result: dict[str, str],
    section_name: str,
    labels: list[str],
    coordinates: list[Any],
    image: np.ndarray,
    ocr_engine: Any,
    strict: bool,
    normaliser: Any,
) -> None:
    boxes = list(_iter_crop_boxes(coordinates))
    if len(boxes) != len(labels) and strict:
        raise HVFExtractionError(
            f"Expected {len(labels)} {section_name} crop boxes, found {len(boxes)}"
        )

    for index, label in enumerate(labels):
        if index >= len(boxes):
            result[f"{section_name}_{label}"] = ""
            continue
        texts = _ocr_texts(ocr_engine, image, boxes[index])
        result[f"{section_name}_{label}"] = normaliser(texts, label)


def _open_pdf_from_path_or_bytes(file: str | Path | bytes):
    try:
        import pymupdf
    except ModuleNotFoundError as exc:
        raise ModuleNotFoundError(
            "PyMuPDF is required. Install with: pip install -r requirements.txt"
        ) from exc

    if isinstance(file, bytes):
        return pymupdf.open(stream=file, filetype="pdf")

    path = Path(file)
    if path.suffix.lower() != ".pdf":
        raise ValueError(f"Expected a PDF file: {path}")
    if not path.exists():
        raise FileNotFoundError(f"PDF file does not exist: {path}")
    return pymupdf.open(path)


def extract_ocr(
    file: str | Path | bytes,
    eye: str,
    template_path: str | Path = DEFAULT_VRVF_TEMPLATE_PATH,
    *,
    strict: bool = False,
) -> dict[str, dict[str, str]]:
    """
    Extract structured data from a Virtual Vision Visual Field PDF using OCR.

    Args:
        file:          Path to a PDF file or raw PDF bytes.
        eye:           'LE' or 'RE'.
        template_path: Path to vrvf.json template. Defaults to data/templates/vrvf.json.
        strict:        If True, raise on unexpected missing values instead of leaving blank.

    Returns:
        {eye: {field_name: value, ...}}
    """
    try:
        from data.templates.vrvf import (
            deviation_map_LE,
            deviation_map_RE,
            header,
            test_details,
            threshold_map_LE,
            threshold_map_RE,
            total_deviation_map_LE,
            total_deviation_map_RE,
            vfi,
        )
    except ModuleNotFoundError as exc:
        raise FileNotFoundError(
            "VRVF cropping template not found. Defaults to data/templates/vrvf.py"
        ) from exc

    eye = eye.upper()
    if eye not in SUPPORTED_EYES:
        raise ValueError(f"Unsupported eye {eye!r}. Expected 'LE' or 'RE'.")

    template = _load_template(template_path, eye)
    try:
        from app.core.ocr import ocr as ocr_engine
    except ModuleNotFoundError as exc:
        raise ModuleNotFoundError(
            "PaddleOCR is required for VRVF extraction. Install backend OCR dependencies first."
        ) from exc

    with _open_pdf_from_path_or_bytes(file) as doc:
        if len(doc) == 0:
            raise HVFExtractionError("PDF has no pages")

        pix = doc[0].get_pixmap(dpi=300)
        image = np.frombuffer(pix.samples, np.uint8).reshape(
            pix.height, pix.width, pix.n)

    if pix.n == 4:
        image = cv2.cvtColor(image, cv2.COLOR_RGBA2BGR)
    elif pix.n == 3:
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    elif pix.n == 1:
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)

    result: dict[str, str] = {}
    text_sections = {
        "header": (header, template["header"]["labels"]),
        "test_details": (test_details, template["test_details"]["labels"]),
        "vfi": (vfi, template["vfi"]["labels"]),
    }
    for section_name, (coordinates, labels) in text_sections.items():
        _assign_ocr_section(
            result,
            section_name,
            labels,
            coordinates,
            image,
            ocr_engine,
            strict,
            _normalise_ocr_text_value,
        )

    map_sections = {
        "threshold_map": threshold_map_LE if eye == "LE" else threshold_map_RE,
        "total_deviation": total_deviation_map_LE if eye == "LE" else total_deviation_map_RE,
        "pattern_deviation": deviation_map_LE if eye == "LE" else deviation_map_RE,
    }
    for section_name, coordinates in map_sections.items():
        _assign_ocr_section(
            result,
            section_name,
            template[section_name]["labels"],
            coordinates,
            image,
            ocr_engine,
            strict,
            lambda texts, _label: _normalise_ocr_map_value(texts),
        )

    return {eye: result}
