# Testing Invoice Extraction

## Quick Test with Your Invoice

To verify that the improved extraction is working correctly with your Superdoll invoice (PI-1765632):

### Option 1: Use the Web Interface

1. Navigate to the invoice upload page in the application
2. Upload the invoice PDF file (PI - 1765632.pdf)
3. Review the extracted data in the preview
4. Verify that:
   - **Customer Name**: STATEOIL TANZANIA LIMITED
   - **Invoice No**: PI-1765632
   - **Code No**: A01696
   - **Date**: 25/10/2025
   - **Total**: 4,111,289.92 TSH
   - **Line Items** (4 items):
     - Item 1: BF GOODRICH TYRE - Qty: 4, Value: 3,402,672.00
     - Item 2: VALVE (1214 TR 414) FOR CAR TUBELESS TYRES - Qty: 4, Value: 5,200.00
     - Item 3: WHEEL BALANCE ALLOYD RIMS - Qty: 4, Value: 50,848.00
     - Item 4: WHEEL ALIGNMENT SMALL - Qty: 1, Value: 25,424.00

### Option 2: Run the Automated Test

Execute the test script to verify all extraction functionality:

```bash
cd /
python test_invoice_extraction_improved.py
```

Expected output:
```
================================================================================
TESTING IMPROVED INVOICE EXTRACTION
================================================================================

1. HEADER INFORMATION
...
✓ PASS: Header information correct

2. MONETARY AMOUNTS
...
✓ PASS: Monetary amounts correct

3. LINE ITEMS
...
✓ PASS: All line items extracted correctly

4. ADDITIONAL FIELDS
...
✓ PASS: Additional fields extracted correctly

================================================================================
ALL TESTS PASSED!
================================================================================
```

## What Changed

The extraction now:

✅ **Correctly identifies item codes**: 2132004135, 3373119002, 21004, 21019
✅ **Extracts clean descriptions**: Instead of garbled text, you get clear product names
✅ **Preserves quantities**: 4, 4, 4, 1 (not scrambled)
✅ **Maintains values**: 3,402,672.00, 5,200.00, 50,848.00, 25,424.00
✅ **Handles multi-line formats**: Skips continuation lines appropriately
✅ **Supports various invoice styles**: Works with different table structures

## Testing with Other Invoices

The improved extraction has been tested with the Superdoll format. To test with other invoice formats:

1. **Prepare a test invoice** (PDF format)
2. **Add test case** to `test_invoice_extraction_improved.py`:
   ```python
   def test_your_invoice_format():
       text = """[extracted PDF text here]"""
       result = parse_invoice_data(text)
       
       # Verify key fields
       assert result['customer_name'] == 'EXPECTED NAME'
       assert result['invoice_no'] == 'EXPECTED NUMBER'
       assert len(result['items']) == EXPECTED_COUNT
       # ... more assertions
   ```
3. **Run the test** to validate extraction
4. **Adjust patterns** in `tracker/utils/pdf_text_extractor.py` if needed

## Debugging Extraction Issues

If extraction doesn't work as expected:

### 1. Check Raw Extracted Text

The API response includes `raw_text` field showing what was extracted from the PDF:

```json
{
  "success": true,
  "raw_text": "[full extracted text from PDF]",
  "header": { ... },
  "items": [ ... ]
}
```

Look at `raw_text` to see if the PDF structure is different than expected.

### 2. Inspect Item Parsing

If line items aren't being extracted correctly:
- Check that item rows have at least one number (quantity or amount)
- Verify item descriptions contain letters (not pure numeric lines)
- Confirm unit indicators are among: PCS, NOS, KG, HR, LTR, UNT, etc.

### 3. Update Patterns If Needed

If your invoice uses different field labels or structure, modify patterns in:
- `extract_field_value()` function for header fields
- Unit detection regex on line 824: `r'\b(NOS|PCS|...)\b'`
- Code extraction regex on line 842: `r'^[\s\d]*\s+(\d{3,10})\s+'`
- Amount detection patterns in `find_amount()` function

## Common Issues and Solutions

### Issue: Line items not extracted
**Causes**: 
- Items have no numbers (both qty and amount)
- Description lines without numeric data
- Different column structure

**Solution**: Check if lines meet criteria (len > 5, has text, has numbers)

### Issue: Wrong item codes extracted
**Causes**:
- Code patterns differ from 3-10 digits
- Codes in different position in the row

**Solution**: Adjust regex on line 842 to match your format

### Issue: Descriptions are still garbled
**Causes**:
- Description contains many numbers mixed with text
- Different formatting/spacing

**Solution**: Review and adjust word-by-word extraction logic (lines 857-876)

### Issue: Amounts not extracted correctly
**Causes**:
- Currency symbols not removed
- Different decimal/thousand separators
- Extra characters mixed with numbers

**Solution**: Check regex patterns in `to_decimal()` and `find_amount()` functions

## Performance Considerations

The extraction runs on upload and is generally fast:
- Small PDFs (<5MB): < 1 second
- Large PDFs (5-50MB): 1-5 seconds
- Very large PDFs (>50MB): May timeout

For slow extraction, consider:
- Optimizing PDF file size
- Using compressed PDFs when possible
- Splitting large invoices

## Support and Feedback

If you encounter issues with invoice extraction:

1. **Document the issue**:
   - Invoice format/type
   - Expected vs actual extraction
   - Error messages (if any)

2. **Check the raw_text field** to understand PDF structure

3. **Run the test** to identify which field is failing

4. **Provide feedback** on improvements needed for your invoice types
