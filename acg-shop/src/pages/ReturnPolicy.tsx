// src/pages/ReturnPolicy.tsx
import React from 'react';

export const ReturnPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-xl shadow-sm border border-gray-100">
        
        <div className="text-center mb-10 pb-6 border-b border-gray-200">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">退貨與退款政策</h1>
          <p className="text-gray-500">了解我們的售後服務與退換貨流程。</p>
        </div>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-purple-600 rounded-full block"></span>
              退貨條件
            </h2>
            <ul className="list-disc list-outside ml-6 space-y-2">
              <li>退貨申請必須在購買後的 7 天內提交。逾期申請可能不被受理。</li>
              <li>退貨商品必須保持完整、未經使用且無損壞。如果商品有損壞或缺少附件，本商店可能拒絕退貨。</li>
              <li>特定商品（如盲盒、已拆封之卡包/模型、特價清倉品）可能不適用於退貨。請在購買前詳細閱讀商品頁面說明或向店員查詢。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-purple-600 rounded-full block"></span>
              退款程序
            </h2>
            <ul className="list-disc list-outside ml-6 space-y-2">
              <li>退貨商品經過檢查並符合退貨條件後，我們將處理您的退款申請。</li>
              <li>退款將按照您原始的付款方式進行退還，並在審核通過後的一定時間內處理。</li>
              <li>如果您支付的是現金，商店可能以現金形式退還款項；如使用信用卡或其他電子支付方式，可能需要您提供相關資訊以進行退款。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-purple-600 rounded-full block"></span>
              退貨運費
            </h2>
            <p className="ml-6">如果退貨是因為商品瑕疵或商店的錯誤，Alliance Studio 將會承擔退貨運費。若是因顧客個人因素（如買錯款式），退貨運費需由顧客自行承擔。</p>
          </section>

        </div>
      </div>
    </div>
  );
};