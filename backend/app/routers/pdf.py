"""
routers/pdf.py — VIEW layer: HTTP endpoint for file upload.

Thin by design: delegates to PDFService, returns response model.
Accepts PDF, JPG, JPEG, PNG files (up to 200 MB).
"""

from fastapi import APIRouter, Depends, File, UploadFile, status

from app.models.pdf import FileUploadResponse
from app.services.pdf_service import PDFService

router = APIRouter(prefix="/upload", tags=["Files"])


@router.post(
    "",
    response_model=FileUploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload a visual field report file",
)
async def upload_file(
    file: UploadFile = File(..., description="HVF/VRVF report — PDF, JPG, JPEG, or PNG (max 200 MB)"),
    service: PDFService = Depends(PDFService),
) -> FileUploadResponse:
    """
    Accept a file upload, validate type and size, store it, and return a job_id
    that the client uses to poll for extraction results.
    """
    return await service.handle_upload(file)
