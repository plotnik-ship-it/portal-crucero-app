/**
 * Team Service
 * 
 * Client-side wrapper for Team Management Cloud Functions.
 * Handles invite creation, acceptance, and revocation.
 */

import { httpsCallable } from 'firebase/functions';
import { functions, db } from './firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

// =============================================================================
// Cloud Function Wrappers
// =============================================================================

/**
 * Create a team invite
 * @param {Object} params
 * @param {string} params.agencyId - Agency ID
 * @param {string} params.email - Invitee email
 * @param {string} params.role - Role to assign ('admin' | 'agent')
 * @returns {Promise<{inviteId: string, inviteLink: string}>}
 */
export const createTeamInvite = async ({ agencyId, email, role }) => {
    try {
        const callable = httpsCallable(functions, 'createTeamInvite');
        const result = await callable({ agencyId, email, role });
        return result.data;
    } catch (error) {
        console.error('Error creating team invite:', error);

        // Handle specific error codes
        if (error.code === 'permission-denied') {
            throw new Error('Action not permitted');
        }
        if (error.code === 'already-exists') {
            throw new Error('A pending invite already exists for this email');
        }
        if (error.code === 'invalid-argument') {
            throw new Error(error.message || 'Invalid input');
        }

        throw new Error('Failed to create invite. Please try again.');
    }
};

/**
 * Accept a team invite
 * @param {Object} params
 * @param {string} params.agencyId - Agency ID
 * @param {string} params.inviteId - Invite ID
 * @param {string} params.token - Invite token
 * @returns {Promise<{ok: boolean}>}
 */
export const acceptTeamInvite = async ({ agencyId, inviteId, token }) => {
    try {
        const callable = httpsCallable(functions, 'acceptTeamInvite');
        const result = await callable({ agencyId, inviteId, token });
        return result.data;
    } catch (error) {
        console.error('Error accepting team invite:', error);
        // Generic message for all failures to prevent enumeration
        throw new Error('Invalid or expired invite');
    }
};

/**
 * Revoke a pending team invite
 * @param {Object} params
 * @param {string} params.agencyId - Agency ID
 * @param {string} params.inviteId - Invite ID
 * @returns {Promise<{ok: boolean}>}
 */
export const revokeTeamInvite = async ({ agencyId, inviteId }) => {
    try {
        const callable = httpsCallable(functions, 'revokeTeamInvite');
        const result = await callable({ agencyId, inviteId });
        return result.data;
    } catch (error) {
        console.error('Error revoking team invite:', error);

        if (error.code === 'permission-denied') {
            throw new Error('Action not permitted');
        }
        if (error.code === 'not-found') {
            throw new Error('Invite not found');
        }
        if (error.code === 'failed-precondition') {
            throw new Error('Can only revoke pending invites');
        }

        throw new Error('Failed to revoke invite. Please try again.');
    }
};

/**
 * Update a team member's role
 * @param {Object} params
 * @param {string} params.memberUid - Member UID
 * @param {string} params.newRole - New role ('admin' | 'agent')
 * @returns {Promise<{ok: boolean, role: string}>}
 */
export const updateMemberRole = async ({ memberUid, newRole }) => {
    try {
        const callable = httpsCallable(functions, 'updateTeamMemberRole');
        const result = await callable({ memberUid, newRole });
        return result.data;
    } catch (error) {
        console.error('Error updating member role:', error);

        if (error.code === 'permission-denied') {
            throw new Error(error.message || 'Permission denied');
        }
        if (error.code === 'failed-precondition') {
            throw new Error(error.message || 'Cannot perform this action');
        }

        throw new Error('Failed to update role. Please try again.');
    }
};

/**
 * Update a team member's status (activate/deactivate)
 * @param {Object} params
 * @param {string} params.memberUid - Member UID
 * @param {string} params.status - New status ('active' | 'disabled')
 * @returns {Promise<{ok: boolean, status: string}>}
 */
export const updateMemberStatus = async ({ memberUid, status }) => {
    try {
        const callable = httpsCallable(functions, 'updateTeamMemberStatus');
        const result = await callable({ memberUid, status });
        return result.data;
    } catch (error) {
        console.error('Error updating member status:', error);

        if (error.code === 'permission-denied') {
            throw new Error(error.message || 'Permission denied');
        }
        if (error.code === 'failed-precondition') {
            throw new Error(error.message || 'Cannot perform this action');
        }

        throw new Error('Failed to update status. Please try again.');
    }
};

/**
 * Remove a team member from the agency
 * @param {Object} params
 * @param {string} params.memberUid - Member UID
 * @returns {Promise<{ok: boolean}>}
 */
export const removeMember = async ({ memberUid }) => {
    try {
        const callable = httpsCallable(functions, 'removeTeamMember');
        const result = await callable({ memberUid });
        return result.data;
    } catch (error) {
        console.error('Error removing team member:', error);

        if (error.code === 'permission-denied') {
            throw new Error(error.message || 'Permission denied');
        }
        if (error.code === 'failed-precondition') {
            throw new Error(error.message || 'Cannot perform this action');
        }

        throw new Error('Failed to remove member. Please try again.');
    }
};

// =============================================================================
// Firestore Read Helpers
// =============================================================================

/**
 * Get all team members for an agency
 * @param {string} agencyId - Agency ID
 * @returns {Promise<Array>} Array of member objects
 */
export const getTeamMembers = async (agencyId) => {
    try {
        const membersRef = collection(db, `agencies/${agencyId}/members`);
        const q = query(membersRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching team members:', error);
        throw new Error('Failed to load team members');
    }
};

/**
 * Get all pending invites for an agency
 * @param {string} agencyId - Agency ID
 * @returns {Promise<Array>} Array of invite objects
 */
export const getTeamInvites = async (agencyId) => {
    try {
        const invitesRef = collection(db, `agencies/${agencyId}/invites`);
        const q = query(invitesRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching team invites:', error);
        throw new Error('Failed to load invites');
    }
};

/**
 * Parse invite params from URL
 * @param {URLSearchParams} searchParams
 * @returns {{ agencyId: string, inviteId: string, token: string } | null}
 */
export const parseInviteParams = (searchParams) => {
    const agencyId = searchParams.get('agencyId');
    const inviteId = searchParams.get('inviteId');
    const token = searchParams.get('token');

    if (!agencyId || !inviteId || !token) {
        return null;
    }

    return { agencyId, inviteId, token };
};
