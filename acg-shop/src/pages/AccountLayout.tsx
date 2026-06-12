// src/pages/AccountLayout.tsx
import React from 'react';
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
// === 1. 引入 Firebase 登出相關套件 ===
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

interface AccountLayoutProps {
  currentUser: any;
}

export const AccountLayout: React.FC<AccountLayoutProps> = ({ currentUser }) => {
  const location = useLocation();

  // 保護路由：如果未登入，直接踢回首頁或登入頁
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // 定義左側選單的項目與對應網址
  const menuItems = [
    { name: '帳戶詳情資料', path: '/account' },
    { name: '訂單', path: '/account/orders' },
    { name: '我的積分', path: '/account/points' },
    { name: '會員條碼', path: '/account/barcode' },
    { name: '更改密碼', path: '/account/password' },
  ];

  // === 2. 實作登出功能 ===
  const handleLogout = async () => {
    if (!window.confirm("確定要登出嗎？")) return;
    try {
      await signOut(auth);
      alert('已成功登出！');
      // 登出後 currentUser 會變成 null，上方的保護路由會自動把使用者踢回 /login
    } catch (error) {
      console.error('登出失敗:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 頂部標題區塊 */}
      <div className="bg-white border-b border-gray-200 py-6 mb-8">
        <h1 className="text-center text-2xl font-bold text-gray-800">我的帳戶</h1>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-10 flex flex-col md:flex-row gap-8">
        
        {/* 左側邊欄 (Sidebar) */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="mb-6 px-4">
              <p className="text-lg font-bold text-gray-900">{currentUser.displayName || '會員'}</p>
            </div>
            <nav className="flex flex-col space-y-1">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`px-4 py-3 text-sm font-medium rounded-lg transition-colors border-l-4 ${
                      isActive 
                        ? 'border-purple-600 bg-purple-50 text-purple-700' 
                        : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
              <hr className="my-2 border-gray-100" />
              
              {/* === 3. 綁定登出事件 === */}
              <button 
                onClick={handleLogout}
                className="text-left px-4 py-3 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
              >
                登出
              </button>
            </nav>
          </div>
        </div>

        {/* 右側內容區塊 */}
        <div className="flex-1">
          <Outlet context={{ currentUser }} />
        </div>
        
      </div>
    </div>
  );
};