/**
 * Traveler Authentication Service - v1.1 CORRECTED
 * 
 * Security improvements:
 * - PBKDF2-SHA256 password verification with salt
 * - Client-side rate limiting (best-effort)
 * - Auth subcollection for data separation
 * - Hash metadata for versioning
 * - 24-hour session expiry
 * 
 * IMPORTANT SECURITY NOTES:
 * - Client-side verification is vulnerable to offline attacks
 * - Rate limiting is best-effort (can be bypassed)
 * - Phase 2 will move verification to Cloud Functions
 */

import { collection, query, where, getDocs, limit, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { verifyPassword } from './passwordService';

// Rate limiting constants (CLIENT-SIDE ONLY)
const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check and enforce rate limiting (CLIENT-SIDE ONLY - can be bypassed)
 * @param {string} bookingId
 * @returns {boolean} true if allowed, false if rate limited
 */
function checkRateLimit(bookingId) {
    const key = `traveler_attempts_${bookingId}`;
    const attemptsData = localStorage.getItem(key);

    if (!attemptsData) {
        return true;
    }

    try {
        const { count, firstAttempt } = JSON.parse(attemptsData);
        const elapsed = Date.now() - firstAttempt;

        // Reset if cooldown period has passed
        if (elapsed > COOLDOWN_MS) {
            localStorage.removeItem(key);
            return true;
        }

        // Check if exceeded max attempts
        if (count >= MAX_ATTEMPTS) {
            const remainingMs = COOLDOWN_MS - elapsed;
            const remainingMin = Math.ceil(remainingMs / 60000);
            throw new Error(`RATE_LIMITED:${remainingMin}`);
        }

        return true;
    } catch (error) {
        if (error.message.startsWith('RATE_LIMITED')) {
            throw error;
        }
        localStorage.removeItem(key);
        return true;
    }
}

/**
 * Record failed login attempt (CLIENT-SIDE)
 * @param {string} bookingId
 */
function recordFailedAttempt(bookingId) {
    const key = `traveler_attempts_${bookingId}`;
    const attemptsData = localStorage.getItem(key);

    if (!attemptsData) {
        localStorage.setItem(key, JSON.stringify({
            count: 1,
            firstAttempt: Date.now()
        }));
    } else {
        try {
            const data = JSON.parse(attemptsData);
            data.count++;
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            localStorage.setItem(key, JSON.stringify({
                count: 1,
                firstAttempt: Date.now()
            }));
        }
    }
}

/**
 * Clear failed attempts on successful login
 * @param {string} bookingId
 */
function clearFailedAttempts(bookingId) {
    const key = `traveler_attempts_${bookingId}`;
    localStorage.removeItem(key);
}

/**
 * Resolve group by groupCode within an agency
 * @param {string} agencyId
 * @param {string} groupCode
 * @returns {Promise<{id: string, data: object} | null>}
 */
export async function resolveGroupByCode(agencyId, groupCode) {
    if (!agencyId || !groupCode) {
        throw new Error('Agency ID and Group Code are required');
    }

    const normalizedCode = groupCode.trim().toUpperCase();

    try {
        const groupsRef = collection(db, 'groups');
        const q = query(
            groupsRef,
            where('agencyId', '==', agencyId),
            where('groupCode', '==', normalizedCode),
            limit(1)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return null;
        }

        const docSnap = snapshot.docs[0];
        return {
            id: docSnap.id,
            data: docSnap.data()
        };
    } catch (error) {
        console.error('Error resolving group by code:', error);
        throw new Error('Failed to resolve group: ' + error.message);
    }
}

/**
 * Resolve booking by bookingCode within a group
 * Returns ONLY the booking ID and minimal data
 * 
 * @param {string} agencyId
 * @param {string} groupId
 * @param {string} bookingCode
 * @returns {Promise<{id: string, displayName: string} | null>}
 */
export async function resolveBookingByCode(agencyId, groupId, bookingCode) {
    if (!agencyId || !groupId || !bookingCode) {
        throw new Error('Agency ID, Group ID, and Booking Code are required');
    }

    const normalizedCode = bookingCode.trim().toUpperCase();

    try {
        const bookingsRef = collection(db, 'bookings');
        const q = query(
            bookingsRef,
            where('agencyId', '==', agencyId),
            where('groupId', '==', groupId),
            where('bookingCode', '==', normalizedCode),
            limit(1)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return null;
        }

        const docSnap = snapshot.docs[0];
        const data = docSnap.data();

        // Return ONLY minimal data
        return {
            id: docSnap.id,
            displayName: data.displayName || 'Unknown Booking'
        };
    } catch (error) {
        console.error('Error resolving booking by code:', error);
        throw new Error('Failed to resolve booking: ' + error.message);
    }
}

/**
 * Get booking auth data from auth subcollection
 * Path: bookings/{bookingId}/auth/public
 * 
 * @param {string} bookingId
 * @returns {Promise<{hash: string, salt: string, hashAlgo: string, hashIterations: number, hashVersion: string}>}
 */
async function getBookingAuthData(bookingId) {
    try {
        const authRef = doc(db, 'bookings', bookingId, 'auth', 'public');
        const authSnap = await getDoc(authRef);

        if (!authSnap.exists()) {
            throw new Error('AUTH_NOT_FOUND');
        }

        const data = authSnap.data();

        return {
            hash: data.travelerPasswordHash || null,
            salt: data.travelerPasswordSalt || null,
            hashAlgo: data.hashAlgo || 'pbkdf2-sha256',
            hashIterations: data.hashIterations || 150000,
            saltBytes: data.saltBytes || 32,
            hashVersion: data.hashVersion || 'v1.1'
        };
    } catch (error) {
        console.error('Error getting booking auth data:', error);
        throw error;
    }
}

/**
 * Traveler login flow - v1.1 CORRECTED
 * 
 * Steps:
 * 1. Find group by groupCode
 * 2. Find booking by bookingCode (minimal data only)
 * 3. Check rate limiting (CLIENT-SIDE ONLY)
 * 4. Get auth data from auth subcollection
 * 5. Verify password with PBKDF2 + salt
 * 6. Create minimal session (24h expiry)
 * 
 * SECURITY NOTES:
 * - Client-side verification can be attacked offline
 * - Rate limiting is best-effort (can be bypassed)
 * - Phase 2 will use Cloud Functions for server-side verification
 * 
 * @param {Object} credentials
 * @param {string} credentials.agencyId
 * @param {string} credentials.groupCode
 * @param {string} credentials.bookingCode
 * @param {string} credentials.password
 * @returns {Promise<Object>} Session object
 */
export async function travelerLogin({ agencyId, groupCode, bookingCode, password }) {
    if (!agencyId) {
        throw new Error('Agency context is required');
    }

    if (!groupCode || !bookingCode || !password) {
        throw new Error('Group Code, Booking Code, and Password are required');
    }

    const normalizedGroupCode = groupCode.trim().toUpperCase();
    const normalizedBookingCode = bookingCode.trim().toUpperCase();

    try {
        // Step 1: Find group by groupCode
        console.log('🔍 Looking for group:', normalizedGroupCode);
        const group = await resolveGroupByCode(agencyId, normalizedGroupCode);

        if (!group) {
            throw new Error('INVALID_GROUP_CODE');
        }

        console.log('✅ Group found:', group.id);

        // Step 2: Find booking by bookingCode (minimal data)
        console.log('🔍 Looking for booking:', normalizedBookingCode);
        const booking = await resolveBookingByCode(agencyId, group.id, normalizedBookingCode);

        if (!booking) {
            throw new Error('INVALID_BOOKING_CODE');
        }

        console.log('✅ Booking found:', booking.id);

        // Step 3: Check rate limiting (CLIENT-SIDE ONLY)
        checkRateLimit(booking.id);

        // Step 4: Get auth data from subcollection
        console.log('🔐 Getting auth data from subcollection...');
        const authData = await getBookingAuthData(booking.id);

        if (!authData.hash || !authData.salt) {
            throw new Error('BOOKING_NO_PASSWORD');
        }

        // Step 5: Verify password with PBKDF2 + salt
        console.log('🔐 Verifying password with PBKDF2...');
        const passwordValid = await verifyPassword(password, authData.hash, authData.salt);

        if (!passwordValid) {
            recordFailedAttempt(booking.id);
            throw new Error('INVALID_PASSWORD');
        }

        console.log('✅ Password verified');

        // Clear failed attempts on success
        clearFailedAttempts(booking.id);

        // Step 6: Create minimal session (24h expiry, no PII)
        const session = {
            type: 'traveler',
            agencyId: agencyId,
            groupId: group.id,
            groupCode: normalizedGroupCode,
            bookingId: booking.id,
            bookingCode: normalizedBookingCode,
            issuedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString()
        };

        localStorage.setItem('travelerSession', JSON.stringify(session));

        console.log('✅ Traveler session created (24h expiry)');

        return session;
    } catch (error) {
        console.error('Traveler login error:', error);

        if (error.message === 'INVALID_GROUP_CODE') {
            throw new Error('Invalid Group Code. Please check and try again.');
        }
        if (error.message === 'INVALID_BOOKING_CODE') {
            throw new Error('Invalid Booking Code. Please check and try again.');
        }
        if (error.message === 'INVALID_PASSWORD') {
            throw new Error('Invalid Password. Please check and try again.');
        }
        if (error.message === 'BOOKING_NO_PASSWORD' || error.message === 'AUTH_NOT_FOUND') {
            throw new Error('This booking has not been set up yet. Please contact your travel agency.');
        }
        if (error.message.startsWith('RATE_LIMITED:')) {
            const minutes = error.message.split(':')[1];
            throw new Error(`Too many failed attempts. Please try again in ${minutes} minutes.`);
        }

        throw error;
    }
}

/**
 * Get current traveler session
 * @returns {Object | null}
 */
export function getTravelerSession() {
    try {
        const sessionStr = localStorage.getItem('travelerSession');
        if (!sessionStr) {
            return null;
        }

        const session = JSON.parse(sessionStr);

        if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
            localStorage.removeItem('travelerSession');
            return null;
        }

        return session;
    } catch (error) {
        console.error('Error reading traveler session:', error);
        localStorage.removeItem('travelerSession');
        return null;
    }
}

/**
 * Clear traveler session (logout)
 */
export function clearTravelerSession() {
    localStorage.removeItem('travelerSession');
}

/**
 * Check if user is logged in as traveler
 * @returns {boolean}
 */
export function isTravelerLoggedIn() {
    return getTravelerSession() !== null;
}

/**
 * Require traveler session (for route guards)
 * @returns {Object} Session object
 * @throws {Error} If not logged in
 */
export function requireTravelerSession() {
    const session = getTravelerSession();
    if (!session) {
        throw new Error('TRAVELER_NOT_LOGGED_IN');
    }
    return session;
}
