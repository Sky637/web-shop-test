// src/pages/AdminOverview.tsx
import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export const AdminOverview: React.FC = () => {
  const { currentUser } = useOutletContext<any>();

  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [totalProductsCount, setTotalProductsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        
        // 1. 抓取商品總數
        const productsSnap = await getDocs(collection(db, "products"));
        setTotalProductsCount(productsSnap.size);

        // 2. 抓取所有訂單，用來計算營業額與待處理數量
        const ordersSnap = await getDocs(collection(db, "orders"));
        
        let tempPendingCount = 0;
        let tempRevenue = 0;
        
        // 取得現在的年份與月份
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        ordersSnap.forEach((doc) => {
          const order = doc.data();
          
          // 計算：待處理訂單
          if (order.status === 'pending') {
            tempPendingCount++;
          }

          // 計算：本月營業額
          if (order.createdAt) {
            const orderDate = new Date(order.createdAt);
            // 如果訂單的年份和月份跟現在一樣 (代表是本月的訂單)
            if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
              // 這裡假設所有沒有被取消的訂單都算入營業額
              tempRevenue += (order.totalAmount || 0);
            }
          }
        });

        // 將計算結果存入 State 讓畫面更新
        setPendingOrdersCount(tempPendingCount);
        setMonthlyRevenue(tempRevenue);
        
      } catch (error) {
        console.error("獲取統計數據失敗:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white border-b border-gray-800 pb-4">📊 系統總覽 (Dashboard)</h2>
      
      {/* 數據卡片區塊 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-950 border border-gray-800 p-6 rounded-xl flex flex-col justify-center items-center shadow-lg transition-transform hover:scale-105">
          <h3 className="text-gray-400 text-sm font-bold mb-2">本月營業額</h3>
          <p className="text-3xl font-black text-white">
            {loading ? <span className="animate-pulse text-gray-600">計算中...</span> : `HK$ ${monthlyRevenue.toLocaleString()}`}
          </p>
        </div>
        <div className="bg-gray-950 border border-gray-800 p-6 rounded-xl flex flex-col justify-center items-center shadow-lg transition-transform hover:scale-105">
          <h3 className="text-gray-400 text-sm font-bold mb-2">待處理訂單</h3>
          <p className="text-3xl font-black text-yellow-400">
            {loading ? <span className="animate-pulse text-gray-600">...</span> : `${pendingOrdersCount} 筆`}
          </p>
        </div>
        <div className="bg-gray-950 border border-gray-800 p-6 rounded-xl flex flex-col justify-center items-center shadow-lg transition-transform hover:scale-105">
          <h3 className="text-gray-400 text-sm font-bold mb-2">線上商品總數</h3>
          <p className="text-3xl font-black text-purple-400">
            {loading ? <span className="animate-pulse text-gray-600">...</span> : `${totalProductsCount} 件`}
          </p>
        </div>
      </div>

      {/* 歡迎訊息區塊 */}
      <div className="bg-gray-950 border border-gray-800 p-8 rounded-xl mt-6 shadow-lg">
         <h3 className="text-lg font-bold text-white mb-2">
           歡迎回來，{currentUser?.displayName || '管理員'}！
         </h3>
         <p className="text-gray-400 text-sm leading-relaxed">
           這是 Alliance Studio 的後台管理系統。您可以在左側選單中切換功能：<br/>
           • 📦 點擊 **商品管理** 來上架、編輯或隱藏商品庫存。<br/>
           • 📋 點擊 **訂單流水** 來追蹤全網客人的購買紀錄並更新發貨狀態。<br/>
           *(上方數據為即時讀取資料庫最新狀態自動結算)*
         </p>
      </div>
    </div>
  );
};