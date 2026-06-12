// src/pages/AdminOrders.tsx
import React, { useEffect, useState } from 'react';
// === 1. 新增引入 writeBatch 和 increment 來處理積分 ===
import { collection, getDocs, doc, writeBatch, increment } from 'firebase/firestore';
import { db } from '../firebase';

export const AdminOrders: React.FC = () => {
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchAllSystemOrders = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "orders"));
      const orders = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      
      orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllOrders(orders);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchAllSystemOrders(); 
  }, []);

  // === 2. 修改：把整包 order 資料傳進來，因為我們需要知道給誰積分 (userId) 跟給多少 (totalAmount) ===
  const handleUpdateStatus = async (order: any) => {
    let nextStatus = '';
    if (order.status === 'pending') nextStatus = '已發貨';
    else if (order.status === '已發貨') nextStatus = 'completed';
    else return;

    let trackingNumber = '';
    if (nextStatus === '已發貨') {
      const input = window.prompt(`請輸入訂單 #${order.id} 的【物流運單號碼】\n(若無運單號可直接留空按確定)：`);
      if (input === null) return; 
      trackingNumber = input.trim();
    } else {
      // 變更為已完成時，提示店長會發放積分
      if (!window.confirm(`確認要將訂單 #${order.id} 狀態變更為【已完成】並發放 ${order.totalAmount} 積分給買家嗎？`)) return;
    }

    try {
      // 使用 batch 確保狀態更新和積分發放同時成功
      const batch = writeBatch(db);
      const orderRef = doc(db, "orders", order.id);

      if (nextStatus === 'completed') {
        // [A] 變更訂單狀態
        batch.update(orderRef, { status: "completed" });
        
        // [B] 發放對應積分給客人
        if (order.userId) {
          const userRef = doc(db, "users", order.userId);
          batch.update(userRef, { points: increment(order.totalAmount) });

          // [C] 建立贈點日誌
          const logRef = doc(collection(db, "pointsLogs"));
          batch.set(logRef, {
            userId: order.userId,
            amount: order.totalAmount,
            reason: `完成訂單 #${order.orderId || order.id} 購物獎勵`,
            createdAt: new Date().toISOString()
          });
        }
      } else {
        // 如果只是發貨，單純更新狀態跟運單號
        const updateData: any = { status: nextStatus };
        if (trackingNumber) {
          updateData.trackingNumber = trackingNumber;
        }
        batch.update(orderRef, updateData);
      }

      await batch.commit();
      alert(`✅ 訂單狀態已更新為【${nextStatus === 'completed' ? '已完成' : nextStatus}】！`);
      fetchAllSystemOrders(); 
    } catch (e) { 
      console.error(e);
      alert("更新失敗"); 
    }
  };

  const filteredOrders = allOrders.filter(order => {
    const matchSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (order.userEmail && order.userEmail.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = filterStatus === 'all' || order.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800 pb-4 mb-4 gap-4">
        <h2 className="text-md font-bold text-white">📋 全網訂單流水</h2>
        
        <div className="flex space-x-2 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="搜尋訂單 ID 或 Email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-white text-sm rounded px-3 py-1.5 flex-1 md:w-64 focus:outline-none focus:border-purple-500"
          />
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-white text-sm rounded px-3 py-1.5 focus:outline-none focus:border-purple-500"
          >
            <option value="all">所有狀態</option>
            <option value="pending">處理中</option>
            <option value="已發貨">已發貨</option>
            <option value="completed">已完成</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-purple-400 animate-pulse font-bold">正在調閱全網資料庫訂單...</div>
      ) : (
        <div className="space-y-4 max-h-[650px] overflow-y-auto pr-2">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-10 text-gray-500">找不到符合條件的訂單。</div>
          ) : filteredOrders.map(order => (
            <div key={order.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-800 pb-2 text-xs text-gray-400 gap-2">
                <div>
                  訂單流水 ID: <span className="text-yellow-400 font-mono font-bold mr-4">#{order.orderId || order.id}</span>
                  買家帳號: <span className="text-white font-bold">{order.userEmail}</span>
                  {order.trackingNumber && (
                    <span className="ml-4 bg-gray-800 text-gray-300 px-2 py-1 rounded font-mono border border-gray-700">
                      📦 運單: <span className="text-purple-400 font-bold">{order.trackingNumber}</span>
                    </span>
                  )}
                </div>
                <div>下單時間: {new Date(order.createdAt).toLocaleString('zh-HK')}</div>
              </div>

              <div className="space-y-2">
                {order.items?.map((item: any, i: number) => (
                  <div key={i} className="flex items-center text-xs justify-between">
                    <span className="text-gray-300 truncate max-w-lg">📦 {item.title}</span>
                    <span className="text-gray-400 font-mono">HK${item.price} x {item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-800 pt-2 flex justify-between items-center text-sm">
                <div>總收付金額：<span className="text-purple-400 font-black">HK${order.totalAmount}</span></div>
                
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    order.status === 'pending' ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-800' : 
                    order.status === 'completed' ? 'bg-green-900/50 text-green-400 border border-green-800' :
                    'bg-blue-900/50 text-blue-400 border border-blue-800'
                  }`}>
                    狀態: {order.status === 'pending' ? '處理中' : order.status === 'completed' ? '已完成' : order.status}
                  </span>
                  
                  {/* === 3. 修改按鈕，把 order 整包傳過去 === */}
                  {order.status === 'pending' && (
                    <button 
                      onClick={() => handleUpdateStatus(order)}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors"
                    >
                      🚚 變更為【已發貨】並填寫運單
                    </button>
                  )}
                  {order.status === '已發貨' && (
                    <button 
                      onClick={() => handleUpdateStatus(order)}
                      className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors"
                    >
                      ✅ 變更為【已完成】(發放積分)
                    </button>
                  )}
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};