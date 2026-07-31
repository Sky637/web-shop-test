// src/App.tsx
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth'; 
import { auth, db } from './firebase'; 
import { Navbar } from './components/Navbar';
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
import Footer from './components/Footer'; 
import { PreorderNotice } from './pages/PreorderNotice';
import { ReturnPolicy } from './pages/ReturnPolicy';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { AdminUsers } from './pages/AdminUsers';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';

function App() {
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

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

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

  const handleAddToCart = (product: any, quantity: number = 1) => {
    setCartItems(prevItems => {
      const existing = prevItems.find(item => item.id === product.id);
      const currentQty = existing ? existing.quantity : 0;

      let maxStock = product.stockQuantity || 0;
      if (product.variantName && product.variants) {
        const variant = product.variants.find((v: any) => v.name === product.variantName);
        if (variant && variant.stock !== undefined) {
          maxStock = variant.stock;
        }
      } else if (product.stock !== undefined) {
         maxStock = product.stock; 
      }

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
        ...product, 
        id: product.id, 
        title: product.title, 
        price: cartPrice, 
        quantity: quantity, 
        imageUrl: cartImageUrl 
      }];
    });
  };

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
      <div className="min-h-screen flex flex-col bg-gray-50 relative">
        <Navbar cartItems={cartItems} currentUser={currentUser} isAdmin={isAdmin} />

        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home onAddToCart={handleAddToCart} />} />
            <Route path="/category/:categoryId" element={<Category onAddToCart={handleAddToCart} />} />
            <Route path="/product/:productId" element={<ProductDetail onAddToCart={handleAddToCart} />} />
            <Route path="/cart" element={<Cart cartItems={cartItems} onUpdateQuantity={handleUpdateQuantity} onRemoveItem={handleRemoveItem} />} />
            
            <Route path="/preorder-notice" element={<PreorderNotice />} />
            <Route path="/return-policy" element={<ReturnPolicy />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            
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
                <Route path="users" element={<AdminUsers />} />
              </Route>
            </Route>
          </Routes>
        </main>

        <Footer />

        <FloatingWhatsApp />
        
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