// src/ProductCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';

interface ProductProps {
  id: string;
  title: string;
  price: number;
  deposit: number;
  imageUrl: string;
  isPreorder: boolean;
  inStock: boolean;
  linkUrl?: string; // 1. 新增可選的 linkUrl 屬性，用來接收帶有規格的跳轉網址
  onAddToCart: () => void;
}

export const ProductCard: React.FC<ProductProps> = ({ id, title, price, deposit, imageUrl, isPreorder, inStock, linkUrl, onAddToCart }) => {
  
  // 2. 判斷要跳轉的最終網址：如果有傳入 linkUrl 就用它，沒有的話就退回使用預設的 ID 跳轉
  const finalUrl = linkUrl || `/product/${id}`;

  return (
    <div className="w-full bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col">
      
      {/* 3. 更新跳轉路徑 */}
      <Link to={finalUrl} className="block relative aspect-square bg-white flex justify-center items-center group cursor-pointer p-4">
        {/* 預訂/現貨標籤 */}
        <span className={`absolute top-2 left-2 text-white text-xs font-bold px-2 py-1 rounded z-10 ${isPreorder ? 'bg-green-500' : 'bg-purple-500'}`}>
          {isPreorder ? '預訂' : '現貨'}
        </span>
        
        <img src={imageUrl} alt={title} className="object-contain h-full w-full group-hover:opacity-90 transition-opacity" />

        {/* 缺貨半透明遮罩 (只有 inStock 為 false 時才顯示) */}
        {!inStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
              <div className="bg-gray-800/90 text-white rounded px-4 py-3 flex flex-col items-center shadow-lg">
                <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path><line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2"></line></svg>
                <span className="text-sm font-bold tracking-widest">缺貨</span>
              </div>
            </div>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1">
        {/* 4. 更新跳轉路徑 */}
        <Link to={finalUrl} className="text-xs text-gray-800 text-center font-medium h-12 overflow-hidden line-clamp-3 mb-2 hover:text-purple-700 transition-colors">
          <span className={isPreorder ? "text-green-600 font-bold" : "text-purple-600 font-bold"}>
            {isPreorder ? '[預訂] ' : '[現貨] '}
          </span>
          {title}
        </Link>
        
        <div className="flex flex-col items-center mb-4 mt-auto">
           {/* 只有在「預訂」狀態，且訂價與訂金不同時，才顯示灰色的刪除線訂價 */}
           {isPreorder && price !== deposit && (
             <span className="text-gray-400 line-through text-xs">HK${price}</span>
           )}
           
           {/* 主要價格與標籤：判斷是預訂還是現貨 */}
           <div className="flex items-baseline space-x-1">
             <span className={`text-lg font-bold ${inStock ? 'text-gray-900' : 'text-red-500'}`}>
               HK${isPreorder ? deposit : price}.00
             </span>
             {/* 貼心小標示，讓客人不點進去也知道是訂金還是全款 */}
             <span className="text-xs text-gray-500 font-medium">
               {isPreorder ? '(訂金)' : '(全款)'}
             </span>
           </div>
        </div>

        {/* 缺貨時按鈕變灰且不可點擊 */}
        <button 
          onClick={inStock ? onAddToCart : undefined} 
          disabled={!inStock}
          className={`w-full font-bold py-2 px-4 rounded text-sm transition-colors ${
            inStock 
              ? 'bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {inStock ? '加入購物車' : '缺貨'}
        </button>
      </div>

    </div>
  );
};