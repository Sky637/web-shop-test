// src/pages/Account.tsx
import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface AccountProps {
  currentUser: any;
}

export const Account: React.FC<AccountProps> = ({ currentUser }) => {
  // 表單狀態
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // 當頁面載入，或者 currentUser 改變時，去資料庫抓資料
  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        // 指向 users 集合中，ID 為客人 uid 的那份文件
        const userDocRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setPhone(data.phone || '');
          setAddress(data.address || '');
        }
      } catch (error) {
        console.error("讀取會員資料失敗:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [currentUser]);

  // 儲存按鈕的處理邏輯
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      setSaving(true);
      setMessage('');
      const userDocRef = doc(db, "users", currentUser.uid);
      
      // 使用 setDoc 儲存資料 (如果文件不存在會自動建立，如果存在會覆蓋)
      await setDoc(userDocRef, {
        phone: phone,
        address: address,
        email: currentUser.email, // 順便把 email 存進資料庫備查
        updatedAt: new Date().toISOString()
      }, { merge: true }); // merge: true 代表只更新這幾個欄位，不要清空其他欄位（如未來的積分）

      setMessage('資料已成功更新！');
    } catch (error) {
      console.error("儲存失敗:", error);
      setMessage('儲存失敗，請重試。');
    } finally {
      setSaving(false);
    }
  };

  // 如果還沒登入，顯示提示
  if (!currentUser) {
    return <div className="text-center py-20 text-gray-500 font-bold">請先登入以查看帳戶資料。</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-10 pb-20">
      <h1 className="text-3xl font-bold text-gray-900 mb-8 border-b pb-4">帳戶詳情資料</h1>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 md:p-8">
        
        {/* 基本資訊 (來自 Firebase Auth，唯讀) */}
        <div className="mb-8 bg-gray-50 p-4 rounded-lg border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">登入資訊</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">帳戶名稱</label>
              <div className="text-gray-900 font-medium">{currentUser.displayName || '未設定'}</div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">電郵地址</label>
              <div className="text-gray-900 font-medium">{currentUser.email}</div>
            </div>
          </div>
        </div>

        {/* 聯絡與送貨資訊 (來自 Firestore 資料庫，可編輯) */}
        <form onSubmit={handleSave} className="space-y-6">
          <h2 className="text-lg font-bold text-gray-800 border-b pb-2">聯絡與送貨資訊</h2>
          
          {loading ? (
            <div className="text-purple-600 font-bold animate-pulse">載入資料中...</div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">聯絡電話</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="例如: 9876 5432"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">預設送貨地址 (香港/澳門)</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="請輸入完整的收件地址或順豐智能櫃編號"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {message && (
                <div className={`p-3 rounded-lg font-medium text-sm ${message.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {message}
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-bold py-3 px-8 rounded-lg shadow transition-colors"
                >
                  {saving ? '儲存中...' : '儲存變更'}
                </button>
              </div>
            </>
          )}
        </form>

      </div>
    </div>
  );
};