// src/utils/logger.ts
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore'; // 🚀 新增 doc, getDoc
import { db, auth } from '../firebase'; 

export const logAdminAction = async (
  action: string,
  targetType: string,
  targetId: string,
  details: string = ""
) => {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.email) return;

  try {
    const settingsRef = doc(db, 'settings', 'store');
    const settingsSnap = await getDoc(settingsRef);
    
    if (settingsSnap.exists() && settingsSnap.data().enableAuditLog === false) {
      return; 
    }

    await addDoc(collection(db, "admin_logs"), {
      adminEmail: currentUser.email,
      action,
      targetType,
      targetId,
      details,
      createdAt: serverTimestamp() 
    });
  } catch (error) {
    console.error("寫入操作日誌失敗:", error);
  }
};