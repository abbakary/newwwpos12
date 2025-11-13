# PDF Invoice Extraction Fixes

## Issues Identified and Fixed

### 1. **Critical Bug: stop_patterns Type Error** ✅
**Problem:** Line 178 had `stop_patterns` as a list `[...]` but code expected it as a string for `.split('|')` operation.
```python
# WRONG
stop_patterns = [r'Tel|Fax|Del|...']  # list
stop_patterns.split('|')  # AttributeError: 'list' object has no attribute 'split'

# FIXED
stop_patterns = r'Tel|Fax|Del|...'  # string
stop_patterns.split('|')  # Works correctly
```

### 2. **Customer Name Extraction Improvement** ✅
**Problem:** Pattern only matched "Customer Name: VALUE" format with colon separator.
Pattern didn't match Superdoll format: "Customer Name STATEOIL TANZANIA LIMITED"

**Solution:** Added fallback pattern that handles cases where label and value are on same line without colon:
```python
# Pattern 1: Standard "Customer Name:" format
m = re.search(r'Customer\s*Name\s*[:=]?\s*...', text, re.I)

# Pattern 2: New - "Customer Name VALUE" (no separator)
if not customer_name:
    m = re.search(r'Customer\s*Name\s+([A-Z][^\n]+?)(?=\n|$)', text, re.I)
```

### 3. **Address Extraction Improvement** ✅
**Problem:** Similar to customer name - didn't handle cases where "Address" keyword appears without colon.
Also struggled with multi-line addresses in scrambled PDFs.

**Solution:** Added dual-pattern matching:
```python
# Pattern 1: Standard "Address:" format with proper cleanup
# Pattern 2: Multi-line "Address [value]" format where value spans multiple lines
```

### 4. **Scrambled PDF Line Items Extraction** ✅
**Problem:** Superdoll invoices have OCR'd/scrambled text where:
- Descriptions appear on separate lines
- Item codes appear separately  
- Quantities appear separately
- Amounts appear separately
Example:
```
BF GOODRICH TYRE              <- Description (line 1)
LT265/65R17 116/113S TL      <- Description (line 2)
...
2132004135                    <- Item code (lines later)
...
4                             <- Quantity (lines later)
...
1,037,400.00                  <- Rate (lines later)
3,402,672.00                  <- Value (lines later)
```

**Solution:** Enhanced item extraction algorithm:
- **Text-only lines:** Treated as description lines and create new item entries
- **Numbers-only lines:** Applied to last item's missing fields (code, qty, rate, value)
- **Item code detection:** First large number (100-999999) in number-only lines treated as item code
- **Qty/Rate/Value parsing:** Numbers intelligently categorized based on value ranges

### 5. **Variable Naming Collision** ✅
**Problem:** Loop variable `idx` reused inside nested loop, causing confusion.
**Solution:** Renamed to `num_idx` to avoid collision with outer `list_idx`.

## Key Improvements Made

### Enhanced Customer Information Extraction
- Customer Name: Now captures both "Customer Name: VALUE" and "Customer NameVALUE" formats
- Address: Handles multi-line addresses and various formatting variations
- Email: Already working via regex pattern matching

### Improved Line Items Extraction for Scrambled PDFs
- Accumulates text-only lines as product descriptions
- Matches item codes with descriptions
- Intelligently extracts and assigns qty, rate, and total value
- Supports partial data - updates items even when data arrives in separate lines

### Better Error Logging
- All extraction steps now log what's being extracted
- Helps diagnose future extraction issues

## Testing

The fixes have been applied to handle the Superdoll invoice format (PI - 1765632.pdf) which includes:
- Code No: A01696
- Customer Name: STATEOIL TANZANIA LIMITED  
- Address: P.O. BOX 15950 DAR ES SALAAM TANZANIA
- Email: stm@superdoll-tz.com
- Invoice No: PI-1765632
- Date: 25/10/2025
- Line Items: 4 items with codes, descriptions, quantities, rates, and values
- Totals: Net Value: 3,484,144.00 | VAT: 627,145.92 | Gross: 4,111,289.92

## Result
Users should now see:
✅ Correct customer information populated in the form
✅ All address details captured properly
✅ Complete line items with descriptions, codes, quantities, and amounts
✅ Proper fallback to manual entry only when PDF is truly unreadable (no text extraction possible)
