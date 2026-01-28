import React, { useState, useEffect } from 'react';
import { useAgency } from '../../../contexts/AgencyContext';
import { updateBranding, uploadLogo, deleteFile } from '../../../services/brandingService';
import LogoUpload from './LogoUpload';
import ColorPicker from './ColorPicker';
import BrandingPreview from './BrandingPreview';
import EmailSettings from './EmailSettings';
import './AgencySettings.css';

const AgencySettings = () => {
    const { agency } = useAgency();
    const [branding, setBranding] = useState({
        logo: null,
        primaryColor: '#0F766E',
        portalName: 'Portal Crucero',
        favicon: null
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (agency?.branding) {
            setBranding(agency.branding);
        }
    }, [agency]);

    const showMessage = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const handleLogoUpload = async (file) => {
        if (!file) {
            // Remove logo
            try {
                setLoading(true);
                if (branding.logo) {
                    await deleteFile(branding.logo);
                }
                const newBranding = { ...branding, logo: null };
                await updateBranding(agency.id, newBranding);
                setBranding(newBranding);
                showMessage('success', 'Logo removed successfully!');
            } catch (error) {
                showMessage('error', error.message);
            } finally {
                setLoading(false);
            }
            return;
        }

        try {
            setLoading(true);

            // Delete old logo if exists
            if (branding.logo) {
                await deleteFile(branding.logo);
            }

            // Upload new logo
            const logoUrl = await uploadLogo(file, agency.id);

            const newBranding = { ...branding, logo: logoUrl };
            await updateBranding(agency.id, newBranding);
            setBranding(newBranding);

            showMessage('success', 'Logo uploaded successfully!');
        } catch (error) {
            showMessage('error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleColorChange = async (color) => {
        try {
            const newBranding = { ...branding, primaryColor: color };
            await updateBranding(agency.id, newBranding);
            setBranding(newBranding);

            // Apply immediately
            document.documentElement.style.setProperty('--color-primary', color);
        } catch (error) {
            showMessage('error', error.message);
        }
    };

    const handleNameChange = async (e) => {
        const name = e.target.value;
        try {
            const newBranding = { ...branding, portalName: name };
            await updateBranding(agency.id, newBranding);
            setBranding(newBranding);

            // Update document title immediately
            document.title = name;
        } catch (error) {
            showMessage('error', error.message);
        }
    };

    const handleReset = async () => {
        if (!window.confirm('Are you sure you want to reset branding to default values?')) {
            return;
        }

        try {
            setLoading(true);

            // Delete logo if exists
            if (branding.logo) {
                await deleteFile(branding.logo);
            }

            const defaultBranding = {
                logo: null,
                primaryColor: '#0F766E',
                portalName: 'Portal Crucero',
                favicon: null
            };

            await updateBranding(agency.id, defaultBranding);
            setBranding(defaultBranding);

            showMessage('success', 'Branding reset to default values');
        } catch (error) {
            showMessage('error', error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!agency) {
        return <div className="loading">Loading agency settings...</div>;
    }

    return (
        <div className="agency-settings">
            <div className="settings-header">
                <div>
                    <h1>Agency Settings</h1>
                    <p className="text-muted">Customize your portal branding and appearance</p>
                </div>
                <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={handleReset}
                    disabled={loading}
                >
                    🔄 Reset to Default
                </button>
            </div>

            {message && (
                <div className={`alert alert-${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="settings-grid">
                <div className="settings-main">
                    <section className="settings-section">
                        <h2>Portal Branding</h2>
                        <p className="section-description">
                            Customize how your portal appears to users
                        </p>

                        <div className="form-group">
                            <label>Agency Logo</label>
                            <LogoUpload
                                currentLogo={branding.logo}
                                onUpload={handleLogoUpload}
                                loading={loading}
                            />
                            <p className="form-hint">
                                📐 Recommended: Square image, 512x512px, PNG or SVG format, max 2MB
                            </p>
                        </div>

                        <div className="form-group">
                            <label>Primary Brand Color</label>
                            <ColorPicker
                                value={branding.primaryColor}
                                onChange={handleColorChange}
                            />
                            <p className="form-hint">
                                🎨 This color will be used for buttons, links, and accents throughout the portal
                            </p>
                        </div>

                        <div className="form-group">
                            <label htmlFor="portal-name">Portal Name</label>
                            <input
                                id="portal-name"
                                type="text"
                                className="form-input"
                                value={branding.portalName}
                                onChange={handleNameChange}
                                placeholder="Acme Travel Portal"
                            />
                            <p className="form-hint">
                                📝 This name appears in the browser tab and email headers
                            </p>
                        </div>
                    </section>

                    <EmailSettings />
                </div>

                <div className="settings-sidebar">
                    <BrandingPreview branding={branding} />
                </div>
            </div>
        </div>
    );
};

export default AgencySettings;
