// src/pages/Orders.tsx
import React, { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export const Orders: React.FC = () => {
  // 1. 接收從 AccountLayout 傳過來的登入者資訊
  const { currentUser } = useOutletContext<any>();
  
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 2. 去 Firestore 抓資料
  useEffect(() => {
    const fetchOrders = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        const q = query(collection(db, "orders"), where("userId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);
        
        const fetchedOrders = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any[];
        
        fetchedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        setOrders(fetchedOrders);
      } catch (error) {
        console.error("讀取訂單失敗:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentUser]);

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('zh-HK', { 
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 border-b border-gray-100 text-gray-700">
            <tr>
              <th className="px-6 py-4 font-bold">訂單編號</th>
              <th className="px-6 py-4 font-bold">下單日期</th>
              <th className="px-6 py-4 font-bold">狀態</th>
              <th className="px-6 py-4 font-bold">總計</th>
              <th className="px-6 py-4 font-bold text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10 text-purple-600 animate-pulse">載入訂單中...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-500">目前沒有訂單紀錄。</td></tr>
            ) : (
              orders.map(order => {
                const totalItems = order.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
                
                return (
                  <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-purple-600 font-mono">#{order.orderId || order.id}</span>
                    </td>
                    <td className="px-6 py-4">{formatDate(order.createdAt)}</td>
                    <td className="px-6 py-4">
                      {/* 依據狀態顯示不同顏色的標籤 */}
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        order.status === 'awaiting_payment' ? 'bg-red-100 text-red-700' :
                        order.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : 
                        order.status === 'completed' ? 'bg-green-200 text-green-800' : 
                        order.status === 'cancelled' ? 'bg-gray-300 text-gray-700' :
                        order.status === 'preorder_hold' ? 'bg-purple-100 text-purple-700' : 
                        order.status === 'partially_shipped' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-800'
                      }`}>
                          {order.status === 'awaiting_payment' ? '等待付款' : 
                          order.status === 'pending' ? '處理中' : 
                          order.status === 'completed' ? '已完成' : 
                          order.status === 'cancelled' ? '已取消' : 
                          order.status === 'preorder_hold' ? '⏳ 預訂留貨' : 
                          order.status === 'partially_shipped' ? '📦 部分發貨 (預訂品等待中)' : order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      HK${order.totalAmount} <span className="text-xs text-gray-400">({totalItems} 件商品)</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                    <Link 
                        to={`/account/orders/${order.id}`} 
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-xs font-bold transition-colors inline-block"
                    >
                        查看
                    </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};