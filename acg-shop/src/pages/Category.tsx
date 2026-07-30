// src/pages/Category.tsx
import React, { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface CategoryProps {
  onAddToCart: (product: any) => void;
}

export const Category: React.FC<CategoryProps> = ({ onAddToCart }) => {
  const { categoryId } = useParams();
  const [searchParams] = useSearchParams();
  const activeTag = searchParams.get('tag');

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockFilter, setStockFilter] = useState<'all' | 'outOfStock' | 'inStock'>('inStock');
  const [sidebarTags, setSidebarTags] = useState<string[]>([]);

  useEffect(() => {
    const fetchTags = async () => {
      const docSnap = await getDoc(doc(db, 'settings', 'store'));
      if (docSnap.exists() && docSnap.data().tags) {
        setSidebarTags(docSnap.data().tags);
      }
    };
    fetchTags();
  }, []);

  useEffect(() => {
    const fetchCategoryProducts = async () => {
      try {
        setLoading(true);
        let q;
        const productsRef = collection(db, "products");

        if (categoryId && categoryId !== 'all') {
          q = query(productsRef, where("category", "==", categoryId));
        } else {
          q = query(productsRef);
        }

        const querySnapshot = await getDocs(q);
        const productsArray: any[] = [];

        querySnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.isVisible === false) return; 

          if (activeTag) {
            const inTags = data.tags && data.tags.includes(activeTag);
            const inMain = data.mainCategory === activeTag;
            const inSub = data.subCategory === activeTag;
            const inSubSub = data.subSubCategory === activeTag;
            
            if (!inTags && !inMain && !inSub && !inSubSub) {
              return; 
            }
          }

          const baseProduct = {
            ...data,
            imageUrl: data.images && data.images.length > 0 ? data.images[0] : (data.imageUrl || "https://via.placeholder.com/300")
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
                title: `${data.title} - ${variant.name}`,
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
        
        setProducts(productsArray);
      } catch (error) {
        console.error("抓取分類商品失敗:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryProducts();
  }, [categoryId, activeTag]);

  const filteredProducts = products.filter(p => {
    if (stockFilter === 'inStock') return p.inStock === true;
    if (stockFilter === 'outOfStock') return p.inStock === false;
    return true; 
  });

  return (
    <div className="min-h-screen bg-white pb-20">
      
      <div className="bg-gradient-to-r from-purple-600 via-purple-500 to-orange-300 pt-8 pb-6 px-4 md:px-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-end">
          <div className="text-white">
            <h1 className="text-3xl font-bold flex items-center mb-2">
               {activeTag ? `標籤搜尋: ${activeTag}` : (categoryId === 'all' ? '全部商品' : '商品分類')}
            </h1>
            <div className="text-sm font-medium text-white/80 space-x-2">
              <Link to="/" className="hover:text-white">主頁</Link>
              <span>/</span>
              <span className="text-white">{activeTag || categoryId || '全部'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-10 pt-8 flex flex-col md:flex-row gap-8">
        
        <div className="w-full md:w-64 flex-shrink-0 space-y-8">
          <div>
            <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">庫存狀態</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <label className="flex items-center space-x-3 cursor-pointer hover:text-purple-700 transition-colors">
                <input type="radio" name="stockStatus" checked={stockFilter === 'all'} onChange={() => setStockFilter('all')} className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300" />
                <span>全部</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer hover:text-purple-700 transition-colors">
                <input type="radio" name="stockStatus" checked={stockFilter === 'outOfStock'} onChange={() => setStockFilter('outOfStock')} className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300" />
                <span>已售罄</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer hover:text-purple-700 transition-colors">
                <input type="radio" name="stockStatus" checked={stockFilter === 'inStock'} onChange={() => setStockFilter('inStock')} className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300" />
                <span className="font-bold text-purple-700">有庫存</span>
              </label>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">產品標籤</h3>
            <div className="flex flex-wrap gap-2">
              {sidebarTags.map((tag, idx) => (
                <Link 
                  key={idx} 
                  to={`/category/all?tag=${encodeURIComponent(tag)}`}
                  className={`text-xs px-2 py-1.5 rounded transition-colors ${
                    activeTag === tag 
                      ? 'bg-purple-600 text-white border border-purple-600 shadow-sm' 
                      : 'border border-purple-200 text-purple-700 hover:bg-purple-50'
                  }`}
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1">
          {loading ? (
            <div className="text-center py-20 text-purple-600 font-bold animate-pulse">搜尋商品中...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              找不到符合目前條件的商品。
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredProducts.map((product) => (
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
    </div>
  );
};