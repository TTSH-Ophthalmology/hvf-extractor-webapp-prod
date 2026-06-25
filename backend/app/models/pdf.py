"""
models/pdf.py — Pydantic schemas for file upload.

MODEL layer: pure data shapes, no logic.
Supports PDF, JPG, JPEG, PNG (the formats accepted by the existing app).
"""

from pydantic import BaseModel


class FileUploadResponse(BaseModel):
    """Returned immediately after a file is accepted."""

    status: str
    job_id: str
    filename: str
    size: int
    message: str


# Keep backwards-compatible alias
PDFUploadResponse = FileUploadResponse
