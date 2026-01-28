import { createContext, useContext, useState, useEffect } from 'react';
import { getGroupsByAgency } from '../services/firestore';
import { useAuth } from '../hooks/useAuth';

const GroupContext = createContext(null);

export const GroupProvider = ({ children }) => {
    const { user } = useAuth();
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Load groups when user logs in as admin
    useEffect(() => {
        if (user?.role === 'admin' && user?.agencyId) {
            loadGroups(user.agencyId);
        } else {
            // Clear groups if not admin
            setGroups([]);
            setSelectedGroup(null);
        }
    }, [user]);

    const loadGroups = async (agencyId) => {
        setLoading(true);
        setError(null);

        try {
            const fetchedGroups = await getGroupsByAgency(agencyId);
            setGroups(fetchedGroups);

            // Don't auto-select any group - let user choose from dashboard home
            // Only restore if there was a previously selected group
            const savedGroupId = localStorage.getItem('selectedGroupId');
            if (savedGroupId) {
                const savedGroup = fetchedGroups.find(g => g.id === savedGroupId);
                if (savedGroup) {
                    setSelectedGroup(savedGroup);
                } else {
                    // Clear invalid saved group
                    localStorage.removeItem('selectedGroupId');
                    setSelectedGroup(null);
                }
            } else {
                setSelectedGroup(null);
            }
        } catch (err) {
            console.error('Error loading groups:', err);
            setError('Error al cargar los grupos');
        } finally {
            setLoading(false);
        }
    };

    const selectGroup = (groupId) => {
        if (groupId === null) {
            // Deselect group - return to dashboard home
            setSelectedGroup(null);
            localStorage.removeItem('selectedGroupId');
            return;
        }

        const group = groups.find(g => g.id === groupId);
        if (group) {
            setSelectedGroup(group);
            localStorage.setItem('selectedGroupId', groupId);
        }
    };

    const refreshGroups = async () => {
        if (user?.agencyId) {
            await loadGroups(user.agencyId);
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
