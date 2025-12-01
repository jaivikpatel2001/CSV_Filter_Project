# CSV Transformation Logic Summary

This document explains how the CSV transformation engine processes your data, detailing the differences between Input and Output files and the specific calculations applied.

## 1. General Data Formatting

| Field | Transformation Rule | Example Input | Example Output |
| :--- | :--- | :--- | :--- |
| **UPC** | Removes exactly one leading zero if present. | `012345` | `12345` |
| **Dates** | Converts all dates to `YYYYMMDD` format. | `2025-11-29` | `20251129` |
| **TAX1** | Converts 'Y' to '1' and 'N' to empty. | `Y` | `1` |
| **Department** | Preserves the original system Department ID if available; otherwise uses the file's value. | *Varies* | *Varies* |

---

## 2. Sale Pricing Logic (Special Pricing #1)

This logic determines how Sale prices are structured in the output based on the **Sale Multiple**.

### **Scenario A: Multi-Item Deal (e.g., "2 for $5.00")**
*   **Condition**: Input `SALE_MULTIPLE` > 1
*   **Calculations**:
    1.  **SPECIAL PRICING #1**: Set to `2`.
    2.  **SPECIAL QUANTITY 1**: Copies the input `SALE_MULTIPLE`.
    3.  **group_price**: Copies the input `SALE_RETAIL` (The "deal" price, e.g., $5.00).
    4.  **SALE_RETAIL**: Replaced by `REG_RETAIL` (The regular unit price).

### **Scenario B: Single Item Sale (e.g., "$3.99 each")**
*   **Condition**: Input `SALE_MULTIPLE` is 1 or empty.
*   **Calculations**:
    1.  **SPECIAL PRICING #1**: Set to `0`.
    2.  **SPECIAL QUANTITY 1**: Left empty.
    3.  **group_price**: Left empty.
    4.  **SALE_RETAIL**: Keeps the input `SALE_RETAIL`.

---

## 3. TPR Pricing Logic (Special Pricing #2)

This logic is identical to the Sale logic but applies to Temporary Price Reduction (TPR) fields.

### **Scenario A: Multi-Item TPR**
*   **Condition**: Input `TPR_MULTIPLE` > 1
*   **Calculations**:
    1.  **SPECIAL PRICING #2**: Set to `2`.
    2.  **SPECIAL QUANTITY 2**: Copies the input `TPR_MULTIPLE`.
    3.  **group_price_2**: Copies the input `TPR_RETAIL`.
    4.  **TPR_RETAIL**: Replaced by `REG_RETAIL`.

### **Scenario B: Single Item TPR**
*   **Condition**: Input `TPR_MULTIPLE` is 1 or empty.
*   **Calculations**:
    1.  **SPECIAL PRICING #2**: Set to `0`.
    2.  **SPECIAL QUANTITY 2**: Left empty.
    3.  **group_price_2**: Left empty.
    4.  **TPR_RETAIL**: Keeps the input `TPR_RETAIL`.

---

## 4. Column Mapping (Input vs Output)

The output CSV will contain the following columns in this specific order. New or modified columns are highlighted.

1.  Item
2.  UPC
3.  Description
4.  Department
5.  REG_RETAIL
6.  PACK
7.  REGULARCOST
8.  TAX1
9.  FOOD_STAMP
10. WIC
11. BOTTLE_DEPOSIT
12. **SPECIAL PRICING #1** *(Calculated: 0 or 2)*
13. **SPECIAL QUANTITY 1** *(From Sale Multiple)*
14. **SALE_RETAIL** *(Modified if Special Pricing is 2)*
15. **group_price** *(New: Contains Deal Price)*
16. SALE_COST
17. SALE_START_DATE
18. SALE_END_DATE
19. **SPECIAL PRICING #2** *(Calculated: 0 or 2)*
20. **SPECIAL QUANTITY 2** *(From TPR Multiple)*
21. **TPR_RETAIL** *(Modified if Special Pricing is 2)*
22. **group_price_2** *(New: Contains TPR Deal Price)*
23. TPR_COST
24. TPR_START_DATE
25. TPR_END_DATE
26. ITEM_SIZE
27. ITEM_UOM

*(Note: The original `SALE_MULTIPLE` and `TPR_MULTIPLE` columns are removed from the output, as their data is now mapped to `SPECIAL QUANTITY` columns.)*
