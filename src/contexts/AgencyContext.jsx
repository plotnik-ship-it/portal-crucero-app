import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { getAgencyWithBranding } from '../services/agencyService';

const AgencyContext = createContext();

export const useAgency = () => {
    const context = useContext(AgencyContext);
    if (!context) {
        throw new Error('useAgency must be used within AgencyProvider');
    }
    return context;
};

export const AgencyProvider = ({ children }) => {
    const { user } = useAuth();
    const [agency, setAgency] = useState(null);
    const [branding, setBranding] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAgency = async () => {
            if (!user) {
                setAgency(null);
                setBranding(null);
                setLoading(false);
                return;
            }

            try {
                // Get user's agencyId
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (!userDoc.exists()) {
                    console.warn('User document not found');
                    setAgency(null);
                    setBranding(null);
                    setLoading(false);
                    return;
                }

                const userData = userDoc.data();
                const agencyId = userData.agencyId;

                if (!agencyId) {
                    console.warn('User has no agencyId');
                    setAgency(null);
                    setBranding(null);
                    setLoading(false);
                    return;
                }

                // Get agency data
                const agencyDoc = await getDoc(doc(db, 'agencies', agencyId));
                if (agencyDoc.exists()) {
                    const agencyData = {
                        id: agencyDoc.id,
                        ...agencyDoc.data()
                    };
                    setAgency(agencyData);

                    // Set branding from agency data
                    if (agencyData.branding) {
                        setBranding(agencyData.branding);
                    }
                } else {
                    console.warn('Agency document not found:', agencyId);
                    setAgency(null);
                    setBranding(null);
                }
            } catch (error) {
                console.error('Error loading agency:', error);
                setAgency(null);
                setBranding(null);
            } finally {
                setLoading(false);
            }
        };

        loadAgency();
    }, [user]);

    // Load branding (no-op for now, branding is loaded with agency data)
    // This exists to satisfy the hook interface
    const loadBranding = async () => {
        // No-op: branding is automatically loaded when agency is loaded
        // This prevents permission errors on public routes
        return;
    };

    const value = {
        agency,
        branding,
        loading,
        loadBranding,
        refreshAgency: async () => {
            if (user && agency) {
                const agencyDoc = await getDoc(doc(db, 'agencies', agency.id));
                if (agencyDoc.exists()) {
                    const agencyData = {
                        id: agencyDoc.id,
                        ...agencyDoc.data()
                    };
                    setAgency(agencyData);

                    // Update branding
                    if (agencyData.branding) {
                        setBranding(agencyData.branding);
                    }
                }
            }
        }
    };

    return (
        <AgencyContext.Provider value={value}>
            {children}
        </AgencyContext.Provider>
    );
};
