/**
 * Password Service - HARDENED v2
 * 
 * Security improvements:
 * - High-entropy base32 passwords (10 chars, ~50 bits entropy)
 * - PBKDF2-SHA256 with 150k iterations
 * - Per-password salt (32 bytes)
 * - No plaintext storage
 */

/**
 * Generate cryptographically secure random bytes
 * @param {number} length - Number of bytes
 * @returns {Uint8Array}
 */
function getRandomBytes(length) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return array;
}

/**
 * Convert bytes to base32 (RFC 4648)
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function bytesToBase32(bytes) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < bytes.length; i++) {
        value = (value << 8) | bytes[i];
        bits += 8;

        while (bits >= 5) {
            output += alphabet[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }

    if (bits > 0) {
        output += alphabet[(value << (5 - bits)) & 31];
    }

    return output;
}

/**
 * Convert bytes to hex string
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function bytesToHex(bytes) {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Convert hex string to bytes
 * @param {string} hex
 * @returns {Uint8Array}
 */
function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

/**
 * Generate a high-entropy traveler password
 * 
 * Format: 10-character base32 (uppercase A-Z, 2-7)
 * Entropy: ~50 bits (2^50 = 1.125 quadrillion combinations)
 * Example: "K7T9P2M4QX"
 * 
 * @returns {string} 10-character base32 password
 */
export function generateTravelerPassword() {
    // Generate 8 random bytes (64 bits)
    // Base32 encoding gives us ~1.6 chars per byte, so 8 bytes = ~13 chars
    // We'll take the first 10 chars for exactly 50 bits of entropy
    const randomBytes = getRandomBytes(8);
    const base32 = bytesToBase32(randomBytes);

    // Return first 10 characters
    return base32.substring(0, 10);
}

/**
 * Generate a cryptographic salt
 * @returns {string} Hex-encoded 32-byte salt
 */
export function generateSalt() {
    const saltBytes = getRandomBytes(32); // 256 bits
    return bytesToHex(saltBytes);
}

/**
 * Hash password using PBKDF2-SHA256
 * 
 * Parameters:
 * - Algorithm: PBKDF2 with SHA-256
 * - Iterations: 150,000 (OWASP recommendation for 2024+)
 * - Salt: 32 bytes (256 bits)
 * - Derived key: 32 bytes (256 bits)
 * 
 * @param {string} password - Plaintext password
 * @param {string} saltHex - Hex-encoded salt (optional, generates new if not provided)
 * @returns {Promise<{hash: string, salt: string}>}
 */
export async function hashPassword(password, saltHex = null) {
    // Generate salt if not provided
    const salt = saltHex || generateSalt();
    const saltBytes = hexToBytes(salt);

    // Convert password to bytes
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBytes,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );

    // Derive key using PBKDF2
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: saltBytes,
            iterations: 150000, // OWASP recommendation
            hash: 'SHA-256'
        },
        keyMaterial,
        256 // 32 bytes = 256 bits
    );

    const hashBytes = new Uint8Array(derivedBits);
    const hash = bytesToHex(hashBytes);

    return { hash, salt };
}

/**
 * Verify password against stored hash and salt
 * 
 * @param {string} inputPassword - Password to verify
 * @param {string} storedHash - Stored hash (hex)
 * @param {string} storedSalt - Stored salt (hex)
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(inputPassword, storedHash, storedSalt) {
    try {
        // Hash the input password with the stored salt
        const { hash: computedHash } = await hashPassword(inputPassword, storedSalt);

        // Constant-time comparison (prevent timing attacks)
        if (computedHash.length !== storedHash.length) {
            return false;
        }

        let mismatch = 0;
        for (let i = 0; i < computedHash.length; i++) {
            mismatch |= computedHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
        }

        return mismatch === 0;
    } catch (error) {
        console.error('Error verifying password:', error);
        return false;
    }
}

/**
 * Generate a 6-character alphanumeric group code
 * @returns {string}
 */
export function generateGroupCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomBytes = getRandomBytes(6);
    let code = '';

    for (let i = 0; i < 6; i++) {
        code += chars[randomBytes[i] % chars.length];
    }

    return code;
}

/**
 * Generate multiple unique passwords
 * @param {number} count - Number of passwords to generate
 * @returns {string[]}
 */
export function generateUniquePasswords(count) {
    const passwords = new Set();

    while (passwords.size < count) {
        passwords.add(generateTravelerPassword());
    }

    return Array.from(passwords);
}

/**
 * Estimate password strength
 * @param {string} password
 * @returns {Object} { entropy: number, strength: string }
 */
export function estimatePasswordStrength(password) {
    // Base32: 32 possible characters
    // 10 characters = 32^10 = ~1.125 quadrillion combinations
    // Entropy = log2(32^10) = 10 * log2(32) = 10 * 5 = 50 bits

    const length = password.length;
    const charset = 32; // base32
    const entropy = length * Math.log2(charset);

    let strength = 'weak';
    if (entropy >= 50) strength = 'strong';
    else if (entropy >= 40) strength = 'medium';

    return { entropy, strength };
}
