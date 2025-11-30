# CSV Transformation Rules - Detailed Explanation

## Overview
This document explains the transformation rules applied to CSV files, including the current implementation and requested optimizations.

---

## 1. UPC Transformation

### Current Implementation
**Rule**: Remove exactly **one** leading zero from the UPC field if present.

**Code Location**: `backend/src/utils/transformer.js` - `transformUPC()` function (lines 11-18)

```javascript
export function transformUPC(upc) {
  if (!upc) return upc;
  const upcStr = String(upc).trim();
  if (upcStr.startsWith('0')) {
    return upcStr.substring(1);  // Removes first character if it's '0'
  }
  return upcStr;
}
```

### Examples
- `012345` → `12345` ✅
- `000987` → `00987` ✅ (only first zero removed)
- `123456` → `123456` ✅ (no leading zero, unchanged)
- `001234` → `01234` ✅ (only first zero removed)

### ✅ Status: **CORRECTLY IMPLEMENTED**
The function removes only the first ascending "0" as requested.

---

## 2. Department ID Preservation

### Current Implementation
**Current Behavior**: The Department field is simply copied from the input file without any validation or preservation logic.

**Code Location**: `backend/src/utils/transformer.js` - `transformRow()` function (line 170)

```javascript
transformedRow.Department = getValue('Department') || '';
```

### ⚠️ Requested Change
**New Rule**: If the value in the incoming file is different from the original source file, ignore the modified value and keep the original Department ID.

### Implementation Strategy
To implement this, we need:

1. **Original Source File Storage**: Store or reference the original Department ID values
2. **Comparison Logic**: Compare incoming Department ID with original
3. **Preservation Logic**: If different, use original value instead

### Proposed Implementation

```javascript
/**
 * Preserve original Department ID if incoming value differs
 * @param {string} incomingDept - Department from current file
 * @param {string} originalDept - Department from original source
 * @param {Object} options - Options with originalData mapping
 * @returns {{value: string, warning: string|null}}
 */
export function preserveDepartmentID(incomingDept, originalDept, options = {}) {
  // If no original data available, use incoming value
  if (!originalDept) {
    return { value: incomingDept || '', warning: null };
  }
  
  // If values differ, preserve original
  if (incomingDept !== originalDept) {
    return { 
      value: originalDept, 
      warning: `Department ID changed from "${originalDept}" to "${incomingDept}" - using original value` 
    };
  }
  
  return { value: incomingDept || '', warning: null };
}
```

### Usage in transformRow()
```javascript
// In transformRow function, replace line 170 with:
const deptResult = preserveDepartmentID(
  getValue('Department'), 
  options.originalData?.[transformedRow.Item]?.Department,
  options
);
transformedRow.Department = deptResult.value;
if (deptResult.warning) warnings.push(deptResult.warning);
```

### Requirements
- Need to maintain a mapping of `Item` → `Original Department ID`
- This could be stored in MongoDB or loaded from a reference file
- Options parameter needs to include `originalData` mapping

---

## 3. Special Pricing #1 and #2 (Sale / TRP)

### Current Implementation
**Current Behavior**: The system ALWAYS populates "SPECIAL PRICING #1" and "SPECIAL PRICING #2" with either "0" or "2" based on the MULTIPLE value.

**Code Location**: `backend/src/utils/transformer.js` - `transformRow()` function

#### SPECIAL PRICING #1 (SALE)
```javascript
// Lines 221-230
if (saleMultiple !== null && saleMultiple > 1) {
  transformedRow.SALE_GROUP = saleRetail || '';
  transformedRow.SALE_RETAIL = regRetail || '';
  transformedRow['SPECIAL PRICING #1'] = '2';  // ← Always set to '2'
} else {
  transformedRow.SALE_RETAIL = saleRetail || '';
  transformedRow['SPECIAL PRICING #1'] = '0';  // ← Always set to '0'
}
```

#### SPECIAL PRICING #2 (TRP)
```javascript
// Lines 252-261
if (tprMultiple !== null && tprMultiple > 1) {
  transformedRow.TRP_GROUP = tprRetail || '';
  transformedRow.TPR_RETAIL = regRetail || '';
  transformedRow['SPECIAL PRICING #2'] = '2';  // ← Always set to '2'
} else {
  transformedRow.TPR_RETAIL = tprRetail || '';
  transformedRow['SPECIAL PRICING #2'] = '0';  // ← Always set to '0'
}
```

### ⚠️ Requested Change
**New Rule**: If there is no Sale or TRP value, keep the field **null** (do not populate with zeros or defaults).

### Problem Analysis
The current logic sets "SPECIAL PRICING #1" and "SPECIAL PRICING #2" to "0" even when there's no sale/TRP data. This should only be set when actual sale/TRP values exist.

### Proposed Implementation

#### Updated SPECIAL PRICING #1 Logic
```javascript
// Check if SALE data exists
const hasSaleData = saleRetail || getValue('SALE_COST') || 
                    getValue('SALE_START_DATE') || getValue('SALE_END_DATE');

if (hasSaleData) {
  if (saleMultiple !== null && saleMultiple > 1) {
    transformedRow.SALE_GROUP = saleRetail || '';
    transformedRow.SALE_RETAIL = regRetail || '';
    transformedRow['SPECIAL PRICING #1'] = '2';
  } else {
    transformedRow.SALE_RETAIL = saleRetail || '';
    transformedRow['SPECIAL PRICING #1'] = '0';
  }
} else {
  // No sale data - leave SPECIAL PRICING #1 null/empty
  transformedRow.SALE_RETAIL = '';
  transformedRow['SPECIAL PRICING #1'] = '';  // ← NULL instead of '0'
}
```

#### Updated SPECIAL PRICING #2 Logic
```javascript
// Check if TPR data exists
const hasTprData = tprRetail || getValue('TPR_COST') || getValue('TRP_COST') ||
                   getValue('TPR_START_DATE') || getValue('TRP_START_DATE') ||
                   getValue('TPR_END_DATE') || getValue('TRP_END_DATE');

if (hasTprData) {
  if (tprMultiple !== null && tprMultiple > 1) {
    transformedRow.TRP_GROUP = tprRetail || '';
    transformedRow.TPR_RETAIL = regRetail || '';
    transformedRow['SPECIAL PRICING #2'] = '2';
  } else {
    transformedRow.TPR_RETAIL = tprRetail || '';
    transformedRow['SPECIAL PRICING #2'] = '0';
  }
} else {
  // No TPR data - leave SPECIAL PRICING #2 null/empty
  transformedRow.TPR_RETAIL = '';
  transformedRow['SPECIAL PRICING #2'] = '';  // ← NULL instead of '0'
}
```

### Examples

#### Example 1: Item with Sale Data
**Input**:
```csv
SALE_MULTIPLE: 2
SALE_RETAIL: 1.99
SALE_COST: 0.7
```
**Output**:
```csv
SALE_GROUP: 1.99
SALE_RETAIL: (REG_RETAIL value)
SPECIAL PRICING #1: 2
```

#### Example 2: Item WITHOUT Sale Data
**Input**:
```csv
SALE_MULTIPLE: (empty)
SALE_RETAIL: (empty)
SALE_COST: (empty)
```
**Output** (Current - WRONG):
```csv
SALE_RETAIL: (empty)
SPECIAL PRICING #1: 0  ← Should be NULL
```

**Output** (Proposed - CORRECT):
```csv
SALE_RETAIL: (empty)
SPECIAL PRICING #1: (empty/null)  ← Correct!
```

---

## 4. Bottle Deposit Mapping

### Current Implementation
**Rule**: Map BOTTLE_DEPOSIT from deposit mapping file using UPC or Item as the lookup key.

**Code Location**: `backend/src/utils/transformer.js` - `transformRow()` function (lines 200-209)

```javascript
// 18. BOTTLE_DEPOSIT - Map from deposit mapping
const itemKey = transformedRow.UPC || transformedRow.Item;
if (depositMapping && depositMapping[itemKey]) {
  transformedRow.BOTTLE_DEPOSIT = depositMapping[itemKey];
} else {
  transformedRow.BOTTLE_DEPOSIT = '';
  if (itemKey) {
    warnings.push(`No deposit mapping found for UPC/Item: ${itemKey}`);
  }
}
```

### How It Works

#### 1. Deposit Mapping File Format
**File**: `backend/sample-data/deposit-mapping.csv`

```csv
UPC,Item,DepositPrice,DepositID
000987,Soda,0.10,DEP-001
003456,Juice,0.05,DEP-002
007890,Water,0.05,DEP-003
```

#### 2. Mapping Process

**Step 1**: Upload deposit mapping file via `/api/upload-deposit-map` endpoint

**Step 2**: File is parsed and stored as a key-value mapping:
```javascript
{
  "000987": "DEP-001",  // UPC → DepositID
  "Soda": "DEP-001",    // Item → DepositID
  "003456": "DEP-002",
  "Juice": "DEP-002",
  // ... etc
}
```

**Step 3**: During transformation, lookup is performed:
1. Try to find mapping using **transformed UPC** (after removing leading zero)
2. If not found, try using **Item** name
3. If still not found, set to empty and add warning

#### 3. Lookup Priority
```javascript
const itemKey = transformedRow.UPC || transformedRow.Item;
```

**Priority**:
1. **UPC** (after transformation) - Primary key
2. **Item** name - Fallback key

### Examples

#### Example 1: Successful Mapping by UPC
**Input Row**:
```csv
UPC: 000987
Item: Soda
```

**After UPC Transformation**:
```csv
UPC: 00987  (one leading zero removed)
```

**Deposit Mapping Lookup**:
- Look for `00987` in mapping → **NOT FOUND** ⚠️
- Look for `Soda` in mapping → **FOUND** → `DEP-001` ✅

**Output**:
```csv
BOTTLE_DEPOSIT: DEP-001
```

**⚠️ POTENTIAL ISSUE**: The UPC is transformed BEFORE lookup, which may cause mismatches if the deposit mapping file uses the original UPC format.

#### Example 2: No Mapping Found
**Input Row**:
```csv
UPC: 012345
Item: Chips
```

**After UPC Transformation**:
```csv
UPC: 12345
```

**Deposit Mapping Lookup**:
- Look for `12345` in mapping → **NOT FOUND**
- Look for `Chips` in mapping → **NOT FOUND**

**Output**:
```csv
BOTTLE_DEPOSIT: (empty)
Warning: "No deposit mapping found for UPC/Item: 12345"
```

### ⚠️ Important Considerations

#### UPC Format Consistency
**Issue**: The deposit mapping file may contain UPCs in their original format (with leading zeros), but the lookup uses the transformed UPC (without leading zero).

**Solution Options**:

**Option 1**: Use original UPC for lookup
```javascript
const originalUPC = getValue('UPC');  // Before transformation
const itemKey = originalUPC || transformedRow.Item;
```

**Option 2**: Transform UPCs in deposit mapping file
```javascript
// When loading deposit mapping, transform UPCs
const transformedKey = transformUPC(upc);
depositMapping[transformedKey] = depositId;
```

**Current Implementation**: Uses **transformed UPC**, which may cause lookup failures if deposit mapping uses original UPC format.

### ✅ Status: **WORKING BUT NEEDS CLARIFICATION**
- The mapping logic is implemented correctly
- However, UPC format consistency between deposit mapping file and lookup needs to be verified
- Consider using original UPC for lookup to avoid mismatches

---

## Summary of Required Changes

### ✅ Already Correct
1. **UPC Transformation** - Removes exactly one leading zero

### ⚠️ Needs Implementation
2. **Department ID Preservation** - Requires:
   - Storage of original Department IDs
   - Comparison logic
   - Warning system for changes

3. **Special Pricing Null Handling** - Requires:
   - Check if Sale/TRP data exists
   - Only set SPECIAL PRICING #1/#2 when data is present
   - Leave null/empty when no sale/TRP data

### 🔍 Needs Verification
4. **Bottle Deposit Mapping** - Verify:
   - UPC format consistency between mapping file and lookup
   - Consider using original UPC for lookup
   - Test with real-world data

---

## Testing Recommendations

### Test Case 1: UPC Transformation
```csv
Input: 012345 → Output: 12345
Input: 000987 → Output: 00987
Input: 123456 → Output: 123456
```

### Test Case 2: Department ID Preservation
```csv
Original: Department = "Snacks"
Incoming: Department = "Beverages"
Output: Department = "Snacks" (with warning)
```

### Test Case 3: Special Pricing Null Handling
```csv
# No Sale Data
Input: SALE_RETAIL = (empty), SALE_COST = (empty)
Output: SPECIAL PRICING #1 = (empty/null)

# With Sale Data
Input: SALE_RETAIL = 1.99, SALE_MULTIPLE = 1
Output: SPECIAL PRICING #1 = 0
```

### Test Case 4: Bottle Deposit Mapping
```csv
# Successful mapping
Input: UPC = 000987, Item = Soda
Mapping: 000987 → DEP-001
Output: BOTTLE_DEPOSIT = DEP-001

# No mapping
Input: UPC = 012345, Item = Chips
Output: BOTTLE_DEPOSIT = (empty) + warning
```

---

## Next Steps

1. **Review this document** and confirm the understanding of requirements
2. **Implement Department ID preservation** logic
3. **Implement Special Pricing null handling** logic
4. **Verify bottle deposit mapping** UPC format consistency
5. **Update unit tests** to cover new scenarios
6. **Test with real-world data** to ensure correctness
