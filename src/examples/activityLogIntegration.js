/**
 * Example: How to integrate Activity Logging into existing services
 * 
 * This file demonstrates how to add activity logging to your payment,
 * family, and settings operations.
 */

import { logActivity, ACTIVITY_TYPES, SEVERITY_LEVELS } from '../services/activityLogService';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

// ============================================
// Example 1: Log Payment Applied
// ============================================

export const applyPaymentWithLogging = async (familyId, paymentData, familyData) => {
    try {
        // 1. Apply the payment (existing logic)
        const paymentRef = await addDoc(collection(db, 'payments'), {
            ...paymentData,
            familyId,
            createdAt: serverTimestamp()
        });

        // 2. Update family balance
        const newBalance = familyData.balanceCad - paymentData.amountCad;
        await updateDoc(doc(db, 'families', familyId), {
            balanceCad: newBalance,
            updatedAt: serverTimestamp()
        });

        // 3. LOG THE ACTIVITY
        await logActivity({
            action: ACTIVITY_TYPES.PAYMENT_APPLIED,
            entityType: 'family',
            entityId: familyId,
            entityName: familyData.familyCode,
            details: {
                amount: paymentData.amountCad,
                method: paymentData.paymentMethod,
                previousBalance: familyData.balanceCad,
                newBalance,
                notes: paymentData.notes,
                paymentId: paymentRef.id
            },
            severity: SEVERITY_LEVELS.INFO
        });

        return paymentRef.id;
    } catch (error) {
        console.error('Error applying payment:', error);
        throw error;
    }
};

// ============================================
// Example 2: Log Family Created
// ============================================

export const createFamilyWithLogging = async (familyData) => {
    try {
        // 1. Create family (existing logic)
        const familyRef = await addDoc(collection(db, 'families'), {
            ...familyData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        // 2. LOG THE ACTIVITY
        await logActivity({
            action: ACTIVITY_TYPES.FAMILY_CREATED,
            entityType: 'family',
            entityId: familyRef.id,
            entityName: familyData.familyCode,
            details: {
                groupId: familyData.groupId,
                cabinNumber: familyData.cabinNumber,
                totalCost: familyData.totalCostCad,
                passengers: familyData.passengers
            },
            severity: SEVERITY_LEVELS.INFO,
            relatedEntities: [
                {
                    type: 'group',
                    id: familyData.groupId,
                    name: familyData.groupName
                }
            ]
        });

        return familyRef.id;
    } catch (error) {
        console.error('Error creating family:', error);
        throw error;
    }
};

// ============================================
// Example 3: Log Family Deleted (Critical)
// ============================================

export const deleteBookingWithLogging = async (familyId, familyData, reason) => {
    try {
        // 1. Delete family (existing logic)
        await deleteDoc(doc(db, 'families', familyId));

        // 2. LOG THE ACTIVITY (CRITICAL severity)
        await logActivity({
            action: ACTIVITY_TYPES.FAMILY_DELETED,
            entityType: 'family',
            entityId: familyId,
            entityName: familyData.familyCode,
            details: {
                reason,
                cabinNumber: familyData.cabinNumber,
                totalCost: familyData.totalCostCad,
                balance: familyData.balanceCad
            },
            severity: SEVERITY_LEVELS.CRITICAL // Critical action!
        });

    } catch (error) {
        console.error('Error deleting family:', error);
        throw error;
    }
};

// ============================================
// Example 4: Log Branding Updated
// ============================================

export const updateBrandingWithLogging = async (agencyId, brandingData, previousBranding) => {
    try {
        // 1. Update branding (existing logic)
        await updateDoc(doc(db, 'agencies', agencyId), {
            branding: brandingData,
            updatedAt: serverTimestamp()
        });

        // 2. Determine what changed
        const changes = {};
        if (brandingData.logo !== previousBranding.logo) {
            changes.logo = true;
        }
        if (brandingData.primaryColor !== previousBranding.primaryColor) {
            changes.primaryColor = {
                old: previousBranding.primaryColor,
                new: brandingData.primaryColor
            };
        }
        if (brandingData.portalName !== previousBranding.portalName) {
            changes.portalName = {
                old: previousBranding.portalName,
                new: brandingData.portalName
            };
        }

        // 3. LOG THE ACTIVITY
        await logActivity({
            action: ACTIVITY_TYPES.BRANDING_UPDATED,
            entityType: 'agency',
            entityId: agencyId,
            entityName: 'Agency Branding',
            details: { changes },
            severity: SEVERITY_LEVELS.INFO
        });

    } catch (error) {
        console.error('Error updating branding:', error);
        throw error;
    }
};

// ============================================
// Example 5: Log Payment Request Approved
// ============================================

export const approvePaymentRequestWithLogging = async (requestId, requestData) => {
    try {
        // 1. Update request status
        await updateDoc(doc(db, 'paymentRequests', requestId), {
            status: 'approved',
            approvedAt: serverTimestamp()
        });

        // 2. LOG THE ACTIVITY
        await logActivity({
            action: ACTIVITY_TYPES.PAYMENT_REQUEST_APPROVED,
            entityType: 'family',
            entityId: requestData.familyId,
            entityName: requestData.familyCode,
            details: {
                requestId,
                requestedAmount: requestData.amount,
                approvedAmount: requestData.amount,
                method: requestData.method
            },
            severity: SEVERITY_LEVELS.INFO
        });

    } catch (error) {
        console.error('Error approving payment request:', error);
        throw error;
    }
};

// ============================================
// Example 6: Log Login (in auth service)
// ============================================

export const logLoginActivity = async (method = 'email') => {
    try {
        await logActivity({
            action: ACTIVITY_TYPES.LOGIN,
            entityType: 'user',
            entityId: 'self',
            entityName: 'Current User',
            details: {
                method,
                success: true
            },
            severity: SEVERITY_LEVELS.INFO
        });
    } catch (error) {
        console.error('Error logging login:', error);
        // Don't throw - logging should not break login
    }
};

// ============================================
// Example 7: Log Failed Login Attempt
// ============================================

export const logFailedLoginAttempt = async (email, reason) => {
    try {
        await logActivity({
            action: ACTIVITY_TYPES.LOGIN_FAILED,
            entityType: 'user',
            entityId: 'unknown',
            entityName: email,
            details: {
                email,
                reason,
                attempts: 1
            },
            severity: SEVERITY_LEVELS.WARNING
        });
    } catch (error) {
        console.error('Error logging failed login:', error);
    }
};

// ============================================
// Best Practices
// ============================================

/**
 * BEST PRACTICES FOR ACTIVITY LOGGING:
 *
 * 1. Always log AFTER the action succeeds
 *    - Don't log before the action in case it fails
 *
 * 2. Use appropriate severity levels
 *    - INFO: Normal operations (payments, updates)
 *    - WARNING: Suspicious or unusual (failed logins, rejections)
 *    - CRITICAL: Destructive actions (deletes, major changes)
 *
 * 3. Include relevant details
 *    - Before/after values for updates
 *    - Amounts for payments
 *    - Reasons for rejections/deletions
 *
 * 4. Don't throw errors from logging
 *    - Logging failures should not break main functionality
 *    - Wrap in try-catch and just log errors
 *
 * 5. Use consistent entity naming
 *    - Use familyCode for families
 *    - Use email for users
 *    - Use descriptive names for settings
 *
 * 6. Add related entities when relevant
 *    - Link families to groups
 *    - Link payments to families
 *    - Helps with cross-referencing
 */

// ============================================
// Integration Checklist
// ============================================

/**
 * TO INTEGRATE ACTIVITY LOGGING:
 * 
 * 1. Import the service
 *    import { logActivity, ACTIVITY_TYPES } from '../services/activityLogService';
 * 
 * 2. Add logging after successful operations
 *    await logActivity({ ... });
 * 
 * 3. Choose appropriate activity type
 *    Use ACTIVITY_TYPES constants
 * 
 * 4. Set correct severity
 *    INFO (default), WARNING, or CRITICAL
 * 
 * 5. Include meaningful details
 *    What changed, amounts, reasons, etc.
 * 
 * 6. Test the integration
 *    Perform action → Check /admin/activity-log
 */
