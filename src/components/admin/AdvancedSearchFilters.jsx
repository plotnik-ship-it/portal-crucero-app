import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../shared/Card';

/**
 * Advanced Search Filters Component
 * Provides multiple filter options and sorting for family list
 */
const AdvancedSearchFilters = ({ onFilterChange, onReset }) => {
    const { t } = useTranslation();
    const [filters, setFilters] = useState({
        searchTerm: '',
        balanceMin: '',
        balanceMax: '',
        depositStatus: 'all', // all, paid, unpaid
        sortBy: 'bookingCode', // bookingCode, displayName, balanceCad, paidCad, totalCad
        sortOrder: 'asc' // asc, desc
    });

    const [isExpanded, setIsExpanded] = useState(false);

    const handleChange = (field, value) => {
        const newFilters = { ...filters, [field]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const handleReset = () => {
        const resetFilters = {
            searchTerm: '',
            balanceMin: '',
            balanceMax: '',
            depositStatus: 'all',
            sortBy: 'bookingCode',
            sortOrder: 'asc'
        };
        setFilters(resetFilters);
        onReset(resetFilters);
    };

    return (
        <Card>
            <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setIsExpanded(!isExpanded)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="card-title">🔍 {t('admin.advancedSearch')}</h3>
                    <button className="btn btn-sm btn-outline">
                        {isExpanded ? `▲ ${t('admin.hide')}` : `▼ ${t('admin.show')}`}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="card-body">
                    <div className="grid grid-cols-3 gap-md mb-md">
                        {/* Search Term */}
                        <div className="form-group">
                            <label className="form-label">{t('admin.search')}</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder={t('admin.searchPlaceholderAdvanced')}
                                value={filters.searchTerm}
                                onChange={(e) => handleChange('searchTerm', e.target.value)}
                            />
                        </div>

                        {/* Deposit Status */}
                        <div className="form-group">
                            <label className="form-label">{t('admin.depositStatusLabel')}</label>
                            <select
                                className="form-input"
                                value={filters.depositStatus}
                                onChange={(e) => handleChange('depositStatus', e.target.value)}
                            >
                                <option value="all">{t('admin.all')}</option>
                                <option value="paid">{t('admin.withDepositOption')}</option>
                                <option value="unpaid">{t('admin.withoutDepositOption')}</option>
                            </select>
                        </div>

                        {/* Sort By */}
                        <div className="form-group">
                            <label className="form-label">{t('admin.sortBy')}</label>
                            <select
                                className="form-input"
                                value={filters.sortBy}
                                onChange={(e) => handleChange('sortBy', e.target.value)}
                            >
                                <option value="bookingCode">{t('admin.sortByCode')}</option>
                                <option value="displayName">{t('admin.sortByName')}</option>
                                <option value="totalCad">{t('admin.sortByTotal')}</option>
                                <option value="paidCad">{t('admin.sortByPaid')}</option>
                                <option value="balanceCad">{t('admin.sortByBalance')}</option>
                            </select>
                        </div>

                        {/* Balance Range */}
                        <div className="form-group">
                            <label className="form-label">{t('admin.balanceMin')}</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="0"
                                min="0"
                                step="100"
                                value={filters.balanceMin}
                                onChange={(e) => handleChange('balanceMin', e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">{t('admin.balanceMax')}</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="10000"
                                min="0"
                                step="100"
                                value={filters.balanceMax}
                                onChange={(e) => handleChange('balanceMax', e.target.value)}
                            />
                        </div>

                        {/* Sort Order */}
                        <div className="form-group">
                            <label className="form-label">{t('admin.order')}</label>
                            <select
                                className="form-input"
                                value={filters.sortOrder}
                                onChange={(e) => handleChange('sortOrder', e.target.value)}
                            >
                                <option value="asc">{t('admin.ascending')}</option>
                                <option value="desc">{t('admin.descending')}</option>
                            </select>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                            className="btn btn-outline"
                            onClick={handleReset}
                        >
                            {t('admin.clearFilters')}
                        </button>
                        <button
                            className="btn btn-outline"
                            onClick={() => setIsExpanded(false)}
                        >
                            {t('admin.applyAndClose')}
                        </button>
                    </div>

                    {/* Active Filters Summary */}
                    {(filters.searchTerm || filters.depositStatus !== 'all' || filters.balanceMin || filters.balanceMax) && (
                        <div className="mt-md p-sm bg-light rounded border border-light">
                            <p className="text-small font-semibold mb-xs">{t('admin.activeFilters')}</p>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {filters.searchTerm && (
                                    <span className="badge badge-primary">
                                        {t('admin.searchLabel')}: "{filters.searchTerm}"
                                    </span>
                                )}
                                {filters.depositStatus !== 'all' && (
                                    <span className="badge badge-info">
                                        {filters.depositStatus === 'paid' ? t('admin.withDeposit') : t('admin.withoutDeposit')}
                                    </span>
                                )}
                                {filters.balanceMin && (
                                    <span className="badge badge-warning">
                                        {t('admin.balance')} ≥ ${filters.balanceMin}
                                    </span>
                                )}
                                {filters.balanceMax && (
                                    <span className="badge badge-warning">
                                        {t('admin.balance')} ≤ ${filters.balanceMax}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
};

export default AdvancedSearchFilters;
