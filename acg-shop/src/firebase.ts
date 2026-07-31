// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// 這些資訊來自你的 Firebase 控制台 (測試開發階段這些金鑰公開在外流是合法的)
const firebaseConfig = {
  apiKey: "AIzaSyCiXm5gAs5Oktg4Jv-XS0R7bF2vsKz-894",
  authDomain: "aliiance-studio-hk.firebaseapp.com",
  projectId: "aliiance-studio-hk",
  storageBucket: "aliiance-studio-hk.firebasestorage.app",
  messagingSenderId: "547324701099",
  appId: "1:547324701099:web:5dbdb1187220130ed24aee",
  measurementId: "G-RJQJGGFC6T"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);

// 匯出 Firestore 資料庫實例，讓其他頁面可以呼叫
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);

// 判斷：如果是本地開發環境 (localhost)，就強制連線到電腦上的 5001 Port 後端
if (window.location.hostname === 'localhost') {
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}