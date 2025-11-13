# Invoice to Started Order Linking - Complete Implementation Guide

## Problem Solved
- **Before**: Creating invoice created NEW customer + order instead of linking to existing started order
- **Result**: 2 customers, 4 orders for same vehicle
- **After**: Invoice links to existing started order, updates it with finalized customer/vehicle data

## Solution Architecture

### 1. Service Layer Changes (COMPLETED)

**File**: `tracker/services/customer_service.py`

**New Methods in OrderService class:**

```python
find_started_order_by_plate(branch, plate_number, status='created')
  → Returns single Order or None
  → Finds most recent created order for given plate
  → Used internally for single order lookups

find_all_started_orders_for_plate(branch, plate_number)
  → Returns list of Orders
  → Finds all started orders for plate (newest first)
  → Used for UI dropdown of available orders

update_order_from_invoice(order, customer, vehicle=None, description=None, **kwargs)
  → Returns updated Order
  → Atomically updates order with finalized invoice data
  → Updates: customer, vehicle, description, started_at timestamp
  → Calls CustomerService.update_customer_visit(customer)
  → CRITICAL: Prevents duplicate order creation
```

### 2. View Layer Changes (COMPLETED)

**File**: `tracker/views_invoice.py` - `invoice_create()` function

**GET Request Handler** (lines 24-47):
```python
- Added imports: CustomerService, VehicleService, OrderService
- Added plate_search from GET parameter: ?plate=T_290
- Added started_orders list from OrderService.find_all_started_orders_for_plate()
- Support loading order by order_id from URL parameter
- If order_id provided, mark as linked started order
```

**POST Request Handler** (lines 49-155):
```python
- Check for selected_order_id from form submission
- If selected: retrieve started order for linking
- Create/get customer using CustomerService.create_or_get_customer()
- Create invoice object with form data
- Link invoice to started order: invoice.order = order
- CRITICAL: Call OrderService.update_order_from_invoice() to:
  - Update order's customer (links finalized customer to order)
  - Update order's vehicle
  - Update order's description with customer details
  - Preserve order.started_at (original start time)
  - Update customer visit tracking
- Handle service selections and estimated duration
- Save invoice
```

### 3. Forms Changes (STILL TO DO)

**File**: `tracker/forms.py` - `InvoiceForm` class

**Changes needed:**
```python
# Add field for plate search
plate_number = forms.CharField(
    required=False,
    label="Vehicle Plate Number",
    widget=forms.TextInput(attrs={
        'class': 'form-control',
        'placeholder': 'Search by plate (e.g., T 290)',
        'data-role': 'plate-search'
    })
)

# Add field for selected started order
selected_order_id = forms.ModelChoiceField(
    queryset=Order.objects.none(),
    required=False,
    label="Select Started Order",
    widget=forms.Select(attrs={'class': 'form-select'})
)

# In __init__: populate selected_order_id choices based on plate search
```

### 4. Template Changes (STILL TO DO)

**File**: `tracker/templates/tracker/invoice_create.html`

**New sections needed:**
```html
<!-- 1. PLATE SEARCH INPUT -->
<div class="form-group">
  <label>Find Started Order by Vehicle Plate</label>
  <input type="text" name="plate_number" class="form-control" 
         placeholder="Enter plate (e.g., T 290)" id="plateSearch">
  <small class="form-text text-muted">
    Optional: Search for existing started orders to link this invoice
  </small>
</div>

<!-- 2. STARTED ORDERS DROPDOWN (shown if orders found) -->
<div class="form-group" id="ordersDropdownContainer" style="display:none;">
  <label>Available Started Orders</label>
  <select name="selected_order_id" class="form-select" id="startedOrdersSelect">
    <option value="">-- Create New Order --</option>
    <!-- Populated by AJAX -->
  </select>
  <div id="selectedOrderDetails" style="display:none;">
    <p>Started: <span id="orderStartTime"></span></p>
    <p>Type: <span id="orderType"></span></p>
  </div>
</div>

<!-- 3. STATUS MESSAGE -->
<div id="linkingStatus" class="alert alert-info" style="display:none;">
  Linking to started order #<span id="linkingOrderNumber"></span>
  (Started: <span id="linkingOrderTime"></span>)
</div>

<!-- 4. EXISTING CUSTOMER SELECTION (as before, but updated) -->
<div class="form-group">
  <label>Or Select Existing Customer</label>
  {{ form.existing_customer }}
</div>

<!-- 5. CUSTOMER CREATION FIELDS (as before) -->
<!-- Customer name, phone, email, address, type, etc. -->
```

### 5. API Endpoint (STILL TO DO)

**File**: `tracker/views_invoice.py`

**New endpoint needed:**
```python
@login_required
@require_http_methods(["GET"])
def api_search_started_orders(request):
    """
    Search for started orders by vehicle plate number.
    Returns JSON list of available orders for linking.
    
    GET /api/invoice/search-started-orders/?plate=T_290
    Response: {
      "success": true,
      "orders": [
        {
          "id": 123,
          "order_number": "ORD2025110616xxxx",
          "plate_number": "T 290",
          "customer": {"id": 45, "name": "John Doe"},
          "started_at": "2025-11-06T16:45:00",
          "type": "service",
          "status": "created"
        },
        ...
      ]
    }
    """
```

### 6. JavaScript/Frontend (STILL TO DO)

**Needed in template or separate JS file:**
```javascript
// On plate search input:
$('#plateSearch').on('input', function() {
  const plate = $(this).val().trim();
  if (plate.length > 2) {
    fetch(`/api/invoice/search-started-orders/?plate=${plate}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.orders.length > 0) {
          // Show dropdown with orders
          const select = $('#startedOrdersSelect');
          select.html('<option value="">-- Create New Order --</option>');
          data.orders.forEach(order => {
            const started = new Date(order.started_at);
            select.append(
              `<option value="${order.id}">
                #${order.order_number} - ${order.customer.name} 
                (Started: ${started.toLocaleString()})
              </option>`
            );
          });
          $('#ordersDropdownContainer').show();
        } else {
          $('#ordersDropdownContainer').hide();
        }
      });
  } else {
    $('#ordersDropdownContainer').hide();
  }
});

// On order selection:
$('#startedOrdersSelect').on('change', function() {
  const orderId = $(this).val();
  if (orderId) {
    // Show status message
    $('#linkingStatus').show();
    // Fetch and display order details
    // Pre-fill customer fields from order
  } else {
    $('#linkingStatus').hide();
  }
});
```

## Database Changes
**None** - All fields already exist:
- Order.status = 'created' for started orders
- Order.started_at = timestamp of when order started
- Invoice.order = ForeignKey to Order
- Customer unique constraint ensures no duplicates

## Workflow After Implementation

### User Flow:
1. User clicks "New Order" button
2. Enters vehicle plate number → Status shows "Order started at 14:30"
3. Later, user clicks "Create Invoice" 
4. Enters same plate number in search box
5. System shows dropdown: "Order #ORD2025... - Started 14:30"
6. User selects the order from dropdown
7. Customer fields pre-fill from the order
8. User can update/confirm customer details
9. Creates invoice
10. Invoice links to started order, updates its details

### Result:
- ✅ 1 Customer (no duplicates)
- ✅ 1 Order (started order)
- ✅ 1 Invoice (linked to order)
- ✅ Order.started_at = 14:30 (preserved)
- ✅ Invoice.created_at = 16:45 (invoice timestamp)
- ✅ Customer visit tracking updated

## Testing Checklist

```
[ ] Start order with plate "T 290" at time T1
[ ] Create invoice, search plate "T 290"
[ ] See dropdown with started order
[ ] Select order from dropdown
[ ] Customer fields pre-populate from order
[ ] Create invoice
[ ] Verify: Only 1 customer exists
[ ] Verify: Only 1 order exists
[ ] Verify: Order.customer updated with new details
[ ] Verify: Order.vehicle correct
[ ] Verify: Invoice.order links to this order
[ ] Verify: Order.started_at = T1 (preserved)
[ ] Verify: Invoice.created_at = T2 (current time)
[ ] Verify: Customer.total_visits incremented
[ ] Verify: Customer.last_visit updated
[ ] Verify: No "Plate T 290" temp customer created
```

## Files Modified

✅ COMPLETED:
- `tracker/services/customer_service.py` - OrderService new methods
- `tracker/views_invoice.py` - invoice_create GET/POST handlers

⏳ STILL TODO:
- `tracker/forms.py` - InvoiceForm new fields
- `tracker/templates/tracker/invoice_create.html` - New UI sections
- `tracker/urls.py` - Add API route
- Frontend JS for plate search and order selection

## Key Implementation Details

### Critical: OrderService.update_order_from_invoice()
```python
def update_order_from_invoice(order, customer, vehicle=None, description=None, **kwargs):
    # Updates order with finalized invoice data
    # Must be called AFTER invoice.save()
    # Uses transaction.atomic() for consistency
    # Preserves order.started_at timestamp
    # Updates customer visit tracking
```

### Why This Prevents Duplicates
1. Started order created at time T1 with "Plate T_290" temp customer
2. User creates invoice with real customer details
3. Instead of creating new order, we LINK invoice to started order
4. OrderService.update_order_from_invoice() updates order's customer
5. Temp customer "Plate T_290" remains but is linked to real work
6. Result: 1 order, 1 invoice, finalized customer data

### Timestamp Preservation
- Order.created_at = T1 (when order started)
- Order.started_at = T1 (preserved - when service/work started)
- Invoice.created_at = T2 (when invoice/documentation finalized)
- Tells complete story: "Work started at T1, documented at T2"
