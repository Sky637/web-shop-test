// src/pages/AdminOrders.tsx
import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, writeBatch, increment, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';

export const AdminOrders: React.FC = () => {
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // 為了執行自動配貨，開兩個臨時 State
  const [inputProductId, setInputProductId] = useState('');
  const [inputArrivedQty, setInputArrivedQty] = useState(0);

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

  useEffect(() => { fetchAllSystemOrders(); }, []);

  // ==========================================
  // 1. 呼叫後端執行「按時間先進先出」自動配貨
  // ==========================================
  const handleAutoAllocate = async () => {
    if (!inputProductId || inputArrivedQty <= 0) return alert("請輸入正確的商品ID與到貨數量");
    try {
      setLoading(true);
      const allocatePreorderStock = httpsCallable(functions, 'allocatePreorderStock');
      const result: any = await allocatePreorderStock({
        productId: inputProductId.trim(),
        arrivedQuantity: inputArrivedQty
      });
      alert(result.data.message);
      fetchAllSystemOrders();
    } catch (e: any) {
      alert("配貨失敗: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 2. 手動任意修改某個客人的配貨數量
  // ==========================================
  const handleManualAdjustQty = async (order: any, itemIndex: number) => {
    const item = order.items[itemIndex];
    const input = window.prompt(`請輸入欲分配給客人 ${order.userEmail} 的全新數量：\n(買家原本下單: ${item.quantity}，目前已配: ${item.allocatedQuantity || 0})`);
    if (input === null) return;
    
    const newAllocated = parseInt(input);
    if (isNaN(newAllocated) || newAllocated < 0) return alert("請輸入有效數字");

    try {
      setLoading(true);
      const updatedItems = [...order.items];
      updatedItems[itemIndex].allocatedQuantity = newAllocated;

      // 檢查是否配滿，若配滿且無其他未配貨預訂品，自動將狀態改為 pending 待發貨
      const isAllAllocated = updatedItems.every(i => !i.isPreorder || i.allocatedQuantity === i.quantity);
      const newStatus = isAllAllocated ? "pending" : order.status;

      await updateDoc(doc(db, "orders", order.id), {
        items: updatedItems,
        status: newStatus
      });

      alert("⚙️ 手動調整配貨量成功！");
      fetchAllSystemOrders();
    } catch (e) {
      alert("調整失敗");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 3. 一般狀態更新 (發貨與完成給積分)
  // ==========================================
  const handleUpdateStatus = async (order: any) => {
    let nextStatus = '';
    if (order.status === 'pending'|| order.status === 'partially_shipped') nextStatus = '已發貨';
    else if (order.status === '已發貨') nextStatus = 'completed';
    else return;

    let trackingNumber = '';
    if (nextStatus === '已發貨') {
      const input = window.prompt(`請輸入訂單 #${order.orderId || order.id} 的【物流運單號碼】\n(若無運單號可直接留空按確定)：`);
      if (input === null) return; 
      trackingNumber = input.trim();
    } else {
      if (!window.confirm(`確認要將訂單 #${order.orderId || order.id} 狀態變更為【已完成】並發放 ${order.totalAmount} 積分給買家嗎？`)) return;
    }

    try {
      const batch = writeBatch(db);
      const orderRef = doc(db, "orders", order.id);

      if (nextStatus === 'completed') {
        batch.update(orderRef, { status: "completed" });
        if (order.userId) {
          const userRef = doc(db, "users", order.userId);
          batch.update(userRef, { points: increment(order.totalAmount) });

          const logRef = doc(collection(db, "pointsLogs"));
          batch.set(logRef, {
            userId: order.userId,
            amount: order.totalAmount,
            reason: `完成訂單 #${order.orderId || order.id} 購物獎勵`,
            createdAt: new Date().toISOString()
          });
        }
      } else {
        const updateData: any = { status: nextStatus };
        if (trackingNumber) {
          // 如果原本已經有部分發貨的運單號，就把新的附加在後面
          updateData.trackingNumber = order.trackingNumber 
            ? `${order.trackingNumber} , [預訂品] ${trackingNumber}` 
            : trackingNumber;
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

  // ==========================================
  // 🚀 新增：部分發貨 (先寄出現貨)
  // ==========================================
  const handlePartialShip = async (order: any) => {
    const input = window.prompt(`請輸入【現貨包裹】的物流運單號碼\n(這會將訂單標記為「部分發貨」，預訂品仍會繼續排隊等貨)：`);
    if (input === null) return; 
    
    try {
      setLoading(true);
      await updateDoc(doc(db, "orders", order.id), {
        status: "partially_shipped",
        trackingNumber: input.trim() ? `[現貨] ${input.trim()}` : "[現貨] 已發出"
      });
      alert("📦 已標記為部分發貨！");
      fetchAllSystemOrders();
    } catch (e) {
      alert("更新失敗");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 4. 手動取消訂單 (軟刪除退庫存/積分)
  // ==========================================
  const handleCancelOrder = async (order: any) => {
    if (!window.confirm(`確定要【取消】訂單 #${order.orderId || order.id} 嗎？\n系統會自動將扣除的庫存與積分歸還給買家。`)) return;

    try {
      setLoading(true);
      const batch = writeBatch(db);
      const orderRef = doc(db, "orders", order.id);
      
      batch.update(orderRef, { 
        status: "cancelled",
        cancelReason: "管理員手動取消"
      });

      // 歸還積分與日誌
      if (order.pointsUsed && order.pointsUsed > 0 && order.userId) {
        const userRef = doc(db, "users", order.userId);
        batch.update(userRef, { points: increment(order.pointsUsed) });

        const logRef = doc(collection(db, "pointsLogs"));
        batch.set(logRef, {
          userId: order.userId,
          amount: order.pointsUsed,
          reason: `管理員取消訂單 #${order.orderId || order.id} 退還積分`,
          createdAt: new Date().toISOString()
        });
      }

      // 歸還庫存
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          const productRef = doc(db, "products", item.productId);
          const pSnap = await getDoc(productRef);
          
          if (pSnap.exists()) {
             const pData = pSnap.data();
             if (item.variantName && pData.variants) {
               const updatedVariants = pData.variants.map((v: any) => {
                 if (v.name === item.variantName) return { ...v, stock: v.stock + item.quantity };
                 return v;
               });
               batch.update(productRef, { variants: updatedVariants });
             } else {
               batch.update(productRef, { stockQuantity: increment(item.quantity) });
             }
          }
        }
      }

      await batch.commit();
      alert(`✅ 訂單已取消，庫存與積分已歸還！`);
      fetchAllSystemOrders();
    } catch (error) {
      console.error("取消訂單失敗:", error);
      alert("取消失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 🚀 新增：紀錄退款與取消剩餘商品 (針對部分發貨的訂單)
  // ==========================================
  const handleRecordRefund = async (order: any) => {
    const refundInput = window.prompt(`請輸入欲退還給客人 ${order.userEmail} 的【退款金額 (HK$)】：\n(請先至 Stripe 後台完成實際退款，再來此處紀錄)`);
    if (refundInput === null) return;
    
    const refundAmount = parseInt(refundInput);
    if (isNaN(refundAmount) || refundAmount < 0) return alert("請輸入有效的退款金額");

    try {
      setLoading(true);
      const batch = writeBatch(db);
      const orderRef = doc(db, "orders", order.id);

      // 1. 標記訂單狀態與退款金額
      batch.update(orderRef, { 
        status: "partially_refunded", // 變成「部分退款/結案」狀態
        refundedAmount: increment(refundAmount), // 記錄退款金額
        refundNote: `管理員紀錄退款 HK$${refundAmount}`
      });

      // 2. 找出哪些預訂品還沒配貨/沒發貨，要把庫存加回去
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          // 如果是預訂品，且還沒配滿 (或者你打算直接取消他剩下的量)
          if (item.isPreorder && item.allocatedQuantity < item.quantity) {
            const unfulfilledQty = item.quantity - (item.allocatedQuantity || 0); // 算出沒發出去的數量
            
            const productRef = doc(db, "products", item.productId);
            const pSnap = await getDoc(productRef);
            
            if (pSnap.exists()) {
               const pData = pSnap.data();
               if (item.variantName && pData.variants) {
                 const updatedVariants = pData.variants.map((v: any) => {
                   if (v.name === item.variantName) return { ...v, stock: v.stock + unfulfilledQty };
                   return v;
                 });
                 batch.update(productRef, { variants: updatedVariants });
               } else {
                 batch.update(productRef, { stockQuantity: increment(unfulfilledQty) });
               }
            }
          }
        }
      }

      await batch.commit();
      alert(`✅ 已成功紀錄退款 HK$${refundAmount}，並將未發貨的商品庫存歸還！`);
      fetchAllSystemOrders();
    } catch (error) {
      console.error("紀錄退款失敗:", error);
      alert("更新失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 5. 永久刪除 (硬刪除)
  // ==========================================
  const handleDeleteOrder = async (orderId: string) => {
    const isConfirmed = window.confirm(
      "⚠️ 嚴重警告：這將會【永久】從資料庫抹除這筆訂單！\n\n注意：這不會歸還庫存與積分，僅用於清理測試垃圾資料。確定要刪除嗎？"
    );
    if (!isConfirmed) return;

    try {
      setLoading(true);
      await deleteDoc(doc(db, "orders", orderId));
      alert("🗑️ 訂單已永久刪除！");
      fetchAllSystemOrders();
    } catch (error) {
      console.error("刪除訂單失敗:", error);
      alert("刪除失敗，請檢查權限。");
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = allOrders.filter(order => {
    const matchSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (order.userEmail && order.userEmail.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = filterStatus === 'all' || order.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 space-y-6">
      
      {/* ================= 大貨到港面板 ================= */}
      <div className="bg-purple-950/30 border border-purple-800/60 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-bold text-purple-400">🚢 大貨到港：預訂品一鍵先進先出（FCFS）自動配貨系統</h3>
        <div className="flex flex-wrap gap-3 items-center text-xs">
          <input type="text" placeholder="輸入到貨商品 ID (如 PRE-432274)" value={inputProductId} onChange={e => setInputProductId(e.target.value)} className="bg-gray-900 border border-gray-700 text-white rounded px-3 py-1.5 w-64" />
          <input type="number" placeholder="到貨總數量" value={inputArrivedQty || ''} onChange={e => setInputArrivedQty(parseInt(e.target.value) || 0)} className="bg-gray-900 border border-gray-700 text-white rounded px-3 py-1.5 w-28" />
          <button onClick={handleAutoAllocate} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-1.5 rounded transition-colors">⚡ 開始執行時間排序配貨</button>
        </div>
      </div>

      {/* ================= 搜尋與篩選 ================= */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800 pb-4 gap-4">
        <h2 className="text-md font-bold text-white">📋 全網訂單流水</h2>
        <div className="flex space-x-2 w-full md:w-auto">
          <input type="text" placeholder="搜尋訂單 ID 或 Email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-gray-900 border border-gray-700 text-white text-sm rounded px-3 py-1.5 flex-1 md:w-64 focus:outline-none" />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-gray-900 border border-gray-700 text-white text-sm rounded px-3 py-1.5">
            <option value="all">所有狀態</option>
            <option value="awaiting_payment">等待付款</option>
            <option value="preorder_hold">⏳ 預訂留貨中</option>
            <option value="pending">處理中 (已配滿/一般單)</option>
            <option value="已發貨">已發貨</option>
            <option value="completed">已完成</option>
            <option value="cancelled">已取消</option>
          </select>
        </div>
      </div>

      {/* ================= 訂單列表 ================= */}
      {loading ? (
        <div className="text-center py-10 text-purple-400 animate-pulse font-bold">資料同步中...</div>
      ) : (
        <div className="space-y-4 max-h-[650px] overflow-y-auto pr-2">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-10 text-gray-500">找不到符合條件的訂單。</div>
          ) : filteredOrders.map(order => (
            <div key={order.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-800 pb-2 text-xs text-gray-400 gap-2">
                <div>
                  流水號: <span className="text-yellow-400 font-mono font-bold mr-4">#{order.orderId || order.id}</span>
                  買家: <span className="text-white font-bold">{order.userEmail}</span>
                  {order.trackingNumber && (
                    <span className="ml-4 bg-gray-800 text-gray-300 px-2 py-1 rounded font-mono border border-gray-700">
                      📦 運單: <span className="text-purple-400 font-bold">{order.trackingNumber}</span>
                    </span>
                  )}
                </div>
                <div>下單時間: {new Date(order.createdAt).toLocaleString('zh-HK')}</div>
              </div>

              {/* 訂單商品明細 */}
              <div className="space-y-2">
                {order.items?.map((item: any, i: number) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center text-xs justify-between bg-gray-950/40 p-2 rounded border border-gray-800/40 gap-2">
                    <div className="space-y-1">
                      <span className="text-gray-300">📦 {item.title}</span>
                      {item.isPreorder && (
                        <div className="text-[10px] text-purple-400 font-bold">
                          ⏱️ 預訂品配貨進度：{item.allocatedQuantity || 0} / {item.quantity} 件
                          {(item.allocatedQuantity || 0) === item.quantity ? " (🔥 已配滿)" : " (⏳ 缺貨等待中)"}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-400 font-mono">HK${item.price} x {item.quantity}</span>
                      {/* 老闆專屬：手動配貨改數 */}
                      {item.isPreorder && (order.status === 'preorder_hold' || order.status === 'pending'|| order.status === 'partially_shipped') && (
                        <button onClick={() => handleManualAdjustQty(order, i)} className="text-[10px] text-teal-400 bg-teal-950/60 border border-teal-800/80 px-2 py-0.5 rounded hover:bg-teal-900">✏️ 人工改數</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 狀態列與操作按鈕 */}
              <div className="border-t border-gray-800 pt-2 flex flex-col md:flex-row justify-between items-start md:items-center text-sm gap-4">
                <div>總收付金額：<span className="text-purple-400 font-black">HK${order.totalAmount}</span></div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    order.status === 'awaiting_payment' ? 'bg-red-900/50 text-red-400 border border-red-800' :
                    order.status === 'preorder_hold' ? 'bg-purple-900/40 text-purple-400 border border-purple-800' :
                    order.status === 'partially_shipped' ? 'bg-blue-900/40 text-blue-400 border border-blue-800' :
                    order.status === 'partially_refunded' ? 'bg-orange-900/50 text-orange-400 border border-orange-800' : 
                    order.status === 'pending' ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-800' : 
                    order.status === 'completed' ? 'bg-green-900/50 text-green-400 border border-green-800' :
                    order.status === 'cancelled' ? 'bg-gray-800 text-gray-500 border border-gray-700' :
                    'bg-gray-900 text-gray-400 border border-gray-800'
                  }`}>
                    狀態: {
                      order.status === 'awaiting_payment' ? '等待付款' : 
                      order.status === 'preorder_hold' ? '⏳ 預訂留貨' : 
                      order.status === 'partially_shipped' ? '📦 部分發貨' : 
                      order.status === 'partially_refunded' ? '🤝 退款結案' :
                      order.status === 'pending' ? '處理中' : 
                      order.status === 'completed' ? '已完成' : 
                      order.status === 'cancelled' ? '已取消' : order.status
                    }
                  </span>

                  {order.status === 'preorder_hold' && (
                    <button onClick={() => handlePartialShip(order)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors">
                      🚚 先發現貨 (部分發貨)
                    </button>
                  )}
                  
                  {(order.status === 'pending' || order.status === 'partially_shipped') && (
                    <button onClick={() => handleUpdateStatus(order)} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors">
                      🚚 {order.status === 'partially_shipped' ? '發送剩餘預訂品' : '發貨'}
                    </button>
                  )}

                  {/* 🚀 新增：紀錄退款按鈕 (只在部分發貨且發現預訂品叫不到貨時顯示) */}
                  {order.status === 'partially_shipped' && (
                    <button onClick={() => handleRecordRefund(order)} className="bg-orange-700 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors">
                      💰 取消剩餘預訂並退款
                    </button>
                  )}
                  
                  {order.status === '已發貨' && (
                    <button onClick={() => handleUpdateStatus(order)} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors">
                      ✅ 完成
                    </button>
                  )}
                  
                  {(order.status === 'awaiting_payment' || order.status === 'preorder_hold' || order.status === 'pending') && (
                     <button onClick={() => handleCancelOrder(order)} className="bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors">⛔ 取消訂單</button>
                  )}
                  
                  <button onClick={() => handleDeleteOrder(order.id)} className="bg-red-900/80 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors border border-red-800">🗑️ 永久刪除</button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};