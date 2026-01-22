/**
 * CSV Parser and Validation Utilities for Bulk Family Import
 */

/**
 * Generate a random secure password
 */
export const generatePassword = (length = 12) => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Parse CSV content to array of objects
 */
export const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
        throw new Error('El archivo CSV debe contener al menos una línea de encabezado y una línea de datos');
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim());

    // Validate required headers
    const requiredHeaders = ['familyCode', 'displayName', 'email'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
        throw new Error(`Faltan columnas requeridas: ${missingHeaders.join(', ')}`);
    }

    // Parse data rows
    const families = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines

        const values = line.split(',').map(v => v.trim());
        const family = {};

        headers.forEach((header, index) => {
            family[header] = values[index] || '';
        });

        families.push(family);
    }

    return families;
};

/**
 * Validate a single family record
 */
export const validateFamily = (family, index, allFamilies) => {
    const errors = [];

    // Validate familyCode
    if (!family.familyCode) {
        errors.push('familyCode es requerido');
    } else {
        // Check for duplicates in the same file
        const duplicates = allFamilies.filter(f => f.familyCode === family.familyCode);
        if (duplicates.length > 1) {
            errors.push(`familyCode duplicado en el archivo: ${family.familyCode}`);
        }
    }

    // Validate displayName
    if (!family.displayName) {
        errors.push('displayName es requerido');
    }

    // Validate email
    if (!family.email) {
        errors.push('email es requerido');
    } else if (!isValidEmail(family.email)) {
        errors.push('email tiene formato inválido');
    }

    return {
        isValid: errors.length === 0,
        errors,
        rowNumber: index + 2 // +2 because index is 0-based and we skip header
    };
};

/**
 * Validate all families in the import
 */
export const validateFamilies = (families) => {
    const validations = families.map((family, index) => ({
        family,
        validation: validateFamily(family, index, families)
    }));

    const validFamilies = validations.filter(v => v.validation.isValid);
    const invalidFamilies = validations.filter(v => !v.validation.isValid);

    return {
        validFamilies: validFamilies.map(v => v.family),
        invalidFamilies: invalidFamilies.map(v => ({
            family: v.family,
            errors: v.validation.errors,
            rowNumber: v.validation.rowNumber
        })),
        totalCount: families.length,
        validCount: validFamilies.length,
        invalidCount: invalidFamilies.length
    };
};

/**
 * Transform CSV family data to Firestore format
 */
export const transformFamilyForFirestore = (csvFamily) => {
    // Parse cabin numbers (semicolon-separated)
    const cabinNumbers = csvFamily.cabinNumbers
        ? csvFamily.cabinNumbers.split(';').map(c => c.trim()).filter(c => c)
        : [];

    // Generate password if not provided
    const password = csvFamily.defaultPassword || generatePassword();

    // Create cabin accounts structure
    const cabinAccounts = cabinNumbers.map((cabinNumber, index) => ({
        cabinNumber,
        subtotalCad: 0,
        gratuitiesCad: 0,
        totalCad: 0,
        paidCad: 0,
        balanceCad: 0
    }));

    // Calculate global totals
    const subtotalCadGlobal = cabinAccounts.reduce((sum, c) => sum + c.subtotalCad, 0);
    const gratuitiesCadGlobal = cabinAccounts.reduce((sum, c) => sum + c.gratuitiesCad, 0);
    const totalCadGlobal = cabinAccounts.reduce((sum, c) => sum + c.totalCad, 0);
    const paidCadGlobal = cabinAccounts.reduce((sum, c) => sum + c.paidCad, 0);
    const balanceCadGlobal = totalCadGlobal - paidCadGlobal;

    return {
        familyCode: csvFamily.familyCode.toUpperCase(),
        displayName: csvFamily.displayName,
        email: csvFamily.email.toLowerCase(),
        defaultPassword: password,
        cabinNumbers,
        cabinAccounts,
        subtotalCadGlobal,
        gratuitiesCadGlobal,
        totalCadGlobal,
        paidCadGlobal,
        balanceCadGlobal,
        groupId: 'default',
        role: 'family'
    };
};

/**
 * Generate a sample CSV template
 */
export const generateCSVTemplate = () => {
    const headers = 'familyCode,displayName,email,cabinNumbers,defaultPassword';
    const example1 = 'FAM001,Familia García,garcia@example.com,101;102,';
    const example2 = 'FAM002,Familia Rodríguez,rodriguez@example.com,103,MyPassword123';
    const example3 = 'FAM003,Familia Martínez,martinez@example.com,,';

    return `${headers}\n${example1}\n${example2}\n${example3}`;
};

/**
 * Download CSV template
 */
export const downloadCSVTemplate = () => {
    const csvContent = generateCSVTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_familias.csv');
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
