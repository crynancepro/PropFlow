import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  type User as FirebaseUser 
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
const firebaseConfig = {
  projectId: "propflow-fdc96",
  appId: "1:888284730771:web:5296107073e91cffa4466",
  apiKey: "AIzaSyBGpLezZqKDTw103i-WA2EGiuXYABix6oI",
  authDomain: "propflow-fdc96.firebaseapp.com",
  storageBucket: "propflow-fdc96.firebasestorage.app",
  messagingSenderId: "888284730771",
  measurementId: "G-3GD6D3NWPN"
};

let app: any;
let db: any;
let auth: any;
let isConfigured = false;

if (firebaseConfig && firebaseConfig.apiKey) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
    isConfigured = true;
    console.log("Firebase connecté avec succès.");
  } catch (error) {
    console.warn("Échec de l'initialisation de Firebase, activation du mode local :", error);
  }
} else {
  console.log("Configuration Firebase absente ou par défaut. Fonctionnement en mode Local.");
}

export { app, db, auth, isConfigured };

export const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  if (!isConfigured || !auth) {
    throw new Error("La synchronisation Cloud n'est pas encore configurée ou activée.");
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err) {
    console.error("Erreur d'authentification:", err);
    throw err;
  }
}

export async function logoutUser() {
  if (auth) {
    await signOut(auth);
  }
}

export async function loginWithEmail(email: string, pass: string) {
  if (!isConfigured || !auth) {
    throw new Error("La synchronisation Cloud n'est pas encore configurée ou activée.");
  }
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (err) {
    console.error("Erreur de connexion email:", err);
    throw err;
  }
}

export async function registerWithEmail(email: string, pass: string) {
  if (!isConfigured || !auth) {
    throw new Error("La synchronisation Cloud n'est pas encore configurée ou activée.");
  }
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (err) {
    console.error("Erreur d'inscription email:", err);
    throw err;
  }
}

// Security & Error Diagnostics handler
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  console.error('Firestore Security / Operation Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection check as required in SKILL.md
export async function testConnection() {
  if (!isConfigured || !db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Veuillez vérifier votre configuration de pare-feu ou réseau Firebase.");
    }
  }
}

if (isConfigured) {
  testConnection();
}

/**
 * Removes undefined values recursively from objects and arrays so they are valid for Firestore.
 */
export function sanitizeFirestoreData<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      if (val !== undefined) {
        if (val !== null && typeof val === 'object' && !Array.isArray(val) && !((val as any) instanceof Date)) {
          result[key] = sanitizeFirestoreData(val);
        } else if (Array.isArray(val)) {
          result[key] = val.map(item => {
            if (item !== null && typeof item === 'object' && !Array.isArray(item) && !((item as any) instanceof Date)) {
              return sanitizeFirestoreData(item);
            }
            return item === undefined ? null : item; // Firestore supports null but not undefined
          });
        } else {
          result[key] = val;
        }
      }
    }
  }
  return result as T;
}

