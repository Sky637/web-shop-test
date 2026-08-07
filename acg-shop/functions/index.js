// functions/index.js
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

// 初始化 Firebase Admin，取得修改資料庫的最高權限
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const stripe = require("stripe")("process.env.STRIPE_SECRET_KEY".trim());

// =======================================================
// 1. 建立 Stripe 結帳網址 API (支援全新結帳與繼續付款)
// =======================================================
exports.createStripeCheckout = onCall(async (request) => {
  try {
    const cartItems = request.data.cartItems;
    const shippingFee = request.data.shippingFee || 0;
    const orderId = request.data.orderId;
    const discountAmount = request.data.discountAmount || 0;

    if (!cartItems) throw new HttpsError("invalid-argument", "沒有購物車資料");

    const line_items = cartItems.map((item) => {
      const isValidUrl = item.imageUrl && item.imageUrl.startsWith("http");
      const productData = { name: item.title };
      if (isValidUrl) { productData.images = [item.imageUrl]; }

      return {
        price_data: {
          currency: "hkd", 
          product_data: productData,
          unit_amount: Math.round(item.price * 100), 
        },
        quantity: item.quantity,
      };
    });

    // 加入運費 (若有)
    if (shippingFee > 0) {
      line_items.push({
        price_data: {
          currency: "hkd",
          product_data: { name: "📦 標準送貨 (Shipping Fee)" },
          unit_amount: Math.round(shippingFee * 100),
        },
        quantity: 1,
      });
    }

    const sessionConfig = {
      payment_method_types: ["card"],
      mode: "payment",
      line_items: line_items,
      // 付款成功跳轉回訂單詳情，並帶上成功參數讓前端雷達捕捉
      success_url: `http://localhost:5173/account/orders/${orderId}?payment=success`,
      // 取消付款則跳回該訂單詳情頁面，讓客人可以按「繼續付款」
      cancel_url: `http://localhost:5173/account/orders/${orderId}?payment=cancelled`,
    };

    // 💎 如果有積分折扣，叫 Stripe 產生一張「一次性優惠券」
    if (discountAmount > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(discountAmount * 100),
        currency: "hkd",
        duration: "once",
        name: "💎 會員積分折抵",
      });
      sessionConfig.discounts = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    return { url: session.url };
    
  } catch (error) {
    console.error("❌ Stripe 結帳發生錯誤：", error);
    throw new HttpsError("internal", error.message);
  }
});

// =======================================================
// 2. 背景排程：自動取消逾期未付款訂單、歸還積分與庫存
// =======================================================
exports.autoCancelUnpaidOrders = onSchedule("every 15 minutes", async (event) => {
  try {
    // 找出 30 分鐘前的時間點
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    // 搜尋狀態為 awaiting_payment 且建立時間超過 30 分鐘的訂單
    const snapshot = await db.collection("orders")
      .where("status", "==", "awaiting_payment")
      .where("createdAt", "<", thirtyMinsAgo)
      .get();

    if (snapshot.empty) {
      console.log("✅ 沒有需要取消的過期訂單。");
      return;
    }

    const batch = db.batch();

    for (const docSnapshot of snapshot.docs) {
      const order = docSnapshot.data();
      
      // 1. 將訂單狀態改為已取消
      batch.update(docSnapshot.ref, { 
        status: "cancelled",
        cancelReason: "逾時 30 分鐘未付款，系統自動取消"
      });

      // 2. 歸還客人使用的積分 (如果有)
      if (order.pointsUsed && order.pointsUsed > 0 && order.userId) {
        const userRef = db.collection("users").doc(order.userId);
        batch.update(userRef, { points: admin.firestore.FieldValue.increment(order.pointsUsed) });

        // 寫入退還積分日誌
        const logRef = db.collection("pointsLogs").doc();
        batch.set(logRef, {
          userId: order.userId,
          amount: order.pointsUsed,
          reason: `逾時未付款，系統自動取消訂單 #${order.orderId || docSnapshot.id} 退還積分`,
          createdAt: new Date().toISOString()
        });
      }

      // 3. 釋放庫存 (把當初扣掉的加回去)
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          const productRef = db.collection("products").doc(item.productId);
          const productSnap = await productRef.get();
          
          if (productSnap.exists) {
             const pData = productSnap.data();
             
             if (item.variantName && pData.variants) {
               // 處理多規格庫存歸還
               const updatedVariants = pData.variants.map(v => {
                 if (v.name === item.variantName) {
                   return { ...v, stock: v.stock + item.quantity };
                 }
                 return v;
               });
               batch.update(productRef, { variants: updatedVariants });
             } else {
               // 處理單一商品庫存歸還
               batch.update(productRef, { stockQuantity: admin.firestore.FieldValue.increment(item.quantity) });
             }
          }
        }
      }
      console.log(`🗑️ 已自動取消訂單: ${docSnapshot.id}`);
    }

    await batch.commit();
    console.log(`🎉 自動取消任務執行完畢！共處理 ${snapshot.size} 筆訂單。`);

  } catch (error) {
    console.error("執行自動取消過期訂單時發生錯誤:", error);
  }
});

// =======================================================
// 3. 大貨到港自動配貨系統 (預訂品先進先出 FCFS)
// =======================================================
exports.allocatePreorderStock = onCall(async (request) => {
  const { productId, arrivedQuantity } = request.data;
  if (!productId || arrivedQuantity <= 0) {
    throw new HttpsError("invalid-argument", "參數錯誤：缺少商品ID或到貨數量小於1");
  }

  try {
    let remainingStock = arrivedQuantity; 
    const batch = db.batch();

    // 嚴格按照下單時間由舊到新排序 (先進先出)
    const snapshot = await db.collection("orders")
      .where("status", "in", ["preorder_hold", "partially_shipped"])
      .orderBy("createdAt", "asc")
      .get();

    if (snapshot.empty) return { message: "目前沒有需要配貨的預訂單！" };

    let processedOrdersCount = 0;

    for (const docSnap of snapshot.docs) {
      if (remainingStock <= 0) break; 

      const orderData = docSnap.data();
      let orderUpdated = false;
      
      const updatedItems = orderData.items.map((item) => {
        // 如果是目標商品、是預訂品，且還沒配滿
        if (item.productId === productId && item.isPreorder && item.allocatedQuantity < item.quantity) {
          const neededQuantity = item.quantity - item.allocatedQuantity; 
          const giveQuantity = Math.min(neededQuantity, remainingStock);
          
          item.allocatedQuantity += giveQuantity; 
          remainingStock -= giveQuantity;         
          orderUpdated = true;
        }
        return item;
      });

      if (orderUpdated) {
        processedOrdersCount++;
        // 檢查是否整張單的所有預訂品都配滿了
        const isAllAllocated = updatedItems.every(item => !item.isPreorder || item.allocatedQuantity === item.quantity);
        
        const updatePayload = { items: updatedItems };
        if (isAllAllocated) {
          updatePayload.status = "pending"; // 全部配滿，升級為待發貨處理中
        }
        batch.update(docSnap.ref, updatePayload);
      }
    }

    await batch.commit();
    return {
      success: true,
      message: `配貨完成！共處理 ${processedOrdersCount} 筆訂單，該商品剩餘無主庫存 ${remainingStock} 件。`
    };

  } catch (error) {
    console.error("配貨演算法出錯:", error);
    throw new HttpsError("internal", error.message);
  }
});

// =======================================================
// 4. 排程任務：每個月底清理 90 天前的舊日誌並備份至 Storage
// =======================================================
exports.archiveAndDeleteOldLogs = onSchedule({
  schedule: "0 0 1 * *",          // Cron 語法：每月 1 號 00:00 執行
  timeZone: "Asia/Hong_Kong"      // 設定為香港時區
}, async (event) => {
  try {
    const bucket = admin.storage().bucket(); // 獲取預設的 Storage Bucket

    // 1. 計算 90 天前的時間戳記
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    console.log(`開始執行清理任務：尋找 ${ninetyDaysAgo.toISOString()} 之前的日誌...`);

    // 2. 查詢舊日誌
    const logsRef = db.collection('admin_logs');
    const snapshot = await logsRef.where('createdAt', '<=', ninetyDaysAgo).get();

    if (snapshot.empty) {
      console.log('✅ 沒有超過 90 天的舊日誌需要清理。');
      return;
    }

    // 3. 準備備份資料 (轉為 JSON 陣列)
    const deletedLogs = [];
    snapshot.forEach(doc => {
      deletedLogs.push({ id: doc.id, ...doc.data() });
    });

    // 4. 建立備份檔案並上傳到 Firebase Storage 的 archived_logs 資料夾
    const fileData = JSON.stringify(deletedLogs, null, 2);
    const timestampStr = new Date().toISOString().split('T')[0]; // 例如: 2026-08-01
    const fileName = `archived_logs/admin_logs_backup_${timestampStr}.json`;
    const file = bucket.file(fileName);

    await file.save(fileData, {
      metadata: { contentType: 'application/json' }
    });
    
    console.log(`📦 已成功將 ${snapshot.size} 筆日誌備份至 Storage: ${fileName}`);

    // 5. 分批刪除 Firestore 上的紀錄 (Firestore batch 限制每次 500 筆)
    const batches = [];
    let currentBatch = db.batch();
    let currentCount = 0;

    snapshot.docs.forEach((doc) => {
      currentBatch.delete(doc.ref);
      currentCount++;
      
      // 滿 500 筆就推入一個 Commit 任務，並開啟新的 Batch
      if (currentCount === 500) {
        batches.push(currentBatch.commit());
        currentBatch = db.batch();
        currentCount = 0;
      }
    });
    
    // 送出剩餘的未滿 500 筆的 batch
    if (currentCount > 0) {
      batches.push(currentBatch.commit());
    }

    // 等待所有刪除任務完成
    await Promise.all(batches);
    console.log('🗑️ 舊日誌已成功從 Firestore 徹底刪除！');

  } catch (error) {
    console.error('❌ 清理或備份日誌時發生錯誤:', error);
  }
});