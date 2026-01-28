import React, { useState, useEffect } from 'react';
import { useAgency } from '../../../contexts/AgencyContext';
import { updateEmailSettings, getEmailSettings } from '../../../services/brandingService';

const EmailSettings = () => {
    const { agency } = useAgency();
    const [settings, setSettings] = useState({
        senderName: '',
        replyTo: '',
        emailSignature: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (agency?.emailSettings) {
            setSettings(agency.emailSettings);
        }
    }, [agency]);

    const handleChange = (field, value) => {
        setSettings(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            setMessage(null);

            await updateEmailSettings(agency.id, settings);

            setMessage({ type: 'success', text: 'Email settings saved successfully!' });
            setHasChanges(false);
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="settings-section">
            <h2>Email Settings</h2>
            <p className="section-description">
                Configure how emails are sent to families
            </p>

            {message && (
                <div className={`alert alert-${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="form-group">
                <label htmlFor="sender-name">Sender Name</label>
                <input
                    id="sender-name"
                    type="text"
                    className="form-input"
                    value={settings.senderName}
                    onChange={(e) => handleChange('senderName', e.target.value)}
                    placeholder="Acme Travel"
                />
                <p className="form-hint">
                    This name will appear in the "From" field of emails
                </p>
            </div>

            <div className="form-group">
                <label htmlFor="reply-to">Reply-To Email</label>
                <input
                    id="reply-to"
                    type="email"
                    className="form-input"
                    value={settings.replyTo}
                    onChange={(e) => handleChange('replyTo', e.target.value)}
                    placeholder="support@acmetravel.com"
                />
                <p className="form-hint">
                    Replies will be sent to this email address
                </p>
            </div>

            <div className="form-group">
                <label htmlFor="email-signature">Email Signature</label>
                <textarea
                    id="email-signature"
                    className="form-textarea"
                    value={settings.emailSignature}
                    onChange={(e) => handleChange('emailSignature', e.target.value)}
                    placeholder="Best regards,&#10;Acme Travel Team"
                    rows={4}
                />
                <p className="form-hint">
                    This signature will be added to the end of all emails
                </p>
            </div>

            {hasChanges && (
                <div className="form-actions">
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : '💾 Save Email Settings'}
                    </button>
                </div>
            )}
        </section>
    );
};

export default EmailSettings;
