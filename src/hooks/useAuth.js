import { useState, useEffect } from 'react';
import { onAuthChange, checkIfAdmin } from '../services/auth';

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthChange(async (authUser) => {
            if (authUser) {
                setUser(authUser);
                const adminStatus = await checkIfAdmin(authUser.uid);
                setIsAdmin(adminStatus);
            } else {
                setUser(null);
                setIsAdmin(false);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { user, isAdmin, loading };
};
