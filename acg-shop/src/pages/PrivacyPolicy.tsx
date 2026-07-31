// src/pages/PrivacyPolicy.tsx
import React from 'react';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-xl shadow-sm border border-gray-100">
        
        <div className="text-center mb-10 pb-6 border-b border-gray-200">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">隱私權政策</h1>
          <p className="text-gray-500">我們重視您的隱私，並致力於保護您的個人資料。</p>
        </div>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-purple-600 rounded-full block"></span>
              信息收集與使用
            </h2>
            <ul className="list-disc list-outside ml-6 space-y-2">
              <li>當您在我們的網站上註冊、下訂單或填寫表單時，我們可能會收集您的個人資訊，例如姓名、電話號碼、電子郵件地址與送貨地址。</li>
              <li>我們使用您提供的個人資訊來處理您的訂單、提供客戶服務、回答查詢，並向您發送與訂單相關的更新通知。</li>
              <li>我們不斷努力提高網站的服務品質，您的資訊有助於我們更有效地響應您的需求。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-purple-600 rounded-full block"></span>
              資訊安全與保護
            </h2>
            <ul className="list-disc list-outside ml-6 space-y-2">
              <li>我們實施各種安全措施，以保持您的個人信息的安全性。</li>
              <li>我們絕不會向第三方出售、租借或交換您的個人識別資訊。</li>
              <li>您也有責任保護您的個人資訊，例如不將您的帳戶密碼透露給他人。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-purple-600 rounded-full block"></span>
              查閱與改正權利
            </h2>
            <p className="ml-6">您可以隨時要求查閱、修改，或要求我們停止繼續收集、處理，或刪除您儲存在我們記錄的個人資料。如欲行使權利，請透過客服信箱與我們聯絡。</p>
          </section>

        </div>
      </div>
    </div>
  );
};