const admin = require("firebase-admin");

// نقرأ البيانات من المتغير السري الذي وضعناه في Render
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
module.exports = db;