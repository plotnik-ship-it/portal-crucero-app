import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAgency } from '../../contexts/AgencyContext';

const AgencyManager = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { agency: currentAgency, refreshAgency } = useAgency();
    const [agencies, setAgencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingAgency, setEditingAgency] = useState(null);
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        billingEmail: '',
        logoUrl: '',
        primaryColor: '#007bff',
        secondaryColor: '#6c757d',
        navbarBackground: '#ffffff'
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadAgencies();
    }, [currentAgency]);

    const loadAgencies = async () => {
        try {
            setLoading(true);

            // Only load the current user's agency
            if (currentAgency?.id) {
                const agencyRef = doc(db, 'agencies', currentAgency.id);
                const agencySnap = await getDoc(agencyRef);

                if (agencySnap.exists()) {
                    setAgencies([{
                        ...agencySnap.data(),
                        docId: agencySnap.id
                    }]);
                } else {
                    setAgencies([]);
                }
            } else {
                setAgencies([]);
            }
        } catch (err) {
            console.error('Error loading agency:', err);
            // Silently handle permission errors - user can only see their own agency
            setAgencies([]);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            id: '',
            name: '',
            billingEmail: '',
            logoUrl: '',
            primaryColor: '#007bff',
            secondaryColor: '#6c757d',
            navbarBackground: '#ffffff'
        });
        setEditingAgency(null);
        setShowForm(false);
    };

    const handleEdit = (agency) => {
        setEditingAgency(agency);
        setFormData({
            id: agency.id,
            name: agency.name,
            billingEmail: agency.billingEmail,
            logoUrl: agency.logoUrl || '',
            primaryColor: agency.branding?.primaryColor || '#007bff',
            secondaryColor: agency.branding?.secondaryColor || '#6c757d',
            navbarBackground: agency.branding?.navbarBackground || '#ffffff'
        });
        setShowForm(true);
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            // Validate
            if (!formData.id || !formData.name || !formData.billingEmail) {
                setError(t('agency.errorRequired'));
                return;
            }

            // Only allow updating the current agency
            const agencyRef = doc(db, 'agencies', formData.id);
            await updateDoc(agencyRef, {
                name: formData.name,
                billingEmail: formData.billingEmail,
                logoUrl: formData.logoUrl || '',
                branding: {
                    primaryColor: formData.primaryColor,
                    secondaryColor: formData.secondaryColor,
                    navbarBackground: formData.navbarBackground
                },
                updatedAt: serverTimestamp()
            });
            setSuccess(t('agency.updated', { name: formData.name }));

            resetForm();
            loadAgencies();
            refreshAgency(); // Refresh agency context

        } catch (err) {
            console.error('Error saving agency:', err);
            setError(t('common.error') + ': ' + err.message);
        }
    };

    const handleDelete = async (agencyId, agencyName) => {
        if (!confirm(t('agency.deleteConfirm', { name: agencyName }))) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'agencies', agencyId));
            setSuccess(t('agency.deleted'));
            loadAgencies();
        } catch (err) {
            console.error('Error deleting agency:', err);
            setError(t('common.error'));
        }
    };

    if (loading) {
        return (
            <div className="container page" style={{ padding: '2rem', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '2rem auto' }}></div>
                <p>{t('common.loading')}</p>
            </div>
        );
    }

    return (
        <div className="container page" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Back Button */}
            <button
                onClick={() => navigate('/admin')}
                className="btn btn-secondary"
                style={{ marginBottom: '1rem' }}
            >
                ← {t('common.backToHome', 'Volver al Inicio')}
            </button>

            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                paddingBottom: '1rem',
                borderBottom: '2px solid #e0e0e0'
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2rem', color: '#333' }}>🏢 {t('agency.management')}</h1>
                    <p style={{ margin: '0.5rem 0 0 0', color: '#666' }}>
                        {agencies.length > 0 ? agencies[0].name : t('common.loading')}
                    </p>
                </div>
                {agencies.length > 0 && !showForm && (
                    <button
                        className="btn btn-primary"
                        onClick={() => handleEdit(agencies[0])}
                        style={{ fontSize: '1rem', padding: '0.75rem 1.5rem' }}
                    >
                        ✏️ {t('common.edit')}
                    </button>
                )}
                {showForm && (
                    <button
                        className="btn btn-secondary"
                        onClick={resetForm}
                        style={{ fontSize: '1rem', padding: '0.75rem 1.5rem' }}
                    >
                        ✕ {t('common.cancel')}
                    </button>
                )}
            </div>

            {/* Alerts */}
            {error && (
                <div className="alert alert-error" style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '8px' }}>
                    ❌ {error}
                </div>
            )}

            {success && (
                <div className="alert alert-success" style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '8px' }}>
                    ✅ {success}
                </div>
            )}

            {/* Form */}
            {showForm && (
                <div className="card" style={{
                    padding: '2rem',
                    marginBottom: '2rem',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                    <h2 style={{ marginTop: 0, color: '#333' }}>
                        {editingAgency ? `✏️ ${t('agency.edit')}` : `➕ ${t('agency.create')}`}
                    </h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label style={{ fontWeight: '600', color: '#555' }}>{t('agency.id')} *</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder={t('agency.idPlaceholder')}
                                value={formData.id}
                                onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                                disabled={!!editingAgency}
                                required
                                style={{
                                    padding: '0.75rem',
                                    fontSize: '1rem',
                                    backgroundColor: editingAgency ? '#f5f5f5' : 'white'
                                }}
                            />
                            {!editingAgency && <small style={{ color: '#666' }}>{t('common.example')}: agency_viajes</small>}
                            {editingAgency && <small style={{ color: '#999' }}>{t('agency.idNote')}</small>}
                        </div>

                        <div className="form-group">
                            <label style={{ fontWeight: '600', color: '#555' }}>{t('agency.name')} *</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder={t('agency.namePlaceholder')}
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                style={{ padding: '0.75rem', fontSize: '1rem' }}
                            />
                        </div>

                        <div className="form-group">
                            <label style={{ fontWeight: '600', color: '#555' }}>{t('agency.email')} *</label>
                            <input
                                type="email"
                                className="form-control"
                                placeholder={t('agency.emailPlaceholder')}
                                value={formData.billingEmail}
                                onChange={(e) => setFormData({ ...formData, billingEmail: e.target.value })}
                                required
                                style={{ padding: '0.75rem', fontSize: '1rem' }}
                            />
                        </div>

                        <div className="form-group">
                            <label style={{ fontWeight: '600', color: '#555' }}>{t('agency.logo')} ({t('common.optional')})</label>
                            <input
                                type="url"
                                className="form-control"
                                placeholder={t('agency.logoPlaceholder')}
                                value={formData.logoUrl}
                                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                                style={{ padding: '0.75rem', fontSize: '1rem' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label style={{ fontWeight: '600', color: '#555' }}>{t('agency.primaryColor')}</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="color"
                                        className="form-control"
                                        value={formData.primaryColor}
                                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                        style={{ width: '60px', height: '40px', padding: '0.25rem' }}
                                    />
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={formData.primaryColor}
                                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                        style={{ flex: 1, padding: '0.5rem' }}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label style={{ fontWeight: '600', color: '#555' }}>{t('agency.secondaryColor')}</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="color"
                                        className="form-control"
                                        value={formData.secondaryColor}
                                        onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                                        style={{ width: '60px', height: '40px', padding: '0.25rem' }}
                                    />
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={formData.secondaryColor}
                                        onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                                        style={{ flex: 1, padding: '0.5rem' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
                            >
                                {editingAgency ? `💾 ${t('common.saveChanges')}` : t('agency.createButton')}
                            </button>
                            {editingAgency && (
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={resetForm}
                                    style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
                                >
                                    {t('common.cancel')}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            )}

            {/* Agencies Grid */}
            <div>
                <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>{t('agency.existing')}</h2>

                {agencies.length === 0 ? (
                    <div className="card" style={{
                        padding: '3rem',
                        textAlign: 'center',
                        borderRadius: '12px',
                        backgroundColor: '#f9f9f9'
                    }}>
                        <p style={{ fontSize: '3rem', margin: 0 }}>🏢</p>
                        <p style={{ color: '#666', fontSize: '1.1rem', margin: '1rem 0 0 0' }}>
                            {t('agency.noAgencies')}
                        </p>
                        <p style={{ color: '#999', margin: '0.5rem 0 0 0' }}>
                            {t('agency.noAgenciesHint')}
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                        gap: '1.5rem'
                    }}>
                        {agencies.map((agency) => (
                            <div
                                key={agency.docId}
                                className="card"
                                style={{
                                    padding: '1.5rem',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                                }}
                            >
                                <div style={{ marginBottom: '1rem' }}>
                                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#333', fontSize: '1.3rem' }}>
                                        {agency.name}
                                    </h3>
                                    <code style={{
                                        backgroundColor: '#f0f0f0',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        fontSize: '0.85rem',
                                        color: '#666'
                                    }}>
                                        {agency.id}
                                    </code>
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.95rem' }}>
                                        📧 {agency.billingEmail}
                                    </p>
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#999', fontWeight: '600' }}>
                                        {t('common.brandColors').toUpperCase()}
                                    </p>
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <div
                                                style={{
                                                    width: '100%',
                                                    height: '40px',
                                                    backgroundColor: agency.branding?.primaryColor || '#007bff',
                                                    borderRadius: '6px',
                                                    border: '2px solid #e0e0e0'
                                                }}
                                            />
                                            <p style={{
                                                margin: '0.25rem 0 0 0',
                                                fontSize: '0.75rem',
                                                color: '#999',
                                                textAlign: 'center'
                                            }}>
                                                {agency.branding?.primaryColor}
                                            </p>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div
                                                style={{
                                                    width: '100%',
                                                    height: '40px',
                                                    backgroundColor: agency.branding?.secondaryColor || '#6c757d',
                                                    borderRadius: '6px',
                                                    border: '2px solid #e0e0e0'
                                                }}
                                            />
                                            <p style={{
                                                margin: '0.25rem 0 0 0',
                                                fontSize: '0.75rem',
                                                color: '#999',
                                                textAlign: 'center'
                                            }}>
                                                {agency.branding?.secondaryColor}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handleEdit(agency)}
                                        style={{ flex: 1, padding: '0.6rem' }}
                                    >
                                        ✏️ {t('common.edit')}
                                    </button>
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={() => handleDelete(agency.id, agency.name)}
                                        style={{ flex: 1, padding: '0.6rem' }}
                                    >
                                        🗑️ {t('common.delete')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AgencyManager;
