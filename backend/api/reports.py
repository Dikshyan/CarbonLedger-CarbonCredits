import os
import pdfkit
from django.template.loader import render_to_string
from django.http import HttpResponse

PDFKIT_CONFIG = pdfkit.configuration(
    wkhtmltopdf=r'C:\Users\LENOVO\Downloads\wkhtmltox\bin\wkhtmltopdf.exe'
)

def render_pdf(template_name, context, filename):
    html = render_to_string(template_name, context)
    options = {"encoding": "UTF-8", "quiet": ""}
    if PDFKIT_CONFIG:
        pdf_bytes = pdfkit.from_string(html, False, options=options, configuration=PDFKIT_CONFIG)
    else:
        pdf_bytes = pdfkit.from_string(html, False, options=options)
    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response