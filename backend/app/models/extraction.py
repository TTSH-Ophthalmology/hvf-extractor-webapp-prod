"""
models/extraction.py — Pydantic schemas for HVF extraction data.

MODEL layer: pure data shapes, no logic.
Mirror these types in frontend/src/models/extraction.ts.
"""

from pydantic import BaseModel, Field


class ExtractionResult(BaseModel):
    """Full extraction result for one HVF PDF report."""

    job_id: str
    filename: str
    eye: str | None = Field(None, description="'LE' or 'RE'")
    status: str = Field(..., description="pending | processing | complete | error")
    raw_data: dict[str, str] = Field(
        default_factory=dict,
        description="Flat key-value pairs extracted from the PDF (field_name -> value)",
    )
    error_message: str | None = None
