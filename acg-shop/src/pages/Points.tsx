// src/pages/Points.tsx
import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const Points: React.FC = () => {
  const { currentUser } = useOutletContext<any>();
  const [points, setPoints] = useState(0);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPointsAndLogs = async () => {
      if (!currentUser) return;
      try {
        setLoading(true);

        // 1. 抓取目前最新總積分
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setPoints(userDoc.data().points || 0);
        }

        // 2. 抓取積分變動日誌 (只抓屬於自己的)
        const q = query(collection(db, "pointsLogs"), where("userId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);
        const fetchedLogs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any[];

        // 依時間由新到舊排序
        fetchedLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLogs(fetchedLogs);
      } catch (error) {
        console.error("抓取積分資料失敗:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPointsAndLogs();
  }, [currentUser]);

  return (
    <div className="space-y-6">
      {/* 總積分區塊 */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center">
        <div className="text-lg text-gray-700">
          我的現有積分：
          <span className="font-black text-3xl text-purple-700 ml-2 animate-pulse">{points}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左欄：積分日誌列表 */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <h2 className="text-base font-bold text-gray-900 p-4 border-b">積分變動日誌</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-bold border-b">
                <tr>
                  <th className="px-4 py-3">原因/說明</th>
                  <th className="px-4 py-3">點數變動</th>
                  <th className="px-4 py-3">日期</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={3} className="text-center py-8 text-purple-600 animate-pulse font-medium">載入日誌中...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-8 text-gray-400">目前尚無積分變動紀錄。</td></tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-800 font-medium">{log.reason}</td>
                      <td className={`px-4 py-3 font-bold text-sm ${log.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {log.amount > 0 ? `+${log.amount}` : log.amount}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(log.createdAt).toLocaleDateString('zh-HK')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 右欄：原有的積分規則說明 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 h-fit">
          <h2 className="text-base font-bold text-gray-900 mb-4 border-b pb-2">💡 積分規則</h2>
          <ol className="list-decimal list-inside space-y-3 text-xs text-gray-500 leading-relaxed">
            <li>每次消費，您將獲得與【訂單實付金額】相同數值的對應積分；</li>
            <li>每 200 積分可以用來抵扣 HKD 1；</li>
            <li>每張訂單使用的積分抵扣上限不可超過訂單總額的 10%；</li>
            <li>積分使用後任何情況下不設退回。</li>
          </ol>
        </div>
      </div>
    </div>
  );
};