/**
 * Stripe Webhook Handler
 * 
 * HTTPS endpoint that receives and processes Stripe webhook events.
 * Verifies webhook signatures and updates Firestore based on subscription events.
 * 
 * Handled Events:
 * - checkout.session.completed
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_failed
 * - invoice.paid
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.stripeWebhook = onRequest({
    secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 60
}, async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;

    try {
        // Verify webhook signature
        event = stripe.webhooks.constructEvent(
            req.rawBody,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('⚠️  Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('✅ Webhook event received:', event.type, '| ID:', event.id);

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object);
                break;

            case 'customer.subscription.created':
                await handleSubscriptionCreated(event.data.object);
                break;

            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;

            case 'invoice.payment_failed':
                await handlePaymentFailed(event.data.object);
                break;

            case 'invoice.paid':
                await handleInvoicePaid(event.data.object);
                break;

            default:
                console.log(`ℹ️  Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('❌ Webhook handler error:', error);
        res.status(500).send('Webhook handler failed');
    }
});

// ============================================
// Event Handlers
// ============================================

/**
 * Handle checkout.session.completed
 * Updates agency with customer and subscription IDs
 */
async function handleCheckoutCompleted(session) {
    const agencyId = session.metadata.agencyId;

    console.log('💳 Checkout completed for agency:', agencyId);

    await admin.firestore()
        .collection('agencies')
        .doc(agencyId)
        .update({
            'billing.stripeCustomerId': session.customer,
            'billing.stripeSubscriptionId': session.subscription,
            'billing.status': 'active',
            'billing.updatedAt': admin.firestore.FieldValue.serverTimestamp()
        });

    console.log('✅ Agency billing updated after checkout');
}

/**
 * Handle customer.subscription.created
 * Updates agency with full subscription details
 */
async function handleSubscriptionCreated(subscription) {
    const agencyId = subscription.metadata.agencyId;
    const planKey = subscription.metadata.planKey;

    console.log('🆕 Subscription created:', subscription.id, 'for agency:', agencyId);

    const status = subscription.status; // trialing, active, etc.
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    const trialEnd = subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null;

    await admin.firestore()
        .collection('agencies')
        .doc(agencyId)
        .update({
            'billing.stripeSubscriptionId': subscription.id,
            'billing.planKey': planKey,
            'billing.status': status,
            'billing.currentPeriodEnd': admin.firestore.Timestamp.fromDate(currentPeriodEnd),
            'billing.trialEnd': trialEnd ? admin.firestore.Timestamp.fromDate(trialEnd) : null,
            'billing.cancelAtPeriodEnd': subscription.cancel_at_period_end,
            'billing.priceId': subscription.items.data[0].price.id,
            'billing.updatedAt': admin.firestore.FieldValue.serverTimestamp()
        });

    console.log('✅ Subscription details saved to Firestore');
}

/**
 * Handle customer.subscription.updated
 * Updates agency when subscription changes (plan change, renewal, etc.)
 */
async function handleSubscriptionUpdated(subscription) {
    const agencyId = subscription.metadata.agencyId;
    const planKey = subscription.metadata.planKey;

    console.log('🔄 Subscription updated:', subscription.id);

    const status = subscription.status;
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

    await admin.firestore()
        .collection('agencies')
        .doc(agencyId)
        .update({
            'billing.planKey': planKey,
            'billing.status': status,
            'billing.currentPeriodEnd': admin.firestore.Timestamp.fromDate(currentPeriodEnd),
            'billing.cancelAtPeriodEnd': subscription.cancel_at_period_end,
            'billing.priceId': subscription.items.data[0].price.id,
            'billing.updatedAt': admin.firestore.FieldValue.serverTimestamp()
        });

    console.log('✅ Subscription update saved to Firestore');
}

/**
 * Handle customer.subscription.deleted
 * Marks subscription as canceled
 */
async function handleSubscriptionDeleted(subscription) {
    const agencyId = subscription.metadata.agencyId;

    console.log('🗑️  Subscription deleted:', subscription.id);

    await admin.firestore()
        .collection('agencies')
        .doc(agencyId)
        .update({
            'billing.status': 'canceled',
            'billing.cancelAtPeriodEnd': false,
            'billing.updatedAt': admin.firestore.FieldValue.serverTimestamp()
        });

    console.log('✅ Subscription marked as canceled in Firestore');
}

/**
 * Handle invoice.payment_failed
 * Marks billing status as past_due
 */
async function handlePaymentFailed(invoice) {
    const customerId = invoice.customer;

    console.log('⚠️  Payment failed for customer:', customerId);

    // Get agency by customer ID
    const agenciesSnapshot = await admin.firestore()
        .collection('agencies')
        .where('billing.stripeCustomerId', '==', customerId)
        .limit(1)
        .get();

    if (agenciesSnapshot.empty) {
        console.error('❌ No agency found for customer:', customerId);
        return;
    }

    const agencyDoc = agenciesSnapshot.docs[0];

    await agencyDoc.ref.update({
        'billing.status': 'past_due',
        'billing.updatedAt': admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Agency marked as past_due');

    // TODO: Send email notification to agency admin
    // You can implement this using your existing email service
}

/**
 * Handle invoice.paid
 * Updates status back to active if it was past_due
 */
async function handleInvoicePaid(invoice) {
    const customerId = invoice.customer;

    console.log('💰 Invoice paid for customer:', customerId);

    // Get agency by customer ID
    const agenciesSnapshot = await admin.firestore()
        .collection('agencies')
        .where('billing.stripeCustomerId', '==', customerId)
        .limit(1)
        .get();

    if (agenciesSnapshot.empty) {
        console.error('❌ No agency found for customer:', customerId);
        return;
    }

    const agencyDoc = agenciesSnapshot.docs[0];
    const agency = agencyDoc.data();

    // If status was past_due, update to active
    if (agency.billing?.status === 'past_due') {
        await agencyDoc.ref.update({
            'billing.status': 'active',
            'billing.updatedAt': admin.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ Agency status updated to active after payment');
    }
}
