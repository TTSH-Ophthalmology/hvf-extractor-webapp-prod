"""
test_extraction_service.py — Unit tests for ExtractionService.

Tests exercise the service directly, without going through HTTP.
"""

import pytest

from app.services.extraction_service import ExtractionService


@pytest.mark.asyncio
async def test_get_result_returns_pending_for_unknown_job():
    """get_result should return a pending ExtractionResult for any job_id (stub)."""
    service = ExtractionService()
    result = await service.get_result("fake-job-id")

    assert result.job_id == "fake-job-id"
    assert result.status == "pending"


@pytest.mark.asyncio
async def test_extract_returns_complete_status(tmp_path):
    """extract_from_pdf should return status=complete with fields (stub)."""
    fake_pdf = tmp_path / "test.pdf"
    fake_pdf.write_bytes(b"%PDF-1.4 fake")

    # Patch the upload dir so the service can find the file
    import app.services.extraction_service as svc_module
    original = svc_module.settings.upload_dir
    svc_module.settings.upload_dir = str(tmp_path)

    service = ExtractionService()
    result = await service.extract_from_pdf("test.pdf", "hvf")

    svc_module.settings.upload_dir = original

    assert result.status == "complete"
    assert len(result.fields) > 0


# TODO: test that MD field is correctly parsed from a real HVF PDF fixture
# TODO: test that PSD field is correctly parsed
# TODO: test error handling when PDF is malformed
# TODO: test that report_type="vrvf" routes to VRVF parser
