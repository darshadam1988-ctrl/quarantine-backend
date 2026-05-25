const admin = require("firebase-admin");

// طباعة للتأكد أن المتغيرات تصل
console.log("Checking environment variables...");
// تم تعديل الأسماء هنا لتطابق ما هو موجود في Railway لديك
console.log("Project ID exists:", !!process.env.project_id);
console.log("Private Key exists:", !!process.env.private_key);

// التعديل هنا: البحث عن الأسماء الصحيحة التي تستخدمها أنت في Railway
if (!process.env.project_id || !process.env.private_key) {
  console.error("ERROR: Missing Firebase environment variables!");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({
    project_id: process.env.project_id,
    private_key_id: process.env.private_key_id,
    // مع الحفاظ على الـ replace كما هي
    private_key: (process.env.private_key || "").replace(/\\n/g, '\n'),
    client_email: process.env.client_email,
    client_id: process.env.client_id,
    auth_uri: process.env.auth_uri,
    token_uri: process.env.token_uri,
    auth_provider_x509_cert_url: process.env.auth_provider_x509_cert_url,
    client_x509_cert_url: process.env.client_x509_cert_url,
    universe_domain: "googleapis.com"
  })
});

const db = admin.firestore();
module.exports = db;