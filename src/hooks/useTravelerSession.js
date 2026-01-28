/**
 * Traveler Session Hook
 * 
 * Provides access to traveler session, family data, and group data (read-only)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getTravelerSession, clearTravelerSession } from '../services/travelerAuthService';

export function useTravelerSession() {
    const [session, setSession] = useState(null);
    const [familyData, setFamilyData] = useState(null);
    const [groupData, setGroupData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadSession();
    }, []);

    const loadSession = async () => {
        try {
            setLoading(true);
            setError(null);

            const currentSession = getTravelerSession();

            if (!currentSession) {
                setSession(null);
                setLoading(false);
                return;
            }

            setSession(currentSession);

            // Fetch family data (read-only)
            const familyRef = doc(db, 'families', currentSession.familyId);
            const familySnap = await getDoc(familyRef);

            if (!familySnap.exists()) {
                throw new Error('Family not found');
            }

            setFamilyData({
                id: familySnap.id,
                ...familySnap.data()
            });

            // Fetch group data (read-only)
            const groupRef = doc(db, 'groups', currentSession.groupId);
            const groupSnap = await getDoc(groupRef);

            if (!groupSnap.exists()) {
                throw new Error('Group not found');
            }

            setGroupData({
                id: groupSnap.id,
                ...groupSnap.data()
            });

        } catch (err) {
            console.error('Error loading traveler session:', err);
            setError(err.message);

            // If permission error, clear session
            if (err.code === 'permission-denied') {
                clearTravelerSession();
                setSession(null);
            }
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        clearTravelerSession();
        setSession(null);
        setFamilyData(null);
        setGroupData(null);
        navigate('/login');
    };

    const requireSession = () => {
        if (!loading && !session) {
            navigate('/login');
        }
    };

    return {
        session,
        familyData,
        groupData,
        loading,
        error,
        isLoggedIn: !!session,
        logout,
        requireSession,
        refresh: loadSession
    };
}
