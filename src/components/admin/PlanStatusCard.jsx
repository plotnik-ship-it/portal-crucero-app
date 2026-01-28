import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAgency } from '../../contexts/AgencyContext';

/**
 * PlanStatusCard - Displays current plan and feature access
 * Shows in admin dashboard for easy plan visibility
 */
const PlanStatusCard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { agency } = useAgency();

    const planKey = agency?.planKey || 'trial';

    // Plan display names
    const planNames = {
        trial: { name: 'Trial', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.1)' },
        solo_groups: { name: 'Solo Groups', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.1)' },
        pro: { name: 'Pro', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
        enterprise: { name: 'Enterprise', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' }
    };

    // Features with plan requirements
    const features = [
        { key: 'multi_group', labelKey: 'plan.features.multiGroup', plans: ['pro', 'enterprise'] },
        { key: 'ocr_parsing', labelKey: 'plan.features.ocrImport', plans: ['pro', 'enterprise'] },
        { key: 'mass_communications', labelKey: 'plan.features.massComms', plans: ['pro', 'enterprise'] },
        { key: 'api_access', labelKey: 'plan.features.apiAccess', plans: ['enterprise'] }
    ];

    const currentPlan = planNames[planKey] || planNames.trial;
    const isLimitedPlan = planKey === 'trial' || planKey === 'solo_groups';

    const hasAccess = (featurePlans) => featurePlans.includes(planKey);

    return (
        <div style={{
            background: 'var(--color-surface)',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            border: '1px solid var(--color-border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                {/* Plan Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>📦</span>
                    <div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: 'var(--color-text-muted)',
                            marginBottom: '0.25rem'
                        }}>
                            {t('plan.yourPlan')}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{
                                display: 'inline-block',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: currentPlan.color,
                                background: currentPlan.bgColor,
                                border: `1px solid ${currentPlan.color}30`
                            }}>
                                {currentPlan.name}
                            </span>
                            {isLimitedPlan && (
                                <span style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--color-warning)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                }}>
                                    ⚡ {t('plan.upgradeAvailable')}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Manage Button */}
                <button
                    onClick={() => navigate('/billing')}
                    className="btn btn-sm"
                    style={{
                        background: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    {t('plan.managePlan')} →
                </button>
            </div>

            {/* Feature Access */}
            <div style={{
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.75rem 1.5rem'
            }}>
                {features.map(feature => {
                    const hasIt = hasAccess(feature.plans);
                    return (
                        <div
                            key={feature.key}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                fontSize: '0.8rem',
                                color: hasIt ? 'var(--color-success)' : 'var(--color-text-muted)',
                                opacity: hasIt ? 1 : 0.6
                            }}
                        >
                            <span>{hasIt ? '✅' : '❌'}</span>
                            <span>{t(feature.labelKey)}</span>
                        </div>
                    );
                })}
            </div>

            {/* Upgrade Banner for Limited Plans */}
            {isLimitedPlan && (
                <div style={{
                    marginTop: '1rem',
                    padding: '0.875rem 1rem',
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🚀</span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--color-text)' }}>
                            {t('plan.upgradeMessage')}
                        </span>
                    </div>
                    <button
                        onClick={() => navigate('/billing/plans')}
                        className="btn btn-sm"
                        style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                            color: 'white',
                            border: 'none',
                            fontSize: '0.8rem',
                            padding: '0.4rem 0.75rem'
                        }}
                    >
                        {t('plan.viewPlans')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default PlanStatusCard;
