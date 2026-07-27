# 🏪 ACG Shop - 全通路 O2O 零售系統 (Omnichannel Retail System)

ACG Shop 是一套專為動漫卡牌零售店打造的 O2O (Online To Offline) 全通路解決方案。系統完美整合了「線上 Web 網店」與「實體店 Android POS 機」，實現庫存、會員點數、歷史訂單的零時差雲端同步。

## ✨ 核心亮點 (Key Features)

### 📱 實體店 POS 系統 (Android)
* **全通路訂單管理：** 支援即時讀取網店下單的預訂品，並提供實體店「收取尾款」結案功能。
* **智慧條碼掃描：** 支援實體條碼槍，遇到多規格商品（如：單包 / 原盒）會自動彈出視覺化選擇視窗。
* **預訂品分流：** 自動判別現貨與預訂品，預訂品結帳時自動切換為只收「訂金 (Deposit)」。
* **雙引擎會員載入：** 支援條碼掃描 (UID) 與電話號碼搜尋，快速載入會員資料。
* **嚴格防呆結帳：** 內建會員積分折抵安全鎖（200積分=HK$1，單筆最高折抵上限 10%），輸入錯誤時自動鎖死結帳按鈕。

### 🌐 線上網店 (Web Frontend)
* **雲端購物車：** 支援 Stripe API 信用卡安全結帳。
* **即時庫存：** 庫存與實體店共用 Firebase 數據庫，實體店售出即時扣減網店庫存，防止超賣。

## 🛠️ 技術棧 (Tech Stack)

* **實體店端 (POS):** Android, Kotlin, Jetpack Compose, MVVM Architecture, StateFlow
* **線上店端 (Web):** React / TypeScript (依實際情況修改)
* **雲端後端 (Backend):** Firebase Firestore (NoSQL)
* **雲端函式 (Serverless):** Firebase Cloud Functions (Node.js 20), Stripe API 
* **代管服務 (Hosting):** Firebase Hosting / Vercel (依實際情況修改)

---

## 📂 系統架構與資料庫設計 (Database Schema)

系統採用 Firestore NoSQL 資料庫，核心 Collections 包含：

* `products`: 包含一般現貨、預訂品 (`isPreorder`)、訂金設定 (`deposit`) 與多規格陣列 (`variants`)。
* `users`: 記錄會員基礎資料與總積分 (`points`)。
* `orders`: 記錄全通路訂單，透過 `source` 欄位區分 `pos_physical_store` 與 `web_store`。
* `pointsLogs`: 會員點數變動日誌，確保每一筆點數增減皆有跡可循。

---

## 🚀 本地端開發與啟動指南 (Getting Started)

### 1. 先決條件 (Prerequisites)
* [Node.js](https://nodejs.org/) (強烈建議使用 v20 LTS，以確保 Firebase Functions 模擬器相容性)
* [Android Studio](https://developer.android.com/studio)
* Firebase CLI (`npm install -g firebase-tools`)

### 2. 啟動 Firebase 雲端函式 (Stripe 結帳服務)
若要測試網店信用卡結帳，需在本地啟動後端模擬器：
```bash
cd functions
npm install
npm run build
firebase emulators:start --only functions
