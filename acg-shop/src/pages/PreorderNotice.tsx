// src/pages/PreorderNotice.tsx
import React from 'react';

export const PreorderNotice: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-xl shadow-sm border border-gray-100">
        
        {/* 標題區塊 */}
        <div className="text-center mb-10 pb-6 border-b border-gray-200">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">購買前須知</h1>
          <p className="text-gray-500">下單前請務必詳閱以下條款，以保障您的購物權益。</p>
        </div>

        {/* 條款內容清單 */}
        <div className="space-y-6 text-gray-700 leading-relaxed">
          <ol className="list-decimal list-outside ml-6 space-y-4">
            <li className="pl-2">
              訂購商品時，必需提供聯絡人姓名及有效之電話號碼，以便本公司通知閣下有關取貨安排及提供客戶服務。
            </li>
            <li className="pl-2">
              如顧客未能在三日內支付已下單的訂單，將會當作棄單處理，自動取消訂單。
            </li>
            <li className="pl-2">
              商品到貨後，會用 WhatsApp 或電話通知顧客，請於 14 天內到門市付清餘額取貨。逾期訂金作廢。
            </li>
            <li className="pl-2">
              商品註明【每人限一】時，如顧客購買多於一盒，本公司將會取消該訂單，且退還已支付的訂金。
            </li>
            <li className="pl-2 font-medium text-red-600">
              商品一經訂購，並且成功支付後，將不能退回訂金、更改產品款式或數量。
            </li>
            <li className="pl-2">
              如有需要取消訂單，訂金將不獲發返還。
            </li>
            <li className="pl-2">
              如遇商品突然取消發售，訂金將全數發還。
            </li>
            <li className="pl-2">
              商品有機會出現延遲出貨的情況，請留意商品官方網站公佈詳情。
            </li>
            <li className="pl-2">
              請留意彩色部份均由人手上色，或會出現色彩濃淡不均勻的情況。圖片可能與實際商品會有些許差異，敬請見諒。
            </li>
            <li className="pl-2">
              商品畫像為研發中的試製品，商品的照片與日後實際的商品可能會出現多少的變更。
            </li>
            <li className="pl-2">
              如有出現因錯字及/或供應商提供錯資料以致商品價錢不對及/或資訊不對，本公司有權利拒絕及取消任何價錢錯誤之訂單。如閣下已用任何形式付款而被取消訂單，我們將會全數退回已收取之款項。
            </li>
            <li className="pl-2 font-bold text-gray-900">
              如有任何爭議，Alliance Studio 保留一切最終決定權。
            </li>
          </ol>
        </div>

        {/* 聯絡資訊區塊 */}
        <div className="mt-12 pt-8 border-t border-gray-200 bg-gray-50 rounded-lg p-6">
          <h3 className="font-bold text-gray-900 mb-2">需要協助嗎？</h3>
          <p className="text-sm text-gray-600 mb-4">如果您對以上條款有任何疑問，歡迎隨時與我們聯絡。</p>
          <div className="space-y-2 text-sm font-medium text-gray-800">
            <p>WhatsApp: <a href="https://wa.me/85212345678" className="text-purple-600 hover:underline">+852 1234 5678</a></p>
            <p>電子郵件: <a href="mailto:alliance.admin.hk@gmail.com" className="text-purple-600 hover:underline">alliance.admin.hk@gmail.com</a></p>
          </div>
        </div>

      </div>
    </div>
  );
};