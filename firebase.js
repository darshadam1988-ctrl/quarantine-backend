const admin = require("firebase-admin");

// دالة لجلب المتغيرات والتأكد من وجودها
const getEnv = (key) => {
  if (!process.env[key]) {
    console.error(`Missing environment variable: ${key}`);
  }
  return process.env[key] || "";
};

const privateKey = getEnv("FIREBASE_PRIVATE_KEY")
  ? getEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, '\n').replace(/"/g, '')
  : '';

admin.initializeApp({
  credential: admin.credential.cert({
    project_id: getEnv("FIREBASE_PROJECT_ID"),
    private_key_id: getEnv("FIREBASE_PRIVATE_KEY_ID"),
    private_key: privateKey,
    client_email: getEnv("FIREBASE_CLIENT_EMAIL"),
    client_id: getEnv("FIREBASE_CLIENT_ID"),
    auth_uri: getEnv("FIREBASE_AUTH_URI"),
    token_uri: getEnv("FIREBASE_TOKEN_URI"),
    auth_provider_x509_cert_url: getEnv("FIREBASE_AUTH_PROVIDER_X509_CERT_URL"),
    client_x509_cert_url: getEnv("FIREBASE_CLIENT_X509_CERT_URL")
  })
});

module.exports = admin.firestore();
