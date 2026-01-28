/**
 * CSV Parser and Validation Utilities for Bulk Family Import
 */

import { generateTravelerPassword, hashPassword } from '../services/passwordService';

/**
 * Generate a random secure password (DEPRECATED - use passwordService instead)
 * @deprecated Use generateTravelerPassword from passwordService
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
    const requiredHeaders = ['bookingCode', 'displayName', 'email'];
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
 * Validate a single booking record
 */
export const validateBooking = (booking, index, allBookings) => {
    const errors = [];

    // Validate bookingCode
    if (!booking.bookingCode) {
        errors.push('bookingCode es requerido');
    }
    // Note: Duplicate bookingCodes are now ALLOWED for merging multiple cabins

    // Validate displayName
    if (!booking.displayName) {
        errors.push('displayName es requerido');
    }

    // Validate email
    if (!booking.email) {
        errors.push('email es requerido');
    } else if (!isValidEmail(booking.email)) {
        errors.push('email tiene formato inválido');
    }

    return {
        isValid: errors.length === 0,
        errors,
        rowNumber: index + 2 // +2 because index is 0-based and we skip header
    };
};

/**
 * Validate all bookings in the import
 */
export const validateBookings = (bookings) => {
    const validations = bookings.map((booking, index) => ({
        booking,
        validation: validateBooking(booking, index, bookings)
    }));

    const validBookings = validations.filter(v => v.validation.isValid);
    const invalidBookings = validations.filter(v => !v.validation.isValid);

    return {
        validBookings: validBookings.map(v => v.booking),
        invalidBookings: invalidBookings.map(v => ({
            booking: v.booking,
            errors: v.validation.errors,
            rowNumber: v.validation.rowNumber
        })),
        totalCount: bookings.length,
        validCount: validBookings.length,
        invalidCount: invalidBookings.length
    };
};

/**
 * Transform CSV booking data to Firestore format
 */
export const transformBookingForFirestore = (csvBooking) => {
    // Parse cabin numbers (semicolon-separated)
    const cabinNumbers = csvBooking.cabinNumbers
        ? csvBooking.cabinNumbers.split(';').map(c => c.trim()).filter(c => c)
        : [];

    // Generate password if not provided
    const password = csvBooking.defaultPassword || generatePassword();

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
        bookingCode: csvBooking.bookingCode.toUpperCase(),
        displayName: csvBooking.displayName,
        email: csvBooking.email.toLowerCase(),
        defaultPassword: password,
        cabinNumbers,
        cabinAccounts,
        subtotalCadGlobal,
        gratuitiesCadGlobal,
        totalCadGlobal,
        paidCadGlobal,
        balanceCadGlobal,
        groupId: 'default',
        role: 'booking'
    };
};

/**
 * Generate a sample CSV template
 */
export const generateCSVTemplate = () => {
    const headers = 'bookingCode,displayName,email,cabinNumbers,defaultPassword';
    const example1 = 'BOOK001,García Family,garcia@example.com,101;102,';
    const example2 = 'BOOK002,Rodríguez Family,rodriguez@example.com,103,MyPassword123';
    const example3 = 'BOOK003,Martínez Family,martinez@example.com,,';

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
    link.setAttribute('download', 'plantilla_reservas.csv');
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Merge CSV rows by bookingCode
 * Multiple rows with same bookingCode = multiple cabins for one booking
 * 
 * @param {Array} csvRows - Parsed CSV rows with cabinNumber, totalCad, paidCad
 * @returns {Array} Merged bookings with cabinAccounts array
 */
export const mergeBookingsByCode = (csvRows) => {
    const bookingMap = new Map();

    csvRows.forEach(row => {
        const bookingCode = row.bookingCode.toUpperCase();

        // Parse numeric values
        const totalCad = parseFloat(row.totalCad) || 0;
        const paidCad = parseFloat(row.paidCad) || 0;
        const balanceCad = Math.round((totalCad - paidCad) * 100) / 100;

        // Calculate subtotal and gratuities (assuming 15% gratuities)
        const subtotalCad = Math.round((totalCad / 1.15) * 100) / 100;
        const gratuitiesCad = Math.round((totalCad - subtotalCad) * 100) / 100;

        // Create cabin object
        const cabin = {
            cabinNumber: row.cabinNumber.trim(),
            totalCad,
            paidCad,
            balanceCad,
            subtotalCad,
            gratuitiesCad
        };

        if (!bookingMap.has(bookingCode)) {
            // First occurrence - create booking entry
            bookingMap.set(bookingCode, {
                bookingCode,
                displayName: row.displayName.trim(),
                email: row.email.trim().toLowerCase(),
                cabinAccounts: [cabin]
            });
        } else {
            // Booking exists, add cabin
            const booking = bookingMap.get(bookingCode);

            // Check for duplicate cabin numbers
            const existingCabin = booking.cabinAccounts.find(c => c.cabinNumber === cabin.cabinNumber);
            if (existingCabin) {
                // Update existing cabin
                Object.assign(existingCabin, cabin);
            } else {
                // Add new cabin
                booking.cabinAccounts.push(cabin);
            }
        }
    });

    // Calculate global totals for each booking
    const bookings = Array.from(bookingMap.values());
    bookings.forEach(booking => {
        booking.totalCadGlobal = booking.cabinAccounts.reduce((sum, c) => sum + c.totalCad, 0);
        booking.paidCadGlobal = booking.cabinAccounts.reduce((sum, c) => sum + c.paidCad, 0);
        booking.balanceCadGlobal = Math.round((booking.totalCadGlobal - booking.paidCadGlobal) * 100) / 100;
        booking.subtotalCadGlobal = booking.cabinAccounts.reduce((sum, c) => sum + c.subtotalCad, 0);
        booking.gratuitiesCadGlobal = booking.cabinAccounts.reduce((sum, c) => sum + c.gratuitiesCad, 0);

        // Round to 2 decimal places
        booking.totalCadGlobal = Math.round(booking.totalCadGlobal * 100) / 100;
        booking.paidCadGlobal = Math.round(booking.paidCadGlobal * 100) / 100;
        booking.subtotalCadGlobal = Math.round(booking.subtotalCadGlobal * 100) / 100;
        booking.gratuitiesCadGlobal = Math.round(booking.gratuitiesCadGlobal * 100) / 100;
    });

    return bookings;
};

/**
 * Transform merged booking data to Firestore format with auto-generated password
 * 
 * @param {Object} mergedBooking - Merged booking data
 * @returns {Promise<Object>} Firestore-ready booking object with password hash
 */
export const transformMergedBookingForFirestore = async (mergedBooking) => {
    // Generate high-entropy password for this booking (10-char base32)
    const password = generateTravelerPassword();

    // Hash password with PBKDF2 + salt
    const { hash, salt } = await hashPassword(password);

    // Create cabin accounts structure
    const cabinAccounts = mergedBooking.cabinNumbers.map((cabinNumber) => ({
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

    // Separate auth data for subcollection
    const authData = {
        travelerPasswordHash: hash,
        travelerPasswordSalt: salt,
        hashAlgo: 'pbkdf2-sha256',
        hashIterations: 150000,
        saltBytes: 32,
        hashVersion: 'v1.1',
        updatedAt: new Date()
    };

    // Main booking document (NO auth fields)
    const bookingData = {
        bookingCode: mergedBooking.bookingCode,
        displayName: mergedBooking.displayName,
        email: mergedBooking.email,
        cabinNumbers: mergedBooking.cabinNumbers,
        cabinAccounts,
        subtotalCadGlobal,
        gratuitiesCadGlobal,
        totalCadGlobal,
        paidCadGlobal,
        balanceCadGlobal,
        groupId: 'default',
        role: 'booking'
    };

    return {
        bookingData,
        authData,
        password // For CSV export ONLY, NEVER store in Firestore
    };
};
