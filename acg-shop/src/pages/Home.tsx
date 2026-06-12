// src/pages/Home.tsx
import React, { useState, useEffect } from 'react';
import { ProductCard } from '../ProductCard';
import { HeroBanner } from '../HeroBanner';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase'; 

interface HomeProps {
  onAddToCart: (product: any) => void;
}

export const Home: React.FC<HomeProps> = ({ onAddToCart }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, "products"), where("isVisible", "!=", false));
        const querySnapshot = await getDocs(q);
        
        const productsArray: any[] = [];

        querySnapshot.docs.forEach(doc => {
          const data = doc.data();
          const baseProduct = {
            // 這裡原本是 id: doc.id，我們先拿掉，放到下面動態給予
            ...data,
            imageUrl: data.images && data.images.length > 0 
                      ? data.images[0] 
                      : (data.imageUrl || "https://via.placeholder.com/300")
          };

          // 解壓縮規格
          if (data.variants && data.variants.length > 0) {
            data.variants.forEach((variant: any) => {
              const variantStock = variant.stock !== undefined ? variant.stock : data.stockQuantity;
              productsArray.push({
                ...baseProduct,
                // === 🚀 核心修復：使用雙底線 ID，並給予結帳所需資訊 ===
                id: `${doc.id}__${variant.name}`, 
                productId: doc.id,
                variantName: variant.name,
                // ==========================================
                displayId: `${doc.id}-${variant.name}`,
                title: `${data.title} - ${variant.name}`, // 標題加上規格
                price: variant.price,
                inStock: data.inStock !== false && variantStock > 0,
                linkUrl: `/product/${doc.id}?variant=${encodeURIComponent(variant.name)}`
              });
            });
          } else {
            productsArray.push({
              ...baseProduct,
              // === 無規格的商品也統一補上 productId 防呆 ===
              id: doc.id,
              productId: doc.id,
              // ==========================================
              displayId: doc.id,
              inStock: data.inStock !== false && data.stockQuantity > 0,
              linkUrl: `/product/${doc.id}`
            });
          }
        });
        
        const inStockProducts = productsArray.filter(p => p.inStock === true);
        setProducts(inStockProducts);

      } catch (error) {
        console.error("抓取商品失敗:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <HeroBanner />
      
      <div className="max-w-6xl mx-auto p-10">
        <h1 className="text-2xl font-bold mb-6 text-purple-800 border-b-2 border-purple-200 pb-2">
          最新預購與現貨
        </h1>
        
        {loading ? (
          <div className="text-center py-10 text-purple-600 font-bold animate-pulse">
            正在從雲端載入最新商品...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard 
                key={product.displayId} 
                {...product} 
                onAddToCart={() => onAddToCart(product)} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};