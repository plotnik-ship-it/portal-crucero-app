import { createContext, useContext, useState, useEffect } from 'react';
import { getGroupsByAgency } from '../services/firestore';
import { useAuth } from '../hooks/useAuth';

const GroupContext = createContext(null);

export const GroupProvider = ({ children }) => {
    const { user, userData } = useAuth();
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Load groups when user logs in as admin
    useEffect(() => {
        if (user && userData?.role === 'admin' && userData?.agencyId) {
            loadGroups(userData.agencyId);
        } else {
            // Clear groups if not admin
            setGroups([]);
            setSelectedGroup(null);
        }
    }, [user, userData]);

    const loadGroups = async (agencyId) => {
        setLoading(true);
        setError(null);

        try {
            const fetchedGroups = await getGroupsByAgency(agencyId);
            setGroups(fetchedGroups);

            // Auto-select group
            if (fetchedGroups.length > 0) {
                // Try to restore last selected group from localStorage
                const savedGroupId = localStorage.getItem('selectedGroupId');
                const savedGroup = fetchedGroups.find(g => g.id === savedGroupId);

                if (savedGroup) {
                    setSelectedGroup(savedGroup);
                } else {
                    // Select first group by default
                    setSelectedGroup(fetchedGroups[0]);
                    localStorage.setItem('selectedGroupId', fetchedGroups[0].id);
                }
            }
        } catch (err) {
            console.error('Error loading groups:', err);
            setError('Error al cargar los grupos');
        } finally {
            setLoading(false);
        }
    };

    const selectGroup = (groupId) => {
        const group = groups.find(g => g.id === groupId);
        if (group) {
            setSelectedGroup(group);
            localStorage.setItem('selectedGroupId', groupId);
        }
    };

    const refreshGroups = async () => {
        if (userData?.agencyId) {
            await loadGroups(userData.agencyId);
        }
    };

    const value = {
        selectedGroup,
        groups,
        loading,
        error,
        selectGroup,
        refreshGroups
    };

    return (
        <GroupContext.Provider value={value}>
            {children}
        </GroupContext.Provider>
    );
};

export const useGroup = () => {
    const context = useContext(GroupContext);
    if (context === null) {
        throw new Error('useGroup must be used within a GroupProvider');
    }
    return context;
};
