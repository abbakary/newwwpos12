"""
Invoice extraction support has been removed per user request.
This module now provides a disabled stub for process_uploaded_invoice_file
so that existing imports do not fail. All OCR/processing logic was removed.
"""

import logging

logger = logging.getLogger(__name__)


def process_uploaded_invoice_file(uploaded_file) -> dict:
    """
    Extraction feature has been disabled. This stub returns a structured
    failure response so callers can handle the absence of OCR functionality.
    """
    logger.warning("Invoice extraction has been disabled by configuration. Received file: %s", getattr(uploaded_file, 'name', '<unknown>'))
    return {
        'success': False,
        'error': 'Invoice extraction feature is disabled',
        'data': {}
    }
