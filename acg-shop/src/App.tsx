// src/App.tsx
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth'; 
import { auth, db } from './firebase'; 
import { Navbar } from './Navbar';
import { Home } from './pages/Home';
import { Category } from './pages/Category';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Login } from './pages/Login'; 
import { Account } from './pages/Account';
import { AccountLayout } from './pages/AccountLayout';
import { Orders } from './pages/Orders';
import { Points } from './pages/Points';
import { AccountBarcode } from './pages/AccountBarcode';
import { AccountPassword } from './pages/AccountPassword';
import { Checkout } from './pages/Checkout';
import { OrderDetail } from './pages/OrderDetail';
import { AdminRoute } from './AdminRoute';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminOverview } from './pages/AdminOverview';
import { AdminProducts } from './pages/AdminProducts';
import { AdminOrders } from './pages/AdminOrders';
import { AdminTags } from './pages/AdminTags';
import { doc, getDoc } from 'firebase/firestore';

function App() {
  // 1. 購物車狀態與 LocalStorage 同步
  const [cartItems, setCartItems] = useState<any[]>(() => {
    const savedCart = localStorage.getItem('TEST_CART');
    if (savedCart) {
      try {
        return JSON.parse(savedCart);
      } catch (e) {
        return []; 
      }
    }
    return []; 
  });

  useEffect(() => {
    localStorage.setItem('TEST_CART', JSON.stringify(cartItems));
  }, [cartItems]);

  // === 新增：全局黃色警告提示 (Toast) 狀態 ===
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 設定 3 秒後自動關閉提示
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);
  // ===========================================

  // 2. 統整：會員身分與權限狀態 (移除原本重複的寫法)
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists() && userDoc.data().role === 'admin') {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch (error) {
          console.error("權限讀取失敗", error);
          setIsAdmin(false);
        }
      } else {
        setCurrentUser(null);
        setIsAdmin(false); 
      }
      setAuthLoading(false); 
    });

    return () => unsubscribe();
  }, []);

  // 3. 升級版：加入購物車 (嚴格檢查庫存)
  const handleAddToCart = (product: any, quantity: number = 1) => {
    setCartItems(prevItems => {
      const existing = prevItems.find(item => item.id === product.id);
      const currentQty = existing ? existing.quantity : 0;

      // 計算這個商品的真實最大庫存
      let maxStock = product.stockQuantity || 0;
      if (product.variantName && product.variants) {
        const variant = product.variants.find((v: any) => v.name === product.variantName);
        if (variant && variant.stock !== undefined) {
          maxStock = variant.stock;
        }
      } else if (product.stock !== undefined) {
         maxStock = product.stock; 
      }

      // 【防呆攔截】如果超過庫存，跳出警告並拒絕加入
      if (currentQty + quantity > maxStock) {
        setToastMessage(`！ 商品「${product.title}」超出限購數量 (剩餘: ${maxStock})，請調整後再試`);
        return prevItems; 
      }

      if (existing) {
        return prevItems.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      
      const cartImageUrl = product.imageUrl || (product.images && product.images.length > 0 ? product.images[0] : "https://via.placeholder.com/150");
      const cartPrice = product.isPreorder ? product.deposit : product.price;
      
      return [...prevItems, { 
        ...product, // 保留 productId 等規格隱藏資訊
        id: product.id, 
        title: product.title, 
        price: cartPrice, 
        quantity: quantity, 
        imageUrl: cartImageUrl 
      }];
    });
  };

  // 4. 升級版：更改購物車數量 (嚴格檢查庫存)
  const handleUpdateQuantity = (id: string, newQty: number) => {
    setCartItems(prev => {
      const itemToUpdate = prev.find(item => item.id === id);
      if (!itemToUpdate) return prev;

      let maxStock = itemToUpdate.stockQuantity || 0;
      if (itemToUpdate.variantName && itemToUpdate.variants) {
        const variant = itemToUpdate.variants.find((v: any) => v.name === itemToUpdate.variantName);
        if (variant && variant.stock !== undefined) maxStock = variant.stock;
      } else if (itemToUpdate.stock !== undefined) {
         maxStock = itemToUpdate.stock;
      }

      // 【防呆攔截】如果按 + 號超過庫存，跳出警告並拒絕更新
      if (newQty > maxStock) {
        setToastMessage(`！ 商品「${itemToUpdate.title}」超出限購數量 (剩餘: ${maxStock})，請調整後再試`);
        return prev;
      }

      if (newQty < 1) return prev;

      return prev.map(item => item.id === id ? { ...item, quantity: newQty } : item);
    });
  };

  const handleRemoveItem = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl font-bold text-purple-600 animate-pulse">驗證身分中...</div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 relative">
        <Navbar cartItems={cartItems} currentUser={currentUser} isAdmin={isAdmin} />

        <Routes>
          <Route path="/" element={<Home onAddToCart={handleAddToCart} />} />
          <Route path="/category/:categoryId" element={<Category onAddToCart={handleAddToCart} />} />
          <Route path="/product/:productId" element={<ProductDetail onAddToCart={handleAddToCart} />} />
          <Route path="/cart" element={<Cart cartItems={cartItems} onUpdateQuantity={handleUpdateQuantity} onRemoveItem={handleRemoveItem} />} />
          <Route path="/account" element={<AccountLayout currentUser={currentUser} />}>
            <Route index element={<Account currentUser={currentUser} />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:orderId" element={<OrderDetail />} />
            <Route path="points" element={<Points />} />
            <Route path="barcode" element={<AccountBarcode />} />
            <Route path="password" element={<AccountPassword />} />
          </Route>
          <Route 
            path="/checkout" 
            element={<Checkout cartItems={cartItems} currentUser={currentUser} onClearCart={handleClearCart} />} 
          />
          <Route path="/login" element={<Login />} />
          
          <Route element={<AdminRoute currentUser={currentUser} />}>
            <Route path="/admin" element={<AdminDashboard currentUser={currentUser}/>}>
              <Route index element={<AdminOverview />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="tags" element={<AdminTags />} />
            </Route>
          </Route>
        </Routes>

        {/* === 完美復刻：黃色防呆警告提示框 (Toast) === */}
        {toastMessage && (
          <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-yellow-900 px-6 py-3 rounded shadow-2xl z-[9999] font-bold flex items-center animate-bounce border border-yellow-500">
            <span className="mr-3 font-black text-xl">!</span>
            <span className="text-sm tracking-wide">{toastMessage}</span>
            <button 
              onClick={() => setToastMessage(null)} 
              className="ml-6 text-yellow-700 hover:text-yellow-900 text-xl leading-none font-light"
            >
              &times;
            </button>
          </div>
        )}

      </div>
    </Router>
  );
}

export default App;