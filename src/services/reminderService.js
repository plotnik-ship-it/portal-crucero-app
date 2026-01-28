import { parseISO, isBefore, isAfter, addDays, differenceInDays } from 'date-fns';
import { sendMassEmail } from './emailService';
import { db } from './firebase';
import { collection, addDoc, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { getTemplateId, getLocalizedEmailText } from './emailLanguageHelper';


/**
 * Get families with upcoming payment deadlines
 * @param {Array} families - Array of family objects
 * @param {number} days - Number of days to look ahead
 * @returns {Array} Families with deadlines in the next N days
 */
export const getFamiliesWithUpcomingDeadlines = (families, days) => {
    const today = new Date();
    const targetDate = addDays(today, days);
    const results = [];

    families.forEach(family => {
        family.cabinAccounts?.forEach(cabin => {
            cabin.paymentDeadlines?.forEach(deadline => {
                if (!deadline.dueDate) return;

                const dueDate = parseISO(deadline.dueDate);
                const isPaid = deadline.status === 'paid';

                // Skip if already paid
                if (isPaid) return;

                // Check if deadline is within the target range
                const daysUntil = differenceInDays(dueDate, today);

                if (daysUntil >= 0 && daysUntil <= days) {
                    results.push({
                        family: {
                            id: family.id,
                            bookingCode: family.bookingCode,
                            displayName: family.displayName,
                            email: family.email,
                            balanceCadGlobal: family.balanceCadGlobal,
                            shipName: family.shipName,
                            sailDate: family.sailDate
                        },
                        deadline: {
                            label: deadline.label,
                            dueDate: deadline.dueDate,
                            amountCad: deadline.amountCad,
                            cabinNumber: cabin.cabinNumber
                        },
                        daysUntil,
                        isUrgent: daysUntil <= 1
                    });
                }
            });
        });
    });

    // Sort by days until deadline (most urgent first)
    return results.sort((a, b) => a.daysUntil - b.daysUntil);
};

/**
 * Get families with overdue payment deadlines
 * @param {Array} families - Array of family objects
 * @returns {Array} Families with overdue deadlines
 */
export const getFamiliesWithOverdueDeadlines = (families) => {
    const today = new Date();
    const results = [];

    families.forEach(family => {
        family.cabinAccounts?.forEach(cabin => {
            cabin.paymentDeadlines?.forEach(deadline => {
                if (!deadline.dueDate) return;

                const dueDate = parseISO(deadline.dueDate);
                const isPaid = deadline.status === 'paid';

                // Check if overdue and not paid
                if (!isPaid && isBefore(dueDate, today)) {
                    const daysOverdue = Math.abs(differenceInDays(dueDate, today));

                    results.push({
                        family: {
                            id: family.id,
                            bookingCode: family.bookingCode,
                            displayName: family.displayName,
                            email: family.email,
                            balanceCadGlobal: family.balanceCadGlobal,
                            shipName: family.shipName,
                            sailDate: family.sailDate
                        },
                        deadline: {
                            label: deadline.label,
                            dueDate: deadline.dueDate,
                            amountCad: deadline.amountCad,
                            cabinNumber: cabin.cabinNumber
                        },
                        daysOverdue
                    });
                }
            });
        });
    });

    // Sort by days overdue (most overdue first)
    return results.sort((a, b) => b.daysOverdue - a.daysOverdue);
};

/**
 * Send reminder emails to families using EmailJS templates
 * @param {Array} familyDeadlines - Array of family/deadline objects
 * @param {string} reminderType - Type of reminder ('7-day', '1-day', 'overdue')
 * @returns {Object} Results of email sending
 */
export const sendReminderEmails = async (familyDeadlines, reminderType) => {
    // Note: EmailJS templates now handle the email content
    // We just need to send the correct variables to the template

    // Determine template type based on reminderType
    const templateTypeMap = {
        '7-day': 'reminder_7day',
        '1-day': 'reminder_1day',
        'overdue': 'overdue'
    };

    const templateType = templateTypeMap[reminderType];

    // The actual email sending will be handled by the RemindersHome component
    // which calls EmailJS directly with the template-specific variables
    // This function is kept for backward compatibility

    console.log(`Reminder type: ${reminderType}, Template type: ${templateType}`);
    console.log(`Would send ${familyDeadlines.length} reminder emails`);

    return {
        sent: familyDeadlines.map(item => item.family.email),
        failed: [],
        total: familyDeadlines.length
    };
};

/**
 * Log sent reminder to Firestore
 * @param {Object} reminderData - Data about the sent reminder
 */
export const logReminderSent = async (reminderData) => {
    try {
        const logRef = collection(db, 'reminderLogs');
        await addDoc(logRef, {
            ...reminderData,
            sentAt: Timestamp.now()
        });
    } catch (error) {
        console.error('Error logging reminder:', error);
        // Don't throw - logging failure shouldn't break the flow
    }
};

/**
 * Get reminder history for an agency
 * @param {string} agencyId - Agency ID
 * @param {number} limitCount - Number of records to fetch
 * @returns {Array} Reminder history
 */
export const getReminderHistory = async (agencyId, limitCount = 10) => {
    try {
        const logsRef = collection(db, 'reminderLogs');
        const q = query(
            logsRef,
            where('agencyId', '==', agencyId),
            orderBy('sentAt', 'desc'),
            limit(limitCount)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            sentAt: doc.data().sentAt?.toDate()
        }));
    } catch (error) {
        console.error('Error fetching reminder history:', error);
        return [];
    }
};
