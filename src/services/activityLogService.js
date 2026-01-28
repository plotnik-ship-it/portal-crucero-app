import { collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getAuth } from 'firebase/auth';

// ============================================
// Activity Type Constants
// ============================================

export const ACTIVITY_TYPES = {
    // Payments
    PAYMENT_APPLIED: 'payment_applied',
    PAYMENT_EDITED: 'payment_edited',
    PAYMENT_DELETED: 'payment_deleted',
    PAYMENT_REQUEST_CREATED: 'payment_request_created',
    PAYMENT_REQUEST_APPROVED: 'payment_request_approved',
    PAYMENT_REQUEST_REJECTED: 'payment_request_rejected',

    // Families
    FAMILY_CREATED: 'family_created',
    FAMILY_UPDATED: 'family_updated',
    FAMILY_DELETED: 'family_deleted',
    FAMILY_STATUS_CHANGED: 'family_status_changed',

    // Documents
    CONFIRMATION_UPLOADED: 'confirmation_uploaded',
    INVOICE_GENERATED: 'invoice_generated',
    DOCUMENT_DELETED: 'document_deleted',

    // Settings
    BRANDING_UPDATED: 'branding_updated',
    EMAIL_SETTINGS_UPDATED: 'email_settings_updated',
    USER_CREATED: 'user_created',
    USER_UPDATED: 'user_updated',
    USER_DELETED: 'user_deleted',

    // Auth
    LOGIN: 'login',
    LOGOUT: 'logout',
    PASSWORD_CHANGED: 'password_changed',
    LOGIN_FAILED: 'login_failed',

    // Groups
    GROUP_CREATED: 'group_created',
    GROUP_UPDATED: 'group_updated',
    GROUP_DELETED: 'group_deleted'
};

// ============================================
// Activity Categories
// ============================================

export const ACTIVITY_CATEGORIES = {
    PAYMENT: 'payment',
    FAMILY: 'family',
    DOCUMENT: 'document',
    SETTINGS: 'settings',
    AUTH: 'auth',
    GROUP: 'group',
    OTHER: 'other'
};

// ============================================
// Severity Levels
// ============================================

export const SEVERITY_LEVELS = {
    INFO: 'info',
    WARNING: 'warning',
    CRITICAL: 'critical'
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get action category from action type
 */
function getActionCategory(action) {
    if (action.startsWith('payment_')) return ACTIVITY_CATEGORIES.PAYMENT;
    if (action.startsWith('family_')) return ACTIVITY_CATEGORIES.FAMILY;
    if (action.startsWith('group_')) return ACTIVITY_CATEGORIES.GROUP;
    if (action.startsWith('confirmation_') || action.startsWith('invoice_') || action.startsWith('document_')) {
        return ACTIVITY_CATEGORIES.DOCUMENT;
    }
    if (action.startsWith('branding_') || action.startsWith('email_') || action.startsWith('user_')) {
        return ACTIVITY_CATEGORIES.SETTINGS;
    }
    if (action.startsWith('login') || action.startsWith('logout') || action.startsWith('password_')) {
        return ACTIVITY_CATEGORIES.AUTH;
    }
    return ACTIVITY_CATEGORIES.OTHER;
}

/**
 * Get client IP address (best effort)
 */
async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json', {
            timeout: 2000
        });
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return 'unknown';
    }
}

// ============================================
// Main Logging Function
// ============================================

/**
 * Log an activity
 * @param {Object} params - Activity parameters
 * @param {string} params.action - Activity type (use ACTIVITY_TYPES constants)
 * @param {string} params.entityType - Type of entity (family, payment, group, etc.)
 * @param {string} params.entityId - Entity ID
 * @param {string} params.entityName - Entity name/identifier for display
 * @param {Object} params.details - Activity-specific details
 * @param {string} params.severity - Severity level (optional, defaults to INFO)
 * @param {Array} params.relatedEntities - Related entities (optional)
 */
export const logActivity = async ({
    action,
    entityType,
    entityId,
    entityName,
    details = {},
    severity = SEVERITY_LEVELS.INFO,
    relatedEntities = []
}) => {
    try {
        // Get current user from auth
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
            console.warn('Cannot log activity: No authenticated user');
            return null;
        }

        // Get user data for agency and name
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            console.warn('Cannot log activity: User document not found');
            return null;
        }

        const userData = userDoc.data();

        if (!userData.agencyId) {
            console.warn('Cannot log activity: User has no agencyId');
            return null;
        }

        // Determine category from action
        const category = getActionCategory(action);

        // Get client IP (async, don't wait for it)
        const ipPromise = getClientIP();

        // Create activity log entry
        const activityData = {
            // Agency & User Info
            agencyId: userData.agencyId,
            userId: user.uid,
            userName: userData.name || user.displayName || 'Unknown User',
            userEmail: user.email,
            userRole: userData.role || 'unknown',

            // Action Info
            action,
            actionCategory: category,
            severity,

            // Entity Info
            entityType,
            entityId,
            entityName,

            // Details
            details,

            // Metadata
            timestamp: serverTimestamp(),
            userAgent: navigator.userAgent,

            // Related entities (optional)
            relatedEntities: relatedEntities.length > 0 ? relatedEntities : null
        };

        // Add IP address if available quickly
        const ip = await Promise.race([
            ipPromise,
            new Promise(resolve => setTimeout(() => resolve('unknown'), 1000))
        ]);
        activityData.ipAddress = ip;

        // Add to Firestore
        const docRef = await addDoc(collection(db, 'activityLog'), activityData);

        console.log(`✅ Activity logged: ${action} for ${entityType}/${entityId}`);
        return docRef.id;

    } catch (error) {
        console.error('Error logging activity:', error);
        // Don't throw - logging should not break the main flow
        return null;
    }
};

// ============================================
// Query Functions
// ============================================

/**
 * Get activity logs with filters
 * @param {string} agencyId - Agency ID to filter by
 * @param {Object} filters - Filter options
 * @param {Date} filters.startDate - Start date for filtering
 * @param {Date} filters.endDate - End date for filtering
 * @param {string} filters.actionType - Specific action type
 * @param {string} filters.actionCategory - Action category
 * @param {string} filters.userId - User ID
 * @param {string} filters.entityType - Entity type
 * @param {string} filters.entityId - Specific entity ID
 * @param {string} filters.severity - Severity level
 * @param {number} filters.limitCount - Max number of results (default 50)
 * @returns {Promise<Array>} Array of activity log entries
 */
export const getActivityLogs = async (agencyId, filters = {}) => {
    try {
        if (!agencyId) {
            throw new Error('Agency ID is required to get activity logs');
        }

        const {
            startDate,
            endDate,
            actionType,
            actionCategory,
            userId,
            entityType,
            entityId,
            severity,
            limitCount = 50
        } = filters;

        // Build query constraints
        const constraints = [
            where('agencyId', '==', agencyId),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
        ];

        // Add optional filters
        if (actionType) {
            constraints.splice(1, 0, where('action', '==', actionType));
        }

        if (actionCategory) {
            constraints.splice(1, 0, where('actionCategory', '==', actionCategory));
        }

        if (userId) {
            constraints.splice(1, 0, where('userId', '==', userId));
        }

        if (entityType) {
            constraints.splice(1, 0, where('entityType', '==', entityType));
        }

        if (entityId) {
            constraints.splice(1, 0, where('entityId', '==', entityId));
        }

        if (severity) {
            constraints.splice(1, 0, where('severity', '==', severity));
        }

        const q = query(collection(db, 'activityLog'), ...constraints);
        const snapshot = await getDocs(q);

        let logs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Client-side date filtering (Firestore has limitations with multiple where clauses)
        if (startDate || endDate) {
            logs = logs.filter(log => {
                const logDate = log.timestamp?.toDate();
                if (!logDate) return false;

                if (startDate && logDate < startDate) return false;
                if (endDate && logDate > endDate) return false;

                return true;
            });
        }

        return logs;
    } catch (error) {
        console.error('Error getting activity logs:', error);
        throw error;
    }
};

/**
 * Get activity logs for a specific entity
 * @param {string} agencyId - Agency ID
 * @param {string} entityType - Entity type (family, payment, etc.)
 * @param {string} entityId - Entity ID
 * @returns {Promise<Array>} Array of activity logs for the entity
 */
export const getActivityLogsByEntity = async (agencyId, entityType, entityId) => {
    try {
        if (!agencyId) {
            throw new Error('Agency ID is required');
        }

        const q = query(
            collection(db, 'activityLog'),
            where('agencyId', '==', agencyId),
            where('entityType', '==', entityType),
            where('entityId', '==', entityId),
            orderBy('timestamp', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting entity activity logs:', error);
        throw error;
    }
};

/**
 * Get recent activity feed
 * @param {string} agencyId - Agency ID
 * @param {number} limitCount - Number of recent activities (default 20)
 * @returns {Promise<Array>} Recent activity logs
 */
export const getRecentActivity = async (agencyId, limitCount = 20) => {
    return getActivityLogs(agencyId, { limitCount });
};

// ============================================
// Formatting & Display Functions
// ============================================

/**
 * Format activity message for display
 * @param {Object} log - Activity log entry
 * @returns {string} Formatted message
 */
export const formatActivityMessage = (log) => {
    const { action, userName, entityName, details } = log;

    switch (action) {
        // Payments
        case ACTIVITY_TYPES.PAYMENT_APPLIED:
            return `${userName} applied $${details.amount} to ${entityName}`;

        case ACTIVITY_TYPES.PAYMENT_EDITED:
            return `${userName} edited payment for ${entityName}`;

        case ACTIVITY_TYPES.PAYMENT_DELETED:
            return `${userName} deleted payment for ${entityName}`;

        case ACTIVITY_TYPES.PAYMENT_REQUEST_APPROVED:
            return `${userName} approved payment request from ${entityName}`;

        case ACTIVITY_TYPES.PAYMENT_REQUEST_REJECTED:
            return `${userName} rejected payment request from ${entityName}`;

        // Families
        case ACTIVITY_TYPES.FAMILY_CREATED:
            return `${userName} created family ${entityName}`;

        case ACTIVITY_TYPES.FAMILY_UPDATED:
            return `${userName} updated family ${entityName}`;

        case ACTIVITY_TYPES.FAMILY_DELETED:
            return `${userName} deleted family ${entityName}`;

        // Documents
        case ACTIVITY_TYPES.CONFIRMATION_UPLOADED:
            return `${userName} uploaded confirmation for ${entityName}`;

        case ACTIVITY_TYPES.INVOICE_GENERATED:
            return `${userName} generated invoice for ${entityName}`;

        // Settings
        case ACTIVITY_TYPES.BRANDING_UPDATED:
            return `${userName} updated agency branding`;

        case ACTIVITY_TYPES.EMAIL_SETTINGS_UPDATED:
            return `${userName} updated email settings`;

        case ACTIVITY_TYPES.USER_CREATED:
            return `${userName} created user ${details.newUserEmail}`;

        // Auth
        case ACTIVITY_TYPES.LOGIN:
            return `${userName} logged in`;

        case ACTIVITY_TYPES.LOGOUT:
            return `${userName} logged out`;

        case ACTIVITY_TYPES.LOGIN_FAILED:
            return `Failed login attempt for ${details.email}`;

        // Groups
        case ACTIVITY_TYPES.GROUP_CREATED:
            return `${userName} created group ${entityName}`;

        case ACTIVITY_TYPES.GROUP_UPDATED:
            return `${userName} updated group ${entityName}`;

        default:
            return `${userName} performed ${action.replace(/_/g, ' ')}`;
    }
};

/**
 * Get icon for activity type
 * @param {string} action - Activity action type
 * @returns {string} Emoji icon
 */
export const getActivityIcon = (action) => {
    if (action.startsWith('payment_')) return '💰';
    if (action.startsWith('family_')) return '👨‍👩‍👧‍👦';
    if (action.startsWith('group_')) return '👥';
    if (action.startsWith('confirmation_') || action.startsWith('invoice_')) return '📄';
    if (action.startsWith('branding_') || action.startsWith('email_')) return '🎨';
    if (action.startsWith('user_')) return '👤';
    if (action.startsWith('login') || action.startsWith('logout')) return '🔐';
    if (action.startsWith('password_')) return '🔑';
    return '📝';
};

/**
 * Get color for severity level
 * @param {string} severity - Severity level
 * @returns {string} CSS color class
 */
export const getSeverityColor = (severity) => {
    switch (severity) {
        case SEVERITY_LEVELS.INFO:
            return 'severity-info';
        case SEVERITY_LEVELS.WARNING:
            return 'severity-warning';
        case SEVERITY_LEVELS.CRITICAL:
            return 'severity-critical';
        default:
            return 'severity-info';
    }
};

/**
 * Format timestamp for display
 * @param {Timestamp} timestamp - Firestore timestamp
 * @returns {string} Formatted time string
 */
export const formatActivityTime = (timestamp) => {
    if (!timestamp) return 'Unknown time';

    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
};
