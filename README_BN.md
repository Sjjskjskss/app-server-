# AURA FFX Dashboard (Firebase ছাড়া)

এটি Android ফোনের ব্রাউজার দিয়ে সেটআপ করার উপযোগী একটি ছোট Node.js অ্যাপ। HTML ফাইল আপলোড, নাম পরিবর্তন, ফাইল প্রতিস্থাপন, Delete এবং প্রতিটি প্রজেক্টের আলাদা path URL সমর্থন করে।

## গুরুত্বপূর্ণ সীমাবদ্ধতা
- প্রজেক্ট URL হবে `https://YOUR-SERVICE.onrender.com/p/project-name` — প্রতিটি প্রজেক্টের আলাদা URL path। আলাদা subdomain (যেমন `app.example.com`) চাইলে নিজের domain এবং DNS configuration লাগবে।
- Render Free-এর filesystem স্থায়ী নাও থাকতে পারে; redeploy/restart-এর পরে আপলোড করা ফাইল হারানোর ঝুঁকি আছে। স্থায়ী ব্যবহারের জন্য Render Persistent Disk (সাধারণত paid) বা S3-compatible object storage যুক্ত করুন।
- এটি কেবল একক HTML ফাইল আপলোড করে। HTML-এ থাকা CSS/JS inline থাকলে ভালো কাজ করবে; আলাদা ছবি/CSS/JS ফাইল বা ZIP project এখনো সমর্থিত নয়।
- Admin password অবশ্যই শক্তিশালী রাখুন। এই starter-এ basic password login আছে; public production service-এ HTTPS ব্যবহার করুন এবং নিয়মিত backup রাখুন।

## ফোন থেকে Render-এ চালানোর ধাপ
1. GitHub account খুলুন/লগইন করুন।
2. এই ZIP extract করে GitHub-এ `aura-ffx-dashboard` নামে repository তৈরি করুন এবং ZIP-এর ফাইলগুলো upload করুন।
3. Render.com-এ লগইন করে **New + → Web Service** নির্বাচন করুন এবং GitHub repository connect করুন।
4. Build Command: `npm install`; Start Command: `npm start`।
5. Environment Variables যোগ করুন:
   - `ADMIN_PASSWORD` = একটি শক্তিশালী নিজের password
   - `PUBLIC_BASE_URL` = Render থেকে পাওয়া সম্পূর্ণ URL, যেমন `https://aura-ffx-dashboard.onrender.com` (নিজের URL বসাবেন)
6. Deploy করুন। Render-এর URL খুলে password দিয়ে login করুন।

## লোকাল চালানো
Node.js 18+ ইনস্টল থাকা কম্পিউটারে:
```bash
npm install
ADMIN_PASSWORD='change-this-password' PUBLIC_BASE_URL='http://localhost:3000' npm start
```

## নিরাপত্তা
কোনো password বা API secret HTML/JavaScript-এ রাখবেন না। এই app-এ আপলোড করা HTML জনসাধারণ দেখতে পারবে; সংবেদনশীল তথ্য বা গোপন credentials HTML-এ রাখবেন না।
