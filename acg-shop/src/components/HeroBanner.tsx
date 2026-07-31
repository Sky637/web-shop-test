// src/components/HeroBanner.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// 定義輪播圖的資料陣列 (可以隨時在這裡新增或修改活動)
const slides = [
  {
    id: 1,
    image: '/godzilla-banner.jpg',
    tag: 'LIMITED EDITION',
    title: '最新模型熱烈預訂中',
    desc: '從深海甦醒的王者、最強人造人、與傳說中的超級賽亞人，為你準備最齊全的收藏。',
    btnText: '立即預購',
    link: '/category/all?tag=模型'
  },
  {
    id: 2,
    image: '/ptcg_m3box.jpg',
    tag: 'NEW RELEASE',
    title: '寶可夢 TCG：最新擴充包',
    desc: '全新超級進化機制登場！立刻擴充你的牌組，實體門市現貨同步熱賣中。',
    btnText: '立刻搶購',
    link: '/category/all?tag=寶可夢集換式卡牌遊戲'
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?q=80&w=1920&auto=format&fit=crop',
    tag: 'ALLIANCE STUDIO',
    title: '線上輕鬆預訂，門市安心取貨',
    desc: '首創全通路無縫體驗！網店下單鎖定庫存，歡迎至觀塘實體門市取貨付尾款。',
    btnText: '查看所有預訂',
    link: '/category/all?tag=新品預訂'
  }
];

export const HeroBanner: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  useEffect(() => {
    if (isHovered) return;
    const slideInterval = setInterval(nextSlide, 5000);
    return () => clearInterval(slideInterval);
  }, [isHovered, currentIndex]);

  return (
    <div 
      className="w-full h-[500px] md:h-[600px] relative overflow-hidden bg-gray-900 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 輪播圖片與內容區塊 */}
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out flex items-center justify-center ${
            index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
          style={{
            backgroundImage: `url(${slide.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* 黑底半透明遮罩，讓文字更清楚 */}
          <div className="absolute inset-0 bg-black opacity-60"></div>
          
          {/* 文字與按鈕內容 */}
          <div className="text-center text-white relative z-20 p-6 transform transition-transform duration-700 translate-y-0">
            <span className="text-sm font-bold tracking-widest uppercase text-yellow-400 mb-3 block">
              {slide.tag}
            </span>
            <h2 className="text-4xl md:text-6xl font-black mb-4 tracking-tight drop-shadow-lg">
              {slide.title}
            </h2>
            <p className="text-lg md:text-xl font-light mb-8 max-w-2xl mx-auto text-gray-200 drop-shadow-md">
              {slide.desc}
            </p>
            <Link 
              to={slide.link}
              className="inline-block bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-10 rounded-full text-lg shadow-[0_0_20px_rgba(147,51,234,0.4)] transform hover:scale-105 transition-all duration-300"
            >
              {slide.btnText}
            </Link>
          </div>
        </div>
      ))}

      {/* 左箭頭按鈕 */}
      <button 
        onClick={prevSlide}
        className="absolute top-1/2 left-4 md:left-8 -translate-y-1/2 z-30 bg-black/30 hover:bg-black/60 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 focus:outline-none"
        aria-label="Previous slide"
      >
        <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
      </button>

      {/* 右箭頭按鈕 */}
      <button 
        onClick={nextSlide}
        className="absolute top-1/2 right-4 md:right-8 -translate-y-1/2 z-30 bg-black/30 hover:bg-black/60 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 focus:outline-none"
        aria-label="Next slide"
      >
        <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
      </button>

      {/* 底部導覽圓點 */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex space-x-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 md:w-4 md:h-4 rounded-full transition-all duration-300 focus:outline-none ${
              index === currentIndex 
                ? 'bg-purple-500 w-8 md:w-10'
                : 'bg-white/50 hover:bg-white/80'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};