/**
 * Create Stripe Checkout Session
 * 
 * Callable Cloud Function that creates a Stripe Checkout session
 * for subscribing to a TravelPoint plan.
 * 
 * @param {object} request.data
 * @param {string} request.data.planKey - 'solo_groups' or 'pro'
 * @param {string} request.data.locale - 'en' or 'es' (optional, default: 'en')
 * 
 * @returns {object} { checkoutUrl, sessionId }
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getPriceIdForPlan } = require('./helpers');

exports.createCheckoutSession = onCall({
    secrets: ['STRIPE_SECRET_KEY'],
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60
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

    // 5. Validate input
    const { planKey, locale = 'en' } = request.data;

    if (!planKey || !['solo_groups', 'pro'].includes(planKey)) {
        throw new HttpsError(
            'invalid-argument',
            'planKey must be "solo_groups" or "pro"'
        );
    }

    // 6. Get price ID for plan
    const priceId = getPriceIdForPlan(planKey);

    if (!priceId) {
        throw new HttpsError(
            'internal',
            'Price configuration error. Please contact support.'
        );
    }

    try {
        // 7. Get or create Stripe customer
        let customerId = agency.billing?.stripeCustomerId;

        if (!customerId) {
            console.log('Creating new Stripe customer for agency:', agencyId);

            const customer = await stripe.customers.create({
                email: agency.contactEmail,
                name: agency.name,
                metadata: {
                    agencyId: agencyId,
                    firebaseUid: uid
                }
            });

            customerId = customer.id;

            // Save customer ID to agency
            await admin.firestore()
                .collection('agencies')
                .doc(agencyId)
                .update({
                    'billing.stripeCustomerId': customerId,
                    'billing.updatedAt': admin.firestore.FieldValue.serverTimestamp()
                });

            console.log('Created Stripe customer:', customerId);
        }

        // 8. Get app URL from environment
        const appUrl = process.env.APP_URL || 'http://localhost:5173';

        // 9. Create checkout session
        console.log('Creating checkout session for plan:', planKey);

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [{
                price: priceId,
                quantity: 1
            }],
            mode: 'subscription',
            success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appUrl}/billing`,
            locale: locale === 'es' ? 'es' : 'en',
            metadata: {
                agencyId: agencyId,
                planKey: planKey
            },
            subscription_data: {
                metadata: {
                    agencyId: agencyId,
                    planKey: planKey
                }
            }
        });

        console.log('Checkout session created:', session.id);

        return {
            checkoutUrl: session.url,
            sessionId: session.id
        };

    } catch (error) {
        console.error('Checkout session error:', error);

        // Return more specific error messages
        if (error.type === 'StripeInvalidRequestError') {
            throw new HttpsError(
                'invalid-argument',
                'Invalid request to Stripe. Please check your plan selection.'
            );
        }

        throw new HttpsError(
            'internal',
            'Failed to create checkout session. Please try again.'
        );
    }
});
