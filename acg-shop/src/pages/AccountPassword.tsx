// src/pages/AccountPassword.tsx
import React, { useState } from 'react';
import { updatePassword } from 'firebase/auth';
import { auth } from '../firebase';

export const AccountPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (newPassword !== confirmPassword) {
      return setMessage({ type: 'error', text: '兩次輸入的密碼不一致！' });
    }
    if (newPassword.length < 6) {
      return setMessage({ type: 'error', text: '新密碼長度至少需要 6 個字元。' });
    }

    try {
      setLoading(true);
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        setMessage({ type: 'success', text: '✅ 密碼已成功更新！請牢記您的新密碼。' });
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      console.error(error);
      // Firebase 安全機制：如果使用者太久沒登入，會要求重新登入才能改密碼
      if (error.code === 'auth/requires-recent-login') {
        setMessage({ type: 'error', text: '為了保護帳戶安全，請登出並重新登入後，再進行密碼修改。' });
      } else {
        setMessage({ type: 'error', text: '修改失敗，請稍後再試。' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-100 shadow-sm rounded-lg p-6 max-w-2xl">
      <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-4">更改密碼</h2>
      
      <p className="text-sm text-gray-500 mb-6">
        為了確保您的帳戶安全，請使用長度至少為 6 個字元的密碼。
      </p>

      {message.text && (
        <div className={`p-4 mb-6 rounded text-sm font-bold ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleUpdatePassword} className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">新密碼</label>
          <input 
            type="password" 
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow"
            placeholder="請輸入新密碼"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">確認新密碼</label>
          <input 
            type="password" 
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow"
            placeholder="請再次輸入新密碼"
          />
        </div>

        <div className="pt-4">
          <button 
            type="submit" 
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-bold py-3 px-8 rounded-lg shadow-sm transition-colors"
          >
            {loading ? '更新中...' : '重置密碼'}
          </button>
        </div>
      </form>
    </div>
  );
};