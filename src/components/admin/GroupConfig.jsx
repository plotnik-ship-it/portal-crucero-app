import { useState, useEffect } from 'react';
import { getGroupData, updateGroupData } from '../../services/firestore';
import Card from '../shared/Card';
import { formatTimestamp } from '../../utils/formatters';

const GroupConfig = ({ groupId = 'default' }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [groupData, setGroupData] = useState(null);

    // Form States
    const [rate, setRate] = useState('');
    const [shipName, setShipName] = useState('');
    const [sailDate, setSailDate] = useState('');
    const [finalPaymentDate, setFinalPaymentDate] = useState('');
    const [itineraryText, setItineraryText] = useState(''); // JSON string for editing

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
                setItineraryText(JSON.stringify(data.itinerary || [], null, 2));
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
            // Validate JSON
            let itinerary = [];
            try {
                itinerary = JSON.parse(itineraryText);
            } catch (err) {
                alert('El formato del itinerario (JSON) es inválido.');
                setSaving(false);
                return;
            }

            const updates = {
                fxRateCadToMxn: parseFloat(rate),
                shipName,
                sailDate,
                finalPaymentDate,
                itinerary,
                // If rate changed, we might want fxUpdatedAt, but updateGroupData sets updatedAt globally
                // Let's set specific fxUpdatedAt only if rate changed? For simplicity, we just rely on general updatedAt or custom logic
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

    if (loading) return <div>Cargando configuración...</div>;

    return (
        <div className="grid grid-2 gap-lg">
            {/* General Settings */}
            <Card>
                <div className="card-header">
                    <h3 className="card-title">⚙️ Configuración del Grupo</h3>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSave}>
                        <div className="form-group">
                            <label className="form-label">Naviera / Barco</label>
                            <input
                                className="form-input"
                                value={shipName}
                                onChange={e => setShipName(e.target.value)}
                                placeholder="Royal Caribbean - Harmony of the Seas"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Fecha de Salida</label>
                            <input
                                type="date"
                                className="form-input"
                                value={sailDate}
                                onChange={e => setSailDate(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Fecha Límite (Pago 100%)</label>
                            <input
                                type="date"
                                className="form-input"
                                value={finalPaymentDate}
                                onChange={e => setFinalPaymentDate(e.target.value)}
                            />
                            <div className="form-help">Se mostrará en el dashboard de las familias.</div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Tasa de Cambio (CAD a MXN)</label>
                            <input
                                type="number"
                                step="0.0001"
                                className="form-input"
                                value={rate}
                                onChange={e => setRate(e.target.value)}
                            />
                            <div className="form-help">
                                Actual: 1 CAD = {groupData?.fxRateCadToMxn?.toFixed(4)} MXN
                                <br />
                                Última act: {formatTimestamp(groupData?.fxUpdatedAt)}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label flex justify-between">
                                Itinerario (JSON)
                                <button
                                    type="button"
                                    className="text-xs text-primary underline"
                                    onClick={() => setItineraryText(JSON.stringify([
                                        { day: 1, port: 'Miami, Florida', arrive: '-', depart: '17:00' },
                                        { day: 2, port: 'Perfect Day at Cococay', arrive: '07:00', depart: '17:00' },
                                        { day: 3, port: 'Nassau, Bahamas', arrive: '08:00', depart: '17:00' },
                                        { day: 4, port: 'Navegación', arrive: '-', depart: '-' }
                                    ], null, 2))}
                                >
                                    Cargar Ejemplo
                                </button>
                            </label>
                            <textarea
                                className="form-input"
                                rows="12"
                                value={itineraryText}
                                onChange={e => setItineraryText(e.target.value)}
                                style={{ fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre' }}
                            />
                            <div className="form-help bg-light p-sm rounded mt-xs">
                                <p className="mb-xs"><strong>Formato Requerido:</strong></p>
                                <pre className="text-xs overflow-x-auto">
                                    {`[
  {
    "day": 1,
    "port": "Puerto Ejemplo",
    "arrive": "08:00",
    "depart": "17:00"
  }
]`}
                                </pre>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary w-full"
                            disabled={saving}
                        >
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
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
