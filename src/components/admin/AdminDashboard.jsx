import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../layout/Layout';
import BookingList from './BookingList';
import BookingDetail from './BookingDetail';
import PaymentRequestsList from './PaymentRequestsList';
import GroupConfig from './GroupConfig';
import BulkBookingImport from './BulkBookingImport';
import CreateBookingModal from './CreateBookingModal';
import GroupSelector from './GroupSelector';
import CreateGroupModal from './CreateGroupModal';
import DeleteGroupModal from './DeleteGroupModal';
import AdminDashboardHome from './AdminDashboardHome';
import ReportsHome from './Reports/ReportsHome';
import CommunicationsHome from './Communications/CommunicationsHome';
import PaymentTimeline from './PaymentTimeline/PaymentTimeline';
import DocumentManager from './Documents/DocumentManager';
import RemindersHome from './Reminders/RemindersHome';
import AnalyticsDashboard from './Analytics/AnalyticsDashboard';
import AdminInvoiceManager from './AdminInvoiceManager';
import QuotationManager from './QuotationManager';
import { useGroup } from '../../contexts/GroupContext';
import { getGroupData } from '../../services/firestore';
import { formatDate } from '../../utils/formatters';

// Default tab configuration
const DEFAULT_TABS = [
    { id: 'bookings', icon: '👥', labelKey: 'admin.bookings', fallback: 'Reservas' },
    { id: 'requests', icon: '📋', labelKey: 'admin.requests' },
    { id: 'invoices', icon: '📄', labelKey: 'invoice.title', fallback: 'Facturas' },
    { id: 'quotations', icon: '📝', labelKey: 'quotation.title', fallback: 'Cotizaciones' },
    { id: 'documents', icon: '📁', labelKey: 'admin.documents.title' },
    { id: 'communications', icon: '📧', labelKey: 'admin.communications' },
    { id: 'reminders', icon: '⏰', labelKey: 'family.reminders.title' },
    { id: 'timeline', icon: '📅', label: 'Timeline' },
    { id: 'reports', icon: '📊', labelKey: 'admin.reports' },
    { id: 'analytics', icon: '📈', label: 'Analytics' },
    { id: 'config', icon: '⚙️', labelKey: 'admin.settings' }
];

const AdminDashboard = () => {
    const { t } = useTranslation();
    const { selectedGroup, refreshGroups, selectGroup, groups } = useGroup();
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [activeTab, setActiveTab] = useState('bookings');
    const [refreshKey, setRefreshKey] = useState(0);
    const [groupInfo, setGroupInfo] = useState(null);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
    const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState(null);

    // Drag-and-drop state
    const [tabs, setTabs] = useState(() => {
        const saved = localStorage.getItem('adminTabOrder');
        return saved ? JSON.parse(saved) : DEFAULT_TABS;
    });
    const [isCustomizing, setIsCustomizing] = useState(false);

    useEffect(() => {
        const fetchGroup = async () => {
            if (!selectedGroup?.id) {
                setGroupInfo(null);
                return;
            }
            try {
                const data = await getGroupData(selectedGroup.id);
                setGroupInfo(data);
            } catch (err) {
                console.error("Error fetching group info:", err);
            }
        };
        fetchGroup();
    }, [selectedGroup, refreshKey]);

    const handleUpdate = () => {
        setRefreshKey(prev => prev + 1);
    };

    const handleGroupCreated = async () => {
        await refreshGroups();
        handleUpdate();
    };

    const handleDeleteGroup = (group) => {
        setGroupToDelete(group);
        setShowDeleteGroupModal(true);
    };

    const handleGroupDeleted = async () => {
        await refreshGroups();
        // If deleted group was selected, select another group or clear selection
        if (groups.length > 1) {
            const otherGroup = groups.find(g => g.id !== groupToDelete?.id);
            if (otherGroup) {
                selectGroup(otherGroup.id);
            }
        }
        setGroupToDelete(null);
        handleUpdate();
    };

    // Drag-and-drop handlers
    const handleDragStart = (e, index) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
        e.currentTarget.style.opacity = '0.5';
    };

    const handleDragEnd = (e) => {
        e.currentTarget.style.opacity = '1';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, dropIndex) => {
        e.preventDefault();
        const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));

        if (dragIndex === dropIndex) return;

        const newTabs = [...tabs];
        const [removed] = newTabs.splice(dragIndex, 1);
        newTabs.splice(dropIndex, 0, removed);

        setTabs(newTabs);
        localStorage.setItem('adminTabOrder', JSON.stringify(newTabs));
    };

    const handleResetTabs = () => {
        setTabs(DEFAULT_TABS);
        localStorage.removeItem('adminTabOrder');
    };


    return (
        <Layout>
            <div className="container page">
                <div className="page-header">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {selectedGroup && (
                                <button
                                    onClick={() => {
                                        selectGroup(null);
                                        setActiveTab('bookings'); // Reset to default tab
                                        localStorage.removeItem('selectedGroupId');
                                    }}
                                    className="btn btn-outline"
                                    title={t('admin.backHome', 'Volver al inicio')}
                                >
                                    🏠 {t('admin.home', 'Inicio')}
                                </button>
                            )}
                            <GroupSelector
                                onCreateGroup={() => setShowCreateGroupModal(true)}
                                onDeleteGroup={handleDeleteGroup}
                            />
                        </div>
                    </div>

                    {selectedGroup && groupInfo && (
                        <div className="bg-light p-sm rounded border border-light shadow-sm" style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p className="text-xs text-muted uppercase font-bold tracking-wider">{t('admin.activeCruise', 'Crucero Activo')}</p>
                                    <p className="font-bold text-primary">{groupInfo.shipName || 'Sin barco'}</p>
                                    <p className="text-small">📅 {formatDate(groupInfo.sailDate)}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Show Dashboard Home when no group selected */}
                {!selectedGroup && (
                    <AdminDashboardHome
                        onSelectGroup={(groupId) => selectGroup(groupId)}
                        onCreateGroup={() => setShowCreateGroupModal(true)}
                    />
                )}

                {/* Show Group Management when group is selected */}
                {selectedGroup && (
                    <>
                        {/* Tabs Navigation */}
                        <div style={{ marginBottom: '1rem' }}>
                            {/* Customize Controls */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem', gap: '0.5rem' }}>
                                <button
                                    onClick={() => setIsCustomizing(!isCustomizing)}
                                    className="btn btn-outline"
                                    style={{
                                        padding: '0.5rem 1rem',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    {isCustomizing ? `✓ ${t('admin.done', 'Listo')}` : `⚙️ ${t('admin.customizeLayout', 'Personalizar diseño')}`}
                                </button>

                                {isCustomizing && (
                                    <button
                                        onClick={handleResetTabs}
                                        className="btn btn-outline"
                                        style={{
                                            padding: '0.5rem 1rem',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        ↺ {t('admin.resetToDefault', 'Restablecer')}
                                    </button>
                                )}
                            </div>

                            {/* Navigation Tabs */}
                            <div className="module-nav">
                                {tabs.map((tab, index) => (
                                    <button
                                        key={tab.id}
                                        draggable={isCustomizing}
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, index)}
                                        onClick={() => !isCustomizing && setActiveTab(tab.id)}
                                        className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-outline'} ${isCustomizing ? 'draggable' : ''}`}
                                        style={{
                                            borderRadius: '0.5rem 0.5rem 0 0',
                                            cursor: isCustomizing ? 'move' : 'pointer'
                                        }}
                                    >
                                        {isCustomizing && <span className="drag-handle">⋮⋮ </span>}
                                        {tab.icon} {tab.labelKey ? t(tab.labelKey, tab.fallback || '') : tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Navigation Controls - Only visible on mobile */}
                        <div
                            className="mobile-only"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.5rem',
                                marginBottom: '1.5rem',
                                padding: '0 0.5rem'
                            }}
                        >
                            {/* Left Arrow */}
                            <button
                                onClick={() => {
                                    const nav = document.querySelector('.module-nav');
                                    if (nav) nav.scrollBy({ left: -200, behavior: 'smooth' });
                                }}
                                style={{
                                    background: 'var(--color-accent, var(--color-primary))',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '40px',
                                    height: '40px',
                                    fontSize: '1.5rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                    padding: 0,
                                    lineHeight: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}
                                aria-label="Anterior"
                            >
                                ‹
                            </button>

                            {/* Hint Text - Centered */}
                            <span style={{
                                fontSize: '0.8rem',
                                color: 'var(--color-text-muted)',
                                fontStyle: 'italic',
                                textAlign: 'center',
                                flex: 1
                            }}>
                                Usa las flechas para navegar
                            </span>

                            {/* Right Arrow */}
                            <button
                                onClick={() => {
                                    const nav = document.querySelector('.module-nav');
                                    if (nav) nav.scrollBy({ left: 200, behavior: 'smooth' });
                                }}
                                style={{
                                    background: 'var(--color-accent, var(--color-primary))',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '40px',
                                    height: '40px',
                                    fontSize: '1.5rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                    padding: 0,
                                    lineHeight: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}
                                aria-label="Siguiente"
                            >
                                ›
                            </button>
                        </div>

                        {/* Tab Content */}
                        {activeTab === 'bookings' && (
                            <>
                                <div className="mb-md flex justify-end gap-sm">
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="btn btn-primary"
                                    >
                                        ➕ {t('admin.addbooking')}
                                    </button>
                                    <button
                                        onClick={() => setShowBulkImport(true)}
                                        className="btn btn-outline"
                                    >
                                        📥 {t('admin.importbookings')}
                                    </button>
                                </div>
                                <BookingList
                                    key={`bookings-${refreshKey}-${selectedGroup.id}`}
                                    groupId={selectedGroup.id}
                                    onSelectBooking={setSelectedBooking}
                                />
                            </>
                        )}

                        {activeTab === 'requests' && (
                            <PaymentRequestsList
                                key={`requests-${refreshKey}`}
                                onUpdate={handleUpdate}
                            />
                        )}

                        {activeTab === 'config' && (
                            <GroupConfig groupId={selectedGroup.id} />
                        )}

                        {activeTab === 'communications' && (
                            <CommunicationsHome agencyId={selectedGroup.agencyId} />
                        )}

                        {activeTab === 'documents' && (
                            <DocumentManager
                                groupId={selectedGroup?.id}
                                agencyId={selectedGroup?.agencyId}
                            />
                        )}

                        {activeTab === 'timeline' && (
                            <PaymentTimeline agencyId={selectedGroup.agencyId} />
                        )}

                        {activeTab === 'reminders' && (
                            <RemindersHome agencyId={selectedGroup.agencyId} />
                        )}

                        {activeTab === 'reports' && (
                            <ReportsHome agencyId={selectedGroup.agencyId} />
                        )}

                        {activeTab === 'analytics' && (
                            <AnalyticsDashboard
                                groupId={selectedGroup.id}
                                groupData={groupInfo}
                            />
                        )}

                        {activeTab === 'invoices' && (
                            <AdminInvoiceManager agencyId={selectedGroup.agencyId} />
                        )}

                        {activeTab === 'quotations' && (
                            <QuotationManager agencyId={selectedGroup.agencyId} />
                        )}
                    </>
                )}

                {/* Booking Detail Modal */}
                {selectedBooking && (
                    <BookingDetail
                        family={selectedBooking}
                        onClose={() => setSelectedBooking(null)}
                        onUpdate={handleUpdate}
                    />
                )}

                {/* Bulk Import Modal */}
                {showBulkImport && (
                    <BulkBookingImport
                        onClose={() => setShowBulkImport(false)}
                        onSuccess={handleUpdate}
                    />
                )}

                {/* Create Booking Modal */}
                {showCreateModal && (
                    <CreateBookingModal
                        onClose={() => setShowCreateModal(false)}
                        onSuccess={handleUpdate}
                    />
                )}

                {/* Create Group Modal */}
                {showCreateGroupModal && (
                    <CreateGroupModal
                        isOpen={showCreateGroupModal}
                        onClose={() => setShowCreateGroupModal(false)}
                        onGroupCreated={handleGroupCreated}
                    />
                )}

                {/* Delete Group Modal */}
                {showDeleteGroupModal && groupToDelete && (
                    <DeleteGroupModal
                        isOpen={showDeleteGroupModal}
                        group={groupToDelete}
                        onClose={() => {
                            setShowDeleteGroupModal(false);
                            setGroupToDelete(null);
                        }}
                        onDeleted={handleGroupDeleted}
                    />
                )}
            </div>
        </Layout>
    );
};

export default AdminDashboard;
