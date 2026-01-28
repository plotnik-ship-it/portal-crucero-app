import { useState, useEffect } from 'react';
import { onAuthChange, checkIfAdmin, getUserData } from '../services/auth';

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [onboardingCompleted, setOnboardingCompleted] = useState(true); // Default true to avoid redirect loops

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

                // Check onboarding status (only for admins)
                if (adminStatus && userData) {
                    setOnboardingCompleted(userData.onboardingCompleted !== false);
                } else {
                    setOnboardingCompleted(true); // Non-admins don't need onboarding
                }
            } else {
                setUser(null);
                setIsAdmin(false);
                setOnboardingCompleted(true);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { user, isAdmin, loading, onboardingCompleted };
};
