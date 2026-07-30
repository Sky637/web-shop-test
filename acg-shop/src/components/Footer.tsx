// src/Footer.tsx

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-8">
          
          <div className="flex flex-col items-center md:items-start gap-3">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Alliance Studio" className="h-8 w-8 object-contain" />
              <span className="text-lg font-bold text-white tracking-wide">
                Alliance Studio
              </span>
            </div>
            <p className="text-sm text-gray-500 text-center md:text-left">
              專營各式動漫卡牌、模型與周邊。<br />
              線上預訂，門市取貨，全通路為您服務。
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-3">
            <h3 className="text-white font-semibold mb-1">聯絡我們</h3>
            <a 
              href="mailto:alliance.studio.hk@gmail.com" 
              className="text-sm hover:text-white transition flex items-center gap-2"
            >
              ✉️ alliance.studio.hk@gmail.com
            </a>
            <a 
              href="https://www.instagram.com/alliance.studio.hk/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm hover:text-white transition flex items-center gap-2"
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