// src/pages/Home.tsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../firebase'; 

import { HeroBanner } from '../components/HeroBanner';
import { ProductCard } from '../components/ProductCard';

interface HomeProps {
  onAddToCart: (product: any, quantity?: number) => void;
}

export const Home: React.FC<HomeProps> = ({ onAddToCart }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestProducts = async () => {
      try {
        const q = query(collection(db, 'products'), limit(8));
        const querySnapshot = await getDocs(q);
        
        const fetchedProducts = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setProducts(fetchedProducts);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestProducts();
  }, []);

  return (
    // 加回 pb-20 確保底部與 Footer 之間有適當的呼吸空間
    <div className="w-full bg-gray-50 flex flex-col pb-20">
      
      {/* 1. 頂部主視覺輪播圖 */}
      <HeroBanner />
      
      {/* 2. 首頁商品展示區 */}
      <div className="max-w-7xl mx-auto px-4 py-16 w-full">
        
        <div className="flex justify-between items-end mb-8 border-b border-gray-200 pb-4">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">
            最新預訂與現貨
          </h2>
          <a href="/category/all" className="text-purple-600 hover:text-purple-800 font-bold text-sm flex items-center gap-1 transition-colors">
            查看全部 
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
          </a>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map(product => {
              const imageUrl = product.imageUrl || (product.images && product.images.length > 0 ? product.images[0] : "https://via.placeholder.com/300");
              const stockNum = product.stockQuantity !== undefined ? product.stockQuantity : product.stock;
              const inStock = stockNum > 0;
              
              return (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  title={product.title}
                  price={product.price}
                  deposit={product.deposit || product.price} 
                  imageUrl={imageUrl}
                  isPreorder={product.isPreorder || false}
                  inStock={inStock}
                  onAddToCart={() => onAddToCart(product, 1)}
                />
              );
            })}
          </div>
        )}
        
        {!loading && products.length === 0 && (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center">
            <span className="text-6xl mb-4 block">📦</span>
            <p className="text-gray-500 font-medium text-lg">目前資料庫還沒有上架商品喔！</p>
            <a href="/admin" className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-full font-bold hover:bg-purple-700 transition">
              前往後台新增
            </a>
          </div>
        )}
        
      </div>
      
    </div>
  );
};