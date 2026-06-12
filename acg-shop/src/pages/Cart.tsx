// src/pages/Cart.tsx
import React from 'react';
import { Link } from 'react-router-dom';

// 定義購物車內項目的資料型別
interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

interface CartProps {
  cartItems: CartItem[];
  onUpdateQuantity: (id: string, newQty: number) => void;
  onRemoveItem: (id: string) => void;
}

export const Cart: React.FC<CartProps> = ({ cartItems, onUpdateQuantity, onRemoveItem }) => {
  
  // 計算總金額
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal;

  if (cartItems.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-10 text-center py-20">
        <h2 className="text-2xl font-bold text-gray-700 mb-4">你的購物車是空的</h2>
        <p className="text-gray-500 mb-8">快去挑選最新的模型或寶可夢卡牌吧！</p>
        <Link to="/" className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded transition-colors">
          返回首頁逛逛
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 border-b pb-4">購物車明細</h1>
      
      {/* 主要區塊：左邊明細，右邊小計 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* === 左邊：商品列表 === */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map((item) => (
            <div key={item.id} className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm flex items-center space-x-4">
              <img src={item.imageUrl} alt={item.title} className="w-20 h-20 object-contain bg-gray-50 rounded" />
              
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">{item.title}</h3>
                <p className="text-sm text-purple-600 font-bold mt-1">HK${item.price}.00</p>
              </div>

              {/* 數量調整控制項 */}
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  className="w-8 h-8 border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center font-bold text-gray-600"
                >
                  -
                </button>
                <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                <button 
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  className="w-8 h-8 border border-gray-300 rounded hover:bg-gray-100 flex items-center justify-center font-bold text-gray-600"
                >
                  +
                </button>
              </div>

              {/* 刪除按鈕 */}
              <button 
                onClick={() => onRemoveItem(item.id)}
                className="text-gray-400 hover:text-red-500 p-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          ))}
        </div>

        {/* === 右邊：訂單摘要結帳面板 === */}
        <div className="bg-white p-6 border border-gray-200 rounded-lg shadow-sm h-fit space-y-4">
          <h2 className="text-lg font-bold text-gray-900 border-b pb-2">訂單摘要</h2>
          <div className="flex justify-between text-sm text-gray-600">
            <span>商品小計</span>
            <span>HK${subtotal}.00</span>
          </div>
          <div className="border-t pt-4 flex justify-between font-bold text-lg text-gray-900">
            <span>總計金額</span>
            <span className="text-purple-700">HK${total}.00</span>
          </div>
          <Link to="/checkout" className="w-full bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold py-3 rounded-lg shadow transition-colors mt-4 text-center block text-sm">
            確認前往結帳 (Stripe)
          </Link>
        </div>

      </div>
    </div>
  );
};