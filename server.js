// ======================================================
// 🚀 QUARANTINE SYSTEM SERVER - UPGRADED SAFE VERSION
// ======================================================

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const app = express();

app.use(cors({
    origin: "*"
}));

app.use(express.json({ limit: "10mb" }));

// ======================================================
// 🔥 FIREBASE INIT
// ======================================================

const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ======================================================
// 🛡️ BASIC SECURITY MIDDLEWARE (LIGHT)
// ======================================================

app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    next();
});

// ======================================================
// 🟢 SERVER TEST
// ======================================================

app.get("/", (req, res) => {
    res.send("✅ Quarantine Backend Running (Upgraded)");
});

// ======================================================
// 🔹 GET BALANCES
// ======================================================

app.get("/get-balances/:officeCode", async (req, res) => {
    try {
        const { officeCode } = req.params;

        const doc = await db.collection("balances").doc(officeCode).get();

        if (!doc.exists) {
            return res.json({
                success: true,
                balances: {}
            });
        }

        res.json({
            success: true,
            balances: doc.data()
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// ======================================================
// 🔹 SAVE INITIAL BALANCES
// ======================================================

app.post("/save-balances", async (req, res) => {
    try {
        const { officeCode, balances } = req.body;

        if (!officeCode) {
            return res.status(400).json({
                success: false,
                message: "officeCode required"
            });
        }

        await db.collection("balances")
            .doc(officeCode)
            .set(balances, { merge: true });

        res.json({ success: true });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// ======================================================
// 🔹 GET REPORT
// ======================================================

app.get("/get-report", async (req, res) => {
    try {
        const { officeCode, dateFrom, dateTo } = req.query;

        if (!officeCode || !dateFrom || !dateTo) {
            return res.status(400).json({
                success: false,
                message: "Missing params"
            });
        }

        const reportId = `${officeCode}_${dateFrom}_${dateTo}`;

        const doc = await db.collection("reports").doc(reportId).get();

        if (!doc.exists) {
            return res.json({
                success: false,
                exists: false
            });
        }

        const report = doc.data();

        const diffDays =
            (new Date() - new Date(dateTo)) /
            (1000 * 60 * 60 * 24);

        res.json({
            success: true,
            exists: true,
            canEdit: diffDays <= 3,
            report
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// ======================================================
// 🔹 SAVE / UPDATE REPORT
// (UNCHANGED LOGIC - SAFE)
// ======================================================

app.post("/save-report", async (req, res) => {
    try {

        const report = req.body;

        const { officeCode, officeName, dateFrom, dateTo } = report;

        if (!officeCode || !dateFrom || !dateTo) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
        }

        const reportId = `${officeCode}_${dateFrom}_${dateTo}`;

        const reportRef = db.collection("reports").doc(reportId);
        const balancesRef = db.collection("balances").doc(officeCode);

        const oldReportSnap = await reportRef.get();
        const balancesSnap = await balancesRef.get();

        let currentBalances = balancesSnap.exists ? balancesSnap.data() : {};

        // ================================
        // UPDATE MODE
        // ================================

        if (oldReportSnap.exists) {

            const oldReport = oldReportSnap.data();

            const diffDays =
                (new Date() - new Date(oldReport.dateTo)) /
                (1000 * 60 * 60 * 24);

            if (diffDays > 3) {
                return res.status(403).json({
                    success: false,
                    message: "انتهت مهلة تعديل هذا التقرير"
                });
            }

            await db.collection("auditLogs").add({
                action: "REPORT_UPDATED",
                officeCode,
                officeName,
                reportId,
                oldData: oldReport,
                newData: report,
                editedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            await reportRef.set({
                ...report,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                isEdited: true
            });

            return res.json({
                success: true,
                updated: true
            });
        }

        // ================================
        // CREATE MODE
        // ================================

        await reportRef.set({
            ...report,
            reportId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            isEdited: false
        });

        await db.collection("auditLogs").add({
            action: "REPORT_CREATED",
            officeCode,
            officeName,
            reportId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            data: report
        });

        res.json({
            success: true,
            created: true
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// ======================================================
// 🔹 GET AUDIT LOGS
// ======================================================

app.get("/audit-logs/:officeCode", async (req, res) => {
    try {

        const snap = await db.collection("auditLogs")
            .where("officeCode", "==", req.params.officeCode)
            .orderBy("createdAt", "desc")
            .limit(50)
            .get();

        const logs = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({ success: true, logs });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// ======================================================
// 🔐 LOGIN (UNCHANGED)
// ======================================================

app.post("/login", async (req, res) => {
    try {

        const { username, password } = req.body;

        const snap = await db.collection("users")
            .where("username", "==", username)
            .where("password", "==", password)
            .limit(1)
            .get();

        if (snap.empty) {
            return res.status(401).json({
                success: false,
                message: "بيانات الدخول غير صحيحة"
            });
        }

        const user = snap.docs[0].data();

        res.json({
            success: true,
            user
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// ======================================================
// 🏢 ADMIN OFFICES APIs (NEW)
// ======================================================

// GET ALL OFFICES
app.get("/get-all-offices", async (req, res) => {
    try {

        const snap = await db.collection("users")
            .where("role", "==", "office")
            .get();

        const offices = snap.docs.map(doc => ({
            id: doc.data().officeCode,
            ...doc.data()
        }));

        res.json({ success: true, offices });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ADD OFFICE
app.post("/add-office-account", async (req, res) => {
    try {

        const { officeName, username, password } = req.body;

        const officeCode = `OFF_${Date.now()}`;

        await db.collection("users").add({
            officeCode,
            officeName,
            username,
            password,
            role: "office",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// UPDATE OFFICE
app.post("/update-office-account", async (req, res) => {
    try {

        const { officeId, username, password } = req.body;

        const snap = await db.collection("users")
            .where("officeCode", "==", officeId)
            .limit(1)
            .get();

        if (snap.empty) {
            return res.status(404).json({ success: false });
        }

        const docId = snap.docs[0].id;

        await db.collection("users").doc(docId).update({
            username,
            password
        });

        res.json({ success: true });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE OFFICE
app.post("/delete-office-account", async (req, res) => {
    try {

        const { officeId } = req.body;

        const snap = await db.collection("users")
            .where("officeCode", "==", officeId)
            .limit(1)
            .get();

        if (snap.empty) {
            return res.status(404).json({ success: false });
        }

        await db.collection("users").doc(snap.docs[0].id).delete();

        res.json({ success: true });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ======================================================
// 🚀 START SERVER
// ======================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});