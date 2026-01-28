import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { getAgencyBranding, updateAgencyBranding } from '../../../services/agencyBranding';
import { uploadAgencyLogo, deleteAgencyLogo, hexToRgb, rgbToHex } from '../../../services/storage';
import './AgencyBrandingConfig.css';

const AgencyBrandingConfig = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Branding state
    const [logoUrl, setLogoUrl] = useState(null);
    const [logoStoragePath, setLogoStoragePath] = useState(null);
    const [previewLogo, setPreviewLogo] = useState(null);
    const [logoFile, setLogoFile] = useState(null);

    // Colors (HEX for UI)
    const [primaryColor, setPrimaryColor] = useState('#2980b9');
    const [secondaryColor, setSecondaryColor] = useState('#34495e');
    const [accentColor, setAccentColor] = useState('#2ecc71');

    // Agency name
    const [agencyName, setAgencyName] = useState('');

    // Contact info
    const [contactInfo, setContactInfo] = useState({
        email: '',
        phone: '',
        website: '',
        address: ''
    });

    // Social media
    const [social, setSocial] = useState({
        facebook: '',
        instagram: '',
        whatsapp: ''
    });

    // Document settings
    const [documentSettings, setDocumentSettings] = useState({
        showLogo: true,
        showAddress: true,
        showSocial: false,
        footerText: 'Gracias por confiar en nosotros'
    });

    useEffect(() => {
        loadBranding();
    }, [user]);

    const loadBranding = async () => {
        if (!user?.agencyId) {
            setLoading(false);
            return;
        }

        try {
            const branding = await getAgencyBranding(user.agencyId);

            if (branding) {
                // Logo
                setLogoUrl(branding.logoUrl || null);
                setLogoStoragePath(branding.logoStoragePath || null);

                // Load logo preview (works with base64)
                if (branding.logoUrl) {
                    setPreviewLogo(branding.logoUrl);
                }

                // Agency name
                setAgencyName(branding.name || user?.agencyName || '');

                // Colors
                setPrimaryColor(branding.primaryColorHex || '#2980b9');
                setSecondaryColor(branding.secondaryColorHex || '#34495e');
                setAccentColor(branding.accentColorHex || '#2ecc71');

                // Contact
                setContactInfo({
                    email: branding.email || '',
                    phone: branding.phone || '',
                    website: branding.website || '',
                    address: branding.address || ''
                });

                // Social
                setSocial(branding.social || {
                    facebook: '',
                    instagram: '',
                    whatsapp: ''
                });

                // Document settings
                setDocumentSettings(branding.documentSettings || {
                    showLogo: true,
                    showAddress: true,
                    showSocial: false,
                    footerText: 'Gracias por confiar en nosotros'
                });
            }
        } catch (error) {
            console.error('Error loading branding:', error);
            // Don't show alert - just log the error
            // User can still configure branding even if loading fails
        } finally {
            setLoading(false);
        }
    };

    const handleLogoSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
        if (!validTypes.includes(file.type)) {
            alert('Formato no válido. Use PNG, JPG o SVG.');
            return;
        }

        // Validate file size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('El archivo es demasiado grande. Máximo 2MB.');
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewLogo(reader.result);
        };
        reader.readAsDataURL(file);

        setLogoFile(file);
    };

    const handleSave = async () => {
        if (!user?.agencyId) {
            alert('No se encontró la agencia del usuario');
            return;
        }

        setSaving(true);

        try {
            let finalLogoUrl = logoUrl;
            let finalLogoPath = logoStoragePath;

            console.log('💾 Saving branding - Initial state:', {
                logoUrl: logoUrl ? `${logoUrl.substring(0, 50)}...` : 'null',
                logoFile: logoFile ? 'File selected' : 'No file',
                logoStoragePath
            });

            // Use base64 for logo instead of Firebase Storage to avoid CORS
            if (logoFile) {
                console.log('📤 Converting logo file to base64...');
                // Convert file to base64
                const reader = new FileReader();
                const base64Promise = new Promise((resolve, reject) => {
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(logoFile);
                });

                finalLogoUrl = await base64Promise;
                finalLogoPath = 'base64'; // Marker to indicate it's base64

                console.log('✅ Logo converted to base64:', finalLogoUrl.substring(0, 50) + '...');

                // Keep the preview
                setPreviewLogo(finalLogoUrl);
            } else {
                console.log('ℹ️ No new logo file, using existing logoUrl');
            }

            // Prepare branding data
            const brandingData = {
                // Agency name
                name: agencyName,

                // Logo (as base64)
                logoUrl: finalLogoUrl,
                logoStoragePath: finalLogoPath,

                // Colors (both HEX and RGB)
                primaryColor: hexToRgb(primaryColor),
                primaryColorHex: primaryColor,
                secondaryColor: hexToRgb(secondaryColor),
                secondaryColorHex: secondaryColor,
                accentColor: hexToRgb(accentColor),
                accentColorHex: accentColor,

                // Contact
                email: contactInfo.email,
                phone: contactInfo.phone,
                website: contactInfo.website,
                address: contactInfo.address,

                // Social
                social: social,

                // Document settings
                documentSettings: documentSettings
            };

            console.log('💾 Saving branding data to Firestore:', {
                ...brandingData,
                logoUrl: brandingData.logoUrl ? `${brandingData.logoUrl.substring(0, 50)}... (${brandingData.logoUrl.length} chars)` : 'null'
            });

            // Save to Firestore
            await updateAgencyBranding(user.agencyId, brandingData);

            // Update local state
            setLogoUrl(finalLogoUrl);
            setLogoStoragePath(finalLogoPath);
            setLogoFile(null);

            alert('✅ Configuración de branding guardada exitosamente');
        } catch (error) {
            console.error('Error saving branding:', error);
            alert('Error al guardar la configuración: ' + error.message);
        } finally {
            setSaving(false);
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="branding-config-loading">
                <div className="spinner"></div>
                <p>Cargando configuración...</p>
            </div>
        );
    }

    return (
        <div className="branding-config-container">
            <div className="branding-config-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1>🎨 Configuración de Branding</h1>
                        <p className="subtitle">Personaliza el logotipo, colores e información de tu agencia</p>
                    </div>
                    <button
                        onClick={() => navigate('/admin')}
                        className="btn btn-outline"
                    >
                        ← Volver al Dashboard
                    </button>
                </div>
            </div>

            <div className="branding-config-content">
                {/* Left Column: Configuration */}
                <div className="branding-config-left">

                    {/* Agency Name */}
                    <div className="branding-card">
                        <h3>🏢 Nombre de la Agencia</h3>
                        <div className="form-group">
                            <label>Nombre</label>
                            <input
                                type="text"
                                value={agencyName}
                                onChange={(e) => setAgencyName(e.target.value)}
                                placeholder="Travel Point"
                            />
                            <p className="text-small text-muted">
                                Este nombre aparecerá en todos los documentos y PDFs generados
                            </p>
                        </div>
                    </div>

                    {/* Logo Upload */}
                    <div className="branding-card">
                        <h3>📷 Logotipo de la Agencia</h3>
                        <div className="logo-upload-section">
                            {previewLogo && (
                                <div className="logo-preview">
                                    <img src={previewLogo} alt="Logo preview" />
                                </div>
                            )}
                            {!previewLogo && logoUrl && (
                                <div className="logo-preview">
                                    <p className="text-small text-muted">Logo guardado previamente (no se puede mostrar por CORS)</p>
                                    <p className="text-xs text-muted">Sube un nuevo logo para verlo en preview</p>
                                </div>
                            )}
                            <div className="logo-upload-controls">
                                <input
                                    type="file"
                                    id="logo-upload"
                                    accept="image/png,image/jpeg,image/svg+xml"
                                    onChange={handleLogoSelect}
                                    style={{ display: 'none' }}
                                />
                                <label htmlFor="logo-upload" className="btn btn-outline">
                                    📁 {logoUrl ? 'Cambiar Logo' : 'Seleccionar Logo'}
                                </label>
                                <p className="text-small text-muted">
                                    Formatos: PNG, JPG, SVG • Tamaño máximo: 2MB<br />
                                    Recomendado: 300x100px
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Colors */}
                    <div className="branding-card">
                        <h3>🎨 Colores de Marca</h3>
                        <div className="color-pickers">
                            <div className="color-picker-group">
                                <label>Color Primario</label>
                                <div className="color-input-group">
                                    <input
                                        type="color"
                                        value={primaryColor}
                                        onChange={(e) => setPrimaryColor(e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        value={primaryColor}
                                        onChange={(e) => setPrimaryColor(e.target.value)}
                                        className="color-hex-input"
                                    />
                                </div>
                            </div>

                            <div className="color-picker-group">
                                <label>Color Secundario</label>
                                <div className="color-input-group">
                                    <input
                                        type="color"
                                        value={secondaryColor}
                                        onChange={(e) => setSecondaryColor(e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        value={secondaryColor}
                                        onChange={(e) => setSecondaryColor(e.target.value)}
                                        className="color-hex-input"
                                    />
                                </div>
                            </div>

                            <div className="color-picker-group">
                                <label>Color de Acento</label>
                                <div className="color-input-group">
                                    <input
                                        type="color"
                                        value={accentColor}
                                        onChange={(e) => setAccentColor(e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        value={accentColor}
                                        onChange={(e) => setAccentColor(e.target.value)}
                                        className="color-hex-input"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="branding-card">
                        <h3>📞 Información de Contacto</h3>
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                value={contactInfo.email}
                                onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                                placeholder="info@tuagencia.com"
                            />
                        </div>

                        <div className="form-group">
                            <label>Teléfono</label>
                            <input
                                type="tel"
                                value={contactInfo.phone}
                                onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                                placeholder="+1 (555) 123-4567"
                            />
                        </div>

                        <div className="form-group">
                            <label>Sitio Web</label>
                            <input
                                type="url"
                                value={contactInfo.website}
                                onChange={(e) => setContactInfo({ ...contactInfo, website: e.target.value })}
                                placeholder="www.tuagencia.com"
                            />
                        </div>

                        <div className="form-group">
                            <label>Dirección</label>
                            <textarea
                                value={contactInfo.address}
                                onChange={(e) => setContactInfo({ ...contactInfo, address: e.target.value })}
                                placeholder="123 Main St, Miami, FL 33101"
                                rows="3"
                            />
                        </div>
                    </div>

                    {/* Document Settings */}
                    <div className="branding-card">
                        <h3>📄 Configuración de Documentos</h3>
                        <div className="form-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={documentSettings.showLogo}
                                    onChange={(e) => setDocumentSettings({ ...documentSettings, showLogo: e.target.checked })}
                                />
                                Mostrar logo en documentos
                            </label>
                        </div>

                        <div className="form-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={documentSettings.showAddress}
                                    onChange={(e) => setDocumentSettings({ ...documentSettings, showAddress: e.target.checked })}
                                />
                                Mostrar dirección en documentos
                            </label>
                        </div>

                        <div className="form-group">
                            <label>Texto del pie de página</label>
                            <input
                                type="text"
                                value={documentSettings.footerText}
                                onChange={(e) => setDocumentSettings({ ...documentSettings, footerText: e.target.value })}
                                placeholder="Gracias por confiar en nosotros"
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column: Preview */}
                <div className="branding-config-right">
                    <div className="branding-card sticky">
                        <h3>👁️ Vista Previa</h3>
                        <div
                            className="branding-preview"
                            style={{
                                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                            }}
                        >
                            {previewLogo && (
                                <div className="preview-logo">
                                    <img src={previewLogo} alt="Logo" />
                                </div>
                            )}
                            <h2 style={{ color: '#ffffff', marginTop: '1rem' }}>
                                {agencyName || user?.agencyName || 'Tu Agencia'}
                            </h2>
                            <div className="preview-contact" style={{ color: '#ffffff' }}>
                                {contactInfo.email && <p>✉️ {contactInfo.email}</p>}
                                {contactInfo.phone && <p>📞 {contactInfo.phone}</p>}
                                {contactInfo.website && <p>🌐 {contactInfo.website}</p>}
                            </div>
                            <div
                                className="preview-accent-bar"
                                style={{ backgroundColor: accentColor }}
                            />
                        </div>

                        <div className="preview-document-sample">
                            <h4>Ejemplo de Documento</h4>
                            <div className="document-preview">
                                <div
                                    className="document-header"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {documentSettings.showLogo && previewLogo && (
                                        <img src={previewLogo} alt="Logo" className="doc-logo" />
                                    )}
                                    <span style={{ color: '#ffffff' }}>
                                        {agencyName || user?.agencyName || 'Tu Agencia'}
                                    </span>
                                </div>
                                <div className="document-body">
                                    <p className="text-small">Contenido del documento...</p>
                                </div>
                                <div
                                    className="document-footer"
                                    style={{ backgroundColor: accentColor, color: '#ffffff' }}
                                >
                                    {documentSettings.footerText}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="branding-config-actions">
                <button
                    onClick={handleSave}
                    className="btn btn-primary btn-lg"
                    disabled={saving || uploading}
                >
                    {uploading ? '📤 Subiendo logo...' : saving ? '💾 Guardando...' : '✅ Guardar Configuración'}
                </button>
            </div>
        </div>
    );
};

export default AgencyBrandingConfig;
