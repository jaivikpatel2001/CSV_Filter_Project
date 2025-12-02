/**
 * Core transformation engine for CSV/Excel data
 * Applies business rules to transform input rows
 */

/**
 * Remove exactly one leading zero from UPC if present
 * @param {string} upc - UPC code
 * @returns {string} - Transformed UPC
 */
export function transformUPC(upc) {
  if (!upc) return upc;
  const upcStr = String(upc).trim();
  if (upcStr.startsWith('0')) {
    return upcStr.substring(1);
  }
  return upcStr;
}

/**
 * Transform TAX1 values: Y→1, N→empty, others preserved with warning
 * @param {string} tax1 - TAX1 value
 * @returns {{value: string, warning: string|null}}
 */
export function transformTAX1(tax1) {
  if (!tax1) return { value: '', warning: null };

  const tax1Str = String(tax1).trim().toUpperCase();

  if (tax1Str === 'Y') {
    return { value: '1', warning: null };
  } else if (tax1Str === 'N') {
    return { value: '', warning: null };
  } else {
    return {
      value: tax1,
      warning: `TAX1 has unexpected value: "${tax1}" (expected Y or N)`
    };
  }
}

/**
 * Preserve original Department ID if incoming value differs
 * @param {string} incomingDept - Department from current file
 * @param {string} originalDept - Department from original source
 * @returns {{value: string, warning: string|null}}
 */
export function preserveDepartmentID(incomingDept, originalDept) {
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

/**
 * Parse numeric value from string (handles currency symbols)
 * @param {string|number} value - Value to parse
 * @returns {number|null}
 */
export function parseNumeric(value) {
  if (value === null || value === undefined || value === '') return null;

  // Remove currency symbols and non-numeric except . and -
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? null : parsed;
}

/**
 * Normalize date to YYYY-MM-DD format
 * @param {string} dateStr - Date string
 * @returns {{value: string, warning: string|null}}
 */
export function normalizeDate(dateStr) {
  if (!dateStr) return { value: '', warning: null };

  const str = String(dateStr).trim();

  // Try various formats
  const formats = [
    // YYYYMMDD (compact format)
    /^(\d{4})(\d{2})(\d{2})$/,
    // YYYY-MM-DD
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    // MM/DD/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // DD-MM-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
  ];

  for (let i = 0; i < formats.length; i++) {
    const match = str.match(formats[i]);
    if (match) {
      let year, month, day;

      if (i === 0) {
        // YYYYMMDD
        [, year, month, day] = match;
      } else if (i === 1) {
        // YYYY-MM-DD
        [, year, month, day] = match;
      } else if (i === 2) {
        // MM/DD/YYYY
        [, month, day, year] = match;
      } else {
        // DD-MM-YYYY
        [, day, month, year] = match;
      }

      // Pad month and day
      month = month.padStart(2, '0');
      day = day.padStart(2, '0');

      // Basic validation
      const monthNum = parseInt(month);
      const dayNum = parseInt(day);

      if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
        return {
          value: '',
          warning: `Invalid date: "${dateStr}"`
        };
      }

      // Return YYYYMMDD format
      return { value: `${year}${month}${day}`, warning: null };
    }
  }

  return {
    value: '',
    warning: `Could not parse date: "${dateStr}"`
  };
}

/**
 * Get case-insensitive column value from row
 * @param {Object} row - Data row
 * @param {string} columnName - Column name to find
 * @returns {any} - Column value or undefined
 */
export function getColumnValue(row, columnName) {
  // Try exact match first
  if (row.hasOwnProperty(columnName)) {
    return row[columnName];
  }

  // Try case-insensitive match
  const lowerName = columnName.toLowerCase();
  for (const key in row) {
    if (key.toLowerCase() === lowerName) {
      return row[key];
    }
  }

  return undefined;
}

/**
 * Main transformation function
 * @param {Object} row - Input row
 * @param {Object} depositMapping - Deposit mapping (UPC/Item -> DepositID)
 * @param {Object} options - Transformation options
 * @returns {{transformedRow: Object, warnings: string[]}}
 */
export function transformRow(row, depositMapping = {}, options = {}) {
  const warnings = [];
  const transformedRow = {};

  // Helper to get value case-insensitively
  const getValue = (name) => getColumnValue(row, name);

  // 1. Status - Remove (skip)

  // 2. Item - Keep
  transformedRow.Item = getValue('Item') || '';

  // 3. UPC - Remove one leading zero
  const upc = getValue('UPC');
  transformedRow.UPC = transformUPC(upc);

  // 4. CaseUPC - Remove (skip)

  // 5. Description - Keep
  transformedRow.Description = getValue('Description') || '';

  // 6. Department - Keep (with preservation logic)
  const deptResult = preserveDepartmentID(
    getValue('Department'),
    options.originalData?.[transformedRow.Item]?.Department
  );
  transformedRow.Department = deptResult.value;
  if (deptResult.warning) warnings.push(deptResult.warning);

  // 7. MANUFACTURER - Remove (skip)
  // 8. REG_MULTIPLE - Remove (skip)

  // 9. REG_RETAIL - Keep
  transformedRow.REG_RETAIL = getValue('REG_RETAIL') || '';

  // 10. CASE_RETAIL - Remove (skip)

  // 11. PACK - Keep
  transformedRow.PACK = getValue('PACK') || '';

  // 12. REGULARCOST - Keep
  transformedRow.REGULARCOST = getValue('REGULARCOST') || '';

  // 13. TAX1 - Transform
  const tax1Result = transformTAX1(getValue('TAX1'));
  transformedRow.TAX1 = tax1Result.value;
  if (tax1Result.warning) warnings.push(tax1Result.warning);

  // 14. TAX2 - Remove (skip)
  // 15. TAX3 - Remove (skip)

  // 16. FOOD_STAMP - Keep
  transformedRow.FOOD_STAMP = getValue('FOOD_STAMP') || '';

  // 17. WIC - Keep
  transformedRow.WIC = getValue('WIC') || '';

  // 18. BOTTLE_DEPOSIT - Map from deposit mapping
  // First, check if there's already a BOTTLE_DEPOSIT value in the row
  const existingDeposit = getValue('BOTTLE_DEPOSIT');

  // Try to map the existing deposit amount to an ID
  if (existingDeposit && depositMapping) {
    // Try exact match first
    if (depositMapping[existingDeposit]) {
      transformedRow.BOTTLE_DEPOSIT = depositMapping[existingDeposit];
    } else {
      // Try normalized amount (e.g., '0.60' -> '0.6')
      const normalizedDeposit = parseNumeric(existingDeposit);
      if (normalizedDeposit !== null && depositMapping[normalizedDeposit.toString()]) {
        transformedRow.BOTTLE_DEPOSIT = depositMapping[normalizedDeposit.toString()];
      } else {
        // Otherwise, try to map by UPC or Item
        const itemKey = transformedRow.UPC || transformedRow.Item;
        if (depositMapping[itemKey]) {
          transformedRow.BOTTLE_DEPOSIT = depositMapping[itemKey];
        } else {
          // Keep the existing value if no mapping found
          transformedRow.BOTTLE_DEPOSIT = existingDeposit;
        }
      }
    }
  } else {
    // No existing deposit, try to map by UPC or Item
    const itemKey = transformedRow.UPC || transformedRow.Item;
    if (depositMapping && depositMapping[itemKey]) {
      transformedRow.BOTTLE_DEPOSIT = depositMapping[itemKey];
    } else {
      transformedRow.BOTTLE_DEPOSIT = '';
      if (itemKey) {
        warnings.push(`No deposit mapping found for UPC/Item: ${itemKey}`);
      }
    }
  }

  // 19. CASE_DEPOSIT - Remove (skip)
  // 20. PRC_GRP - Remove (skip)

  // 21. SALE_MULTIPLE and SPECIAL QUANTITY - Special logic
  const saleMultiple = parseNumeric(getValue('SALE_MULTIPLE'));
  // Note: SALE_MULTIPLE is no longer included in output

  const saleRetail = getValue('SALE_RETAIL');
  const regRetail = getValue('REG_RETAIL');

  // Initialize group_price default
  transformedRow.group_price = '';

  // Check if SALE data exists (any sale-related field has a value)
  const hasSaleData = saleRetail || getValue('SALE_COST') ||
    getValue('SALE_START_DATE') || getValue('SALE_END_DATE') ||
    (saleMultiple !== null && saleMultiple > 0);

  if (hasSaleData) {
    if (saleMultiple !== null && saleMultiple > 1) {
      // n > 1: group_price = original SALE_RETAIL, SALE_RETAIL = REG_RETAIL, SPECIAL PRICING #1 = 2, SPECIAL QUANTITY = original value
      transformedRow.group_price = saleRetail || '';
      transformedRow.SALE_RETAIL = regRetail || '';
      transformedRow['SPECIAL PRICING #1'] = '2';
      transformedRow['SPECIAL QUANTITY 1'] = getValue('SALE_MULTIPLE') || '';
    } else {
      // n <= 1: Keep SALE_RETAIL, SPECIAL PRICING #1 = 0, SPECIAL QUANTITY = empty (null)
      transformedRow.SALE_RETAIL = saleRetail || '';
      transformedRow['SPECIAL PRICING #1'] = '0';
      transformedRow['SPECIAL QUANTITY 1'] = '';
    }
  } else {
    // No sale data - leave SPECIAL PRICING #1 and SPECIAL QUANTITY null/empty
    transformedRow.SALE_RETAIL = '';
    transformedRow['SPECIAL PRICING #1'] = '';
    transformedRow['SPECIAL QUANTITY 1'] = '';
  }

  // 22. SALE_COST - Keep
  transformedRow.SALE_COST = getValue('SALE_COST') || '';

  // 23. SALE_START_DATE - Keep and normalize
  const saleStartResult = normalizeDate(getValue('SALE_START_DATE'));
  transformedRow.SALE_START_DATE = saleStartResult.value;
  if (saleStartResult.warning) warnings.push(saleStartResult.warning);

  // 24. SALE_END_DATE - Keep and normalize
  const saleEndResult = normalizeDate(getValue('SALE_END_DATE'));
  transformedRow.SALE_END_DATE = saleEndResult.value;
  if (saleEndResult.warning) warnings.push(saleEndResult.warning);

  // 25. TPR_MULTIPLE and SPECIAL QUANTITY - Special logic (mirror SALE_MULTIPLE)
  // Accept both TPR and TRP variants
  const tprMultiple = parseNumeric(getValue('TPR_MULTIPLE') || getValue('TRP_MULTIPLE'));
  // Note: TPR_MULTIPLE is no longer included in output

  const tprRetail = getValue('TPR_RETAIL') || getValue('TRP_RETAIL');

  // Initialize group_price_2 default
  transformedRow.group_price_2 = '';

  // Check if TPR data exists (any TPR-related field has a value)
  const hasTprData = tprRetail || getValue('TPR_COST') || getValue('TRP_COST') ||
    getValue('TPR_START_DATE') || getValue('TRP_START_DATE') ||
    getValue('TPR_END_DATE') || getValue('TRP_END_DATE') ||
    (tprMultiple !== null && tprMultiple > 0);

  if (hasTprData) {
    if (tprMultiple !== null && tprMultiple > 1) {
      // n > 1: group_price_2 = TRP_RETAIL, TRP_RETAIL = REG_RETAIL, SPECIAL PRICING #2 = 2, SPECIAL QUANTITY = original value
      transformedRow.group_price_2 = tprRetail || '';
      transformedRow.TPR_RETAIL = regRetail || '';
      transformedRow['SPECIAL PRICING #2'] = '2';
      transformedRow['SPECIAL QUANTITY 2'] = getValue('TPR_MULTIPLE') || getValue('TRP_MULTIPLE') || '';
    } else {
      // n <= 1: Keep TPR_RETAIL, SPECIAL PRICING #2 = 0, SPECIAL QUANTITY = empty (null)
      transformedRow.TPR_RETAIL = tprRetail || '';
      transformedRow['SPECIAL PRICING #2'] = '0';
      transformedRow['SPECIAL QUANTITY 2'] = '';
    }
  } else {
    // No TPR data - leave SPECIAL PRICING #2 and SPECIAL QUANTITY null/empty
    transformedRow.TPR_RETAIL = '';
    transformedRow['SPECIAL PRICING #2'] = '';
    transformedRow['SPECIAL QUANTITY 2'] = '';
  }

  // 26. TPR_COST - Keep
  transformedRow.TPR_COST = getValue('TPR_COST') || getValue('TRP_COST') || '';

  // 27. TPR_START_DATE - Keep and normalize
  const tprStartResult = normalizeDate(getValue('TPR_START_DATE') || getValue('TRP_START_DATE'));
  transformedRow.TPR_START_DATE = tprStartResult.value;
  if (tprStartResult.warning) warnings.push(tprStartResult.warning);

  // 28. TPR_END_DATE - Keep and normalize
  const tprEndResult = normalizeDate(getValue('TPR_END_DATE') || getValue('TRP_END_DATE'));
  transformedRow.TPR_END_DATE = tprEndResult.value;
  if (tprEndResult.warning) warnings.push(tprEndResult.warning);

  // 29-32. FUTURE_* - Remove (skip)

  // 33. BRAND - Remove (skip)

  // 34. ITEM_SIZE - Keep
  transformedRow.ITEM_SIZE = getValue('ITEM_SIZE') || '';

  // 35. ITEM_UOM - Keep
  transformedRow.ITEM_UOM = getValue('ITEM_UOM') || '';

  // 36. PBHN - Remove (skip)
  // 37. CLASS - Remove (skip)

  return { transformedRow, warnings };
}

/**
 * Get output column order
 * @returns {string[]} - Ordered column names
 */
export function getOutputColumns() {
  return [
    // Core item information
    'Item',
    'UPC',
    'Description',
    'Department',
    'REG_RETAIL',
    'PACK',
    'REGULARCOST',
    'TAX1',
    'FOOD_STAMP',
    'WIC',
    'BOTTLE_DEPOSIT',

    // SALE section: Special_Pricing, RETAIL, QUANTITY, Group_price, Start_Date, End_Date
    'SPECIAL PRICING #1',
    'SALE_RETAIL',
    'SPECIAL QUANTITY 1',
    'group_price',
    'SALE_START_DATE',
    'SALE_END_DATE',
    'SALE_COST',

    // TPR section: Special_Pricing, RETAIL, QUANTITY, Group_price, Start_Date, End_Date
    'SPECIAL PRICING #2',
    'TPR_RETAIL',
    'SPECIAL QUANTITY 2',
    'group_price_2',
    'TPR_START_DATE',
    'TPR_END_DATE',
    'TPR_COST',

    // Item details
    'ITEM_SIZE',
    'ITEM_UOM'
  ];
}