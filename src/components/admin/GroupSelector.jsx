import { useState, useRef, useEffect } from 'react';
import { useGroup } from '../../contexts/GroupContext';

const GroupSelector = ({ onCreateGroup }) => {
    const { selectedGroup, groups, loading, selectGroup } = useGroup();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectGroup = (groupId) => {
        selectGroup(groupId);
        setIsOpen(false);
    };

    if (loading) {
        return (
            <div className="btn btn-outline" style={{ minWidth: '250px' }}>
                <span>⏳ Cargando grupos...</span>
            </div>
        );
    }

    if (groups.length === 0) {
        return (
            <button
                onClick={onCreateGroup}
                className="btn btn-primary"
            >
                + Crear Primer Grupo
            </button>
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="btn btn-outline"
                style={{
                    minWidth: '250px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem'
                }}
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🚢 {selectedGroup?.name || 'Seleccionar Grupo'}
                </span>
                <span style={{ fontSize: '0.75rem' }}>
                    {isOpen ? '▲' : '▼'}
                </span>
            </button>

            {isOpen && (
                <div
                    className="card"
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 0.5rem)',
                        left: 0,
                        minWidth: '300px',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        zIndex: 1000,
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                >
                    <div className="card-body" style={{ padding: '0.5rem' }}>
                        {/* Group List */}
                        {groups.map((group) => (
                            <button
                                key={group.id}
                                onClick={() => handleSelectGroup(group.id)}
                                className={`btn ${selectedGroup?.id === group.id ? 'btn-primary' : 'btn-outline'}`}
                                style={{
                                    width: '100%',
                                    marginBottom: '0.5rem',
                                    textAlign: 'left',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>
                                        {group.name}
                                    </div>
                                    {group.shipName && (
                                        <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                                            {group.shipName}
                                        </div>
                                    )}
                                </div>
                                {selectedGroup?.id === group.id && (
                                    <span>✓</span>
                                )}
                            </button>
                        ))}

                        {/* Create New Group Button */}
                        <hr style={{ margin: '0.5rem 0' }} />
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onCreateGroup();
                            }}
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                        >
                            + Crear Nuevo Grupo
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupSelector;
