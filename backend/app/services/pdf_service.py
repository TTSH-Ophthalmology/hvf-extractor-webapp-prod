"""
services/pdf_service.py — CONTROLLER layer: file upload business logic.

Responsibilities:
  - Validate file type (PDF, JPG, JPEG, PNG) and size (≤ 200 MB)
  - Save file to UPLOAD_DIR with a unique job_id filename
  - Create an initial ExtractionResult record (status=pending)
  - Trigger (or enqueue) extraction

This service knows nothing about HTTP. It receives a FastAPI UploadFile
only because that is the framework's abstraction for binary streams.
"""

import logging
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.config import settings
from app.models.pdf import FileUploadResponse

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}


class PDFService:
    async def handle_upload(self, file: UploadFile) -> FileUploadResponse:
        """
        Validate, store, and initiate processing of an uploaded file.

        Args:
            file: The uploaded file from the multipart request.

        Returns:
            FileUploadResponse containing the assigned job_id.

        Raises:
            HTTPException 400: If file type is not allowed.
            HTTPException 413: If file exceeds the size limit.
        """
        filename = file.filename or "unknown"
        file_ext = Path(filename).suffix.lower()

        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type '{file_ext}' not allowed. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
            )

        contents = await file.read()

        if len(contents) > settings.max_upload_size:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size is {settings.max_upload_size // (1024 * 1024)} MB.",
            )

        # Ensure upload directory exists
        upload_dir = settings.resolved_upload_dir
        upload_dir.mkdir(parents=True, exist_ok=True)

        job_id = str(uuid.uuid4())
        dest_path = upload_dir / f"{job_id}{file_ext}"

        with open(dest_path, "wb") as f:
            f.write(contents)

        logger.info("File uploaded: %s → %s", filename, dest_path)

        # TODO: create initial ExtractionResult(status="pending") in storage
        # TODO: trigger ExtractionService.extract_from_pdf() as background task

        return FileUploadResponse(
            status="success",
            job_id=job_id,
            filename=filename,
            size=len(contents),
            message="Upload received. Extraction pending.",
        )
