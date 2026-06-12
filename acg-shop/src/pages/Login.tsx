// src/pages/Login.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';

export const Login: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        // 1. 註冊新帳戶
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // 2. 註冊成功後，同步寫入 Firebase Profile
        await updateProfile(userCredential.user, {
          displayName: displayName || "新會員"
        });
        
        // === 關鍵修改：強制重整網頁，抓取最新的名字狀態 ===
        window.location.href = '/'; 
        return; // 停止執行，不讓下面的 navigate 觸發
        
      } else {
        // 3. 執行登入
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/'); // 登入則正常使用 navigate
      }
      // 認證成功後，將客人踢回首頁
      navigate('/');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('該電郵地址已被其他會員註冊。');
      } else if (err.code === 'auth/invalid-credential') {
        setError('電郵或密碼輸入錯誤，請重試。');
      } else if (err.code === 'auth/weak-password') {
        setError('密碼安全強度不足，至少需要 6 個字元。');
      } else {
        setError('系統認證失敗，請檢查網路連線。');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white border border-gray-200 p-8 rounded-xl shadow-sm space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-black text-purple-700">
            {isRegister ? '建立新帳戶' : '歡迎回來'}
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            {isRegister ? '加入 HOBBYLAND 開始你的收藏預訂之旅' : '登入以查看你的網店訂單與會員積分'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">暱稱 / 姓名</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="例如: Sky"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">電郵地址</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="yourname@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">密碼</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="輸入密碼 (至少 6 位數)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold py-3 rounded-lg shadow transition-colors text-sm disabled:bg-gray-400"
          >
            {loading ? '請稍候...' : (isRegister ? '註冊帳戶' : '立即登入')}
          </button>
        </form>

        <div className="text-center text-sm text-gray-600 border-t pt-4">
          {isRegister ? '已經有帳戶了？' : '還沒有 HOBBYLAND 帳戶？'}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="text-purple-600 font-bold hover:underline ml-1"
          >
            {isRegister ? '立即登入' : '免費註冊'}
          </button>
        </div>
      </div>
    </div>
  );
};