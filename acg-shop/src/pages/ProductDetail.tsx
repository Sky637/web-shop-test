// src/pages/ProductDetail.tsx
import React, { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface ProductDetailProps {
  onAddToCart: (product: any, quantity: number) => void;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({ onAddToCart }) => {
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mainImage, setMainImage] = useState<string>("");
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [quantity, setQuantity] = useState<number>(1);
  
  // === 全螢幕檢視狀態 (Lightbox) ===
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  
  // === 主圖 Hover 放大鏡狀態 ===
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPos, setHoverPos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, "products", productId || "");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setProduct({ id: docSnap.id, ...data });
          if (data.images && data.images.length > 0) setMainImage(data.images[0]);
          else if (data.imageUrl) setMainImage(data.imageUrl);
          
          if (data.variants && data.variants.length > 0) {
            const urlVariantName = searchParams.get('variant');
            const matchedVariant = data.variants.find((v: any) => v.name === urlVariantName);
            setSelectedVariant(matchedVariant || data.variants[0]);
          }
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    if (productId) fetchProductData();
  }, [productId, searchParams]);

  if (loading) return <div className="text-center py-20 animate-pulse text-purple-600 font-bold text-xl">載入商品中...</div>;
  if (!product) return <div className="text-center py-20 text-gray-500 font-bold">找不到此商品</div>;

  const imagesArray = product.images || [product.imageUrl];
  const displayPrice = selectedVariant ? selectedVariant.price : product.price;
  const currentStock = selectedVariant && selectedVariant.stock !== undefined ? selectedVariant.stock : product.stockQuantity;
  const canBuy = product.inStock !== false && currentStock > 0;

  const handleAddToCartClick = () => {
    if (!canBuy) return;
    const finalTitle = selectedVariant ? `${product.title} - ${selectedVariant.name}` : product.title;
    onAddToCart({
      ...product,
      id: selectedVariant ? `${product.id}-${selectedVariant.name}` : product.id,
      title: finalTitle, price: displayPrice, imageUrl: mainImage 
    }, quantity);
    alert('已成功加入購物車！');
  };

  // === 圖片 Hover 放大鏡移動邏輯 ===
  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    // 計算游標在圖片上的 X 與 Y 軸百分比
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setHoverPos({ x, y });
  };

  // === 全螢幕 Lightbox 左右切換邏輯 ===
  const currentImageIndex = imagesArray.indexOf(mainImage);
  
  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const prevIndex = (currentImageIndex - 1 + imagesArray.length) % imagesArray.length;
    setMainImage(imagesArray[prevIndex]);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIndex = (currentImageIndex + 1) % imagesArray.length;
    setMainImage(imagesArray[nextIndex]);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10 pb-20 relative">
      
      {/* === 全螢幕圖片檢視 (含左右箭頭) === */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* 頂部計數器 */}
          <div className="absolute top-6 font-bold text-white tracking-widest">
            {currentImageIndex + 1} / {imagesArray.length}
          </div>

          <button className="absolute top-6 right-8 text-white text-4xl font-light hover:text-red-500 transition-colors z-50 drop-shadow-md">&times;</button>
          
          {/* 左箭頭 (大於1張圖才顯示) */}
          {imagesArray.length > 1 && (
            <button 
              onClick={handlePrevImage} 
              className="absolute left-6 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/30 text-white transition-colors border border-white/20 z-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
            </button>
          )}

          <img 
            src={mainImage} 
            alt={product.title} 
            className="max-w-full max-h-[90vh] object-contain select-none cursor-default"
            onClick={(e) => e.stopPropagation()} 
          />

          {/* 右箭頭 (大於1張圖才顯示) */}
          {imagesArray.length > 1 && (
            <button 
              onClick={handleNextImage} 
              className="absolute right-6 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/30 text-white transition-colors border border-white/20 z-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
            </button>
          )}
        </div>
      )}

      {/* 階層式分類麵包屑 */}
      <div className="text-sm text-gray-500 mb-6 flex flex-wrap items-center gap-2">
        <Link to="/" className="hover:text-purple-700">Home</Link>
        {product.mainCategory && <><span className="text-gray-300">/</span><Link to={`/category/all?tag=${encodeURIComponent(product.mainCategory)}`} className="hover:text-purple-700 transition-colors">{product.mainCategory}</Link></>}
        {product.subCategory && <><span className="text-gray-300">/</span><Link to={`/category/all?tag=${encodeURIComponent(product.subCategory)}`} className="hover:text-purple-700 transition-colors">{product.subCategory}</Link></>}
        {product.subSubCategory && <><span className="text-gray-300">/</span><span className="text-gray-900 font-bold">{product.subSubCategory}</span></>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        
        {/* === 左側：圖片區 === */}
        <div className="flex flex-col space-y-4">
          
          {/* 主圖 (支援放大鏡 Hover 與點擊全螢幕) */}
          <div 
            onClick={() => setIsLightboxOpen(true)}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onMouseMove={handleImageMouseMove}
            className="border border-gray-200 rounded-lg overflow-hidden bg-white aspect-square relative flex justify-center items-center shadow-sm cursor-zoom-in group"
          >
            {product.isPreorder && <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded z-20">預訂</span>}
            
            <img 
              src={mainImage} 
              alt={product.title} 
              className={`object-contain w-full h-full p-2 transition-transform duration-200 ${isHovering ? 'scale-[2.5]' : 'scale-100'}`} 
              style={{
                transformOrigin: isHovering ? `${hoverPos.x}% ${hoverPos.y}%` : 'center center'
              }}
            />
          </div>
          
          {/* 小縮圖列表 */}
          {imagesArray.length > 1 && (
            <div className="flex space-x-3 overflow-x-auto pb-2">
              {imagesArray.map((img: string, idx: number) => (
                <div key={idx} onClick={() => setMainImage(img)} className={`w-24 h-24 flex-shrink-0 border-2 cursor-pointer rounded-lg overflow-hidden transition-all ${mainImage === img ? 'border-purple-600 shadow-sm' : 'border-gray-100 hover:border-purple-300'}`}>
                  <img src={img} className="object-cover w-full h-full" alt="thumb" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右側：商品資訊區 */}
        <div className="flex flex-col">
          {!canBuy && (
             <div className="text-red-500 font-bold mb-2 flex items-center text-sm bg-red-50 w-fit px-3 py-1 rounded-full border border-red-100">
               <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
               已售罄
             </div>
          )}

          <h1 className="text-2xl font-bold text-gray-900 mb-4 leading-snug">
            <span className={product.isPreorder ? "text-green-600 mr-2" : "text-purple-600 mr-2"}>
              {product.isPreorder ? '[預訂]' : '[現貨]'}
            </span>
            {product.title}
          </h1>

          <div className="text-sm text-gray-500 mb-6 space-y-3">
            <p className="mb-3">SKU: <span className="text-gray-700 font-mono">{product.sku || product.id}</span></p>
            
            <div className="flex items-start">
              <span className="whitespace-nowrap mr-2 mt-1 font-bold text-gray-600">分類:</span>
              <div className="flex flex-wrap gap-2">
                {[product.mainCategory, product.subCategory, product.subSubCategory]
                  .filter(Boolean)
                  .map((cat, idx) => (
                    <Link key={idx} to={`/category/all?tag=${encodeURIComponent(cat)}`} className="bg-blue-600 text-white px-2 py-0.5 text-xs font-medium rounded hover:bg-blue-700 transition-colors">
                      {cat}
                    </Link>
                ))}
                {(!product.mainCategory && !product.subCategory && !product.subSubCategory) && <span className="text-gray-400 mt-1 italic text-xs">無分類</span>}
              </div>
            </div>

            <div className="flex items-start">
              <span className="whitespace-nowrap mr-2 mt-1 font-bold text-gray-600">標籤:</span>
              <div className="flex flex-wrap gap-2">
                {product.tags && product.tags.length > 0 ? (
                  product.tags.map((tag: string, index: number) => (
                    <Link key={index} to={`/category/all?tag=${encodeURIComponent(tag)}`} className="bg-blue-600 text-white px-2 py-0.5 text-xs font-medium rounded hover:bg-blue-700 transition-colors">
                      {tag}
                    </Link>
                  ))
                ) : (
                  <span className="text-gray-400 mt-1 italic text-xs">無標籤</span>
                )}
              </div>
            </div>
          </div>

          <div className="mb-8 flex items-end space-x-2 border-b border-gray-100 pb-6">
            <span className="text-4xl font-black text-purple-700">HK${displayPrice}.00</span>
            <span className="text-gray-500 font-medium mb-1">{product.isPreorder ? '(訂金)' : '(全款)'}</span>
          </div>

          {product.variants && product.variants.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-700 mb-3">選擇規格：</h3>
              <div className="flex flex-wrap gap-3">
                {product.variants.map((variant: any, index: number) => {
                  const isVariantSelected = selectedVariant?.name === variant.name;
                  const isVariantOutOfStock = variant.stock <= 0;
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedVariant(variant)}
                      className={`px-5 py-2.5 text-sm rounded-lg border-2 transition-all duration-200 ${
                        isVariantSelected 
                          ? 'border-purple-600 text-purple-800 bg-purple-50 font-bold shadow-sm' 
                          : 'border-gray-200 text-gray-600 hover:border-purple-300 hover:bg-gray-50'
                      } ${isVariantOutOfStock ? 'opacity-50 bg-gray-50' : ''}`}
                    >
                      {isVariantOutOfStock ? <span className="line-through text-gray-400">-{variant.name}-</span> : variant.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <ul className="text-sm text-gray-600 space-y-2 mb-8 list-disc list-inside bg-gray-50 p-4 rounded-lg">
            {product.janCode && <li><span className="font-semibold text-gray-700">JAN Code:</span> {product.janCode}</li>}
            {product.fullPrice && <li><span className="font-semibold text-gray-700">日元定價:</span> ¥{product.fullPrice} yen連稅</li>}
            {product.price && <li><span className="font-semibold text-gray-700">訂價HKD:</span> ${product.price}</li>}
            {product.deposit && <li><span className="font-semibold text-gray-700">訂金HKD:</span> ${product.deposit}</li>}
            {product.releaseDate && <li><span className="font-semibold text-gray-700">預計到貨日:</span> {product.releaseDate}</li>}
            {product.cutoffDate && <li><span className="font-semibold text-gray-700">預訂截單日:</span> {product.cutoffDate}</li>}
            {product.brand && <li><span className="font-semibold text-gray-700">生產商:</span> {product.brand}</li>}
            {product.series && <li><span className="font-semibold text-gray-700">系列:</span> {product.series}</li>}
            {product.scale && <li><span className="font-semibold text-gray-700">比例:</span> {product.scale}</li>}
            {product.material && <li><span className="font-semibold text-gray-700">素材:</span> {product.material}</li>}
            {product.size && <li><span className="font-semibold text-gray-700">尺寸:</span> {product.size}</li>}
          </ul>

          <div className="mt-auto">
            {canBuy && (
              <div className="flex items-center text-green-600 text-sm font-bold mb-3">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                有庫存 <span className="text-gray-500 font-normal ml-2">(剩餘 {currentStock} 件)</span>
              </div>
            )}
            
            <div className="flex space-x-4 h-14 mt-2">
              <div className={`flex items-center border rounded-lg bg-white overflow-hidden ${canBuy ? 'border-gray-300' : 'border-gray-200 opacity-50'}`}>
                <button disabled={!canBuy} onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-5 text-gray-500 hover:bg-gray-100 h-full font-bold text-lg transition-colors">-</button>
                <span className="px-2 text-center w-12 font-bold text-gray-900">{quantity}</span>
                <button disabled={!canBuy || quantity >= currentStock} onClick={() => setQuantity(q => q + 1)} className="px-5 text-gray-500 hover:bg-gray-100 h-full font-bold text-lg transition-colors">+</button>
              </div>
              
              <button 
                onClick={handleAddToCartClick}
                disabled={!canBuy}
                className={`flex-1 font-bold rounded-lg flex items-center justify-center transition-colors text-lg shadow-sm ${
                  canBuy 
                    ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/30' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {canBuy ? (
                  <><svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>加入購物車</>
                ) : (
                  <><svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>缺貨</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};