// src/pages/AdminOverview.tsx
import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';

export const AdminOverview: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    monthlyRevenue: 0,
    pendingOrders: 0,
    totalProducts: 0,
  });
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // 1. 抓取所有訂單
        const ordersSnap = await getDocs(collection(db, "orders"));
        const orders = ordersSnap.docs.map(doc => doc.data() as any);
        
        // 2. 抓取所有商品
        const productsSnap = await getDocs(collection(db, "products"));
        const totalProducts = productsSnap.size;

        // --- 數據統計邏輯 ---
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        let monthlyRev = 0;
        let pendingCount = 0;
        const productSales: Record<string, { title: string; count: number; revenue: number }> = {};

        orders.forEach(order => {
          // 統計本月營業額 (排除已取消的訂單)
          const orderDate = new Date(order.createdAt);
          if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear && order.status !== 'cancelled') {
            monthlyRev += (order.totalAmount || 0);
          }

          // 統計待處理訂單
          if (['pending', 'preorder_hold', 'awaiting_payment', 'partially_shipped'].includes(order.status)) {
            pendingCount++;
          }

          // 統計熱銷商品 (遍歷訂單內的 items)
          if (order.status !== 'cancelled' && order.items) {
            order.items.forEach((item: any) => {
              if (!productSales[item.productId]) {
                productSales[item.productId] = { title: item.title, count: 0, revenue: 0 };
              }
              productSales[item.productId].count += item.quantity;
              productSales[item.productId].revenue += (item.price * item.quantity);
            });
          }
        });

        // 將商品銷量物件轉為陣列，按銷量排序並取前 5 名
        const sortedTopProducts = Object.values(productSales)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setStats({
          monthlyRevenue: monthlyRev,
          pendingOrders: pendingCount,
          totalProducts: totalProducts
        });
        setTopProducts(sortedTopProducts);

      } catch (error) {
        console.error("載入儀表板數據失敗:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // 找出現有熱銷商品中最高銷量，用來計算長條圖的百分比寬度
  const maxSalesCount = topProducts.length > 0 ? topProducts[0].count : 1;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-purple-400 font-bold animate-pulse">
        數據載入與分析中...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 標題區 */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">📊</span>
        <h2 className="text-2xl font-bold text-white tracking-wide">系統總覽 (Dashboard)</h2>
      </div>

      {/* 頂部三大 KPI 數據卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center space-y-2 hover:border-purple-500/50 transition-colors">
          <span className="text-sm font-medium text-gray-400">本月營業額</span>
          <span className="text-3xl font-black text-white">HK$ {stats.monthlyRevenue.toLocaleString()}</span>
        </div>
        
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center space-y-2 hover:border-yellow-500/50 transition-colors">
          <span className="text-sm font-medium text-gray-400">待處理訂單</span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-yellow-400">{stats.pendingOrders}</span>
            <span className="text-sm text-yellow-500 font-bold">筆</span>
          </div>
        </div>
        
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center space-y-2 hover:border-blue-500/50 transition-colors">
          <span className="text-sm font-medium text-gray-400">線上商品總數</span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-blue-400">{stats.totalProducts}</span>
            <span className="text-sm text-blue-500 font-bold">件</span>
          </div>
        </div>
      </div>

      {/* 底部數據分析區 (分為左右兩塊) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 左側：熱銷商品排行 Top 5 */}
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            🔥 熱銷商品排行 Top 5
          </h3>
          
          {topProducts.length === 0 ? (
            <p className="text-gray-500 text-center py-10 text-sm">目前尚無足夠的銷售數據。</p>
          ) : (
            <div className="space-y-5">
              {topProducts.map((item, index) => (
                <div key={index} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-end text-sm">
                    <span className="text-gray-300 font-medium truncate pr-4">
                      {index + 1}. {item.title}
                    </span>
                    <span className="text-white font-bold whitespace-nowrap">
                      賣出 {item.count} 件
                    </span>
                  </div>
                  {/* 純 CSS 進度條 */}
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-600 to-purple-400 h-2 rounded-full" 
                      style={{ width: `${(item.count / maxSalesCount) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右側：歡迎面板與營運小提示 */}
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-purple-400 mb-4">
              歡迎回來，{currentUser?.displayName || '管理員'}！
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              這是 Alliance Studio 的後台管理系統。目前的數據為即時讀取：
            </p>
            <ul className="list-disc list-inside text-sm text-gray-400 space-y-2">
              <li><strong className="text-gray-200">本月營業額：</strong> 僅計算當月未取消的訂單總額。</li>
              <li><strong className="text-gray-200">待處理訂單：</strong> 包含等待付款、預訂留貨及等待發貨的訂單，請留意出貨進度。</li>
              <li><strong className="text-gray-200">熱銷排行：</strong> 系統會自動加總所有訂單內的商品銷售件數，協助精準掌握補貨時機。</li>
            </ul>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-800 text-xs text-gray-500 text-center">
            * 數據圖表由系統實時從資料庫統計生成 *
          </div>
        </div>

      </div>
    </div>
  );
};