// src/components/Footer.tsx
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          
          {/* 1. 品牌資訊 */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Alliance Studio" className="h-8 w-8 object-contain" />
              <span className="text-lg font-bold text-white tracking-wide">
                Alliance Studio
              </span>
            </div>
            <p className="text-sm text-gray-500">
              專營各式動漫卡牌、模型與周邊。<br />
              線上預訂，門市取貨，全通路為您服務。
            </p>
          </div>

          {/* 2. 客戶服務 */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <h3 className="text-white font-semibold mb-1">客戶服務</h3>
            <Link 
              to="/preorder-notice" 
              className="text-sm text-gray-400 hover:text-white transition"
            >
              購買前須知
            </Link>
            <Link 
              to="/return-policy" 
              className="text-sm text-gray-400 hover:text-white transition"
            >
              退換貨政策
            </Link>
            <Link 
              to="/privacy-policy" 
              className="text-sm text-gray-400 hover:text-white transition"
            >
              隱私權政策
            </Link>
          </div>

          {/* 3. 聯絡我們 */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <h3 className="text-white font-semibold mb-1">聯絡我們</h3>
            <a 
              href="mailto:alliance.studio.hk@gmail.com" 
              className="text-sm text-gray-400 hover:text-white transition flex items-center gap-2"
            >
              ✉️ alliance.studio.hk@gmail.com
            </a>
            <a 
              href="https://www.instagram.com/alliance.studio.hk/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-white transition flex items-center gap-2"
            >
              📸 @alliance.studio.hk
            </a>
          </div>
          
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-xs text-gray-600">
          © {new Date().getFullYear()} Alliance Studio. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;