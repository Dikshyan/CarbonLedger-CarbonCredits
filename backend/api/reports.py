"""
PDF report generation for CarbonLedger.

Strategy (tried in order):
  1. WeasyPrint — requires GTK3 system libraries (available on Linux / CI)
  2. pdfkit / wkhtmltopdf — requires wkhtmltopdf binary in PATH
  3. Premium print-ready HTML — the browser can File → Print → Save as PDF

All three outputs use the same professional HTML template.
"""
import logging
import os
import shutil
from io import BytesIO
from django.template.loader import render_to_string
from django.http import HttpResponse

logger = logging.getLogger(__name__)


# ─── WeasyPrint ────────────────────────────────────────────────────────────────
WEASYPRINT_AVAILABLE = False
try:
    from weasyprint import HTML as WeasyHTML
    # Probe to confirm GTK libs are loaded
    WeasyHTML(string="<html><body>probe</body></html>").write_pdf()
    WEASYPRINT_AVAILABLE = True
    logger.info("[reports] WeasyPrint PDF generation available.")
except Exception as _e:
    logger.warning("[reports] WeasyPrint unavailable: %s", _e)


# ─── pdfkit / wkhtmltopdf ──────────────────────────────────────────────────────
PDFKIT_AVAILABLE = False
PDFKIT_CONFIG = None
try:
    import pdfkit
    wk_path = os.getenv("WKHTMLTOPDF_PATH") or shutil.which("wkhtmltopdf")
    if wk_path and os.path.exists(wk_path):
        PDFKIT_CONFIG = pdfkit.configuration(wkhtmltopdf=wk_path)
        PDFKIT_AVAILABLE = True
        logger.info("[reports] pdfkit/wkhtmltopdf PDF generation available at %s.", wk_path)
    else:
        logger.warning("[reports] wkhtmltopdf binary not found — pdfkit unavailable.")
except Exception as _e:
    logger.warning("[reports] pdfkit unavailable: %s", _e)


def render_pdf(template_name: str, context: dict, filename: str) -> HttpResponse:
    """
    Render *template_name* + *context* as a downloadable PDF (or premium
    print-ready HTML when a PDF renderer is not available).
    """
    html_string = render_to_string(template_name, context)

    # ── 1. WeasyPrint ──────────────────────────────────────────────────────────
    if WEASYPRINT_AVAILABLE:
        try:
            buf = BytesIO()
            WeasyHTML(string=html_string).write_pdf(buf)
            response = HttpResponse(buf.getvalue(), content_type="application/pdf")
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
            return response
        except Exception as exc:
            logger.error("[reports] WeasyPrint rendering failed: %s", exc)

    # ── 2. pdfkit / wkhtmltopdf ───────────────────────────────────────────────
    if PDFKIT_AVAILABLE:
        try:
            pdf_bytes = pdfkit.from_string(
                html_string, False,
                options={"encoding": "UTF-8", "quiet": ""},
                configuration=PDFKIT_CONFIG,
            )
            response = HttpResponse(pdf_bytes, content_type="application/pdf")
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
            return response
        except Exception as exc:
            logger.error("[reports] pdfkit rendering failed: %s", exc)

    # ── 3. Premium print-ready HTML fallback ──────────────────────────────────
    # Wrap with a print instruction banner so the user knows to Ctrl+P → Save as PDF
    print_banner = """
    <div style="
        position:fixed; top:0; left:0; right:0; z-index:9999;
        background:#0c4a6e; color:white; text-align:center;
        padding:10px; font-family:Arial,sans-serif; font-size:13px;
        display:flex; align-items:center; justify-content:center; gap:12px;
    ">
        <span>📄 PDF renderer not available on this server.</span>
        <button onclick="window.print()" style="
            background:#34d399; border:none; color:#064e3b;
            padding:6px 16px; border-radius:6px; font-weight:700;
            cursor:pointer; font-size:13px;
        ">🖨️ Print / Save as PDF</button>
        <style>@media print { div[style*='position:fixed'] { display:none !important; } }</style>
    </div>
    <div style="height:48px;"></div>
    """
    full_html = html_string.replace("<body>", f"<body>{print_banner}", 1)

    response = HttpResponse(full_html, content_type="text/html; charset=utf-8")
    response["X-Report-Status"] = "rendered-html-fallback"
    return response