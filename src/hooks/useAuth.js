import { useState, useEffect } from 'react';
import { onAuthChange, checkIfAdmin, getUserData } from '../services/auth';

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthChange(async (authUser) => {
            if (authUser) {
                // Load complete user data from Firestore
                const userData = await getUserData(authUser.uid);

                // Merge Firebase Auth user with Firestore data
                const completeUser = {
                    ...authUser,
                    ...userData,
                    uid: authUser.uid, // Ensure uid is from auth
                    email: authUser.email // Ensure email is from auth
                };

                setUser(completeUser);
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
