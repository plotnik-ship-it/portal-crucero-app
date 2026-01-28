import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getGroupData, updateGroupData } from '../../services/firestore';
import Card from '../shared/Card';
import { formatTimestamp } from '../../utils/formatters';
import ItineraryEditor from './ItineraryEditor';

const GroupConfig = ({ groupId = 'default' }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [groupData, setGroupData] = useState(null);

    // Form States
    const [rate, setRate] = useState('');
    const [shipName, setShipName] = useState('');
    const [sailDate, setSailDate] = useState('');
    const [finalPaymentDate, setFinalPaymentDate] = useState('');
    const [itinerary, setItinerary] = useState([]); // Array of itinerary days

    useEffect(() => {
        loadData();
    }, [groupId]);

    const loadData = async () => {
        try {
            const data = await getGroupData(groupId);
            if (data) {
                setGroupData(data);
                setRate(data.fxRateCadToMxn);
                setShipName(data.shipName || '');
                setSailDate(data.sailDate || '');
                setFinalPaymentDate(data.finalPaymentDate || '');
                setItinerary(data.itinerary || []);
            }
        } catch (error) {
            console.error('Error loading group data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const updates = {
                fxRateCadToMxn: parseFloat(rate),
                shipName,
                sailDate,
                finalPaymentDate,
                itinerary,
            };

            // If we want to track separate timestamps:
            if (parseFloat(rate) !== groupData.fxRateCadToMxn) {
                updates.fxUpdatedAt = new Date(); // serverTimestamp will be handled by wrapper or explicit import
            }

            await updateGroupData(groupId, updates);

            setGroupData(prev => ({ ...prev, ...updates }));
            alert('Configuración actualizada exitosamente');
        } catch (error) {
            console.error('Error saving config:', error);
            alert('Error al guardar la configuración');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>{t('common.loading')}</div>;

    return (
        <div className="grid grid-2 gap-lg">
            {/* General Settings */}
            <Card>
                <div className="card-header">
                    <h3 className="card-title">⚙️ {t('admin.groupConfig')}</h3>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSave}>
                        <div className="form-group">
                            <label className="form-label">{t('admin.shipName')}</label>
                            <input
                                className="form-input"
                                value={shipName}
                                onChange={e => setShipName(e.target.value)}
                                placeholder="Royal Caribbean - Harmony of the Seas"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">{t('admin.sailDate')}</label>
                            <input
                                type="date"
                                className="form-input"
                                value={sailDate}
                                onChange={e => setSailDate(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">{t('admin.deadlineDate')}</label>
                            <input
                                type="date"
                                className="form-input"
                                value={finalPaymentDate}
                                onChange={e => setFinalPaymentDate(e.target.value)}
                            />
                            <div className="form-help">{t('admin.deadlineHelp')}</div>
                        </div>


                        {/* Exchange Rate - Only show for CAD groups */}
                        {groupData?.groupCurrency === 'CAD' && (
                            <div className="form-group">
                                <label className="form-label">{t('admin.exchangeRate')}</label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    className="form-input"
                                    value={rate}
                                    onChange={e => setRate(e.target.value)}
                                />
                                <div className="form-help">
                                    {t('admin.currentRate', { rate: groupData?.fxRateCadToMxn?.toFixed(4) })}
                                    <br />
                                    {t('admin.lastUpdated', { date: formatTimestamp(groupData?.fxUpdatedAt) })}
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">{t('admin.itinerary')}</label>
                            <ItineraryEditor
                                value={itinerary}
                                onChange={(newItinerary) => setItinerary(newItinerary)}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary w-full"
                            disabled={saving}
                        >
                            {saving ? t('common.loading') : t('common.saveChanges')}
                        </button>
                    </form>
                </div>
            </Card>

            {/* Preview Only Panel - Useful to see how it looks cleanly? Or just stick to one card? 
                Let's keep it simple with one card for now, or maybe sidebar help.
            */}
        </div>
    );
};

export default GroupConfig;
