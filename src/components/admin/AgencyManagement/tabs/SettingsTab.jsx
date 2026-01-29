/**
 * Settings Tab Component
 * 
 * General agency settings: contact info, terms, preferences.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { useAuth } from '../../../../hooks/useAuth';
import './SettingsTab.css';

const SettingsTab = ({ onToast }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const agencyId = user?.agencyId;

    const [settings, setSettings] = useState({
        contactEmail: '',
        contactPhone: '',
        website: '',
        termsUrl: '',
        privacyUrl: '',
        defaultLanguage: 'es',
        timezone: 'America/Mexico_City',
        businessHours: '',
        address: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Load settings
    const loadSettings = useCallback(async () => {
        if (!agencyId) return;

        try {
            setLoading(true);
            const agencyRef = doc(db, 'agencies', agencyId);
            const agencyDoc = await getDoc(agencyRef);

            if (agencyDoc.exists()) {
                const data = agencyDoc.data();
                setSettings(prev => ({
                    ...prev,
                    ...(data.settings || {}),
                    contactEmail: data.contactEmail || data.settings?.contactEmail || '',
                    contactPhone: data.contactPhone || data.settings?.contactPhone || ''
                }));
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            onToast?.('error', t('agency.settings.loadError', 'Failed to load settings'));
        } finally {
            setLoading(false);
        }
    }, [agencyId, onToast, t]);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    // Handle input change
    const handleChange = (field, value) => {
        setSettings(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
    };

    // Save settings
    const handleSave = async () => {
        if (!agencyId) return;

        try {
            setSaving(true);
            const agencyRef = doc(db, 'agencies', agencyId);

            await updateDoc(agencyRef, {
                settings: {
                    contactEmail: settings.contactEmail,
                    contactPhone: settings.contactPhone,
                    website: settings.website,
                    termsUrl: settings.termsUrl,
                    privacyUrl: settings.privacyUrl,
                    defaultLanguage: settings.defaultLanguage,
                    timezone: settings.timezone,
                    businessHours: settings.businessHours,
                    address: settings.address
                },
                updatedAt: serverTimestamp()
            });

            setHasChanges(false);
            onToast?.('success', t('agency.settings.saved', 'Settings saved successfully'));
        } catch (error) {
            console.error('Error saving settings:', error);
            onToast?.('error', t('agency.settings.saveError', 'Failed to save settings'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="settings-tab settings-tab--loading">
                <div className="loading-spinner"></div>
                <p>{t('common.loading', 'Loading...')}</p>
            </div>
        );
    }

    return (
        <div className="settings-tab">
            <div className="settings-tab__header">
                <div>
                    <h2>{t('agency.settings.title', 'General Settings')}</h2>
                    <p className="text-muted">
                        {t('agency.settings.subtitle', 'Configure your agency\'s contact information and preferences')}
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={!hasChanges || saving}
                >
                    {saving ? t('common.saving', 'Saving...') : t('common.save', 'Save Changes')}
                </button>
            </div>

            <div className="settings-tab__grid">
                {/* Contact Information */}
                <section className="settings-section">
                    <h3>
                        <span className="section-icon">📧</span>
                        {t('agency.settings.contact', 'Contact Information')}
                    </h3>

                    <div className="form-group">
                        <label htmlFor="contactEmail">
                            {t('agency.settings.contactEmail', 'Contact Email')}
                        </label>
                        <input
                            type="email"
                            id="contactEmail"
                            className="form-input"
                            value={settings.contactEmail}
                            onChange={(e) => handleChange('contactEmail', e.target.value)}
                            placeholder="contact@agency.com"
                        />
                        <p className="form-hint">
                            {t('agency.settings.contactEmailHint', 'Primary email for customer inquiries')}
                        </p>
                    </div>

                    <div className="form-group">
                        <label htmlFor="contactPhone">
                            {t('agency.settings.contactPhone', 'Contact Phone')}
                        </label>
                        <input
                            type="tel"
                            id="contactPhone"
                            className="form-input"
                            value={settings.contactPhone}
                            onChange={(e) => handleChange('contactPhone', e.target.value)}
                            placeholder="+1 (555) 123-4567"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="website">
                            {t('agency.settings.website', 'Website')}
                        </label>
                        <input
                            type="url"
                            id="website"
                            className="form-input"
                            value={settings.website}
                            onChange={(e) => handleChange('website', e.target.value)}
                            placeholder="https://www.myagency.com"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="address">
                            {t('agency.settings.address', 'Business Address')}
                        </label>
                        <textarea
                            id="address"
                            className="form-input"
                            value={settings.address}
                            onChange={(e) => handleChange('address', e.target.value)}
                            placeholder="123 Main St, Suite 100&#10;City, Province Z1Z 1Z1"
                            rows={3}
                        />
                    </div>
                </section>

                {/* Legal & Policies */}
                <section className="settings-section">
                    <h3>
                        <span className="section-icon">📄</span>
                        {t('agency.settings.legal', 'Legal & Policies')}
                    </h3>

                    <div className="form-group">
                        <label htmlFor="termsUrl">
                            {t('agency.settings.termsUrl', 'Terms & Conditions URL')}
                        </label>
                        <input
                            type="url"
                            id="termsUrl"
                            className="form-input"
                            value={settings.termsUrl}
                            onChange={(e) => handleChange('termsUrl', e.target.value)}
                            placeholder="https://myagency.com/terms"
                        />
                        <p className="form-hint">
                            {t('agency.settings.termsHint', 'Link displayed to travelers during booking')}
                        </p>
                    </div>

                    <div className="form-group">
                        <label htmlFor="privacyUrl">
                            {t('agency.settings.privacyUrl', 'Privacy Policy URL')}
                        </label>
                        <input
                            type="url"
                            id="privacyUrl"
                            className="form-input"
                            value={settings.privacyUrl}
                            onChange={(e) => handleChange('privacyUrl', e.target.value)}
                            placeholder="https://myagency.com/privacy"
                        />
                    </div>
                </section>

                {/* Preferences */}
                <section className="settings-section">
                    <h3>
                        <span className="section-icon">🌐</span>
                        {t('agency.settings.preferences', 'Preferences')}
                    </h3>

                    <div className="form-group">
                        <label htmlFor="defaultLanguage">
                            {t('agency.settings.defaultLanguage', 'Default Language')}
                        </label>
                        <select
                            id="defaultLanguage"
                            className="form-input"
                            value={settings.defaultLanguage}
                            onChange={(e) => handleChange('defaultLanguage', e.target.value)}
                        >
                            <option value="es">Español (MX)</option>
                            <option value="en">English (CA)</option>
                        </select>
                        <p className="form-hint">
                            {t('agency.settings.languageHint', 'Default language for new travelers')}
                        </p>
                    </div>

                    <div className="form-group">
                        <label htmlFor="timezone">
                            {t('agency.settings.timezone', 'Timezone')}
                        </label>
                        <select
                            id="timezone"
                            className="form-input"
                            value={settings.timezone}
                            onChange={(e) => handleChange('timezone', e.target.value)}
                        >
                            <optgroup label="Canada">
                                <option value="America/Vancouver">Pacific (Vancouver)</option>
                                <option value="America/Edmonton">Mountain (Edmonton)</option>
                                <option value="America/Winnipeg">Central (Winnipeg)</option>
                                <option value="America/Toronto">Eastern (Toronto)</option>
                                <option value="America/Halifax">Atlantic (Halifax)</option>
                            </optgroup>
                            <optgroup label="Mexico">
                                <option value="America/Mexico_City">Central (CDMX)</option>
                                <option value="America/Tijuana">Pacific (Tijuana)</option>
                                <option value="America/Cancun">Eastern (Cancún)</option>
                            </optgroup>
                            <optgroup label="USA">
                                <option value="America/New_York">Eastern (New York)</option>
                                <option value="America/Chicago">Central (Chicago)</option>
                                <option value="America/Denver">Mountain (Denver)</option>
                                <option value="America/Los_Angeles">Pacific (Los Angeles)</option>
                            </optgroup>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="businessHours">
                            {t('agency.settings.businessHours', 'Business Hours')}
                        </label>
                        <input
                            type="text"
                            id="businessHours"
                            className="form-input"
                            value={settings.businessHours}
                            onChange={(e) => handleChange('businessHours', e.target.value)}
                            placeholder="Mon-Fri 9:00 AM - 6:00 PM"
                        />
                        <p className="form-hint">
                            {t('agency.settings.hoursHint', 'Displayed on traveler portal')}
                        </p>
                    </div>
                </section>
            </div>

            {/* Unsaved changes indicator */}
            {hasChanges && (
                <div className="unsaved-indicator">
                    <span className="unsaved-dot"></span>
                    {t('agency.settings.unsaved', 'You have unsaved changes')}
                </div>
            )}
        </div>
    );
};

export default SettingsTab;
