// src/pages/AdminUsers.tsx
import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { logAdminAction } from '../utils/logger';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // ==========================================
  // 1. 抓取所有會員資料
  // ==========================================
  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersData = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      
      // 依照建立日期排序 (新的在前)
      usersData.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      setUsers(usersData);
    } catch (e) {
      console.error("讀取會員資料失敗:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllUsers();
  }, []);

  // ==========================================
  // 2. 手動修改會員積分
  // ==========================================
  const handleUpdatePoints = async (user: any) => {
    const currentPoints = user.points || 0;
    const input = window.prompt(`請輸入 ${user.displayName || user.email} 的全新積分總額：\n(目前積分為: ${currentPoints})`, currentPoints.toString());
    
    if (input === null) return;
    
    const newPoints = parseInt(input);
    if (isNaN(newPoints) || newPoints < 0) return alert("請輸入有效的數字！");

    try {
      setLoading(true);
      const userRef = doc(db, "users", user.id);
      await updateDoc(userRef, { points: newPoints });

      await logAdminAction('修改積分', '會員', user.email, `從 ${currentPoints} 更改為 ${newPoints}`);

      alert(`✅ 已成功將該會員積分更新為 ${newPoints}！`);
      fetchAllUsers(); // 重新抓取資料以更新畫面
    } catch (error) {
      console.error("更新積分失敗:", error);
      alert("更新失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 3. 多階層權限管理
  // ==========================================
  const handleChangeRole = async (user: any, newRole: string) => {
    if (!window.confirm(`確定要將 ${user.email} 的權限更改為【${newRole}】嗎？`)) return;

    try {
      setLoading(true);
      const userRef = doc(db, "users", user.id);
      await updateDoc(userRef, { role: newRole });
      
      await logAdminAction('修改權限', '會員', user.email, `權限變更為: ${newRole}`);
      
      alert("✅ 權限更新成功！");
      fetchAllUsers();
    } catch (error) {
      console.error("更新權限失敗:", error);
      alert("更新失敗，請檢查權限設定。");
    } finally {
      setLoading(false);
    }
  };

  // 搜尋過濾邏輯 (支援信箱、電話、姓名搜尋)
  const filteredUsers = users.filter(user => {
    const term = searchTerm.toLowerCase();
    const matchEmail = user.email?.toLowerCase().includes(term);
    const matchPhone = user.phone?.includes(term);
    const matchName = user.displayName?.toLowerCase().includes(term);
    return matchEmail || matchPhone || matchName;
  });

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 space-y-6">
      
      {/* 頂部標題與搜尋區 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800 pb-4 gap-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          👥 會員與積分管理
          <span className="text-sm font-normal text-gray-500 bg-gray-900 px-2 py-1 rounded">
            共 {users.length} 人
          </span>
        </h2>
        
        <div className="w-full md:w-auto">
          <input 
            type="text" 
            placeholder="搜尋 Email、電話或姓名..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-4 py-2 w-full md:w-72 focus:outline-none focus:border-purple-500" 
          />
        </div>
      </div>

      {/* 會員列表 */}
      {loading ? (
        <div className="text-center py-10 text-purple-400 animate-pulse font-bold">資料同步中...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-gray-900/50 text-gray-300 uppercase font-medium border-b border-gray-800">
              <tr>
                <th className="px-4 py-3">會員資訊</th>
                <th className="px-4 py-3">聯絡電話</th>
                <th className="px-4 py-3">目前積分</th>
                <th className="px-4 py-3">加入時間</th>
                <th className="px-4 py-3">權限 / 操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">找不到符合條件的會員。</td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-900/30 transition-colors">
                    
                    {/* 1. 會員資訊 */}
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-white font-bold">{user.displayName || '未設定姓名'}</span>
                        <span className="text-xs text-gray-500">{user.email}</span>
                      </div>
                    </td>

                    {/* 2. 聯絡電話 */}
                    <td className="px-4 py-4">
                      {user.phone ? (
                        <span className="text-gray-300 font-mono tracking-wider">{user.phone}</span>
                      ) : (
                        <span className="text-gray-600 text-xs italic">未提供</span>
                      )}
                    </td>

                    {/* 3. 目前積分 */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-purple-400 font-bold text-base">{user.points || 0}</span>
                        <button 
                          onClick={() => handleUpdatePoints(user)}
                          className="text-[10px] text-gray-400 hover:text-purple-400 bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                        >
                          修改
                        </button>
                      </div>
                    </td>

                    {/* 4. 加入時間 */}
                    <td className="px-4 py-4 text-xs">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-HK') : '未知'}
                    </td>

                    {/* 5. 權限與操作 */}
                    <td className="px-4 py-4">
                      <select
                        value={user.role || 'user'}
                        onChange={(e) => handleChangeRole(user, e.target.value)}
                        className={`text-xs font-bold rounded px-2 py-1.5 border focus:outline-none transition-colors ${
                          user.role === 'superadmin' ? 'bg-red-900/40 text-red-400 border-red-800' :
                          user.role === 'manager' ? 'bg-purple-900/40 text-purple-400 border-purple-800' :
                          user.role === 'staff' ? 'bg-blue-900/40 text-blue-400 border-blue-800' :
                          'bg-gray-800 text-gray-400 border-gray-700'
                        }`}
                      >
                        <option value="user" className="bg-gray-900 text-gray-300">一般會員</option>
                        <option value="staff" className="bg-gray-900 text-gray-300">店員 (Staff)</option>
                        <option value="manager" className="bg-gray-900 text-gray-300">店長 (Manager)</option>
                        <option value="superadmin" className="bg-gray-900 text-gray-300">最高管理員</option>
                      </select>
                    </td>

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