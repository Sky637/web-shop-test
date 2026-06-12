// src/pages/OrderDetail.tsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, writeBatch, increment, collection } from 'firebase/firestore';
import { db } from '../firebase';


export const OrderDetail: React.FC = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, "orders", orderId || "");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setOrder({ id: docSnap.id, ...docSnap.data() });
        } else {
          console.log("找不到該筆訂單！");
        }
      } catch (error) {
        console.error("讀取訂單詳情失敗:", error);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) fetchOrderDetails();
  }, [orderId]);

  const handleCompleteOrder = async () => {
    if (!window.confirm("確定要將此訂單設為已完成並發放積分嗎？")) return;
    
    try {
      setLoading(true);
      const batch = writeBatch(db);
      
      const orderRef = doc(db, "orders", order.id);
      batch.update(orderRef, { status: "completed" });
      
      const userRef = doc(db, "users", order.userId);
      batch.update(userRef, { points: increment(order.totalAmount) });

      const logRef = doc(collection(db, "pointsLogs"));
      batch.set(logRef, {
        userId: order.userId,
        amount: order.totalAmount,
        reason: `完成訂單 #${order.id} 購物獎勵`,
        createdAt: new Date().toISOString()
      });

      await batch.commit();
      alert(`✅ 訂單已完成！已發放 ${order.totalAmount} 積分至客人帳戶。`);
      window.location.reload(); 
    } catch (error) {
      console.error("更新訂單失敗:", error);
      alert("操作失敗。");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-purple-600 animate-pulse font-bold">載入訂單資料中...</div>;
  if (!order) return <div className="text-center py-20 text-gray-500">找不到此訂單，請確認訂單編號。</div>;

  return (
    <div className="space-y-6 pb-10">
      
      {/* 頂部：訂單狀態與返回按鈕 */}
      <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="text-sm text-gray-700">
          <span className="font-bold mr-2">訂單 #{order.orderId || order.id}</span>
          <span className="mr-2">創建於 {new Date(order.createdAt).toLocaleString('zh-HK')}</span>
          <span>目前狀態為 
            <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${
              order.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : 
              order.status === 'completed' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'
            }`}>
              {order.status === 'pending' ? '處理中' : order.status === 'completed' ? '已完成' : order.status}
            </span>
          </span>
        </div>
      </div>

      {/* 訂單商品明細 */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-lg overflow-hidden">
        <h2 className="text-lg font-bold text-gray-900 p-6 border-b">訂單詳情</h2>
        <div className="p-6 space-y-4">
          {order.items.map((item: any, index: number) => (
            <div key={index} className="flex items-center justify-between border-b border-gray-50 pb-4 last:border-0 last:pb-0">
              <div className="flex items-center space-x-4">
                <img src={item.imageUrl} alt={item.title} className="w-16 h-16 object-contain bg-gray-50 border rounded" />
                <div>
                  <p className="font-medium text-gray-800 text-sm max-w-md">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-1">SKU: {item.id}</p>
                </div>
              </div>
              <div className="text-right text-sm">
                <p className="text-gray-600">HK${item.price} x {item.quantity}</p>
                <p className="font-bold text-purple-700 mt-1">HK${item.price * item.quantity}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 寄送與金額總結 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="bg-white border border-gray-100 shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">寄送與聯絡資訊</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <p><span className="font-bold mr-2">聯絡人信箱:</span> {order.userEmail}</p>
            <p><span className="font-bold mr-2">聯絡電話:</span> {order.phone || '未提供'}</p>
            <p><span className="font-bold mr-2">送貨方式:</span> {order.deliveryMethod === 'pickup' ? '門市自取' : '標準送貨'}</p>
            <p><span className="font-bold mr-2">送貨地址:</span> {order.shippingAddress || '未提供'}</p>
            
            {/* === 新增：如果訂單含有運單號，則高亮顯示出來 === */}
            {order.trackingNumber && (
              <div className="pt-2 mt-2 border-t border-dashed border-gray-200">
                <p className="flex items-center">
                  <span className="font-bold mr-2">📦 物流運單號:</span>
                  <span className="text-purple-700 font-mono font-bold bg-purple-50 px-3 py-1 rounded border border-purple-100">
                    {order.trackingNumber}
                  </span>
                </p>
                <p className="text-xs text-gray-400 mt-1 ml-[90px]">請使用此號碼至對應物流網站查詢包裹狀態</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-100 shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">金額總計</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>商品總金額</span>
              <span>HK${order.totalAmount}.00</span>
            </div>
            <div className="flex justify-between">
              <span>運費</span>
              <span>HK$0.00</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2 text-base font-black text-gray-900">
              <span>總計</span>
              <span className="text-purple-700">HK${order.totalAmount}.00</span>
            </div>
          </div>
        </div>

      </div>

      {/* 底部操作 */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
        <div className="flex space-x-4">
          <button onClick={() => window.location.reload()} className="flex items-center text-sm font-bold text-gray-500 hover:text-purple-600 transition-colors">
            刷新狀態
          </button>
          
          {order.status === 'pending' && (
             <button onClick={handleCompleteOrder} className="flex items-center text-sm font-bold text-green-600 hover:text-green-800 transition-colors bg-green-50 px-3 py-1 rounded">
               [測試] 模擬店長發貨 (發放積分)
             </button>
          )}
        </div>
        
        <Link to="/account/orders" className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 px-6 rounded transition-colors text-sm">
          返回訂單列表
        </Link>
      </div>

    </div>
  );
};