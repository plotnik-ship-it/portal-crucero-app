/**
 * Create Stripe Customer Portal Session
 * 
 * Callable Cloud Function that creates a Stripe Customer Portal session
 * for managing subscriptions, payment methods, and invoices.
 * 
 * @returns {object} { portalUrl }
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.createCustomerPortalSession = onCall({
    secrets: ['STRIPE_SECRET_KEY'],
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30
}, async (request) => {
    // 1. Verify authentication
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const uid = request.auth.uid;

    // 2. Get user data
    const userDoc = await admin.firestore()
        .collection('users')
        .doc(uid)
        .get();

    if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data();
    const { agencyId, role } = userData;

    // 3. Verify user is admin
    if (role !== 'admin') {
        throw new HttpsError(
            'permission-denied',
            'Only admins can manage billing'
        );
    }

    if (!agencyId) {
        throw new HttpsError(
            'failed-precondition',
            'User does not have an agency assigned'
        );
    }

    // 4. Get agency data
    const agencyDoc = await admin.firestore()
        .collection('agencies')
        .doc(agencyId)
        .get();

    if (!agencyDoc.exists) {
        throw new HttpsError('not-found', 'Agency not found');
    }

    const agency = agencyDoc.data();
    const customerId = agency.billing?.stripeCustomerId;

    if (!customerId) {
        throw new HttpsError(
            'failed-precondition',
            'No Stripe customer found. Please subscribe to a plan first.'
        );
    }

    try {
        // 5. Get app URL from environment
        const appUrl = process.env.APP_URL || 'http://localhost:5173';

        // 6. Create portal session
        console.log('Creating customer portal session for customer:', customerId);

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${appUrl}/billing`
        });

        console.log('Portal session created:', session.id);

        return {
            portalUrl: session.url
        };

    } catch (error) {
        console.error('Portal session error:', error);

        if (error.type === 'StripeInvalidRequestError') {
            throw new HttpsError(
                'invalid-argument',
                'Invalid customer ID. Please contact support.'
            );
        }

        throw new HttpsError(
            'internal',
            'Failed to create portal session. Please try again.'
        );
    }
});
