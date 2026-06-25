"""
test_pdf_router.py — Integration tests for POST /api/upload.

Uses httpx.AsyncClient with the FastAPI ASGI app (no real HTTP server needed).
"""

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.mark.asyncio
async def test_upload_returns_202_with_job_id(tmp_path):
    """A valid PDF upload should return HTTP 202 and a job_id."""
    fake_pdf = tmp_path / "sample.pdf"
    fake_pdf.write_bytes(b"%PDF-1.4 fake content")

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        with open(fake_pdf, "rb") as f:
            response = await client.post(
                "/api/upload",
                files={"file": ("sample.pdf", f, "application/pdf")},
            )

    assert response.status_code == 202
    body = response.json()
    assert "job_id" in body
    assert body["filename"] == "sample.pdf"


@pytest.mark.asyncio
async def test_upload_rejects_non_pdf(tmp_path):
    """A file with a disallowed extension should return HTTP 400."""
    fake_txt = tmp_path / "report.txt"
    fake_txt.write_bytes(b"not a pdf")

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        with open(fake_txt, "rb") as f:
            response = await client.post(
                "/api/upload",
                files={"file": ("report.txt", f, "text/plain")},
            )

    assert response.status_code == 400


# TODO: test_upload_rejects_file_over_200mb — expect HTTP 413
