// src/pages/AdminProducts.tsx
import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // 匯入 Storage 相關 API
import { db, storage } from '../firebase'; // 引入 storage
import { logAdminAction } from '../utils/logger';

export const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 表單核心狀態
  const [sku, setSku] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [janCode, setJanCode] = useState(0);
  const [stockQuantity, setStockQuantity] = useState(10);
  const [brand, setBrand] = useState('');
  const [series, setSeries] = useState('');
  const [scale, setScale] = useState('');
  const [material, setMaterial] = useState('');
  const [size, setSize] = useState('');
  const [isPreorder, setIsPreorder] = useState(false);
  const [inStock, setInStock] = useState(true);
  
  // 階層分類狀態
  const [mainCategory, setMainCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [subSubCategory, setSubSubCategory] = useState('');

  // 標籤、圖片與規格狀態
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [imagesInput, setImagesInput] = useState('');
  const [variantsInput, setVariantsInput] = useState('');
  
  // 控制上傳中狀態
  const [uploadingImage, setUploadingImage] = useState(false);

  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const fetchAllProducts = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "products"));
      setProducts(querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchTags = async () => {
    const docSnap = await getDoc(doc(db, 'settings', 'store'));
    if (docSnap.exists() && docSnap.data().tags) {
      setAvailableTags(docSnap.data().tags);
    }
  };

  useEffect(() => { 
    fetchAllProducts(); 
    fetchTags();
  }, []);

  // ==========================================
  // 圖片上傳到 Firebase Storage
  // ==========================================
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      const newUrls: string[] = [];
      
      // 支援一次選取多張圖片上傳
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // 建立唯一檔案名稱 (避免檔名重複互相覆蓋)
        const uniqueFileName = `${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `products/${uniqueFileName}`);
        
        // 1. 將實體檔案上傳至 Firebase Storage
        const snapshot = await uploadBytes(storageRef, file);
        // 2. 取得公開可讀取的專屬網址
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        newUrls.push(downloadURL);
      }

      // 將取得的新網址，附加到原本的圖片陣列字串後面
      setImagesInput(prev => {
        const currentImages = prev.trim();
        return currentImages ? `${currentImages}, ${newUrls.join(', ')}` : newUrls.join(', ');
      });
      
      alert("✅ 圖片上傳成功！");
    } catch (error) {
      console.error("上傳失敗:", error);
      alert("❌ 圖片上傳失敗。請確認你的 Firebase Storage 規則是否允許寫入。");
    } finally {
      setUploadingImage(false);
      // 清空 input 讓下次可以選同樣檔名的照片
      e.target.value = ''; 
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku) return alert("請務必輸入 SKU 作為文件 ID");
    try {
      const imagesArray = imagesInput.split(',').map(i => i.trim()).filter(Boolean);
      
      // 解析 名稱:價格:庫存:子SKU
      const variantsArray = variantsInput.split(',').map((v, index) => {
        const parts = v.split(':');
        const name = parts[0]?.trim();
        const variantPrice = Number(parts[1]?.trim());
        const variantStock = parts.length > 2 ? Number(parts[2]?.trim()) : Number(stockQuantity);
        const variantSku = parts.length > 3 && parts[3]?.trim() !== '' ? parts[3]?.trim() : `${sku}-V${index + 1}`;
        
        return name && !isNaN(variantPrice) 
          ? { name, price: variantPrice, stock: variantStock, sku: variantSku } 
          : null;
      }).filter(Boolean);

      const productRef = doc(db, "products", sku);

      // ==========================================
      // 狀態比對 (決定是否寫入 Log)
      // ==========================================
      const oldSnap = await getDoc(productRef);
      let actionType = '新增';
      let detailsStr = '上架了全新商品';
      let shouldLog = true;

      if (oldSnap.exists()) {
        const oldData = oldSnap.data();
        actionType = '修改';
        const changes: string[] = [];

        // 1. 檢查價格是否變動
        if (oldData.price !== Number(price)) {
          changes.push(`價格: ${oldData.price} -> ${price}`);
        }
        
        // 2. 檢查總庫存是否被手動覆寫
        if (oldData.stockQuantity !== Number(stockQuantity)) {
          changes.push(`庫存: ${oldData.stockQuantity} -> ${stockQuantity}`);
        }
        
        // 3. 檢查是否從預訂轉為現貨
        if (oldData.isPreorder !== isPreorder) {
          changes.push(`預訂狀態改為: ${isPreorder}`);
        }

        if (changes.length > 0) {
          detailsStr = `更新關鍵數值：${changes.join(', ')}`;
        } else {
          shouldLog = false;
        }
      }

      // ==========================================
      // 執行實際的資料庫覆寫
      // ==========================================
      await setDoc(productRef, {
        sku, title, price: Number(price), deposit: Number(deposit),
        janCode, brand, series, scale, material, size,
        stockQuantity: Number(stockQuantity), isPreorder, inStock,
        mainCategory, subCategory, subSubCategory,
        tags: selectedTags,
        images: imagesArray.length > 0 ? imagesArray : ["https://via.placeholder.com/300"],
        variants: variantsArray,
        isVisible: true
      }, { merge: true });

      if (shouldLog) {
        await logAdminAction(actionType, '商品', sku, detailsStr);
      }

      alert("🎉 商品儲存成功！");
      setSku(''); setTitle(''); setJanCode(0); setPrice(0); setDeposit(0); setStockQuantity(0);
      setBrand(''); setSeries(''); setScale(''); setMaterial(''); setSize(''); 
      setMainCategory(''); setSubCategory(''); setSubSubCategory('');
      setSelectedTags([]); setImagesInput(''); setVariantsInput('');
      fetchAllProducts();
    } catch (err) { 
      console.error(err);
      alert("儲存失敗"); 
    }
  };

  const handleToggleVisibility = async (id: string, currentVisible: boolean = true) => {
    if (!window.confirm(`確定要將此商品${currentVisible ? '隱藏 (下架)' : '重新顯示 (上架)'}嗎？`)) return;
    await updateDoc(doc(db, "products", id), { isVisible: !currentVisible });
    await logAdminAction(currentVisible ? '下架' : '重新上架', '商品', id);
    fetchAllProducts();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="bg-gray-950 p-6 rounded-xl border border-gray-800 h-fit space-y-4">
        <h2 className="text-md font-bold text-white border-b border-gray-800 pb-2">📦 商品上架 / 編輯</h2>
        <form onSubmit={handleSaveProduct} className="space-y-3 text-sm">
          
          <div>
            <label className="block text-gray-400 mb-1 font-bold">商品 SKU</label>
            <input type="text" required value={sku} onChange={e => setSku(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" />
          </div>
          <div>
            <label className="block text-gray-400 mb-1 font-bold">商品名稱</label>
            <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" />
          </div>

          <div className="p-3 bg-gray-900 border border-gray-700 rounded-lg space-y-3">
            <h3 className="text-purple-400 font-bold border-b border-gray-700 pb-1">🗂️ 導覽分類</h3>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-gray-400 mb-1 text-xs">主分類</label>
                <input type="text" value={mainCategory} onChange={e => setMainCategory(e.target.value)} placeholder="例: 桌遊卡牌" className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1.5 text-white text-xs" />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">次分類</label>
                <input type="text" value={subCategory} onChange={e => setSubCategory(e.target.value)} placeholder="例: 遊戲分類" className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1.5 text-white text-xs" />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">子分類</label>
                <input type="text" value={subSubCategory} onChange={e => setSubSubCategory(e.target.value)} placeholder="例: 寶可夢" className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1.5 text-white text-xs" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 mb-1 font-bold">全款預設價 (HKD)</label>
              <input type="number" required value={price || ''} onChange={e => setPrice(Number(e.target.value))} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-gray-400 mb-1 font-bold">總庫存 (無規格時使用)</label>
              <input type="number" required value={stockQuantity} onChange={e => setStockQuantity(Number(e.target.value))} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 mb-1 font-bold">預訂訂金 (HKD)</label>
              <input type="number" required value={deposit || ''} onChange={e => setDeposit(Number(e.target.value))} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-gray-400 mb-1 font-bold">JAN Code</label>
              <input type="number" value={janCode || ''} onChange={e => setJanCode(Number(e.target.value))} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div>
                <label className="block text-gray-400 mb-1 font-bold">生產商</label>
                <input type="text" value={brand} onChange={e => setBrand(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" />
             </div>
             <div>
                <label className="block text-gray-400 mb-1 font-bold">系列</label>
                <input type="text" value={series} onChange={e => setSeries(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div>
                <label className="block text-gray-400 mb-1 font-bold">比例</label>
                <input type="text" value={scale} onChange={e => setScale(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" />
             </div>
             <div>
                <label className="block text-gray-400 mb-1 font-bold">素材</label>
                <input type="text" value={material} onChange={e => setMaterial(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" />
             </div>
          </div>

          <div>
             <label className="block text-gray-400 mb-1 font-bold">尺寸</label>
             <input type="text" value={size} onChange={e => setSize(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" />
          </div>

          <div className="flex space-x-6 py-2">
            <label className="flex items-center space-x-2 cursor-pointer text-gray-400">
              <input type="checkbox" checked={isPreorder} onChange={e => setIsPreorder(e.target.checked)} /> <span>標記為【預訂】</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer text-gray-400">
              <input type="checkbox" checked={inStock} onChange={e => setInStock(e.target.checked)} /> <span>上架有庫存</span>
            </label>
          </div>

          <div>
            <label className="block text-gray-400 mb-2 font-bold">產品標籤 (可複選)</label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <label key={tag} className={`px-2 py-1 border rounded text-xs cursor-pointer ${selectedTags.includes(tag) ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400'}`}>
                  <input type="checkbox" className="hidden" checked={selectedTags.includes(tag)} onChange={() => handleTagToggle(tag)} />
                  {tag}
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-purple-400 mb-1 font-bold">商品多種規格 (名稱:價格:庫存:專屬SKU)</label>
            <p className="text-xs text-gray-500 mb-1">格式：單包:20:50:PTC-01-1P, 原盒:600:0:PTC-01-BOX (逗號分開)</p>
            <input type="text" value={variantsInput} onChange={e => setVariantsInput(e.target.value)} placeholder="例如: 單包:20:50:SKU-01, 原盒:600:0:SKU-02" className="w-full bg-gray-900 border border-purple-900/50 rounded px-3 py-2 text-white text-xs" />
          </div>

          {/* 專屬圖片上傳區塊 */}
          <div className="p-3 bg-gray-900 border border-gray-700 rounded-lg space-y-2">
             <label className="block text-gray-400 font-bold">圖片路徑陣列 (可手動輸入，或直接上傳)</label>
             <p className="text-xs text-gray-500">上傳會自動存入雲端，並將網址加入下方輸入框中 (支援多選)。</p>
             
             <div className="flex gap-2">
               <input 
                 type="text" 
                 value={imagesInput} 
                 onChange={e => setImagesInput(e.target.value)} 
                 className="flex-1 bg-gray-950 border border-gray-700 rounded px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500" 
                 placeholder="https://..."
               />
               <label className={`flex-shrink-0 flex items-center justify-center px-4 py-2 rounded text-xs font-bold cursor-pointer transition-colors ${uploadingImage ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
                 {uploadingImage ? '上傳中...' : '⬆️ 選擇圖片上傳'}
                 <input 
                   type="file" 
                   multiple 
                   accept="image/*" 
                   onChange={handleImageUpload} 
                   className="hidden" 
                   disabled={uploadingImage} 
                 />
               </label>
             </div>
          </div>

          <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded mt-4">確認發佈至雲端</button>
        </form>
      </div>

      <div className="lg:col-span-2 bg-gray-950 p-6 rounded-xl border border-gray-800">
        <h2 className="text-md font-bold text-white border-b border-gray-800 pb-2 mb-4">📦 線上商品清單</h2>
        {loading ? <div className="text-center py-10 animate-pulse text-purple-400">同步中...</div> : (
          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2">
            {products.map(p => (
              <div key={p.id} className={`border p-4 rounded-lg flex justify-between items-center text-sm ${p.isVisible !== false ? 'bg-gray-900 border-gray-800' : 'bg-gray-950 border-red-900/50 opacity-60'}`}>
                <div className="flex items-center space-x-4">
                  <img src={p.images?.[0] || p.imageUrl || "https://via.placeholder.com/150"} className="w-14 h-14 object-contain bg-white rounded border border-gray-700" alt="" />
                  <div>
                    <h3 className="text-white font-bold text-base">
                      {p.isVisible === false && <span className="text-red-500 mr-2">[已隱藏]</span>}
                      {p.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      SKU: <span className="text-yellow-400 font-bold mr-3">{p.id}</span>
                      分類: <span className="text-gray-300">{p.mainCategory} &gt; {p.subCategory}</span>
                    </p>
                    {p.variants && p.variants.length > 0 && (
                      <p className="text-xs text-purple-400 mt-1 truncate max-w-xs">
                        規格: {p.variants.map((v:any) => `${v.name}($${v.price})`).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => {
                    setSku(p.id); setTitle(p.title); setPrice(p.price); setDeposit(p.deposit || 0);
                    setJanCode(p.janCode || 0); setBrand(p.brand || ''); setSeries(p.series || '');
                    setScale(p.scale || ''); setMaterial(p.material || ''); setSize(p.size || '');
                    setMainCategory(p.mainCategory || ''); setSubCategory(p.subCategory || ''); setSubSubCategory(p.subSubCategory || '');
                    setStockQuantity(p.stockQuantity || 0); setIsPreorder(!!p.isPreorder); setInStock(!!p.inStock);
                    setSelectedTags(p.tags || []); setImagesInput(p.images?.join(', ') || '');
                    setVariantsInput(p.variants?.map((v:any) => `${v.name}:${v.price}:${v.stock ?? p.stockQuantity}:${v.sku || ''}`).join(', ') || '');
                  }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold rounded">修改</button>
                  
                  <button onClick={() => handleToggleVisibility(p.id, p.isVisible)} className={`${p.isVisible !== false ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white px-4 py-2 text-xs font-bold rounded transition-colors`}>
                    {p.isVisible !== false ? '隱藏(下架)' : '重新上架'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};