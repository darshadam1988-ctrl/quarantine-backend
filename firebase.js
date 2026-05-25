const admin = require("firebase-admin");

// نستخدم Buffer لفك تشفير المفتاح إذا كان مشفراً بـ Base64
// أو نتركه كما هو إذا كان نصاً عادياً، الكود سيكتشف ذلك
const getPrivateKey = () => {
  const pk = process.env.FIREBASE_PRIVATE_KEY || '';
  // إذا كان المفتاح يبدأ بـ BEGIN، فهو نصي، وإلا فهو مشفر بـ Base64
  if (pk.includes('BEGIN')) {
    return pk.replace(/\\n/g, '\n');
  }
  return Buffer.from(pk, 'base64').toString('ascii');
};

admin.initializeApp({
  credential: admin.credential.cert({
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: getPrivateKey(), 
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
  })
});

module.exports = admin.firestore();
