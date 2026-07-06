"""
services/extraction_service.py — CONTROLLER layer: HVF extraction business logic.

Responsibilities:
  - Locate the uploaded file on disk using the job_id
  - Call the selected extraction pipeline
  - Return an ExtractionResult with the flat key-value dict from the pipeline

Supported report types: hvf, vrvf
"""

import logging
from pathlib import Path

from fastapi import HTTPException

from app.config import settings
from app.models.extraction import ExtractionResult
from app.models.report_type import ReportType
from app.services.pipeline import (
    DEFAULT_TEMPLATE_PATH,
    DEFAULT_VRVF_TEMPLATE_PATH,
    HVFExtractionError,
    extract_ocr,
    extract_pdf,
)
from uuid import UUID
import os

logger = logging.getLogger(__name__)


class ExtractionService:
    async def extract(
        self,
        job_id: str,
        eye: str,
        report_type: ReportType = ReportType.HVF,
    ) -> ExtractionResult:
        """
        Run HVF extraction on a previously uploaded file.

        Args:
            job_id:      UUID assigned at upload time — used to find the file on disk.
            eye:         'LE' or 'RE'.
            report_type: 'hvf' or 'vrvf'.

        Returns:
            ExtractionResult with status='complete' and raw_data populated.

        Raises:
            HTTPException 404: File not found for the given job_id.
            HTTPException 400: PDF could not be parsed (wrong format, unsupported eye, etc.).
            HTTPException 422: Unsupported report_type.
        """
        try:
            UUID(job_id)
        except:
            raise HTTPException(
                status_code=422,
                detail="Invalid job_id."
            )
        try:
            report_type = ReportType(report_type)
        except ValueError as exc:
            raise HTTPException(
                status_code=422,
                detail="Unsupported report_type. Expected 'hvf' or 'vrvf'.",
            ) from exc

        upload_dir = Path(settings.upload_dir)
        matches = list(upload_dir.glob(f"{job_id}.*"))

        if not matches:
            logger.warning("Extraction requested for unknown job_id: %s", job_id)
            raise HTTPException(
                status_code=404,
                detail=f"No uploaded file found for job_id '{job_id}'.",
            )

        file_path = matches[0]
        logger.info("Extracting %s from %s (eye=%s)", report_type.upper(), file_path.name, eye)

        if report_type == ReportType.HVF:
            try:
                result = extract_pdf(file_path, eye, template_path=DEFAULT_TEMPLATE_PATH)
                raw_data: dict[str, str] = result[eye.upper()]
            except (ValueError, FileNotFoundError, HVFExtractionError) as exc:
                logger.error("Extraction failed for job_id=%s eye=%s: %s", job_id, eye, exc)
                raise HTTPException(status_code=400, detail=str(exc)) from exc
            except Exception as exc:
                logger.exception("Unexpected error during extraction job_id=%s", job_id)
                raise HTTPException(status_code=500, detail="Internal extraction error.") from exc

            logger.info(
                "Extraction complete: job_id=%s eye=%s fields=%d",
                job_id,
                eye,
                len(raw_data),
            )
        elif report_type == ReportType.VRVF:
            try:
                result = extract_ocr(file_path, eye, template_path=DEFAULT_VRVF_TEMPLATE_PATH)
                raw_data = result[eye.upper()]
            except (ValueError, FileNotFoundError, HVFExtractionError) as exc:
                logger.error("OCR extraction failed for job_id=%s eye=%s: %s", job_id, eye, exc)
                raise HTTPException(status_code=400, detail=str(exc)) from exc
            except Exception as exc:
                logger.exception("Unexpected OCR error during extraction job_id=%s", job_id)
                raise HTTPException(status_code=500, detail="Internal OCR extraction error.") from exc

            logger.info(
                "OCR extraction complete: job_id=%s eye=%s fields=%d",
                job_id,
                eye,
                len(raw_data),
            )

    #unlink pdf after extraction.
        try:
            file_path.unlink(missing_ok=True)
        except OSError:
            logger.warning("Failed to delete uploaded file after extraction: %s", file_path)

        return ExtractionResult(
            job_id=job_id,
            filename=file_path.name,
            eye=eye.upper(),
            status="complete",
            raw_data=raw_data,
        )

    async def get_result(self, job_id: str) -> ExtractionResult:
        """
        Retrieve a persisted extraction result by job_id.

        Note: Extraction is currently synchronous — results are returned
        directly from extract() and not persisted. This endpoint exists for
        future use when async job queuing is added.
        """
        raise HTTPException(
            status_code=404,
            detail=f"No persisted result for job_id '{job_id}'. "
                   "Results are returned synchronously by POST /api/extract.",
        )
