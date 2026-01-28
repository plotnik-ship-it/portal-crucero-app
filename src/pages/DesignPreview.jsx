import React from 'react';
import '../styles/new-design.css';

/**
 * Professional SaaS Design Preview
 * White-Label Ready for Enterprise Agencies
 */
const DesignPreview = () => {
    return (
        <div className="new-design" style={{
            padding: '2rem',
            background: '#F8FAFC',
            minHeight: '100vh'
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* Agency Branding Preview */}
                <section style={{
                    marginBottom: '2rem',
                    background: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #0F766E 0%, #115E59 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: '700',
                            fontSize: '1.25rem'
                        }}>
                            AT
                        </div>
                        <div>
                            <h3 style={{
                                margin: 0,
                                fontSize: '1.125rem',
                                fontFamily: 'Poppins, sans-serif',
                                color: '#0F172A'
                            }}>
                                Acme Travel Portal
                            </h3>
                            <p className="text-muted-new" style={{ margin: 0, fontSize: '0.875rem' }}>
                                White-label branding example
                            </p>
                        </div>
                    </div>
                    <div style={{
                        padding: '0.5rem 1rem',
                        background: '#CCFBF1',
                        color: '#115E59',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                    }}>
                        AGENCY BRANDED
                    </div>
                </section>

                {/* Operational Alert Strip */}
                <section style={{ marginBottom: '2rem' }}>
                    <div style={{
                        background: '#FEF3C7',
                        border: '1px solid #FBBF24',
                        borderRadius: '12px',
                        padding: '1rem 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                                <div>
                                    <div style={{ fontWeight: '600', fontSize: '0.875rem', color: '#92400E' }}>
                                        3 overdue payments
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#B45309' }}>
                                        Require immediate attention
                                    </div>
                                </div>
                            </div>
                            <div style={{ width: '1px', height: '32px', background: '#FBBF24' }}></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '1.25rem' }}>📋</span>
                                <div>
                                    <div style={{ fontWeight: '600', fontSize: '0.875rem', color: '#92400E' }}>
                                        2 pending requests
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#B45309' }}>
                                        Awaiting approval
                                    </div>
                                </div>
                            </div>
                            <div style={{ width: '1px', height: '32px', background: '#FBBF24' }}></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '1.25rem' }}>⏰</span>
                                <div>
                                    <div style={{ fontWeight: '600', fontSize: '0.875rem', color: '#92400E' }}>
                                        Deadline in 5 days
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#B45309' }}>
                                        Final payment due Jan 30
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button className="btn-new btn-sm-new" style={{
                            background: '#FBBF24',
                            color: '#78350F',
                            fontWeight: '600'
                        }}>
                            Review All
                        </button>
                    </div>
                </section>

                {/* Header */}
                <div style={{ marginBottom: '3rem' }}>
                    <h1 style={{
                        fontFamily: 'Poppins, sans-serif',
                        fontSize: '2rem',
                        marginBottom: '0.5rem',
                        color: '#0F172A'
                    }}>
                        🎯 Professional SaaS Design
                    </h1>
                    <p className="text-muted-new" style={{ fontSize: '1rem' }}>
                        White-label ready for enterprise agencies
                    </p>
                </div>

                {/* Color Palette */}
                <section style={{ marginBottom: '3rem' }}>
                    <h2 style={{
                        fontFamily: 'Poppins, sans-serif',
                        fontSize: '1.5rem',
                        marginBottom: '1.5rem',
                        color: '#0F172A'
                    }}>
                        Neutral-First Color System
                    </h2>
                    <div className="grid-new grid-4-new">
                        <div className="card-new">
                            <div style={{
                                background: '#F8FAFC',
                                height: '80px',
                                borderRadius: '8px',
                                marginBottom: '0.75rem',
                                border: '1px solid #E2E8F0'
                            }}></div>
                            <p style={{ fontWeight: '500', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                Background
                            </p>
                            <p className="text-muted-new" style={{ fontSize: '0.75rem' }}>#F8FAFC</p>
                            <p className="text-muted-new" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                                Dominant 85%
                            </p>
                        </div>

                        <div className="card-new">
                            <div style={{
                                background: '#0F766E',
                                height: '80px',
                                borderRadius: '8px',
                                marginBottom: '0.75rem'
                            }}></div>
                            <p style={{ fontWeight: '500', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                Corporate Teal
                            </p>
                            <p className="text-muted-new" style={{ fontSize: '0.75rem' }}>#0F766E</p>
                            <p className="text-muted-new" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                                Enterprise
                            </p>
                        </div>

                        <div className="card-new">
                            <div style={{
                                background: '#16A34A',
                                height: '80px',
                                borderRadius: '8px',
                                marginBottom: '0.75rem'
                            }}></div>
                            <p style={{ fontWeight: '500', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                Success Green
                            </p>
                            <p className="text-muted-new" style={{ fontSize: '0.75rem' }}>#16A34A</p>
                            <p className="text-muted-new" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                                Professional
                            </p>
                        </div>

                        <div className="card-new">
                            <div style={{
                                background: '#FBBF24',
                                height: '80px',
                                borderRadius: '8px',
                                marginBottom: '0.75rem'
                            }}></div>
                            <p style={{ fontWeight: '500', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                Warning Amber
                            </p>
                            <p className="text-muted-new" style={{ fontSize: '0.75rem' }}>#FBBF24</p>
                            <p className="text-muted-new" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                                Elegant
                            </p>
                        </div>
                    </div>
                </section>

                {/* Button Hierarchy */}
                <section style={{ marginBottom: '3rem' }}>
                    <h2 style={{
                        fontFamily: 'Poppins, sans-serif',
                        fontSize: '1.5rem',
                        marginBottom: '1.5rem',
                        color: '#0F172A'
                    }}>
                        Button Hierarchy (SaaS Best Practice)
                    </h2>

                    <div className="card-new" style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{
                            fontSize: '1rem',
                            marginBottom: '1rem',
                            color: '#475569'
                        }}>
                            ✅ Correct Usage
                        </h3>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                            <button className="btn-new btn-primary-new">
                                💾 Save Changes
                            </button>
                            <button className="btn-new btn-secondary-new">
                                📧 Send Email
                            </button>
                            <button className="btn-new btn-ghost-new">
                                ➕ Add Family
                            </button>
                        </div>
                        <p className="text-muted-new" style={{ fontSize: '0.875rem' }}>
                            Primary for main action, Secondary for common actions, Ghost for subtle actions
                        </p>
                    </div>

                    <div className="card-new">
                        <h3 style={{
                            fontSize: '1rem',
                            marginBottom: '1rem',
                            color: '#475569'
                        }}>
                            All Button Variants
                        </h3>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button className="btn-new btn-primary-new">Primary</button>
                            <button className="btn-new btn-secondary-new">Secondary</button>
                            <button className="btn-new btn-ghost-new">Ghost</button>
                            <button className="btn-new btn-danger-new">Danger</button>
                            <button className="btn-new btn-sm-new btn-secondary-new">Small</button>
                        </div>
                    </div>
                </section>

                {/* Dashboard Cards */}
                <section style={{ marginBottom: '3rem' }}>
                    <h2 style={{
                        fontFamily: 'Poppins, sans-serif',
                        fontSize: '1.5rem',
                        marginBottom: '1.5rem',
                        color: '#0F172A'
                    }}>
                        Dashboard Metrics (Data-Focused)
                    </h2>
                    <div className="grid-new grid-4-new">
                        <div className="stat-card-new">
                            <p className="stat-label-new">Total Families</p>
                            <p className="stat-value-new">248</p>
                            <p style={{ fontSize: '0.75rem', color: '#16A34A', fontWeight: '500' }}>
                                ↑ 12% vs last month
                            </p>
                        </div>

                        <div className="stat-card-new">
                            <p className="stat-label-new">Total Revenue</p>
                            <p className="stat-value-new">$124,500</p>
                            <p style={{ fontSize: '0.75rem', color: '#16A34A', fontWeight: '500' }}>
                                ↑ 8% vs last month
                            </p>
                        </div>

                        <div className="stat-card-new">
                            <p className="stat-label-new">Pending Balance</p>
                            <p className="stat-value-new">$45,230</p>
                            <p style={{ fontSize: '0.75rem', color: '#FBBF24', fontWeight: '500' }}>
                                23 families
                            </p>
                        </div>

                        <div className="stat-card-new">
                            <p className="stat-label-new">Payment Requests</p>
                            <p className="stat-value-new">12</p>
                            <p style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '500' }}>
                                Awaiting approval
                            </p>
                        </div>
                    </div>
                </section>

                {/* Family Cards */}
                <section style={{ marginBottom: '3rem' }}>
                    <h2 style={{
                        fontFamily: 'Poppins, sans-serif',
                        fontSize: '1.5rem',
                        marginBottom: '1.5rem',
                        color: '#0F172A'
                    }}>
                        Family Cards (Clean & Professional)
                    </h2>
                    <div className="grid-new grid-3-new">
                        <div className="card-new">
                            <div className="flex-between-new" style={{ marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{
                                        fontSize: '1.125rem',
                                        marginBottom: '0.25rem',
                                        fontFamily: 'Poppins, sans-serif'
                                    }}>
                                        González Family
                                    </h3>
                                    <p className="text-muted-new" style={{ fontSize: '0.875rem' }}>
                                        2 cabins • FAM-001
                                    </p>
                                </div>
                                <button className="btn-new btn-sm-new btn-ghost-new">⋯</button>
                            </div>
                            <div style={{
                                padding: '0.75rem',
                                background: '#F8FAFC',
                                borderRadius: '8px',
                                marginBottom: '1rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span className="text-secondary-new" style={{ fontSize: '0.875rem' }}>Total</span>
                                    <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>$4,500</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span className="text-secondary-new" style={{ fontSize: '0.875rem' }}>Paid</span>
                                    <span style={{ fontWeight: '600', fontSize: '0.875rem', color: '#16A34A' }}>$2,050</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span className="text-secondary-new" style={{ fontSize: '0.875rem' }}>Balance</span>
                                    <span style={{ fontWeight: '600', fontSize: '0.875rem', color: '#DC2626' }}>$2,450</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <span className="badge-new badge-warning-new">Pending</span>
                                <span className="badge-new badge-neutral-new">Active</span>
                            </div>
                        </div>

                        <div className="card-new">
                            <div className="flex-between-new" style={{ marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{
                                        fontSize: '1.125rem',
                                        marginBottom: '0.25rem',
                                        fontFamily: 'Poppins, sans-serif'
                                    }}>
                                        Martínez Family
                                    </h3>
                                    <p className="text-muted-new" style={{ fontSize: '0.875rem' }}>
                                        1 cabin • FAM-002
                                    </p>
                                </div>
                                <button className="btn-new btn-sm-new btn-ghost-new">⋯</button>
                            </div>
                            <div style={{
                                padding: '0.75rem',
                                background: '#F8FAFC',
                                borderRadius: '8px',
                                marginBottom: '1rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span className="text-secondary-new" style={{ fontSize: '0.875rem' }}>Total</span>
                                    <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>$2,200</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span className="text-secondary-new" style={{ fontSize: '0.875rem' }}>Paid</span>
                                    <span style={{ fontWeight: '600', fontSize: '0.875rem', color: '#16A34A' }}>$2,200</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span className="text-secondary-new" style={{ fontSize: '0.875rem' }}>Balance</span>
                                    <span style={{ fontWeight: '600', fontSize: '0.875rem', color: '#16A34A' }}>$0</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <span className="badge-new badge-success-new">Paid</span>
                            </div>
                        </div>

                        <div className="card-new">
                            <div className="flex-between-new" style={{ marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{
                                        fontSize: '1.125rem',
                                        marginBottom: '0.25rem',
                                        fontFamily: 'Poppins, sans-serif'
                                    }}>
                                        López Family
                                    </h3>
                                    <p className="text-muted-new" style={{ fontSize: '0.875rem' }}>
                                        3 cabins • FAM-003
                                    </p>
                                </div>
                                <button className="btn-new btn-sm-new btn-ghost-new">⋯</button>
                            </div>
                            <div style={{
                                padding: '0.75rem',
                                background: '#F8FAFC',
                                borderRadius: '8px',
                                marginBottom: '1rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span className="text-secondary-new" style={{ fontSize: '0.875rem' }}>Total</span>
                                    <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>$6,750</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span className="text-secondary-new" style={{ fontSize: '0.875rem' }}>Paid</span>
                                    <span style={{ fontWeight: '600', fontSize: '0.875rem', color: '#16A34A' }}>$3,000</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span className="text-secondary-new" style={{ fontSize: '0.875rem' }}>Balance</span>
                                    <span style={{ fontWeight: '600', fontSize: '0.875rem', color: '#DC2626' }}>$3,750</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <span className="badge-new badge-warning-new">Pending</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Data Table */}
                <section style={{ marginBottom: '3rem' }}>
                    <h2 style={{
                        fontFamily: 'Poppins, sans-serif',
                        fontSize: '1.5rem',
                        marginBottom: '1.5rem',
                        color: '#0F172A'
                    }}>
                        Payment History Table
                    </h2>
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        overflow: 'hidden'
                    }}>
                        <table className="table-new">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Family</th>
                                    <th>Amount</th>
                                    <th>Method</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Jan 24, 2026</td>
                                    <td>
                                        <div>
                                            <div style={{ fontWeight: '500' }}>González Family</div>
                                            <div className="text-muted-new" style={{ fontSize: '0.75rem' }}>FAM-001</div>
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: '600' }}>$500.00</td>
                                    <td>Wire Transfer</td>
                                    <td><span className="badge-new badge-success-new">Completed</span></td>
                                    <td>
                                        <button className="btn-new btn-sm-new btn-ghost-new">View</button>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Jan 23, 2026</td>
                                    <td>
                                        <div>
                                            <div style={{ fontWeight: '500' }}>Martínez Family</div>
                                            <div className="text-muted-new" style={{ fontSize: '0.75rem' }}>FAM-002</div>
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: '600' }}>$1,200.00</td>
                                    <td>Card</td>
                                    <td><span className="badge-new badge-warning-new">Pending</span></td>
                                    <td>
                                        <button className="btn-new btn-sm-new btn-ghost-new">View</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Design Principles */}
                <section style={{ marginBottom: '3rem' }}>
                    <h2 style={{
                        fontFamily: 'Poppins, sans-serif',
                        fontSize: '1.5rem',
                        marginBottom: '1.5rem',
                        color: '#0F172A'
                    }}>
                        White-Label SaaS Principles
                    </h2>
                    <div className="grid-new grid-2-new">
                        <div className="card-new">
                            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#16A34A' }}>
                                ✅ What We Did Right
                            </h3>
                            <ul style={{ lineHeight: '1.8', color: '#475569', fontSize: '0.875rem' }}>
                                <li>Neutral base (85% gray scale)</li>
                                <li>Muted, professional colors</li>
                                <li>Clear button hierarchy</li>
                                <li>Data-focused, not lifestyle</li>
                                <li>Configurable primary color</li>
                                <li>Subtle shadows & borders</li>
                            </ul>
                        </div>
                        <div className="card-new">
                            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#DC2626' }}>
                                ❌ What We Avoided
                            </h3>
                            <ul style={{ lineHeight: '1.8', color: '#475569', fontSize: '0.875rem' }}>
                                <li>Bright, saturated colors</li>
                                <li>Too many colored buttons</li>
                                <li>Editorial lifestyle images</li>
                                <li>Android-style green</li>
                                <li>Canva-like appearance</li>
                                <li>Template-y feel</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* White-Label Color Customization */}
                <section style={{ marginBottom: '3rem' }}>
                    <h2 style={{
                        fontFamily: 'Poppins, sans-serif',
                        fontSize: '1.5rem',
                        marginBottom: '1.5rem',
                        color: '#0F172A'
                    }}>
                        White-Label: Agency Branding Examples
                    </h2>
                    <div className="grid-new grid-3-new">
                        {/* Agency 1 - Teal (Default) */}
                        <div className="card-new">
                            <div style={{
                                padding: '1rem',
                                background: 'linear-gradient(135deg, #0F766E 0%, #115E59 100%)',
                                borderRadius: '8px',
                                marginBottom: '1rem',
                                color: 'white',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontWeight: '700', fontSize: '1.5rem', marginBottom: '0.25rem' }}>AT</div>
                                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Acme Travel</div>
                            </div>
                            <p style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                                Corporate Teal
                            </p>
                            <p className="text-muted-new" style={{ fontSize: '0.75rem' }}>
                                Professional, trustworthy, enterprise-ready
                            </p>
                        </div>

                        {/* Agency 2 - Navy */}
                        <div className="card-new">
                            <div style={{
                                padding: '1rem',
                                background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)',
                                borderRadius: '8px',
                                marginBottom: '1rem',
                                color: 'white',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontWeight: '700', fontSize: '1.5rem', marginBottom: '0.25rem' }}>GT</div>
                                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Global Tours</div>
                            </div>
                            <p style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                                Navy Blue
                            </p>
                            <p className="text-muted-new" style={{ fontSize: '0.75rem' }}>
                                Traditional, reliable, corporate
                            </p>
                        </div>

                        {/* Agency 3 - Purple */}
                        <div className="card-new">
                            <div style={{
                                padding: '1rem',
                                background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                                borderRadius: '8px',
                                marginBottom: '1rem',
                                color: 'white',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontWeight: '700', fontSize: '1.5rem', marginBottom: '0.25rem' }}>LT</div>
                                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Luxury Travel</div>
                            </div>
                            <p style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                                Royal Purple
                            </p>
                            <p className="text-muted-new" style={{ fontSize: '0.75rem' }}>
                                Premium, exclusive, high-end
                            </p>
                        </div>
                    </div>
                    <div style={{
                        marginTop: '1.5rem',
                        padding: '1rem',
                        background: '#F1F5F9',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0'
                    }}>
                        <p style={{ fontSize: '0.875rem', color: '#475569', margin: 0 }}>
                            💡 <strong>White-Label Ready:</strong> Each agency can configure their primary color, logo, and portal name. The neutral base ensures the design works with any brand color.
                        </p>
                    </div>
                </section>

                {/* Final CTA */}
                <section>
                    <div className="card-new" style={{
                        background: 'linear-gradient(135deg, #0F766E 0%, #115E59 100%)',
                        color: 'white',
                        textAlign: 'center',
                        padding: '3rem',
                        border: 'none'
                    }}>
                        <h2 style={{
                            fontFamily: 'Poppins, sans-serif',
                            margin: '0 0 0.75rem 0',
                            color: 'white'
                        }}>
                            Enterprise-Ready Design System
                        </h2>
                        <p style={{ margin: '0 0 2rem 0', opacity: 0.95, fontSize: '1rem' }}>
                            "This is YOUR software" - Professional, neutral, and white-label ready
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button
                                className="btn-new"
                                style={{
                                    background: 'white',
                                    color: '#0F766E',
                                    fontSize: '0.875rem',
                                    fontWeight: '600'
                                }}
                            >
                                🚀 Apply to Portal
                            </button>
                            <button
                                className="btn-new"
                                style={{
                                    background: 'transparent',
                                    color: 'white',
                                    border: '1px solid rgba(255,255,255,0.3)',
                                    fontSize: '0.875rem'
                                }}
                            >
                                📋 View Documentation
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default DesignPreview;
