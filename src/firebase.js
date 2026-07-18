import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBJISK68e2xb2odIX0IDVdqno8gAfYgsSs",
  authDomain: "yoga-asana-8d565.firebaseapp.com",
  projectId: "yoga-asana-8d565",
  storageBucket: "yoga-asana-8d565.firebasestorage.app",
  messagingSenderId: "224024656680",
  appId: "1:224024656680:web:0e816e991fd46b20ecee1d",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);