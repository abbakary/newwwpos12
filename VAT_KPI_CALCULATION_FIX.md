# VAT and Revenue KPI Calculation Fix

## Problem
When uploading and extracting an invoice with payment summary data (Net Value, VAT, Gross Value), the extracted values were correctly displayed in the preview, but the dashboard KPIs were not being updated:
- **Revenue This Month (Net)**: Still showed 0.00
- **VAT This Month**: Still showed 0.00

The extracted values (Net: 27,542.37, VAT: 4,957.63, Gross: 32,500) were visible in the extraction preview but not reflected in the dashboard metrics.

## Root Cause
The issue was in the manual invoice creation flow (`tracker/views_start_order.py`, lines 346-397):

1. **Invoice is created with correct extracted values** (lines 370-372):
   ```python
   inv.subtotal = Decimal(str(subtotal or '0').replace(',', ''))
   inv.tax_amount = Decimal(str(tax_amount or '0').replace(',', ''))
   inv.total_amount = Decimal(str(total_amount or '0').replace(',', ''))
   ```

2. **Line items are created** (lines 382-392):
   - User-added line items from the manual entry form

3. **PROBLEM: `calculate_totals()` is called** (lines 396-397):
   - This method recalculates totals from line items using the formula:
     - `subtotal = sum of line_total values`
     - `tax_amount = sum of per-item taxes + (subtotal × tax_rate%)`
     - `total_amount = subtotal + tax_amount`
   - If line items don't match the extracted totals, or if there are no line items with pricing, the totals get overwritten with incorrect values (often zeros)

4. **Dashboard KPI calculation fails**:
   - Dashboard query (in `tracker/views.py`, lines 361-365) aggregates:
     ```python
     inv_month_sums = invoices_qs.filter(invoice_date__gte=month_start).aggregate(
         month_net=Sum('subtotal'),
         month_vat=Sum('tax_amount'),
         month_gross=Sum('total_amount')
     )
     ```
   - Since the invoice totals were zeroed out, KPIs show 0.00

## Solution
**Preserve the extracted values after `calculate_totals()`** - This is the same pattern used in `tracker/views_invoice.py` (lines 492-496) and `tracker/views_invoice_upload.py` (lines 424-428).

### File Changed
**`tracker/views_start_order.py`** - In the `started_order_detail` view, manual invoice creation flow (around line 396)

### Change Details
Added code after `calculate_totals()` call to preserve extracted values:

```python
# IMPORTANT: Preserve extracted Net, VAT, and Gross values from the form submission
# This ensures extracted invoice data is preserved for dashboard KPI calculations
extracted_subtotal = Decimal(str(subtotal or '0').replace(',', ''))
extracted_tax = Decimal(str(tax_amount or '0').replace(',', ''))
extracted_total = Decimal(str(total_amount or '0').replace(',', ''))

# Only override if extracted values are provided (non-zero)
if extracted_subtotal > 0 or extracted_tax > 0 or extracted_total > 0:
    inv.subtotal = extracted_subtotal
    inv.tax_amount = extracted_tax
    inv.total_amount = extracted_total or (extracted_subtotal + extracted_tax)
    inv.save(update_fields=['subtotal', 'tax_amount', 'total_amount'])
```

### How It Works
1. Extract the original invoice amounts from the form submission
2. After `calculate_totals()` processes line items, restore the extracted amounts
3. Use `update_fields=['subtotal', 'tax_amount', 'total_amount']` to update only these fields, preserving other data
4. This ensures the dashboard query gets the correct extracted values

## Data Flow After Fix
```
User uploads invoice PDF
    ↓
Extraction preview shows: Net 27,542.37, VAT 4,957.63, Gross 32,500
    ↓
User switches to "Enter Manually" tab
    ↓
Form is populated with extracted values
    ↓
User submits form (extracted values sent as POST data)
    ↓
Invoice created with extracted values
    ↓
Line items created
    ↓
calculate_totals() updates based on line items
    ↓
PRESERVED: Extracted values are restored (now in database)
    ↓
Dashboard query (next refresh):
    - Aggregates all invoices from this month
    - Sums subtotal (Net) = 27,542.37
    - Sums tax_amount (VAT) = 4,957.63
    - Sums total_amount (Gross) = 32,500
    ↓
KPIs update correctly:
✓ Revenue This Month (Net) = 27,542.37
✓ VAT This Month = 4,957.63
```

## Related Code Consistency
This fix aligns with existing patterns in:

1. **`tracker/views_invoice.py`** (lines 492-496):
   - After creating line items, preserves extracted values
   - Same approach: `inv.save(update_fields=['subtotal', 'tax_amount', 'total_amount'])`

2. **`tracker/views_invoice_upload.py`** (lines 424-428):
   - Two-step invoice upload flow
   - Explicitly preserves extracted Net/VAT/Gross values

## Testing
To verify the fix works:

1. **Create a started order** (or use existing one)
2. **Upload an invoice PDF** with clear payment summary:
   - Subtotal/Net: any value
   - Tax/VAT: any value
   - Total/Gross: subtotal + tax
3. **Extract and submit**:
   - Verify the extracted values are shown in preview ✓
   - Switch to "Enter Manually" and submit ✓
4. **Check dashboard**:
   - Navigate to Dashboard
   - Verify "Revenue This Month (Net)" shows the extracted net value ✓
   - Verify "VAT This Month" shows the extracted tax value ✓

## Impact
- **Fixes**: Dashboard KPIs now correctly reflect extracted invoice values
- **Scope**: Manual invoice creation from started orders (the primary flow shown in the screenshot)
- **Backward Compatible**: Only affects invoices with explicitly provided extracted values
- **Performance**: No negative impact - uses efficient `update_fields` parameter to update only necessary columns

## Notes
- The invoice_date is automatically set to the extracted date or current date (line 358-360)
- The fix respects the month filtering in the dashboard query (invoices from current month only)
- Values with commas are properly handled with `.replace(',', '')` before conversion to Decimal
