// src/pages/AdminTags.tsx
import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const AdminTags: React.FC = () => {
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(true);

  // 從 Firestore 讀取標籤庫
  const fetchTags = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'settings', 'store');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().tags) {
        setTags(docSnap.data().tags);
      }
    } catch (error) {
      console.error("讀取標籤失敗:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  // 新增標籤
  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const tag = newTag.trim();
    if (!tag) return;
    if (tags.includes(tag)) return alert("此標籤已經存在囉！");

    const updatedTags = [...tags, tag];
    
    try {
      await setDoc(doc(db, 'settings', 'store'), { tags: updatedTags }, { merge: true });
      setTags(updatedTags);
      setNewTag('');
    } catch (error) {
      alert("儲存標籤失敗！");
    }
  };

  // 刪除標籤
  const handleRemoveTag = async (tagToRemove: string) => {
    if (!window.confirm(`確定要刪除「${tagToRemove}」標籤嗎？（這不會刪除商品，但前台標籤列將不再顯示它）`)) return;
    
    const updatedTags = tags.filter(t => t !== tagToRemove);
    try {
      await setDoc(doc(db, 'settings', 'store'), { tags: updatedTags }, { merge: true });
      setTags(updatedTags);
    } catch (error) {
      alert("刪除標籤失敗！");
    }
  };

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl p-6">
      <div className="border-b border-gray-800 pb-4 mb-6">
        <h2 className="text-xl font-bold text-white mb-2">🏷️ 全站標籤管理庫</h2>
        <p className="text-gray-400 text-sm">在此新增或刪除的標籤，將會同步更新到「商品上架頁」與「前台商品分類側邊欄」。</p>
      </div>

      {/* 新增標籤表單 */}
      <form onSubmit={handleAddTag} className="flex space-x-3 mb-8">
        <input 
          type="text" 
          value={newTag} 
          onChange={(e) => setNewTag(e.target.value)} 
          placeholder="輸入新標籤名稱 (例: MEGAHouse)" 
          className="bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2 flex-1 focus:outline-none focus:border-purple-500"
        />
        <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2 rounded-lg transition-colors">
          ＋ 新增標籤
        </button>
      </form>

      {/* 標籤列表網格 (仿照你的截圖) */}
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
        <h3 className="text-gray-400 font-bold mb-4 text-sm">目前已建立的標籤 ({tags.length})</h3>
        {loading ? (
          <div className="text-purple-500 animate-pulse font-bold">載入中...</div>
        ) : tags.length === 0 ? (
          <div className="text-gray-500 text-sm">目前沒有任何標籤，請在上方新增。</div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {tags.map((tag, idx) => (
              <div key={idx} className="group flex items-center bg-gray-950 border border-purple-900/50 rounded-lg overflow-hidden transition-all hover:border-purple-500">
                <span className="px-3 py-1.5 text-sm text-purple-100">{tag}</span>
                <button 
                  onClick={() => handleRemoveTag(tag)}
                  className="bg-red-900/30 text-red-400 hover:bg-red-600 hover:text-white px-2.5 py-1.5 transition-colors font-bold text-xs"
                  title="刪除此標籤"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};