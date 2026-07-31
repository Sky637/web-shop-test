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

  // 計算經過篩選後的訂單列表 (方便匯出報表與列表顯示使用)
  const filteredOrders = allOrders.filter(order => {
    const matchSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (order.userEmail && order.userEmail.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = filterStatus === 'all' || order.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // ==========================================
  // 🚀 新增：匯出 CSV 報表功能
  // ==========================================
  const handleExportCSV = () => {
    if (!filteredOrders || filteredOrders.length === 0) {
      alert("目前沒有訂單資料可供匯出！");
      return;
    }

    // 定義 CSV 標題
    const headers = [
      "系統流水號", 
      "建立日期", 
      "買家帳號 (Email)", 
      "訂單狀態", 
      "總金額 (HK$)", 
      "物流運單號碼",
      "購買商品明細"
    ];

    // 整理每一筆訂單的資料
    const csvRows = filteredOrders.map(order => {
      const date = order.createdAt 
        ? new Date(order.createdAt).toLocaleString('zh-HK') 
        : "未知日期";
      
      const itemsDetail = order.items 
        ? order.items.map((item: any) => `${item.title} (x${item.quantity})`).join(" | ")
        : "無商品紀錄";

      // 轉換狀態為中文顯示
      const statusMap: Record<string, string> = {
        'awaiting_payment': '等待付款',
        'preorder_hold': '預訂留貨中',
        'pending': '處理中',
        'partially_shipped': '部分發貨',
        'partially_refunded': '部分退款/結案',
        '已發貨': '已發貨',
        'completed': '已完成',
        'cancelled': '已取消'
      };

      const rowData = [
        order.orderId || order.id,
        date,
        order.userEmail || "未提供",
        statusMap[order.status] || order.status || "未知",
        order.totalAmount || 0,
        order.trackingNumber || "無",
        itemsDetail
      ];

      return rowData.map(field => `"${String(field).replace(/"/g, '""')}"`).join(",");
    });

    // 組合並建立下載連結 (加入 \uFEFF 避免中文亂碼)
    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Alliance_Orders_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==========================================
  // 呼叫後端執行「按時間先進先出」自動配貨
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
  // WhatsApp 一鍵到貨通知 (含訂單專屬連結)
  // ==========================================
  const handleWhatsAppNotify = async (order: any) => {
    let targetPhone = order.phone;

    // 1. 如果訂單本身沒有電話，且這筆訂單有綁定會員 userId，就去 users 資料庫找
    if (!targetPhone && order.userId) {
      try {
        const userRef = doc(db, "users", order.userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().phone) {
          targetPhone = userSnap.data().phone;
        }
      } catch (error) {
        console.error("抓取會員電話失敗:", error);
      }
    }

    // 2. 再次檢查是否真的沒有電話
    if (!targetPhone) {
      alert("⚠️ 這筆訂單與該會員的個人資料中，都沒有留下聯絡電話，無法自動跳轉 WhatsApp！");
      return;
    }

    // 3. 格式化電話號碼 (去除空白，若是香港 8 碼則自動加上 852)
    let formattedPhone = targetPhone.replace(/\s+/g, '');
    if (formattedPhone.length === 8) {
      formattedPhone = '852' + formattedPhone;
    }

    // 4. 抓取「已經配貨 (allocatedQuantity > 0)」的預訂商品名單
    const arrivedItems = order.items
      ?.filter((item: any) => item.isPreorder && (item.allocatedQuantity || 0) > 0)
      .map((item: any) => `- ${item.title} (x${item.allocatedQuantity})`)
      .join('\n');

    // 5. 自動產生訂單專屬連結 (抓取目前網站網域 + 訂單路由)
    const baseUrl = window.location.origin;
    const orderLink = `${baseUrl}/account/orders/${order.id}`; 

    // 6. 根據是否有預訂品，組裝不同的預設訊息 (加入訂單連結)
    let defaultText = '';
    if (arrivedItems) {
      defaultText = `您好！您在 Alliance Studio 預訂的商品已經到貨囉！\n\n訂單編號：#${order.orderId || order.id}\n到貨商品：\n${arrivedItems}\n\n點擊查看訂單詳情與安排取貨：\n${orderLink}\n\n請您抽空前往門市取貨，或回覆此訊息安排寄送，謝謝！`;
    } else {
      defaultText = `您好！您在 Alliance Studio 的訂單 (#${order.orderId || order.id}) 狀態有更新。\n\n點擊查看訂單詳情：\n${orderLink}\n\n請回覆此訊息與我們聯絡，謝謝！`;
    }

    // 7. 將文字編碼並打開 WhatsApp 連結
    const encodedText = encodeURIComponent(defaultText);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedText}`;
    
    window.open(whatsappUrl, '_blank');
  };

  // ==========================================
  // 手動任意修改某個客人的配貨數量
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
  // 一般狀態更新 (發貨與完成給積分)
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
  // 部分發貨 (先寄出現貨)
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
  // 手動取消訂單 (軟刪除退庫存/積分)
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
  // 紀錄退款與取消剩餘商品 (針對部分發貨的訂單)
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

      batch.update(orderRef, { 
        status: "partially_refunded",
        refundedAmount: increment(refundAmount),
        refundNote: `管理員紀錄退款 HK$${refundAmount}`
      });

      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          if (item.isPreorder && item.allocatedQuantity < item.quantity) {
            const unfulfilledQty = item.quantity - (item.allocatedQuantity || 0);
            
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
  // 永久刪除 (硬刪除)
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

      {/* ================= 搜尋與篩選 (加入匯出按鈕) ================= */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800 pb-4 gap-4">
        
        {/* 左側：標題與匯出按鈕 */}
        <div className="flex items-center gap-4">
          <h2 className="text-md font-bold text-white">📋 全網訂單流水</h2>
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
            匯出 CSV
          </button>
        </div>

        {/* 右側：搜尋與過濾器 */}
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

                  <button 
                    onClick={() => handleWhatsAppNotify(order)} 
                    className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    WhatsApp
                  </button>

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