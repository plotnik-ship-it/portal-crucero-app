/**
 * CabinInfoCard Component
 * 
 * Displays cabin information for the family
 */

import { useTranslation } from 'react-i18next';

const CabinInfoCard = ({ familyData }) => {
    const { t } = useTranslation();

    const cabins = familyData.cabins || [];

    return (
        <div className="cabin-info-card">
            <div className="card-header">
                <h3>{t('traveler.cabin.title')}</h3>
            </div>

            <div className="cabin-list">
                {cabins.length > 0 ? (
                    cabins.map((cabin, index) => (
                        <div key={index} className="cabin-item">
                            <div className="cabin-icon">🛏️</div>
                            <div className="cabin-details">
                                <span className="cabin-number">{t('traveler.cabin.number')}: {cabin.cabinNumber}</span>
                                {cabin.category && (
                                    <span className="cabin-category">{cabin.category}</span>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="no-cabins">
                        <p>{t('traveler.cabin.noCabins')}</p>
                    </div>
                )}
            </div>

            {familyData.displayName && (
                <div className="family-name-display">
                    <span className="label">{t('traveler.family.name')}:</span>
                    <span className="value">{familyData.displayName}</span>
                </div>
            )}
        </div>
    );
};

export default CabinInfoCard;
