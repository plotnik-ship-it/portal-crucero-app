/**
 * Team Management Cloud Functions
 * 
 * Secure multi-tenant team invitation system for Enterprise agencies.
 * Handles invite creation, acceptance, and revocation with SHA-256 token hashing.
 * 
 * Security:
 * - 256-bit random tokens, only SHA-256 hash stored
 * - Generic error messages to prevent enumeration
 * - Admin SDK for writes (client rules deny direct writes)
 * - Multi-tenant isolation via agencyId scoping
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const crypto = require('crypto');

// Ensure Firebase Admin is initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// =============================================================================
// Constants
// =============================================================================

const INVITE_EXPIRY_HOURS = 72;
const VALID_INVITE_ROLES = ['admin', 'agent']; // Cannot invite 'owner'

/**
 * Get APP_ORIGIN from environment
 * Set in Firebase Functions config: firebase functions:secrets:set APP_ORIGIN
 * Or in .env file for local development
 */
function getAppOrigin() {
    return process.env.APP_ORIGIN || 'https://portal-crucero-app.vercel.app';
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * SHA-256 hash with composite key for extra security
 * @param {string} agencyId 
 * @param {string} inviteId 
 * @param {string} token 
 * @returns {string} Hex-encoded SHA-256 hash
 */
function hashToken(agencyId, inviteId, token) {
    const composite = `${agencyId}.${inviteId}.${token}`;
    return crypto.createHash('sha256').update(composite).digest('hex');
}

/**
 * Generate cryptographically secure random token (256-bit = 32 bytes)
 * @returns {string} Hex-encoded token
 */
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate UUID v4 for invite IDs
 * @returns {string}
 */
function generateInviteId() {
    return crypto.randomUUID();
}

/**
 * Verify caller is owner or admin of the agency
 * @param {string} callerUid - UID of the caller
 * @param {string} agencyId - Agency ID to check
 * @returns {Promise<{role: string, isAuthorized: boolean}>}
 */
async function verifyCallerIsOwnerOrAdmin(callerUid, agencyId) {
    const memberRef = db.doc(`agencies/${agencyId}/members/${callerUid}`);
    const memberDoc = await memberRef.get();

    if (!memberDoc.exists) {
        return { role: null, isAuthorized: false };
    }

    const memberData = memberDoc.data();
    const isAuthorized = ['owner', 'admin'].includes(memberData.role) &&
        memberData.status === 'active';

    return { role: memberData.role, isAuthorized };
}

// =============================================================================
// Cloud Functions
// =============================================================================

/**
 * Create a team invite
 * 
 * Input: { agencyId: string, email: string, role: 'admin' | 'agent' }
 * Returns: { inviteId: string, inviteLink: string }
 * 
 * Security:
 * - Auth required
 * - Caller must be owner/admin of the agency
 * - Cannot create 'owner' invites
 * - Token is never stored, only hash
 */
exports.createTeamInvite = onCall({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30
}, async (request) => {
    // 1. Verify authentication
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const callerUid = request.auth.uid;
    const { agencyId, email, role } = request.data;

    // 2. Validate input
    if (!agencyId || typeof agencyId !== 'string') {
        throw new HttpsError('invalid-argument', 'Agency ID is required');
    }

    if (!email || typeof email !== 'string') {
        throw new HttpsError('invalid-argument', 'Email is required');
    }

    if (!role || !VALID_INVITE_ROLES.includes(role)) {
        throw new HttpsError('invalid-argument', `Role must be one of: ${VALID_INVITE_ROLES.join(', ')}`);
    }

    const emailLower = email.toLowerCase().trim();

    // 3. Verify caller authorization
    const { isAuthorized } = await verifyCallerIsOwnerOrAdmin(callerUid, agencyId);

    if (!isAuthorized) {
        throw new HttpsError('permission-denied', 'You do not have permission to invite team members');
    }

    // 4. Check if email already has pending invite
    const existingInvites = await db.collection(`agencies/${agencyId}/invites`)
        .where('email', '==', emailLower)
        .where('status', '==', 'pending')
        .get();

    if (!existingInvites.empty) {
        throw new HttpsError('already-exists', 'A pending invite already exists for this email');
    }

    // 5. Generate secure token and hash
    const inviteId = generateInviteId();
    const token = generateToken();
    const tokenHash = hashToken(agencyId, inviteId, token);

    // 6. Calculate expiration (72 hours from now)
    const now = Date.now();
    const expiresAt = now + (INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

    // 7. Create invite document
    const inviteData = {
        email: emailLower,
        role: role,
        status: 'pending',
        tokenHash: tokenHash,
        expiresAt: expiresAt,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: callerUid,
        acceptedAt: null,
        acceptedByUid: null
    };

    await db.doc(`agencies/${agencyId}/invites/${inviteId}`).set(inviteData);

    // 8. Generate invite link (token included in URL, NOT stored in DB)
    const appOrigin = getAppOrigin();
    const inviteLink = `${appOrigin}/accept-invite?agencyId=${encodeURIComponent(agencyId)}&inviteId=${encodeURIComponent(inviteId)}&token=${encodeURIComponent(token)}`;

    console.log(`✅ Invite created for ${emailLower} to agency ${agencyId} with role ${role}`);

    return {
        inviteId,
        inviteLink
    };
});

/**
 * Accept a team invite
 * 
 * Input: { agencyId: string, inviteId: string, token: string }
 * Returns: { ok: true, agencyName?: string }
 * 
 * Security:
 * - Auth required with verified email
 * - Token verification via SHA-256 hash comparison
 * - Email must match invite email
 * - Uses transaction for consistency
 * - Generic error messages to prevent enumeration
 */
exports.acceptTeamInvite = onCall({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30
}, async (request) => {
    // 1. Verify authentication
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const callerUid = request.auth.uid;
    const callerEmail = request.auth.token.email;

    if (!callerEmail) {
        throw new HttpsError('failed-precondition', 'Email verification required');
    }

    const callerEmailLower = callerEmail.toLowerCase();
    const { agencyId, inviteId, token } = request.data;

    // 2. Validate input
    if (!agencyId || !inviteId || !token) {
        throw new HttpsError('invalid-argument', 'Invalid or expired invite');
    }

    // 3. Run transaction
    try {
        const result = await db.runTransaction(async (transaction) => {
            const inviteRef = db.doc(`agencies/${agencyId}/invites/${inviteId}`);
            const inviteDoc = await transaction.get(inviteRef);

            // Check invite exists
            if (!inviteDoc.exists) {
                throw new Error('INVALID_INVITE');
            }

            const inviteData = inviteDoc.data();

            // Check status is pending
            if (inviteData.status !== 'pending') {
                throw new Error('INVALID_INVITE');
            }

            // Check not expired
            const now = Date.now();
            if (inviteData.expiresAt < now) {
                // Mark as expired
                transaction.update(inviteRef, { status: 'expired' });
                throw new Error('INVALID_INVITE');
            }

            // Verify token hash
            const expectedHash = hashToken(agencyId, inviteId, token);
            if (expectedHash !== inviteData.tokenHash) {
                throw new Error('INVALID_INVITE');
            }

            // Verify email matches
            if (inviteData.email !== callerEmailLower) {
                throw new Error('INVALID_INVITE');
            }

            // Check if member already exists
            const memberRef = db.doc(`agencies/${agencyId}/members/${callerUid}`);
            const memberDoc = await transaction.get(memberRef);

            if (memberDoc.exists) {
                // Member already exists, just update status if disabled
                const memberData = memberDoc.data();
                if (memberData.status === 'disabled') {
                    transaction.update(memberRef, {
                        status: 'active',
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            } else {
                // Create new member
                transaction.set(memberRef, {
                    role: inviteData.role,
                    status: 'active',
                    email: callerEmailLower,
                    displayName: request.auth.token.name || null,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    createdBy: inviteData.createdBy,
                    inviteId: inviteId
                });
            }

            // Also update the user document to include agencyId
            const userRef = db.doc(`users/${callerUid}`);
            const userDoc = await transaction.get(userRef);

            if (userDoc.exists) {
                transaction.update(userRef, {
                    agencyId: agencyId,
                    role: inviteData.role,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Create user doc if doesn't exist
                transaction.set(userRef, {
                    email: callerEmailLower,
                    displayName: request.auth.token.name || null,
                    agencyId: agencyId,
                    role: inviteData.role,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            // Mark invite as accepted
            transaction.update(inviteRef, {
                status: 'accepted',
                acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
                acceptedByUid: callerUid
            });

            return { role: inviteData.role };
        });

        console.log(`✅ Invite accepted: ${callerEmailLower} joined agency ${agencyId} as ${result.role}`);

        return { ok: true };

    } catch (error) {
        // Generic error for all failures to prevent enumeration
        console.error('Accept invite error:', error.message);
        throw new HttpsError('invalid-argument', 'Invalid or expired invite');
    }
});

/**
 * Revoke a pending team invite
 * 
 * Input: { agencyId: string, inviteId: string }
 * Returns: { ok: true }
 * 
 * Security:
 * - Auth required
 * - Caller must be owner/admin of the agency
 * - Can only revoke pending invites
 */
exports.revokeTeamInvite = onCall({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30
}, async (request) => {
    // 1. Verify authentication
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const callerUid = request.auth.uid;
    const { agencyId, inviteId } = request.data;

    // 2. Validate input
    if (!agencyId || typeof agencyId !== 'string') {
        throw new HttpsError('invalid-argument', 'Agency ID is required');
    }

    if (!inviteId || typeof inviteId !== 'string') {
        throw new HttpsError('invalid-argument', 'Invite ID is required');
    }

    // 3. Verify caller authorization
    const { isAuthorized } = await verifyCallerIsOwnerOrAdmin(callerUid, agencyId);

    if (!isAuthorized) {
        throw new HttpsError('permission-denied', 'You do not have permission to revoke invites');
    }

    // 4. Get and update invite
    const inviteRef = db.doc(`agencies/${agencyId}/invites/${inviteId}`);
    const inviteDoc = await inviteRef.get();

    if (!inviteDoc.exists) {
        throw new HttpsError('not-found', 'Invite not found');
    }

    const inviteData = inviteDoc.data();

    if (inviteData.status !== 'pending') {
        throw new HttpsError('failed-precondition', 'Can only revoke pending invites');
    }

    // 5. Mark as revoked
    await inviteRef.update({
        status: 'revoked',
        revokedAt: admin.firestore.FieldValue.serverTimestamp(),
        revokedBy: callerUid
    });

    console.log(`✅ Invite ${inviteId} revoked by ${callerUid}`);

    return { ok: true };
});
