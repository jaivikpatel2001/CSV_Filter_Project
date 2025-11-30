# CSV Transformation Quick Reference Guide

## 📋 Transformation Rules Summary

### 1. UPC Transformation
```
Rule: Remove exactly ONE leading zero if present
Examples:
  012345  →  12345   ✓
  000987  →  00987   ✓ (only first zero)
  123456  →  123456  ✓ (no change)
```

### 2. Department ID (D)
```
Rule: Preserve original value if incoming file has different value
Behavior:
  - If original exists AND differs → Use original + warning
  - If original exists AND matches → Use incoming
  - If no original data → Use incoming
```

### 3. TAX1
```
Rule: Y/y → "1", N/n → "" (empty)
Examples:
  Y  →  1       ✓
  y  →  1       ✓
  N  →  (empty) ✓
  n  →  (empty) ✓
  X  →  X       ⚠️ (preserved with warning)
```

### 4. Dates (SALE/TRP START/END)
```
Rule: Normalize to YYYY-MM-DD format
Accepted formats:
  - YYYY-MM-DD  (already correct)
  - MM/DD/YYYY  (converted)
  - DD-MM-YYYY  (converted)
  
Examples:
  2025-11-01   →  2025-11-01  ✓
  11/01/2025   →  2025-11-01  ✓
  01-11-2025   →  2025-11-01  ✓
  invalid      →  (empty)     ⚠️ (with warning)
```

### 5. SPECIAL PRICING #1 (SALE)
```
Rule: Only populate if Sale data exists, otherwise NULL

Has Sale Data (any of: SALE_RETAIL, SALE_COST, SALE_START_DATE, SALE_END_DATE):
  - If SALE_MULTIPLE ≤ 1:
    ✓ SALE_RETAIL = (keep original)
    ✓ SPECIAL PRICING #1 = "0"
    
  - If SALE_MULTIPLE > 1:
    ✓ SALE_GROUP = (original SALE_RETAIL)
    ✓ SALE_RETAIL = REG_RETAIL
    ✓ SPECIAL PRICING #1 = "2"

No Sale Data:
  ✓ SALE_RETAIL = (empty)
  ✓ SPECIAL PRICING #1 = (empty/NULL) ← NEW!
```

### 6. SPECIAL PRICING #2 (TRP)
```
Rule: Only populate if TRP data exists, otherwise NULL

Has TRP Data (any of: TPR_RETAIL, TPR_COST, TPR_START_DATE, TPR_END_DATE):
  - If TPR_MULTIPLE ≤ 1:
    ✓ TPR_RETAIL = (keep original)
    ✓ SPECIAL PRICING #2 = "0"
    
  - If TPR_MULTIPLE > 1:
    ✓ TRP_GROUP = (original TPR_RETAIL)
    ✓ TPR_RETAIL = REG_RETAIL
    ✓ SPECIAL PRICING #2 = "2"

No TRP Data:
  ✓ TPR_RETAIL = (empty)
  ✓ SPECIAL PRICING #2 = (empty/NULL) ← NEW!
```

### 7. BOTTLE_DEPOSIT
```
Rule: Map from deposit mapping file using UPC or Item

Lookup Priority:
  1. Transformed UPC (after removing leading zero)
  2. Item name (fallback)

Behavior:
  - If mapping found → Use DepositID
  - If not found → (empty) + warning

Mapping File Format:
  UPC,Item,DepositPrice,DepositID
  000987,Soda,0.10,DEP-001
  003456,Juice,0.05,DEP-002
```

---

## 🔄 Complete Example

### Input Row:
```csv
Status: Active
Item: Chips
UPC: 012345
Description: Potato chips
Department: Beverages (changed from original "Snacks")
REG_RETAIL: 2.99
PACK: 1
REGULARCOST: 0.8
TAX1: Y
SALE_MULTIPLE: 2
SALE_RETAIL: 1.99
SALE_COST: 0.7
SALE_START_DATE: 11/01/2025
SALE_END_DATE: 11/10/2025
TPR_MULTIPLE: (empty)
TPR_RETAIL: (empty)
ITEM_SIZE: 100g
ITEM_UOM: bag
```

### Output Row:
```csv
Item: Chips
UPC: 12345 ← (leading zero removed)
Description: Potato chips
Department: Snacks ← (preserved original)
REG_RETAIL: 2.99
PACK: 1
REGULARCOST: 0.8
TAX1: 1 ← (Y → 1)
FOOD_STAMP: 
WIC: 
BOTTLE_DEPOSIT: ← (empty, no mapping found)
SALE_GROUP: 1.99 ← (original SALE_RETAIL)
SALE_MULTIPLE: 2
SALE_RETAIL: 2.99 ← (changed to REG_RETAIL)
SALE_COST: 0.7
SALE_START_DATE: 2025-11-01 ← (normalized)
SALE_END_DATE: 2025-11-10 ← (normalized)
SPECIAL PRICING #1: 2 ← (SALE_MULTIPLE > 1)
TPR_MULTIPLE: 
TPR_RETAIL: 
TPR_COST: 
TPR_START_DATE: 
TPR_END_DATE: 
SPECIAL PRICING #2: ← (NULL - no TRP data)
ITEM_SIZE: 100g
ITEM_UOM: bag
```

### Warnings Generated:
```
⚠️ Department ID changed from "Snacks" to "Beverages" - using original value
⚠️ No deposit mapping found for UPC/Item: 12345
```

---

## 📊 Columns Removed (Not in Output)
- Status
- CaseUPC
- MANUFACTURER
- REG_MULTIPLE
- CASE_RETAIL
- TAX2, TAX3
- CASE_DEPOSIT
- PRC_GRP
- FUTURE_* (all future columns)
- BRAND
- PBHN
- CLASS

---

## 📊 Columns Kept (No Transformation)
- Item
- Description
- REG_RETAIL
- PACK
- REGULARCOST
- FOOD_STAMP
- WIC
- SALE_COST
- TPR_COST
- ITEM_SIZE
- ITEM_UOM

---

## 🔧 API Usage

### Transform with Department Preservation
```javascript
// Prepare original data mapping
const originalData = {
  'Chips': { Department: 'Snacks' },
  'Soda': { Department: 'Beverages' }
};

// Transform row
const { transformedRow, warnings } = transformRow(
  inputRow,
  depositMapping,
  { originalData }
);

// Check for warnings
warnings.forEach(warning => console.log('⚠️', warning));
```

### Upload Deposit Mapping
```javascript
// POST /api/upload-deposit-map
FormData:
  - file: deposit-mapping.csv

Response:
  {
    "success": true,
    "message": "Deposit mapping uploaded",
    "count": 3
  }
```

---

## ✅ Validation Checklist

Before processing:
- [ ] CSV file has required columns (Item, UPC, Description, Department)
- [ ] Deposit mapping file uploaded (if needed)
- [ ] Original Department data available (if preservation needed)

After processing:
- [ ] UPC has exactly one leading zero removed
- [ ] Department matches original (if provided)
- [ ] TAX1 is "1" or empty
- [ ] Dates are in YYYY-MM-DD format
- [ ] SPECIAL PRICING #1 is "0", "2", or empty
- [ ] SPECIAL PRICING #2 is "0", "2", or empty
- [ ] BOTTLE_DEPOSIT populated where mapping exists
- [ ] Review all warnings

---

## 🧪 Test Data

### Sample Input CSV
```csv
Status,Item,UPC,Description,Department,REG_RETAIL,TAX1,SALE_MULTIPLE,SALE_RETAIL
Active,Chips,012345,Potato chips,Snacks,2.99,Y,2,1.99
Active,Soda,000987,Cola 2L,Beverages,3.49,Y,1,2.99
Active,Milk,001234,Whole Milk,Dairy,4.99,N,,,
```

### Expected Output CSV
```csv
Item,UPC,Description,Department,REG_RETAIL,TAX1,SALE_RETAIL,SPECIAL PRICING #1
Chips,12345,Potato chips,Snacks,2.99,1,2.99,2
Soda,00987,Cola 2L,Beverages,3.49,1,2.99,0
Milk,01234,Whole Milk,Dairy,4.99,,, (empty)
```

---

## 📞 Support

For issues or questions:
- Check `TRANSFORMATION_RULES.md` for detailed explanations
- Review `IMPLEMENTATION_SUMMARY.md` for technical details
- Run tests: `npm test` in backend directory
- Check warnings in transformation output

---

**Last Updated**: 2025-11-30
**Version**: 2.0 (with Department preservation and null handling)
