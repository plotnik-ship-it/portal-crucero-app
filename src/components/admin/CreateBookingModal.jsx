import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createBooking } from '../../services/firestore';

const createBookingModal = ({ onClose, onSuccess }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        displayName: '',
        bookingCode: '',
        email: '',
        cabinCount: 1, // Default to 1 cabin
        password: 'password123' // Default password as per requirement
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Prepare cabin accounts based on count
            const cabinAccounts = Array.from({ length: parseInt(formData.cabinCount) }).map((_, idx) => ({
                cabinNumber: `Cabina ${idx + 1}`,
                bookingNumber: '',
                subtotalCad: 0,
                gratuitiesCad: 0,
                totalCad: 0,
                paidCad: 0,
                balanceCad: 0,
                paymentDeadlines: [],
                depositPaid: false
            }));

            const cabinNumbers = cabinAccounts.map(c => c.cabinNumber);

            const familyData = {
                displayName: formData.displayName,
                bookingCode: formData.bookingCode.toUpperCase(),
                email: formData.email,
                password: formData.password,
                cabinNumbers,
                cabinAccounts,
                role: 'family',
                subtotalCadGlobal: 0,
                gratuitiesCadGlobal: 0,
                totalCadGlobal: 0,
                paidCadGlobal: 0,
                balanceCadGlobal: 0
            };

            await createBooking(familyData);

            alert(t('admin.BookingCreatedSuccess', { name: formData.displayName }));
            onSuccess();
            onClose();

        } catch (error) {
            console.error('Error creating booking:', error);
            alert(t('admin.errorCreatingbooking', { error: error.message }));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className="modal-content">
                <div className="modal-header">
                    <h3 className="modal-title">{t('admin.newbooking')}</h3>
                    <button onClick={onClose} className="btn-close">&times;</button>
                </div>

                <div className="modal-body">
                    <form onSubmit={handleSubmit} id="createBookingForm">
                        <div className="form-group">
                            <label className="form-label required">{t('admin.bookingCodeLabel')}</label>
                            <input
                                className="form-input"
                                value={formData.bookingCode}
                                onChange={(e) => setFormData({ ...formData, bookingCode: e.target.value })}
                                placeholder={t('admin.bookingCodePlaceholder')}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label required">{t('admin.BookingNameLabel')}</label>
                            <input
                                className="form-input"
                                value={formData.displayName}
                                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                placeholder={t('admin.BookingNamePlaceholder')}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label required">{t('admin.emailLabel')}</label>
                            <input
                                type="email"
                                className="form-input"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder={t('admin.emailPlaceholder')}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">{t('admin.initialCabinCount')}</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.cabinCount}
                                onChange={(e) => setFormData({ ...formData, cabinCount: Math.max(1, parseInt(e.target.value) || 1) })}
                                min="1"
                                max="10"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label required">{t('admin.temporaryPassword')}</label>
                            <input
                                className="form-input"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                            <small className="text-muted">{t('admin.temporaryPasswordHelp')}</small>
                        </div>
                    </form>
                </div>

                <div className="modal-footer">
                    <button onClick={onClose} className="btn btn-outline" type="button">{t('common.cancel')}</button>
                    <button
                        type="submit"
                        form="createBookingForm"
                        className="btn btn-primary"
                        disabled={loading}
                    >
                        {loading ? t('common.loading') : t('admin.createbooking')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default createBookingModal;
