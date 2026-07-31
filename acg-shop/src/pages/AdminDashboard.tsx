// src/pages/AdminDashboard.tsx
import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

interface AdminDashboardProps {
  currentUser: any;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const location = useLocation();

  // 定義左側選單
  const menuItems = [
    { name: '📊 系統總覽', path: '/admin' },
    { name: '📦 商品管理', path: '/admin/products' },
    { name: '📋 訂單流水', path: '/admin/orders' },
    { name: '🏷️ 標籤管理', path: '/admin/tags' },
    { name: '👥 會員管理', path: '/admin/users'},
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col md:flex-row">
      
      {/* 左側邊欄 (Sidebar) */}
      <aside className="w-full md:w-64 bg-gray-950 border-r border-gray-800 flex-shrink-0 flex flex-col">
        {/* LOGO 區塊 */}
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-lg font-black tracking-widest text-white flex items-center">
            <span className="text-yellow-400 mr-2">🛡️</span> Alliance Studio
          </h1>
          <p className="text-xs text-gray-500 mt-1">網店後台管理中心</p>
        </div>
        
        {/* 導覽選單 */}
        <nav className="p-4 space-y-2 flex-1">
          {menuItems.map(item => {
            // 判斷目前網址是否作用中 (精準比對 /admin，或是包含 /admin/products 等子路徑)
            const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
            
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`block px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                  isActive 
                    ? 'bg-purple-600 text-white shadow-md' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* 底部返回前台按鈕 */}
        <div className="p-4 border-t border-gray-800">
          <Link to="/" className="flex items-center justify-center w-full px-4 py-3 rounded-lg text-sm font-bold text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
            🏠 返回前台首頁
          </Link>
        </div>
      </aside>

      {/* 右側內容區塊 (Outlet 會自動替換成總覽、商品或訂單) */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <Outlet context={{ currentUser }} />
      </main>
      
    </div>
  );
};