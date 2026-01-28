import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * ItineraryEditor Component
 * User-friendly editor for cruise itineraries with smart text parsing
 */
const ItineraryEditor = ({ value = [], onChange }) => {
    const { t } = useTranslation();
    const [mode, setMode] = useState('edit'); // 'import' or 'edit'
    const [importText, setImportText] = useState('');
    const [itinerary, setItinerary] = useState(value);

    // Smart parser for cruise itinerary text
    const parseItineraryText = (text) => {
        const lines = text.split('\n').filter(line => line.trim());
        const parsed = [];

        lines.forEach(line => {
            // Skip empty lines or headers
            if (!line.trim() || line.toLowerCase().includes('itinerary') || line.toLowerCase().includes('itinerario')) {
                return;
            }

            // Extract day number - supports multiple formats
            // "Day 1", "Día 1", "1.", "Day 1:", etc.
            const dayMatch = line.match(/(?:day|día)\s*(\d+)|^(\d+)[\.\):\-]/i);
            if (!dayMatch) return;

            const day = parseInt(dayMatch[1] || dayMatch[2]);

            // Extract port name - everything between day and time indicators
            let portName = line
                .replace(/(?:day|día)\s*\d+[\.\):\-\s]*/i, '') // Remove day prefix
                .replace(/^(\d+)[\.\):\-\s]+/, '') // Remove numeric day prefix
                .trim();

            // Extract times - look for HH:MM patterns
            const timeMatches = [...line.matchAll(/(\d{1,2}):(\d{2})\s*(am|pm)?/gi)];

            let arrive = '-';
            let depart = '-';

            if (timeMatches.length > 0) {
                // Convert times to 24h format
                const convertTo24h = (hour, minute, meridiem) => {
                    let h = parseInt(hour);
                    const m = minute.padStart(2, '0');

                    if (meridiem) {
                        const isPM = meridiem.toLowerCase() === 'pm';
                        if (isPM && h !== 12) h += 12;
                        if (!isPM && h === 12) h = 0;
                    }

                    return `${h.toString().padStart(2, '0')}:${m}`;
                };

                // First time is usually arrival, second is departure
                if (timeMatches.length === 1) {
                    // Check context to determine if it's arrival or departure
                    if (line.toLowerCase().includes('depart') || line.toLowerCase().includes('salida')) {
                        depart = convertTo24h(timeMatches[0][1], timeMatches[0][2], timeMatches[0][3]);
                    } else {
                        arrive = convertTo24h(timeMatches[0][1], timeMatches[0][2], timeMatches[0][3]);
                    }
                } else if (timeMatches.length >= 2) {
                    arrive = convertTo24h(timeMatches[0][1], timeMatches[0][2], timeMatches[0][3]);
                    depart = convertTo24h(timeMatches[1][1], timeMatches[1][2], timeMatches[1][3]);
                }

                // Remove time info from port name
                portName = portName.replace(/\d{1,2}:\d{2}\s*(am|pm)?/gi, '').trim();
            }

            // Clean up port name - remove common separators and keywords
            portName = portName
                .replace(/[\-–—]/g, ' ') // Replace dashes
                .replace(/\s+/g, ' ') // Normalize spaces
                .replace(/\(.*?\)/g, '') // Remove parentheses content
                .replace(/arrive|depart|arrival|departure|salida|llegada/gi, '')
                .trim();

            // Handle "At Sea" / "Navegación" / "Sea Day"
            if (portName.toLowerCase().includes('sea') ||
                portName.toLowerCase().includes('navegación') ||
                portName.toLowerCase().includes('navegacion')) {
                portName = 'At Sea / Navegación';
                arrive = '-';
                depart = '-';
            }

            parsed.push({
                day,
                port: portName || 'Unknown Port',
                arrive,
                depart
            });
        });

        return parsed.sort((a, b) => a.day - b.day);
    };

    const handleParseText = () => {
        const parsed = parseItineraryText(importText);
        if (parsed.length === 0) {
            alert(t('admin.itineraryEditor.parseError') || 'No se pudo analizar el texto. Verifica el formato.');
            return;
        }
        setItinerary(parsed);
        onChange(parsed);
        setMode('edit');
    };

    const handleUpdateDay = (index, field, value) => {
        const updated = [...itinerary];
        updated[index] = { ...updated[index], [field]: value };
        setItinerary(updated);
        onChange(updated);
    };

    const handleAddDay = () => {
        const newDay = {
            day: itinerary.length + 1,
            port: '',
            arrive: '-',
            depart: '-'
        };
        const updated = [...itinerary, newDay];
        setItinerary(updated);
        onChange(updated);
    };

    const handleDeleteDay = (index) => {
        const updated = itinerary.filter((_, i) => i !== index);
        // Renumber days
        updated.forEach((item, i) => {
            item.day = i + 1;
        });
        setItinerary(updated);
        onChange(updated);
    };

    return (
        <div className="itinerary-editor">
            {/* Mode Toggle */}
            <div className="flex gap-sm mb-md">
                <button
                    type="button"
                    className={`btn btn-sm ${mode === 'import' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setMode('import')}
                    style={{ transition: 'all 0.2s ease' }}
                    onMouseEnter={(e) => {
                        if (mode !== 'import') {
                            e.currentTarget.style.background = 'rgba(45, 156, 219, 0.08)';
                            e.currentTarget.style.borderColor = 'var(--color-primary)';
                            e.currentTarget.style.color = 'var(--color-primary)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (mode !== 'import') {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = 'var(--color-border)';
                            e.currentTarget.style.color = 'var(--color-text-muted)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }
                    }}
                >
                    📋 {t('admin.itineraryEditor.importMode') || 'Importar Texto'}
                </button>
                <button
                    type="button"
                    className={`btn btn-sm ${mode === 'edit' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setMode('edit')}
                    style={{ transition: 'all 0.2s ease' }}
                    onMouseEnter={(e) => {
                        if (mode !== 'edit') {
                            e.currentTarget.style.background = 'rgba(45, 156, 219, 0.08)';
                            e.currentTarget.style.borderColor = 'var(--color-primary)';
                            e.currentTarget.style.color = 'var(--color-primary)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (mode !== 'edit') {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = 'var(--color-border)';
                            e.currentTarget.style.color = 'var(--color-text-muted)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }
                    }}
                >
                    ✏️ {t('admin.itineraryEditor.editMode') || 'Editar Tabla'}
                </button>
            </div>

            {/* Import Mode */}
            {mode === 'import' && (
                <div className="space-y-md">
                    <div className="form-group">
                        <label className="form-label">
                            {t('admin.itineraryEditor.pasteHere') || 'Pega el itinerario aquí'}
                        </label>
                        <textarea
                            className="form-input"
                            rows="10"
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                            placeholder={`Day 1: Miami, Florida - Depart 5:00 PM
Day 2: Perfect Day at CocoCay - 7:00 AM to 5:00 PM
Day 3: Nassau, Bahamas - 8:00 AM to 6:00 PM
Day 4: At Sea
Day 5: Miami, Florida - Arrive 7:00 AM`}
                        />
                    </div>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleParseText}
                    >
                        🔍 {t('admin.itineraryEditor.parseText') || 'Analizar Texto'}
                    </button>
                </div>
            )}

            {/* Edit Mode */}
            {mode === 'edit' && (
                <div className="space-y-md">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th style={{ width: '100px' }}>{t('admin.itineraryEditor.day') || 'Día'}</th>
                                    <th>{t('admin.itineraryEditor.port') || 'Puerto'}</th>
                                    <th style={{ width: '120px' }}>{t('admin.itineraryEditor.arrival') || 'Llegada'}</th>
                                    <th style={{ width: '120px' }}>{t('admin.itineraryEditor.departure') || 'Salida'}</th>
                                    <th style={{ width: '80px' }}>{t('common.actions') || 'Acciones'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {itinerary.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center text-muted">
                                            {t('admin.itineraryEditor.noDays') || 'No hay días configurados. Importa texto o agrega días manualmente.'}
                                        </td>
                                    </tr>
                                ) : (
                                    itinerary.map((day, index) => (
                                        <tr key={index}>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={day.day}
                                                    onChange={(e) => handleUpdateDay(index, 'day', parseInt(e.target.value) || 1)}
                                                    min="1"
                                                    style={{ textAlign: 'center' }}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={day.port}
                                                    onChange={(e) => handleUpdateDay(index, 'port', e.target.value)}
                                                    placeholder="Puerto"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={day.arrive}
                                                    onChange={(e) => handleUpdateDay(index, 'arrive', e.target.value)}
                                                    placeholder="HH:MM o -"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={day.depart}
                                                    onChange={(e) => handleUpdateDay(index, 'depart', e.target.value)}
                                                    placeholder="HH:MM o -"
                                                />
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => handleDeleteDay(index)}
                                                    title="Eliminar día"
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <button
                        type="button"
                        className="btn btn-outline"
                        onClick={handleAddDay}
                        style={{
                            marginTop: '1rem',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(45, 156, 219, 0.08)';
                            e.currentTarget.style.borderColor = 'var(--color-primary)';
                            e.currentTarget.style.color = 'var(--color-primary)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = 'var(--color-border)';
                            e.currentTarget.style.color = 'var(--color-text-muted)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        ➕ {t('admin.itineraryEditor.addDay') || 'Agregar Día'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ItineraryEditor;
