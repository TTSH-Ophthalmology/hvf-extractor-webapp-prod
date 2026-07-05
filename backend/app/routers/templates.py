"""
routers/templates.py - HTTP endpoints for report template JSON files.

Thin by design: validates template names and confines reads/writes to
backend/data/templates.
"""

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field


router = APIRouter(prefix="/templates", tags=["Templates"])

TEMPLATES_DIR = Path(__file__).resolve().parents[2] / "data" / "templates"


class TemplateListResponse(BaseModel):
    templates: list[str] = Field(default_factory=list)


class TemplateResponse(BaseModel):
    name: str
    content: dict[str, Any]


class TemplateSaveRequest(BaseModel):
    content: dict[str, Any]


def _template_path(name: str) -> Path:
    if Path(name).name != name or not name.endswith(".json"):
        raise HTTPException(status_code=400, detail="Template name must be a JSON filename")

    path = (TEMPLATES_DIR / name).resolve()
    templates_dir = TEMPLATES_DIR.resolve()

    if templates_dir not in path.parents:
        raise HTTPException(status_code=400, detail="Invalid template path")

    return path


@router.get("", response_model=TemplateListResponse, summary="List available templates")
def list_templates() -> TemplateListResponse:
    TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
    templates = sorted(path.name for path in TEMPLATES_DIR.glob("*.json") if path.is_file())
    return TemplateListResponse(templates=templates)


@router.get("/{name}", response_model=TemplateResponse, summary="Read a template JSON file")
def get_template(name: str) -> TemplateResponse:
    path = _template_path(name)

    if not path.exists():
        raise HTTPException(status_code=404, detail="Template not found")

    try:
        with path.open("r", encoding="utf-8") as file:
            content = json.load(file)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Template contains invalid JSON: {exc.msg}",
        ) from exc

    if not isinstance(content, dict):
        raise HTTPException(status_code=422, detail="Template JSON must be an object")

    return TemplateResponse(name=path.name, content=content)


@router.put("/{name}", response_model=TemplateResponse, summary="Save a template JSON file")
def save_template(name: str, payload: TemplateSaveRequest) -> TemplateResponse:
    path = _template_path(name)
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("w", encoding="utf-8") as file:
        json.dump(payload.content, file, indent=2, ensure_ascii=False)
        file.write("\n")

    return TemplateResponse(name=path.name, content=payload.content)
