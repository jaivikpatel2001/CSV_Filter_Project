/**
 * AGNE Vendor Transformation Rules
 * Current transformation logic for AGNE CSV format
 */

import {
    transformUPC,
    transformTAX1,
    preserveDepartmentID,
    parseNumeric,
    normalizeDate,
    getColumnValue
} from './helpers.js';

/**
 * AGNE Vendor Configuration
 */
export const agneConfig = {
    vendorId: 'AGNE',
    vendorName: 'AGNE',
    description: 'Standard AGNE CSV transformation with special pricing logic',
    supportedFormats: ['csv', 'xlsx', 'xls'],

    transformationRules: {
        columnsRemoved: [
            'Status', 'CaseUPC', 'MANUFACTURER', 'REG_MULTIPLE',
            'CASE_RETAIL', 'TAX2', 'TAX3', 'CASE_DEPOSIT',
            'PRC_GRP', 'FUTURE_*', 'BRAND', 'PBHN', 'CLASS',
            'SALE_MULTIPLE', 'TPR_MULTIPLE'
        ],
        transformations: [
            'UPC: Remove one leading zero',
            'TAX1: Y→1, N→empty',
            'Dates: Normalized to YYYYMMDD',
            'SALE/TPR: Special pricing logic with quantity',
            'BOTTLE_DEPOSIT: Mapped from deposit file'
        ]
    }
};

/**
 * Transform row according to AGNE rules
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
    const existingDeposit = getValue('BOTTLE_DEPOSIT');

    if (existingDeposit && depositMapping) {
        if (depositMapping[existingDeposit]) {
            transformedRow.BOTTLE_DEPOSIT = depositMapping[existingDeposit];
        } else {
            const normalizedDeposit = parseNumeric(existingDeposit);
            if (normalizedDeposit !== null && depositMapping[normalizedDeposit.toString()]) {
                transformedRow.BOTTLE_DEPOSIT = depositMapping[normalizedDeposit.toString()];
            } else {
                const itemKey = transformedRow.UPC || transformedRow.Item;
                if (depositMapping[itemKey]) {
                    transformedRow.BOTTLE_DEPOSIT = depositMapping[itemKey];
                } else {
                    transformedRow.BOTTLE_DEPOSIT = existingDeposit;
                }
            }
        }
    } else {
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
    const saleRetail = getValue('SALE_RETAIL');
    const regRetail = getValue('REG_RETAIL');

    transformedRow.group_price = '';

    const hasSaleData = saleRetail || getValue('SALE_COST') ||
        getValue('SALE_START_DATE') || getValue('SALE_END_DATE') ||
        (saleMultiple !== null && saleMultiple > 0);

    if (hasSaleData) {
        if (saleMultiple !== null && saleMultiple > 1) {
            transformedRow.group_price = saleRetail || '';
            transformedRow.SALE_RETAIL = regRetail || '';
            transformedRow['SPECIAL PRICING #1'] = '2';
            transformedRow['SPECIAL QUANTITY 1'] = getValue('SALE_MULTIPLE') || '';
        } else {
            transformedRow.SALE_RETAIL = saleRetail || '';
            transformedRow['SPECIAL PRICING #1'] = '0';
            transformedRow['SPECIAL QUANTITY 1'] = '';
        }
    } else {
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

    // 25. TPR_MULTIPLE and SPECIAL QUANTITY - Special logic
    const tprMultiple = parseNumeric(getValue('TPR_MULTIPLE') || getValue('TRP_MULTIPLE'));
    const tprRetail = getValue('TPR_RETAIL') || getValue('TRP_RETAIL');

    transformedRow.group_price_2 = '';

    const hasTprData = tprRetail || getValue('TPR_COST') || getValue('TRP_COST') ||
        getValue('TPR_START_DATE') || getValue('TRP_START_DATE') ||
        getValue('TPR_END_DATE') || getValue('TRP_END_DATE') ||
        (tprMultiple !== null && tprMultiple > 0);

    if (hasTprData) {
        if (tprMultiple !== null && tprMultiple > 1) {
            transformedRow.group_price_2 = tprRetail || '';
            transformedRow.TPR_RETAIL = regRetail || '';
            transformedRow['SPECIAL PRICING #2'] = '2';
            transformedRow['SPECIAL QUANTITY 2'] = getValue('TPR_MULTIPLE') || getValue('TRP_MULTIPLE') || '';
        } else {
            transformedRow.TPR_RETAIL = tprRetail || '';
            transformedRow['SPECIAL PRICING #2'] = '0';
            transformedRow['SPECIAL QUANTITY 2'] = '';
        }
    } else {
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
 * Get output column order for AGNE
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
