// src/Navbar.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';

interface NavbarProps {
  cartItems: any[];
  currentUser: any;
  isAdmin: boolean;
}

const BoardGameMegaMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('遊戲分類');

  const menuData = {
    '遊戲分類': [
      '寶可夢集換式卡牌遊戲', '龍珠超卡牌遊戲 FUSION WORLD', 'ONE PIECE卡牌對戰', 
      'UNION ARENA', 'Battle Spirits', '數碼寶貝卡牌遊戲', '遊戲王', 
      '決鬥大師', 'Weiß Schwarz', '卡片戰鬥!! 先導者', '碧藍戰卡'
    ],
    '卡牌配件': [
      '卡套', '卡盒', '對戰桌墊', '骰子與指示物'
    ]
  };

  return (
    <li 
      className="relative group"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <Link to="/category/all?tag=桌遊卡牌" className="hover:text-purple-200 flex items-center py-2">
        <span className="mr-1">🃏</span> 桌遊卡牌
        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </Link>

      {isOpen && (
        <div className="absolute top-full left-0 mt-0 w-[550px] bg-white rounded-b-lg shadow-2xl flex overflow-hidden z-50 text-gray-800 border border-gray-100 cursor-default">
          <div className="w-1/3 py-2 border-r border-gray-100 bg-white">
            {Object.keys(menuData).map((catName) => (
              // === 修改：將 div 改為 Link，讓大分類也能被點擊 ===
              <Link 
                key={catName}
                to={`/category/all?tag=${encodeURIComponent(catName)}`}
                onMouseEnter={() => setActiveCategory(catName)}
                onClick={() => setIsOpen(false)} // 點擊後收起選單
                className={`px-4 py-3 flex justify-between items-center text-sm font-bold transition-colors cursor-pointer block ${
                  activeCategory === catName 
                    ? 'text-purple-700 bg-purple-50 border-l-4 border-purple-600' 
                    : 'text-gray-600 hover:bg-gray-50 border-l-4 border-transparent'
                }`}
              >
                {catName}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </Link>
            ))}
          </div>
          <div className="w-2/3 p-6 bg-gray-50/50">
            <div className="grid grid-cols-1 gap-y-4">
              {menuData[activeCategory as keyof typeof menuData].map((subItem) => (
                <Link 
                  key={subItem} 
                  to={`/category/all?tag=${encodeURIComponent(subItem)}`}
                  className="text-sm text-gray-600 hover:text-purple-700 hover:font-bold transition-all block truncate"
                  onClick={() => setIsOpen(false)}
                >
                  {subItem}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </li>
  );
};

export const Navbar: React.FC<NavbarProps> = ({ cartItems, currentUser, isAdmin }) => {
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert('已成功安全登出！');
    } catch (error) {
      console.error('登出時發生錯誤:', error);
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50 w-full">
      
      <div className="max-w-7xl mx-auto px-4 md:px-10 relative z-50 bg-white">
        <div className="flex justify-between items-center h-16">
          
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-black text-purple-700 tracking-tighter">TEST</span>
          </Link>

          <div className="flex items-center space-x-6 h-full">
            {currentUser ? (
              <div className="relative h-full flex items-center group">
                <Link to="/account" className="flex items-center cursor-pointer text-gray-600 hover:text-purple-600 space-x-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                  <span className="text-sm font-medium">{currentUser.displayName || '會員'}</span>
                </Link>

                <div className="absolute right-0 top-16 w-48 bg-white border border-gray-100 shadow-xl rounded-b-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 flex flex-col py-2 z-50">
                  <Link to="/account" className="px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700">帳戶詳情資料</Link>
                  <Link to="/account/orders" className="px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700">訂單</Link>
                  <Link to="/account/points" className="px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700">我的積分</Link>
                  {isAdmin && (
                    <Link to="/admin" className="px-4 py-2 text-sm font-bold text-purple-700 hover:bg-purple-100 border-l-2 border-purple-600 bg-purple-50 my-1">
                      ⚙️ 後台管理系統
                    </Link>
                  )}
                  <hr className="my-1 border-gray-100" />
                  <button 
                    onClick={handleLogout}
                    className="text-left w-full px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-red-500 font-medium"
                  >
                    登出
                  </button>
                </div>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="text-sm font-bold text-purple-600 hover:text-purple-800 border border-purple-200 px-4 py-1.5 rounded-full hover:bg-purple-50 transition-all flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
                <span>登入 / 註冊</span>
              </Link>
            )}

            <div className="relative h-full flex items-center group">
              <Link to="/cart" className="relative flex items-center text-gray-600 hover:text-purple-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full">
                    {cartCount}
                  </span>
                )}
              </Link>

              <div className="absolute right-0 top-16 w-80 bg-white border border-gray-100 shadow-2xl rounded-b-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 p-4 cursor-default z-50">
                {cartItems.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 text-sm">購物車是空的</div>
                ) : (
                  <>
                    <div className="max-h-60 overflow-y-auto space-y-4 mb-4 pr-2">
                      {cartItems.map(item => (
                        <div key={item.id} className="flex items-start space-x-3">
                          <img src={item.imageUrl} alt={item.title} className="w-12 h-12 object-contain bg-gray-50 border border-gray-100 rounded flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-800 font-medium truncate mb-1">{item.title}</p>
                            <p className="text-xs text-gray-500">{item.quantity} x <span className="font-bold text-gray-900">HK${item.price}</span></p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-gray-100 pt-3">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-sm text-gray-600 font-bold">小計:</span>
                        <span className="text-base font-black text-gray-900">HK${subtotal}.00</span>
                      </div>
                      <div className="space-y-2">
                        <Link to="/cart" className="block w-full text-center bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 text-sm rounded transition-colors">查看購物車</Link>
                        <Link to="/checkout" className="block w-full text-center bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 text-sm rounded transition-colors">結帳</Link>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
      
      {/* 紫色分類導覽列 */}
      <div className="bg-purple-600 text-white hidden md:block relative z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-10">
          <ul className="flex space-x-8 text-sm font-bold items-center h-12">
            <li><Link to="/category/all?tag=現貨" className="hover:text-purple-200 flex items-center py-2"><span className="mr-1">🛍️</span> 現貨熱賣</Link></li>
            <li><Link to="/category/all?tag=新品預訂" className="hover:text-purple-200 flex items-center py-2"><span className="mr-1">🆕</span> 新品預訂</Link></li>
            <li><Link to="/category/all?tag=模型" className="hover:text-purple-200 flex items-center py-2"><span className="mr-1">🤖</span> 模型專區</Link></li>
            <BoardGameMegaMenu />
          </ul>
        </div>
      </div>
    </nav>
  );
};