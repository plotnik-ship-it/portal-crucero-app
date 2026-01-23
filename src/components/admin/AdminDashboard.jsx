import { useState, useEffect } from 'react';
import Layout from '../layout/Layout';
import FamilyList from './FamilyList';
import FamilyDetail from './FamilyDetail';
import PaymentRequestsList from './PaymentRequestsList';
import GroupConfig from './GroupConfig';
import BulkFamilyImport from './BulkFamilyImport';
import CreateFamilyModal from './CreateFamilyModal';
import GroupSelector from './GroupSelector';
import CreateGroupModal from './CreateGroupModal';
import { useGroup } from '../../contexts/GroupContext';
import { getGroupData } from '../../services/firestore';
import { formatDate } from '../../utils/formatters';

const AdminDashboard = () => {
    const { selectedGroup, refreshGroups } = useGroup();
    const [selectedFamily, setSelectedFamily] = useState(null);
    const [activeTab, setActiveTab] = useState('families');
    const [refreshKey, setRefreshKey] = useState(0);
    const [groupInfo, setGroupInfo] = useState(null);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);

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

    return (
        <Layout>
            <div className="container page">
                <div className="page-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                            <h1 className="page-title">Panel de Administración</h1>
                            <p className="page-subtitle">Gestión de familias y solicitudes de pago</p>
                        </div>
                        <GroupSelector onCreateGroup={() => setShowCreateGroupModal(true)} />
                    </div>

                    {selectedGroup && groupInfo && (
                        <div className="bg-light p-sm rounded border border-light shadow-sm" style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p className="text-xs text-muted uppercase font-bold tracking-wider">Crucero Activo</p>
                                    <p className="font-bold text-primary">{groupInfo.shipName || 'Sin barco'}</p>
                                    <p className="text-small">📅 {formatDate(groupInfo.sailDate)}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {!selectedGroup && (
                        <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                            <p>👋 Selecciona un grupo de crucero para comenzar, o crea uno nuevo.</p>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    marginBottom: '2rem',
                    borderBottom: '2px solid var(--color-border)'
                }}>
                    <button
                        onClick={() => setActiveTab('families')}
                        className={`btn ${activeTab === 'families' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ borderRadius: '0.5rem 0.5rem 0 0' }}
                    >
                        👥 Familias
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`btn ${activeTab === 'requests' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ borderRadius: '0.5rem 0.5rem 0 0' }}
                    >
                        📋 Solicitudes
                    </button>
                    <button
                        onClick={() => setActiveTab('config')}
                        className={`btn ${activeTab === 'config' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ borderRadius: '0.5rem 0.5rem 0 0' }}
                    >
                        ⚙️ Configuración
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'families' && selectedGroup && (
                    <>
                        <div className="mb-md flex justify-end gap-sm">
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="btn btn-primary"
                            >
                                ➕ Agregar Familia
                            </button>
                            <button
                                onClick={() => setShowBulkImport(true)}
                                className="btn btn-outline"
                            >
                                📥 Importar Familias
                            </button>
                        </div>
                        <FamilyList
                            key={`families-${refreshKey}-${selectedGroup.id}`}
                            groupId={selectedGroup.id}
                            onSelectFamily={setSelectedFamily}
                        />
                    </>
                )}

                {activeTab === 'requests' && (
                    <PaymentRequestsList
                        key={`requests-${refreshKey}`}
                        onUpdate={handleUpdate}
                    />
                )}

                {activeTab === 'config' && selectedGroup && (
                    <GroupConfig groupId={selectedGroup.id} />
                )}

                {/* Family Detail Modal */}
                {selectedFamily && (
                    <FamilyDetail
                        family={selectedFamily}
                        onClose={() => setSelectedFamily(null)}
                        onUpdate={handleUpdate}
                    />
                )}

                {/* Bulk Import Modal */}
                {showBulkImport && (
                    <BulkFamilyImport
                        onClose={() => setShowBulkImport(false)}
                        onSuccess={handleUpdate}
                    />
                )}

                {/* Create Family Modal */}
                {showCreateModal && (
                    <CreateFamilyModal
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
            </div>
        </Layout>
    );
};

export default AdminDashboard;
