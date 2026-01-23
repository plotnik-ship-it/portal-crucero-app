import {
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    sendPasswordResetEmail,
    onAuthStateChanged,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential
} from 'firebase/auth';
import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    setDoc,
    serverTimestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';

/**
 * Sign in with email and password
 */
export const signIn = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        throw new Error(getAuthErrorMessage(error.code));
    }
};

/**
 * Sign out current user
 */
export const signOut = async () => {
    try {
        await firebaseSignOut(auth);
    } catch (error) {
        throw new Error('Error al cerrar sesión');
    }
};

/**
 * Send password reset email
 */
export const resetPassword = async (email) => {
    try {
        // Configuration for the password reset email
        const actionCodeSettings = {
            // URL to redirect to after password reset
            url: window.location.origin + '/login',
            handleCodeInApp: false,
        };

        console.log('🔐 Sending password reset email to:', email);
        console.log('🔐 Auth domain:', auth.config.authDomain);

        await sendPasswordResetEmail(auth, email, actionCodeSettings);

        console.log('✅ Password reset email sent successfully');
    } catch (error) {
        console.error('❌ Password reset error:', error.code, error.message);
        throw new Error(getAuthErrorMessage(error.code));
    }
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = () => {
    return auth.currentUser;
};

/**
 * Check if user is admin
 */
export const checkIfAdmin = async (uid) => {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            return userDoc.data().role === 'admin';
        }
        return false;
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
};

/**
 * Get user role and family ID
 * Matches by UID first, fallback to Email search in 'families' collection
 */
export const getUserData = async (uid, forceEmail = null) => {
    try {
        // 1. Try to get existing user document
        const userDocRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            return userDoc.data();
        }

        // 2. If no user doc, check if we have a family with this user's email
        const currentUser = auth.currentUser;
        const emailToSearch = forceEmail || currentUser?.email;

        if (!emailToSearch) {
            console.error('❌ [AUTO-FIX] Cannot auto-link: No email available (uid: ' + uid + ')');
            return null;
        }

        console.log(`⚠️ [AUTO-FIX] User doc for ${uid} missing. Searching families for email: ${emailToSearch}`);

        const familiesRef = collection(db, 'families');
        const q = query(familiesRef, where('email', '==', emailToSearch));

        console.log('⚠️ [AUTO-FIX] Executing query...');
        const querySnapshot = await getDocs(q);
        console.log('⚠️ [AUTO-FIX] Query result size:', querySnapshot.size);

        if (!querySnapshot.empty) {
            // Found a matching family! Auto-link them.
            const familyDoc = querySnapshot.docs[0];
            const familyData = familyDoc.data();

            console.log(`✅ Found matching family: ${familyData.displayName} (${familyDoc.id}). Auto-linking...`);

            const newUserData = {
                email: currentUser.email,
                role: 'family',
                familyId: familyDoc.id,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            await setDoc(userDocRef, newUserData);
            console.log('✅ User document created and linked successfully.');

            return newUserData;
        }

        console.warn('❌ No matching family found for email:', currentUser.email);
        return null;
    } catch (error) {
        console.error('Error getting user data:', error);
        return null; // Return null prevents infinite loops vs throwing error
    }
};

/**
 * Listen to auth state changes
 */
export const onAuthChange = (callback) => {
    return onAuthStateChanged(auth, callback);
};

/**
 * Change user password
 * Requires current password for reauthentication
 */
export const changePassword = async (currentPassword, newPassword) => {
    try {
        const user = auth.currentUser;

        if (!user || !user.email) {
            throw new Error('No hay usuario autenticado');
        }

        // Reauthenticate user before changing password
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);

        // Update password
        await updatePassword(user, newPassword);

        console.log('✅ Password changed successfully');
    } catch (error) {
        console.error('❌ Password change error:', error.code, error.message);
        throw new Error(getAuthErrorMessage(error.code));
    }
};

/**
 * Get user-friendly error messages
 */
const getAuthErrorMessage = (errorCode) => {
    const errorMessages = {
        'auth/invalid-email': 'El correo electrónico no es válido',
        'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
        'auth/user-not-found': 'No existe una cuenta con este correo',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/invalid-credential': 'Credenciales inválidas',
        'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
        'auth/network-request-failed': 'Error de conexión. Verifica tu internet',
    };

    return errorMessages[errorCode] || 'Error de autenticación';
};
