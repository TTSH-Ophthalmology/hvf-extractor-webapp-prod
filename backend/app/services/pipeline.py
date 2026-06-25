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

from app.services.normalise_pdf import normalise_pdf_header


def _resource_path(*parts: str) -> Path:
    # When bundled with PyInstaller, files live in _MEIPASS.
    # Otherwise resolve relative to backend/ (three levels up from this file).
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).parent.parent.parent))
    return base.joinpath(*parts)


DEFAULT_TEMPLATE_PATH = _resource_path("data", "templates", "HVF.json")
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
    expected_count = sum(len(template[section]["labels"]) for section in sections)

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
        result[f"ght_vfi_{label}"] = values[index] if index < len(values) else ""


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
    _assign_map_values(result, _extract_map_values(blocks, eye), template, strict)
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
    _assign_map_values(result, _extract_map_values(blocks, eye), template, strict)
    _extract_ght_vfi(result, blocks, template["ght_vfi"]["labels"], strict)

    return {eye: result}
