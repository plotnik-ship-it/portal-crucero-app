/**
 * Step 3: Group Creation with Cruise Template
 * Create first group with ship, sail date, itinerary, deadlines, and CSV import
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parseCSV, mergeBookingsByCode, downloadCSVTemplate } from '../../utils/csvParser';
import './GroupCreationStep.css';

const GroupCreationStep = ({ data, onChange }) => {
    const { t } = useTranslation();
    const [csvFile, setCsvFile] = useState(null);
    const [csvError, setCsvError] = useState(null);
    const [csvPreview, setCsvPreview] = useState(null);
    const [showCsvImport, setShowCsvImport] = useState(false);

    const handleChange = (field, value) => {
        onChange({
            ...data,
            [field]: value
        });
    };

    const handleItineraryChange = (index, field, value) => {
        const newItinerary = [...data.itinerary];
        newItinerary[index] = {
            ...newItinerary[index],
            [field]: value
        };
        onChange({
            ...data,
            itinerary: newItinerary
        });
    };

    const addItineraryDay = () => {
        const newDay = data.itinerary.length + 1;
        onChange({
            ...data,
            itinerary: [
                ...data.itinerary,
                { day: newDay, port: '', arrive: '', depart: '' }
            ]
        });
    };

    const removeItineraryDay = (index) => {
        if (data.itinerary.length <= 1) return;
        const newItinerary = data.itinerary.filter((_, i) => i !== index);
        // Renumber days
        newItinerary.forEach((day, i) => {
            day.day = i + 1;
        });
        onChange({
            ...data,
            itinerary: newItinerary
        });
    };

    const handleDeadlineChange = (index, field, value) => {
        const newDeadlines = [...data.paymentDeadlines];
        newDeadlines[index] = {
            ...newDeadlines[index],
            [field]: value
        };
        onChange({
            ...data,
            paymentDeadlines: newDeadlines
        });
    };

    const handleCsvUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setCsvError(null);
        setCsvFile(file);

        try {
            const text = await file.text();
            const result = parseCSV(text);

            if (result.errors && result.errors.length > 0) {
                setCsvError(t('onboarding.csvErrorCount', { count: result.errors.length }));
                setCsvPreview(result);
                return;
            }

            // Merge families by bookingCode
            const mergedFamilies = mergeBookingsByCode(result.families);

            setCsvPreview(result);
            onChange({
                ...data,
                csvFamilies: mergedFamilies
            });

            console.log('✅ CSV parsed successfully:', result.summary);
        } catch (error) {
            setCsvError(error.message);
            setCsvPreview(null);
        }
    };

    const clearCsvImport = () => {
        setCsvFile(null);
        setCsvError(null);
        setCsvPreview(null);
        onChange({
            ...data,
            csvFamilies: []
        });
    };

    return (
        <div className="onboarding-form group-creation-step">
            <div className="step-header">
                <h2>🚢 {t('onboarding.step3Title')}</h2>
                <p className="step-description">
                    {t('onboarding.step3Subtitle')} <span className="optional-badge">{t('onboarding.step3Optional')}</span>
                </p>
            </div>

            {/* Group Basic Info */}
            <div className="form-section">
                <h3>{t('onboarding.basicInformation')}</h3>

                <div className="form-group">
                    <label>
                        {t('onboarding.groupName')} <span className="required">*</span>
                    </label>
                    <input
                        type="text"
                        value={data.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder={t('onboarding.groupNamePlaceholder')}
                        required
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>
                            {t('onboarding.shipName')} <span className="required">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.shipName}
                            onChange={(e) => handleChange('shipName', e.target.value)}
                            placeholder={t('onboarding.shipNamePlaceholder')}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>
                            {t('onboarding.sailDate')} <span className="required">*</span>
                        </label>
                        <input
                            type="date"
                            value={data.sailDate}
                            onChange={(e) => handleChange('sailDate', e.target.value)}
                            required
                        />
                    </div>
                </div>
            </div>

            {/* Itinerary Builder */}
            <div className="form-section">
                <h3>{t('onboarding.itinerary')}</h3>
                <div className="itinerary-list">
                    {data.itinerary.map((day, index) => (
                        <div key={index} className="itinerary-day">
                            <div className="day-number">{t('onboarding.day')} {day.day}</div>
                            <div className="day-fields">
                                <input
                                    type="text"
                                    value={day.port}
                                    onChange={(e) => handleItineraryChange(index, 'port', e.target.value)}
                                    placeholder={t('onboarding.portPlaceholder')}
                                    className="port-input"
                                />
                                <input
                                    type="time"
                                    value={day.arrive}
                                    onChange={(e) => handleItineraryChange(index, 'arrive', e.target.value)}
                                    placeholder={t('onboarding.arrive')}
                                    className="time-input"
                                />
                                <input
                                    type="time"
                                    value={day.depart}
                                    onChange={(e) => handleItineraryChange(index, 'depart', e.target.value)}
                                    placeholder={t('onboarding.depart')}
                                    className="time-input"
                                />
                                {data.itinerary.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeItineraryDay(index)}
                                        className="btn-icon btn-remove"
                                        title={t('onboarding.removeDay')}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={addItineraryDay}
                    className="btn btn-outline btn-add"
                >
                    {t('onboarding.addDay')}
                </button>
            </div>

            {/* Payment Deadlines */}
            <div className="form-section">
                <h3>{t('onboarding.paymentDeadlines')}</h3>
                <p className="help-text">{t('onboarding.percentageWarning')}</p>

                <div className="deadlines-list">
                    {data.paymentDeadlines.map((deadline, index) => (
                        <div key={index} className="deadline-row">
                            <input
                                type="text"
                                value={deadline.label}
                                onChange={(e) => handleDeadlineChange(index, 'label', e.target.value)}
                                placeholder={t('onboarding.deadlineLabelPlaceholder')}
                                className="deadline-label"
                            />
                            <input
                                type="date"
                                value={deadline.dueDate}
                                onChange={(e) => handleDeadlineChange(index, 'dueDate', e.target.value)}
                                className="deadline-date"
                            />
                            <div className="percentage-input">
                                <input
                                    type="number"
                                    value={deadline.percentage}
                                    onChange={(e) => handleDeadlineChange(index, 'percentage', parseFloat(e.target.value) || 0)}
                                    min="0"
                                    max="100"
                                    className="deadline-percentage"
                                />
                                <span>%</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="deadline-summary">
                    {t('onboarding.percentageTotal')}: {data.paymentDeadlines.reduce((sum, d) => sum + (parseFloat(d.percentage) || 0), 0)}%
                </div>
            </div>

            {/* CSV Import */}
            <div className="form-section">
                <div className="section-header">
                    <h3>{t('onboarding.csvImport')} ({t('onboarding.csvImportOptional')})</h3>
                    <button
                        type="button"
                        onClick={() => setShowCsvImport(!showCsvImport)}
                        className="btn btn-outline btn-sm"
                    >
                        {showCsvImport ? t('onboarding.hide') : t('onboarding.show')} {t('onboarding.csvImport')}
                    </button>
                </div>

                {showCsvImport && (
                    <div className="csv-import-section">
                        <div className="csv-actions">
                            <button
                                type="button"
                                onClick={downloadCSVTemplate}
                                className="btn btn-outline"
                            >
                                📥 {t('onboarding.downloadTemplate')}
                            </button>

                            <input
                                type="file"
                                id="csv-upload"
                                accept=".csv"
                                onChange={handleCsvUpload}
                                style={{ display: 'none' }}
                            />
                            <label htmlFor="csv-upload" className="btn btn-primary">
                                📤 {t('onboarding.uploadCSV')}
                            </label>

                            {csvFile && (
                                <button
                                    type="button"
                                    onClick={clearCsvImport}
                                    className="btn btn-outline"
                                >
                                    {t('onboarding.clear')}
                                </button>
                            )}
                        </div>

                        {csvError && (
                            <div className="csv-error">
                                <span>⚠️</span>
                                <span>{csvError}</span>
                            </div>
                        )}

                        {csvPreview && (
                            <div className="csv-preview">
                                <h4>{t('onboarding.csvPreview')}</h4>
                                <div className="summary-stats">
                                    <div className="stat">
                                        <span className="stat-label">{t('onboarding.totalFamilies')}:</span>
                                        <span className="stat-value">{csvPreview.summary.totalFamilies}</span>
                                    </div>
                                    <div className="stat">
                                        <span className="stat-label">{t('onboarding.totalCabins')}:</span>
                                        <span className="stat-value">{csvPreview.summary.totalCabins}</span>
                                    </div>
                                    <div className="stat">
                                        <span className="stat-label">{t('onboarding.validRows')}:</span>
                                        <span className="stat-value success">{csvPreview.summary.validRows}</span>
                                    </div>
                                    {csvPreview.summary.invalidRows > 0 && (
                                        <div className="stat">
                                            <span className="stat-label">{t('onboarding.invalidRows')}:</span>
                                            <span className="stat-value error">{csvPreview.summary.invalidRows}</span>
                                        </div>
                                    )}
                                </div>

                                {csvPreview.errors && csvPreview.errors.length > 0 && (
                                    <div className="csv-errors">
                                        <h5>{t('onboarding.errors')}:</h5>
                                        {csvPreview.errors.slice(0, 5).map((err, i) => (
                                            <div key={i} className="error-item">
                                                <strong>{t('onboarding.row')} {err.row}:</strong> {err.errors.join(', ')}
                                            </div>
                                        ))}
                                        {csvPreview.errors.length > 5 && (
                                            <p className="more-errors">{t('onboarding.moreErrors', { count: csvPreview.errors.length - 5 })}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GroupCreationStep;
