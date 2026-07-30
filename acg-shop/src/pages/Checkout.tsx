// src/pages/Checkout.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, writeBatch, increment, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase'; 

interface CheckoutProps {
  cartItems: any[];
  currentUser: any;
  onClearCart: () => void;
}

// 1. 乖乖把 cartItems 接收進來，不要改名
export const Checkout: React.FC<CheckoutProps> = ({ cartItems, currentUser, onClearCart }) => {
  const navigate = useNavigate();
  // 2. 畫面計算使用 cartItems
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const [deliveryMethod, setDeliveryMethod] = useState('shipping');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const [availablePoints, setAvailablePoints] = useState(0);
  const [usePoints, setUsePoints] = useState(0);

  const shippingFee = deliveryMethod === 'shipping' ? 30 : 0;
  const maxDiscountAmount = Math.floor(subtotal * 0.1); 
  const pointsDiscountAmount = Math.floor(usePoints / 200); 
  const finalTotal = subtotal + shippingFee - pointsDiscountAmount;

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setAddress(userDoc.data().address || '');
          setPhone(userDoc.data().phone || '');
          setAvailablePoints(userDoc.data().points || 0);
        }
      }
    };
    fetchUserData();
  }, [currentUser]);

  useEffect(() => {
    if (cartItems.length === 0 && !loading) {
      navigate('/');
    }
  }, [cartItems.length, navigate, loading]);

  if (cartItems.length === 0) return null;

  const handlePointsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value) || 0;
    const maxAllowedPointsByDiscount = maxDiscountAmount * 200;
    const maxLimit = Math.min(availablePoints, maxAllowedPointsByDiscount);
    if (val > maxLimit) val = maxLimit;
    if (val < 0) val = 0;
    setUsePoints(val);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      setLoading(true);
      const batch = writeBatch(db);

      // 3. 在這裡把完整的 cartItems 拿來瘦身，產出專屬後端用的 cleanItems
      const cleanItems = cartItems.map((item: any) => ({
        id: item.id,
        productId: item.productId || item.id,
        title: item.title,
        price: item.price,
        quantity: item.quantity,
        imageUrl: item.imageUrl,
        variantName: item.variantName || null,
        isPreorder: item.isPreorder === true, // 確保繼承商品的預訂屬性
        allocatedQuantity: 0                  // 預設配貨數量為 0
      }));
      
      const newOrderRef = doc(collection(db, "orders"));
      const orderData = {
        orderId: newOrderRef.id,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        items: cleanItems, // 寫入資料庫用瘦身版的
        subtotal: subtotal,
        shippingFee: shippingFee,
        pointsUsed: usePoints,
        discountAmount: pointsDiscountAmount,
        totalAmount: finalTotal,
        status: "awaiting_payment", 
        deliveryMethod,
        shippingAddress: deliveryMethod === 'shipping' ? address : '門市自取',
        phone,
        createdAt: new Date().toISOString()
      };
      batch.set(newOrderRef, orderData);

      const productUpdates: { [key: string]: { variantName: string | null, quantity: number }[] } = {};

      for (const item of cleanItems) {
        let realProductId = item.id;
        let vName = null;

        if (item.id.includes('__')) {
          const parts = item.id.split('__');
          realProductId = parts[0];
          vName = parts[1];
        } else if (item.id.split('-').length > 2) {
          const parts = item.id.split('-');
          vName = parts.pop() || null;
          realProductId = parts.join('-');
        }

        if (!productUpdates[realProductId]) {
          productUpdates[realProductId] = [];
        }
        productUpdates[realProductId].push({ variantName: vName, quantity: item.quantity });
      }

      for (const productId of Object.keys(productUpdates)) {
        const productRef = doc(db, "products", productId);
        const pSnap = await getDoc(productRef);

        if (pSnap.exists()) {
          const pData = pSnap.data();
          let updatedVariants = pData.variants ? [...pData.variants] : [];
          let normalStockDeduct = 0;
          let hasVariantUpdate = false;

          for (const updateReq of productUpdates[productId]) {
            if (updateReq.variantName && pData.variants) {
              updatedVariants = updatedVariants.map((v: any) => {
                if (v.name === updateReq.variantName) {
                  return { ...v, stock: Math.max(0, v.stock - updateReq.quantity) };
                }
                return v;
              });
              hasVariantUpdate = true;
            } else {
              normalStockDeduct += updateReq.quantity;
            }
          }

          const updatePayload: any = {};
          if (hasVariantUpdate) {
            updatePayload.variants = updatedVariants;
          }
          if (normalStockDeduct > 0) {
            updatePayload.stockQuantity = increment(-normalStockDeduct); 
          }

          if (Object.keys(updatePayload).length > 0) {
            batch.update(productRef, updatePayload);
          }
        }
      }

      if (usePoints > 0) {
        const userRef = doc(db, "users", currentUser.uid);
        batch.update(userRef, { points: increment(-usePoints) });

        const logRef = doc(collection(db, "pointsLogs"));
        batch.set(logRef, {
          userId: currentUser.uid,
          amount: -usePoints,
          reason: `訂單 #${newOrderRef.id} 結帳折抵`,
          createdAt: new Date().toISOString()
        });
      }

      await batch.commit();

      const createCheckout = httpsCallable(functions, 'createStripeCheckout');
      
      const result = await createCheckout({ 
        cartItems: cleanItems, // 送給 Stripe 也用瘦身版的
        orderId: newOrderRef.id,
        shippingFee: shippingFee,
        discountAmount: pointsDiscountAmount 
      });
      
      const data = result.data as { url: string };

      if (data.url) {
        onClearCart();
        window.location.href = data.url;
      }

    } catch (error) {
      console.error("結帳失敗:", error);
      alert("結帳發生錯誤，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10 pb-20">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 border-b pb-4">結帳</h1>
      
      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
            <h2 className="text-xl font-bold text-gray-800">1. 送貨方式</h2>
            <div className="flex space-x-4">
              <label className={`flex-1 border rounded-lg p-4 cursor-pointer flex flex-col items-center ${deliveryMethod === 'shipping' ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600'}`}>
                <input type="radio" name="delivery" value="shipping" checked={deliveryMethod === 'shipping'} onChange={() => setDeliveryMethod('shipping')} className="hidden" />
                <span className="font-bold mb-1">📦 標準送貨 (+HK$30)</span>
              </label>
              <label className={`flex-1 border rounded-lg p-4 cursor-pointer flex flex-col items-center ${deliveryMethod === 'pickup' ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600'}`}>
                <input type="radio" name="delivery" value="pickup" checked={deliveryMethod === 'pickup'} onChange={() => setDeliveryMethod('pickup')} className="hidden" />
                <span className="font-bold mb-1">🏪 門市自取 (免運)</span>
              </label>
            </div>

            <h2 className="text-xl font-bold text-gray-800 pt-4 border-t">2. 聯絡資料</h2>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">聯絡電話</label>
              <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
            </div>

            {deliveryMethod === 'shipping' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">送貨地址</label>
                <textarea required value={address} onChange={(e) => setAddress(e.target.value)} rows={3} className="w-full px-4 py-2 border rounded-lg" />
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-purple-200">
             <h2 className="text-lg font-bold text-purple-800 mb-2">💎 使用會員積分</h2>
             <p className="text-sm text-gray-600 mb-4">
               您目前擁有 <span className="font-bold text-purple-600">{availablePoints}</span> 積分。<br/>
               (每 200 積分可折抵 HK$1，最高可折抵此訂單 10%: HK${maxDiscountAmount})
             </p>
             <div className="flex items-center space-x-2">
               <input 
                 type="number" 
                 value={usePoints || ''} 
                 onChange={handlePointsChange}
                 placeholder="0"
                 className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500"
               />
               <span className="text-sm text-gray-500">積分</span>
             </div>
             {pointsDiscountAmount > 0 && (
               <div className="text-sm text-green-600 font-bold mt-2">
                 ✅ 將折抵 HK${pointsDiscountAmount}
               </div>
             )}
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 h-fit space-y-4">
          <h2 className="text-xl font-bold text-gray-800 border-b pb-2">訂單摘要</h2>
          
          <div className="max-h-60 overflow-y-auto space-y-3">
            {cartItems.map(item => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-3">
                  <img src={item.imageUrl} alt={item.title} className="w-12 h-12 object-contain bg-white border rounded" />
                  <div>
                    <p className="font-medium text-gray-800 line-clamp-1">{item.title}</p>
                    <p className="text-gray-500">數量: {item.quantity}</p>
                  </div>
                </div>
                <div className="font-bold text-gray-900">HK${item.price * item.quantity}</div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-2 text-sm text-gray-600">
            <div className="flex justify-between"><span>商品小計</span><span>HK${subtotal}.00</span></div>
            <div className="flex justify-between"><span>運費</span><span>HK${shippingFee}.00</span></div>
            {pointsDiscountAmount > 0 && (
              <div className="flex justify-between text-green-600 font-bold">
                <span>積分折抵</span><span>-HK${pointsDiscountAmount}.00</span>
              </div>
            )}
          </div>

          <div className="border-t pt-4 flex justify-between font-black text-2xl text-gray-900">
            <span>總計金額</span>
            <span className="text-purple-700">HK${finalTotal}.00</span>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white font-bold py-4 rounded-lg shadow-lg transition-colors mt-6 text-lg">
            {loading ? '處理中...' : '確認並送出訂單'}
          </button>
        </div>
      </form>
    </div>
  );
};