"""
routers/extraction.py — VIEW layer: HTTP endpoints for HVF extraction.

Thin by design: delegates all logic to ExtractionService.
"""

from typing import Literal

from fastapi import APIRouter, Depends, Query

from app.models.extraction import ExtractionResult
from app.services.extraction_service import ExtractionService

router = APIRouter(prefix="/extract", tags=["Extraction"])


@router.post(
    "",
    response_model=ExtractionResult,
    summary="Run HVF extraction on an uploaded file",
)
async def extract_data(
    job_id: str = Query(..., description="Job ID returned by the upload endpoint"),
    eye: Literal["LE", "RE"] = Query(..., description="Which eye this report belongs to"),
    report_type: str = Query("hvf", description="Report type: 'hvf' (only HVF supported currently)"),
    service: ExtractionService = Depends(ExtractionService),
) -> ExtractionResult:
    """
    Run HVF data extraction on a previously uploaded PDF.
    Returns status=complete synchronously — no polling required.
    """
    return await service.extract(job_id, eye, report_type)


@router.get(
    "/{job_id}",
    response_model=ExtractionResult,
    summary="Poll extraction status by job ID (future use)",
)
async def get_extraction(
    job_id: str,
    service: ExtractionService = Depends(ExtractionService),
) -> ExtractionResult:
    """Retrieve a previously completed extraction result."""
    return await service.get_result(job_id)
