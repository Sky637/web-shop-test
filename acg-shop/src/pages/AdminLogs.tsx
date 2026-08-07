// src/pages/AdminLogs.tsx
import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export const AdminLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLogEnabled, setIsLogEnabled] = useState(true);
  
  const [accessDenied, setAccessDenied] = useState(false);

  const checkAccessAndFetch = async () => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // 1. 先驗證權限是否為 superadmin
      const userSnap = await getDoc(doc(db, "users", currentUser.uid));
      if (!userSnap.exists() || userSnap.data().role !== 'superadmin') {
        setAccessDenied(true);
        setLoading(false);
        return; // 權限不足，直接中斷執行
      }

      // 2. 抓取系統開關設定
      const settingsRef = doc(db, 'settings', 'store');
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists() && settingsSnap.data().enableAuditLog !== undefined) {
        setIsLogEnabled(settingsSnap.data().enableAuditLog);
      }

      // 3. 取得最新的 100 筆操作紀錄
      const q = query(collection(db, "admin_logs"), orderBy("createdAt", "desc"), limit(100));
      const querySnapshot = await getDocs(q);
      
      const logData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        time: doc.data().createdAt?.toDate().toLocaleString('zh-HK') || '未知時間'
      }));
      
      setLogs(logData);
    } catch (error) {
      console.error("讀取日誌失敗:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAccessAndFetch();
  }, []);

  const handleToggleLog = async () => {
    const newState = !isLogEnabled;
    const confirmMsg = newState 
      ? "確定要【開啟】系統操作紀錄功能嗎？\n(未來的操作將會被寫入資料庫)" 
      : "確定要【關閉】系統操作紀錄功能嗎？\n(為節省資料庫空間，未來的操作將不再被記錄)";
      
    if (!window.confirm(confirmMsg)) return;

    try {
      await setDoc(doc(db, 'settings', 'store'), { enableAuditLog: newState }, { merge: true });
      setIsLogEnabled(newState);
      alert(`✅ 系統操作紀錄已${newState ? '開啟' : '關閉'}！`);
    } catch (error) {
      console.error("更新日誌設定失敗:", error);
      alert("更新設定失敗，請稍後再試。");
    }
  };

  // 如果權限不足，顯示警告畫面
  if (accessDenied) {
    return (
      <div className="bg-gray-950 p-10 rounded-xl border border-red-900/50 flex flex-col items-center justify-center h-[60vh] space-y-4">
        <span className="text-6xl">⛔</span>
        <h2 className="text-2xl font-bold text-red-500">存取被拒</h2>
        <p className="text-gray-400">抱歉，只有「最高管理員」有權限查看系統操作紀錄。</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-950 p-6 rounded-xl border border-gray-800 h-fit min-h-[500px]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800 pb-4 mb-6 gap-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          📝 系統操作紀錄 (Audit Logs)
        </h2>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={handleToggleLog} 
            className={`flex-1 md:flex-none px-4 py-2 rounded text-sm font-bold transition-colors border ${
              isLogEnabled 
                ? 'bg-green-900/30 text-green-400 border-green-800 hover:bg-green-900/50' 
                : 'bg-red-900/30 text-red-400 border-red-800 hover:bg-red-900/50'
            }`}
          >
            {isLogEnabled ? '🟢 紀錄功能：已開啟' : '🔴 紀錄功能：已關閉'}
          </button>
          
          <button 
            onClick={checkAccessAndFetch} 
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-bold transition-colors"
          >
            重新整理
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 animate-pulse text-purple-400">載入紀錄中...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-gray-900 text-gray-300 text-xs uppercase border-b border-gray-800">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg">操作時間</th>
                <th className="px-4 py-3">管理員帳號</th>
                <th className="px-4 py-3">動作</th>
                <th className="px-4 py-3">目標類型</th>
                <th className="px-4 py-3">目標 ID</th>
                <th className="px-4 py-3 rounded-tr-lg">詳細說明</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">目前尚無任何操作紀錄</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-900/50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{log.time}</td>
                    <td className="px-4 py-3 text-purple-400 font-medium">{log.adminEmail}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        log.action.includes('刪除') || log.action.includes('下架') || log.action.includes('取消') 
                          ? 'bg-red-900/50 text-red-400' 
                          : log.action.includes('新增') 
                            ? 'bg-green-900/50 text-green-400' 
                            : 'bg-blue-900/50 text-blue-400'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">{log.targetType}</td>
                    <td className="px-4 py-3 text-white font-mono">{log.targetId}</td>
                    <td className="px-4 py-3 text-gray-500">{log.details || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};