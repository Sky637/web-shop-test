// src/AdminRoute.tsx
import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

interface AdminRouteProps {
  currentUser: any;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ currentUser }) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!currentUser) {
        setIsAdmin(false);
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("權限驗證失敗:", error);
        setIsAdmin(false);
      }
    };
    checkAdminRole();
  }, [currentUser]);

  if (isAdmin === null) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-purple-600">正在驗證安全權限...</div>;
  }

  // 驗證成功則渲染子路由元件，失敗則踢回首頁
  return isAdmin ? <Outlet /> : <Navigate to="/" replace />;
};