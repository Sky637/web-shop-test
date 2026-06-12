// src/HeroBanner.tsx
import React from 'react';

export const HeroBanner: React.FC = () => {
  return (
    <div 
      className="w-full h-[500px] bg-gray-900 flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: 'url(/godzilla-banner.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black opacity-50 z-0"></div>
      <div className="text-center text-white relative z-10 p-6">
        <span className="text-sm font-bold tracking-widest uppercase text-yellow-400 mb-2 block">
          LIMITED EDITION
        </span>
        <h2 className="text-5xl md:text-6xl font-black mb-4 tracking-tight">
          最新模型熱烈預訂中
        </h2>
        <p className="text-xl md:text-2xl font-light mb-8 max-w-2xl mx-auto">
          從深海甦醒的王者、最強人造人、與傳說中的超級賽亞人，為你準備最齊全的收藏。
        </p>
        <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-full text-lg shadow-xl transform hover:scale-105 transition-all">
          立即預購
        </button>
      </div>
    </div>
  );
};