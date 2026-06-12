// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// 這些資訊來自你的 Firebase 控制台 (測試開發階段這些金鑰公開在外流是合法的)
const firebaseConfig = {
  apiKey: "AIzaSyAYXPLzk1uZw9iUIqzHKOruFU4eH7NeGK8",
  authDomain: "web-test-81458.firebaseapp.com",
  databaseURL: "https://web-test-81458-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "web-test-81458",
  storageBucket: "web-test-81458.firebasestorage.app",
  messagingSenderId: "370553168601",
  appId: "1:370553168601:web:52c5f1d0a68c4782fc14c8",
  measurementId: "G-DF03GDLLE1"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// 匯出 Firestore 資料庫實例，讓其他頁面可以呼叫
export const db = getFirestore(app);
export const auth = getAuth(app);