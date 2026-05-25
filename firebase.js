const admin = require("firebase-admin");

// طباعة للتأكد أن المتغيرات تصل
console.log("Checking environment variables...");
console.log("Project ID exists:", !!process.env.FIREBASE_PROJECT_ID);
console.log("Private Key exists:", !!process.env.FIREBASE_PRIVATE_KEY);

if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY) {
  console.error("ERROR: Missing Firebase environment variables!");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    // التعديل: التأكد أننا نتعامل مع نص قبل الـ replace
    private_key: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    universe_domain: "googleapis.com"
  })
});

const db = admin.firestore();
module.exports = db;