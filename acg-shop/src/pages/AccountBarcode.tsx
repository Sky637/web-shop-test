// src/pages/AccountBarcode.tsx
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import Barcode from 'react-barcode';

export const AccountBarcode: React.FC = () => {
  const { currentUser } = useOutletContext<any>();

  if (!currentUser) return null;

  return (
    <div className="bg-white border border-gray-100 shadow-sm rounded-lg p-6 max-w-2xl">
      <h2 className="text-xl font-bold text-gray-800 mb-2 border-b pb-4">會員條碼</h2>
      <p className="text-sm text-gray-500 mb-8 mt-4">
        出示此會員條碼即可於門市核對會員身份、累積積分或處理相關服務。
      </p>

      <div className="flex flex-col items-center justify-center bg-gray-50 py-10 px-4 rounded-xl border border-gray-200">
        
        {/* === 核心修復：限制容器最大寬度，並讓內部的 SVG 條碼自動響應式縮放 === */}
        <div className="bg-white p-4 rounded-lg shadow-sm w-full max-w-sm flex justify-center [&>svg]:max-w-full [&>svg]:h-auto">
          <Barcode 
            value={currentUser.uid} 
            width={1.5} // 將線條改細，預設是 2
            height={80} 
            displayValue={false} 
            background="#ffffff"
            lineColor="#000000"
            margin={0} // 移除條碼預設的留白，讓我們的 padding 來控制
          />
        </div>
        
        <p className="mt-6 text-sm font-mono font-bold text-gray-700 tracking-widest uppercase">
          {currentUser.uid.substring(0, 15)}...
        </p>
      </div>

      <div className="mt-8 bg-purple-50 p-4 rounded-lg border border-purple-100">
        <h3 className="text-sm font-bold text-purple-800 mb-2 flex items-center">
          <span className="mr-2">💡</span> 門市使用說明
        </h3>
        <ul className="text-xs text-purple-700 space-y-2 pl-6 list-disc">
          <li>結帳時請主動向店員出示此畫面。</li>
          <li>會員積分可與網店同步累積與折抵。</li>
          <li>為保護您的帳戶安全，請勿將條碼截圖傳送給他人。</li>
        </ul>
      </div>
    </div>
  );
};