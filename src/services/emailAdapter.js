/**
 * Email Adapter Service
 * 
 * This is a placeholder adapter that logs emails to console.
 * In production, replace with SendGrid, Postmark, or similar service.
 */

// Email adapter interface
export const emailAdapter = {
    /**
     * Send admin notification when a new agency request is submitted
     * @param {Object} request - Agency request data
     */
    async sendAdminNotification(request) {
        console.log('📧 [EMAIL ADAPTER] Admin Notification');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('To: admin@travelpoint.com');
        console.log('Subject: New Beta Access Request');
        console.log('');
        console.log('A new agency has requested beta access:');
        console.log('');
        console.log(`Agency Name: ${request.agencyName}`);
        console.log(`Contact Email: ${request.contactEmail}`);
        console.log(`Phone: ${request.phoneNumber || 'Not provided'}`);
        console.log(`Group Type: ${request.groupType}`);
        console.log(`Message: ${request.message || 'No message'}`);
        console.log('');
        console.log('Review and approve: https://travelpoint.com/admin/requests');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // TODO: Replace with actual email service
        // Example with SendGrid:
        // await sendgrid.send({
        //     to: 'admin@travelpoint.com',
        //     from: 'noreply@travelpoint.com',
        //     subject: 'New Beta Access Request',
        //     html: generateAdminNotificationHTML(request)
        // });

        return Promise.resolve();
    },

    /**
     * Send approval email with signup link
     * @param {Object} request - Agency request data
     * @param {string} signupLink - Signup link with approval code
     */
    async sendApprovalEmail(request, signupLink) {
        console.log('📧 [EMAIL ADAPTER] Approval Email');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`To: ${request.contactEmail}`);
        console.log('Subject: Welcome to TravelPoint Beta! 🎉');
        console.log('');
        console.log(`Hi ${request.agencyName},`);
        console.log('');
        console.log('Great news! Your request to join TravelPoint\'s beta program has been approved.');
        console.log('');
        console.log('Click the link below to complete your signup:');
        console.log(signupLink);
        console.log('');
        console.log('This link is unique to your agency and will expire in 7 days.');
        console.log('');
        console.log('Welcome aboard!');
        console.log('The TravelPoint Team');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // TODO: Replace with actual email service
        return Promise.resolve();
    },

    /**
     * Send rejection email
     * @param {Object} request - Agency request data
     * @param {string} reason - Rejection reason
     */
    async sendRejectionEmail(request, reason) {
        console.log('📧 [EMAIL ADAPTER] Rejection Email');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`To: ${request.contactEmail}`);
        console.log('Subject: Update on Your TravelPoint Beta Request');
        console.log('');
        console.log(`Hi ${request.agencyName},`);
        console.log('');
        console.log('Thank you for your interest in TravelPoint.');
        console.log('');
        console.log('Unfortunately, we\'re unable to approve your beta access request at this time.');
        console.log('');
        if (reason) {
            console.log(`Reason: ${reason}`);
            console.log('');
        }
        console.log('We appreciate your interest and will keep you updated on future opportunities.');
        console.log('');
        console.log('Best regards,');
        console.log('The TravelPoint Team');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // TODO: Replace with actual email service
        return Promise.resolve();
    }
};

/**
 * Future implementation guide:
 * 
 * 1. Install email service SDK:
 *    npm install @sendgrid/mail
 *    or
 *    npm install postmark
 * 
 * 2. Configure API keys in environment variables:
 *    VITE_SENDGRID_API_KEY=your_key_here
 * 
 * 3. Replace console.log calls with actual email sends
 * 
 * 4. Create HTML email templates in /src/templates/emails/
 * 
 * 5. Add error handling and retry logic
 */
