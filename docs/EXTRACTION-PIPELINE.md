# Extraction Pipeline

## Overview

The application extracts structured clinical data from two types of ophthalmic visual field test reports:

- **HVF** (Humphrey Visual Field): PDF reports with embedded text, parsed without OCR
- **VRVF** (Virtual Reality Visual Field): PDF reports with image-based content, parsed using PaddleOCR

Both pipelines share the same upload/response interface but diverge entirely in how they parse the PDF.

---

## Architecture

```
[Browser]
   ├── POST /api/upload        → PDFService
   └── POST /api/extract       → ExtractionService
                                     ├── HVF → pipeline.extract_pdf()
                                     └── VRVF → pipeline.extract_ocr()
```

**Key backend files:**

| File | Role |
|---|---|
| `backend/app/routers/pdf.py` | Upload endpoint |
| `backend/app/routers/extraction.py` | Extraction endpoints |
| `backend/app/services/pdf_service.py` | Upload validation and storage |
| `backend/app/services/extraction_service.py` | Pipeline routing and job management |
| `backend/app/services/pipeline.py` | Core extraction logic (both pipelines) |
| `backend/app/services/normalise_pdf.py` | DP-based header field alignment (HVF) |
| `backend/app/core/ocr.py` | PaddleOCR engine initialisation (VRVF) |
| `backend/data/templates/vrvf.py` | OCR crop box coordinates (VRVF) |

---

## Stage 1: File Upload

**Endpoint:** `POST /api/upload`

The client submits a file via multipart/form-data. `PDFService.handle_upload()` in `pdf_service.py`:
- Validates file extension (`.pdf`, `.jpg`, `.jpeg`, `.png`) and size (≤ 200 MB)
- Saves the file to `./uploads/{uuid4}{ext}`
- Returns a `job_id` (the UUID) to the client

---

## Stage 2: Extraction Trigger

**Endpoint:** `POST /api/extract?job_id=...&eye=LE|RE&report_type=hvf|vrvf`

`ExtractionService.extract()` in `extraction_service.py`:
- Locates the uploaded file via `glob(f"{job_id}.*")`
- Routes to `extract_pdf()` (HVF) or `extract_ocr()` (VRVF) based on `report_type`
- Handles cleanup and error wrapping

---

## Pipeline A: HVF (Text-Based)

HVF PDFs contain embedded text. No OCR is used; PyMuPDF extracts text blocks directly.

### A1: PDF Text Block Extraction

`pipeline.py` opens the PDF with `pymupdf.open()` and calls `page.get_text_blocks()` on page 0. This returns a list of positional text block tuples. Specific block indexes are hard-coded based on the known HVF PDF layout.

### A2: Header Extraction

`_extract_header()` reads from **blocks[8], [10], [11], [13]** and passes the raw text lines to `normalise_pdf_header()` in `normalise_pdf.py`.

**Dynamic Programming Alignment:** Because HVF PDFs can have optional fields (e.g. `Fovea` may be absent), the header normaliser uses a DP sequence alignment algorithm to map positional values to named fields:
- **Match score (fields with a matcher):** +6 if the value's format matches the expected type (date, fraction, percentage, etc.), −8 if it doesn't
- **Match score (fields without a matcher):** +1 if any value is present, 0 otherwise; applies to free-text fields like `Fixation Monitor` and `Fixation Target`
- **Gap penalty:** −2 per skipped label position
- **Unmatched value penalty:** −5 per value consumed without being assigned to a label
- Per-field matcher functions (`_match_date`, `_match_percent`, `_match_strategy`, etc.) define what a valid value looks like for each typed label
- Backtracking yields the highest-scoring label→value assignment

Output keys are prefixed with `header_` (e.g. `header_Date`, `header_Fixation Losses`). Fields extracted: `Fixation Monitor`, `Fixation Target`, `Fixation Losses`, `False POS Errors`, `False NEG Errors`, `Test Duration`, `Fovea`, `Stimulus`, `Background`, `Strategy`, `Pupil Diameter`, `Visual Acuity`, `Rx`, `Date`, `Time`, `Age`

### A3: Map Value Extraction

`_extract_map_values()` reads **blocks[15]–[38]** and extracts values matching the regex `[<>]?-?\d+` (supporting numeric, negative, and threshold-flagged values like `<0` or `>30`).

**Left-eye mirroring:** For `eye=LE`, each block's value list is reversed to correct for the left–right mirror orientation of LE maps.

`_assign_map_values()` then distributes the flat value list across three sections of 54 points each:

| Section | Output key prefix |
|---|---|
| Threshold Map | `threshold_map_` |
| Total Deviation | `total_deviation_` |
| Pattern Deviation | `pattern_deviation_` |

Point labels use a quadrant+index convention: `S`=Superior, `I`=Inferior, `T`=Temporal, `N`=Nasal (e.g. `ST6` = Superior-Temporal point 6). There are 54 labels covering `ST1–ST13`, `SN1–SN14`, `IT1–IT13`, `IN1–IN14`.

### A4: GHT/VFI Extraction

`_extract_ght_vfi()` reads **blocks[40]–[41]**, skipping any value ending in `:` (label tokens). Maps to:
- `ght_vfi_GHT`
- `ght_vfi_VFI24-2`
- `ght_vfi_MD24-2`
- `ght_vfi_PSD24-2`

---

## Pipeline B: VRVF (OCR-Based)

VRVF PDFs contain image-based content. The page is rasterised and individual fields are extracted by cropping and running PaddleOCR on each region.

### B1: PDF Rasterisation

The PDF page is rendered at **300 DPI** using PyMuPDF's `get_pixmap(dpi=300)`. The resulting pixmap (1-, 3-, or 4-channel) is converted to a BGR numpy array via OpenCV `cv2.cvtColor`.

### B2: OCR Engine Initialisation

At application startup (the `lifespan` function in `main.py`), `ocr.py` initialises PaddleOCR using locally bundled models:

| Model | Path |
|---|---|
| Text Detection | `data/models/det/` |
| Text Recognition | `data/models/rec/` |

Both model directories must contain `inference.yml`. Two workarounds are applied at startup to address PaddlePaddle 3.x CPU inference bugs:
- Environment variables: `FLAGS_use_mkldnn=0`, `FLAGS_enable_pir_api=0`
- Monkey-patch: `paddle.inference.create_predictor` calls `config.disable_mkldnn()` before creating the predictor

This design supports **air-gapped deployment**: no internet access is required at runtime.

### B3: Crop-Based OCR

For each field, a pixel-coordinate bounding box is defined in `vrvf.py` (calibrated for 300 DPI renders). `_ocr_texts()` crops the numpy array to the box and calls `ocr_engine.predict(crop)`.

Both PaddleOCR v2 (nested list of tuples) and v3 (dict with `rec_texts`) result formats are handled.

Sections and their normalisation path:

| Section | Normaliser | Fields |
|---|---|---|
| `header` | `_normalise_ocr_text_value` | Patient/test metadata |
| `test_details` | `_normalise_ocr_text_value` | 12 test parameter fields |
| `vfi` | `_normalise_ocr_text_value` | VFI, MD, PSD |
| `threshold_map` | `_normalise_ocr_map_value` | 54 numeric point values |
| `total_deviation` | `_normalise_ocr_map_value` | 54 numeric point values |
| `pattern_deviation` | `_normalise_ocr_map_value` | 54 numeric point values |

Map sections use separate `_LE` and `_RE` crop box sets. Text sections use the same coordinates for both eyes.

### B4: OCR Post-Processing

**Text fields** (`_normalise_ocr_text_value`):
- Joins multi-line OCR output
- Strips the field's label prefix if OCR includes it (e.g. `"VFI: 92%"` → `"92%"`)
- Handles common OCR misreads of label prefixes via aliases: when the field is `VFI`, also tries to strip `"FI:"` as a prefix; similarly `"ID:"` for `MD` and `"SD:"` for `PSD`

**Map fields** (`_normalise_ocr_map_value`):
- Unifies Unicode dashes (en-dash, em-dash → hyphen)
- Corrects OCR digit misread: pattern `4 {number}` → `<{number}` (e.g. `"4 16"` → `"<16"`, where `4` is misread for the `<` sign)
- Strips remaining non-numeric characters
- Extracts first token matching `[<>]?-?\d+`

---

## Stage 3: Cleanup and Response

After extraction (both pipelines):
1. `gc.collect()` is called (required on Windows to release PyMuPDF's C-level file handles before deletion)
2. The uploaded file is deleted via `file_path.unlink(missing_ok=True)`; if an `OSError` occurs (Windows file-handle race), it retries once after 200 ms
3. `ExtractionResult(job_id, filename, eye, status="complete", raw_data={field: value, ...})` is returned

---

## Stage 4: Frontend: Review and Download

The `ResultExtractionPage` renders the `raw_data` map as an editable table. Users can correct any misread values before downloading.

`DownloadDataButton.buildCsv()` generates a CSV with columns: `EYE`, `FILE`, followed by all extracted field names. The file is named `DDMMYY-extraction-results.csv` and delivered as a browser download.

---

## Data Flow Summary

```
Browser
  │  file + eye + reportType
  ▼
POST /api/upload
  save to ./uploads/{uuid}.pdf → job_id
  │
  ▼
POST /api/extract?job_id&eye&report_type
  │
  ├─[HVF]──────────────────────────────────────────────┐
  │  pymupdf.open() → get_text_blocks()                 │
  │  blocks[8,10,11,13]  → DP alignment  → header       │
  │  blocks[15–38]       → regex extract → maps (3×54)  │
  │  blocks[40–41]       → strip labels  → GHT/VFI      │
  │                                                     │
  └─[VRVF]─────────────────────────────────────────────┤
     pymupdf → 300 DPI pixmap → BGR numpy               │
     per-field crop box → PaddleOCR → normalise          │
     text sections + map sections (3×54)                 │
                                                        │
  file deleted ◄───────────────────────────────────────-┘
  │
  ▼
ExtractionResult { status, raw_data: {field: value} }
  │
  ▼
Browser: editable table → CSV download
```

---

## Configuration Reference

| Config key | Default | Description |
|---|---|---|
| `upload_dir` | `./uploads` | Temporary PDF storage |
| `max_upload_size` | 200 MB | Maximum upload size |
| `log_dir` | `./data/logs` | Rotating log files |
| `cors_origins` | dev server origins | Allowed frontend origins |

Template files in `backend/data/templates/` define which fields are extracted and their crop coordinates. These are editable via `GET/PUT /api/templates/{name}` from the Settings UI without requiring a code change.
