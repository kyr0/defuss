import { initializeApp } from "firebase/app";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBFIczedFNpB2ZXwfIE5bQtvTAj-VWBSwc",
    authDomain: "webrtc-mesh-chat.firebaseapp.com",
    databaseURL: "https://webrtc-mesh-chat-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "webrtc-mesh-chat",
    storageBucket: "webrtc-mesh-chat.firebasestorage.app",
    messagingSenderId: "641182449226",
    appId: "1:641182449226:web:a3f0a2e962a1548792b0b3",
    measurementId: "G-5FNN4DDND4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

export const db = getDatabase(app);
export const auth = getAuth(app);

export default app;