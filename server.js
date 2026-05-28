// ======================================================
// 🚀 QUARANTINE SYSTEM SERVER - PRO VERSION
// ======================================================

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const app = express();

app.use(cors());
app.use(express.json());

// ======================================================
// 🔥 FIREBASE INIT
// ======================================================

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ======================================================
// 🟢 SERVER TEST
// ======================================================

app.get("/", (req, res) => {
    res.send("✅ Quarantine Backend Running");
});

// ======================================================
// 🔹 GET BALANCES
// ======================================================

app.get("/get-balances/:officeCode", async (req, res) => {
    try {
        const { officeCode } = req.params;

        const doc = await db
            .collection("balances")
            .doc(officeCode)
            .get();

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
        console.error(err);

        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// ======================================================
// 🔹 SAVE INITIAL BALANCES (ADMIN)
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

        await db
            .collection("balances")
            .doc(officeCode)
            .set(balances, { merge: true });

        res.json({
            success: true
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// ======================================================
// 🔹 GET REPORT BY PERIOD
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

        const doc = await db
            .collection("reports")
            .doc(reportId)
            .get();

        if (!doc.exists) {
            return res.json({
                success: false,
                exists: false
            });
        }

        const report = doc.data();

        // ======================================================
        // 🔒 CHECK EDIT DEADLINE
        // ======================================================

        const endDate = new Date(dateTo);
        const now = new Date();

        const diffTime = now - endDate;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        const canEdit = diffDays <= 3;

        res.json({
            success: true,
            exists: true,
            canEdit,
            report
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// ======================================================
// 🔹 SAVE OR UPDATE REPORT
// ======================================================

app.post("/save-report", async (req, res) => {

    try {

        const report = req.body;

        const {
            officeCode,
            officeName,
            dateFrom,
            dateTo
        } = report;

        if (!officeCode || !dateFrom || !dateTo) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
        }

        // ======================================================
        // 📌 REPORT ID
        // ======================================================

        const reportId =
            `${officeCode}_${dateFrom}_${dateTo}`;

        const reportRef =
            db.collection("reports").doc(reportId);

        const balancesRef =
            db.collection("balances").doc(officeCode);

        // ======================================================
        // 🔍 CHECK IF REPORT EXISTS
        // ======================================================

        const oldReportSnap = await reportRef.get();

        const balancesSnap = await balancesRef.get();

        let currentBalances = {};

        if (balancesSnap.exists) {
            currentBalances = balancesSnap.data();
        }

        // ======================================================
        // 🔄 UPDATE MODE
        // ======================================================

        if (oldReportSnap.exists) {

            const oldReport = oldReportSnap.data();

            // ======================================================
            // 🔒 EDIT DEADLINE
            // ======================================================

            const endDate = new Date(oldReport.dateTo);
            const now = new Date();

            const diffDays =
                (now - endDate) /
                (1000 * 60 * 60 * 24);

            if (diffDays > 3) {
                return res.status(403).json({
                    success: false,
                    message:
                        "انتهت مهلة تعديل هذا التقرير"
                });
            }

            // ======================================================
            // 🧠 RECALCULATE BALANCES
            // ======================================================

            const newBalances = {

                yellowBalance:
                    (currentBalances.yellowBalance || 0)
                    + (oldReport.yellowEgyptians || 0)
                    + (oldReport.yellowForeigners || 0)
                    - (report.yellowEgyptians || 0)
                    - (report.yellowForeigners || 0),

                choleraBalance:
                    (currentBalances.choleraBalance || 0)
                    + (oldReport.choleraDose1 || 0)
                    + (oldReport.choleraDose2 || 0)
                    - (report.choleraDose1 || 0)
                    - (report.choleraDose2 || 0),

                solkBalance:
                    (currentBalances.solkBalance || 0)
                    + (oldReport.solkUsed || 0)
                    - (report.solkUsed || 0),

                pasteurBalance:
                    (currentBalances.pasteurBalance || 0)
                    + (
                        (oldReport.pasteurHajj || 0)
                        + (oldReport.pasteurForeignHajj || 0)
                        + (oldReport.pasteurOmrah || 0)
                        + (oldReport.pasteurTravelers || 0)
                    )
                    - (
                        (report.pasteurHajj || 0)
                        + (report.pasteurForeignHajj || 0)
                        + (report.pasteurOmrah || 0)
                        + (report.pasteurTravelers || 0)
                    ),

                pfizerBalance:
                    (currentBalances.pfizerBalance || 0)
                    + (
                        (oldReport.pfizerHajj || 0)
                        + (oldReport.pfizerForeignHajj || 0)
                        + (oldReport.pfizerOmrah || 0)
                        + (oldReport.pfizerTravelers || 0)
                    )
                    - (
                        (report.pfizerHajj || 0)
                        + (report.pfizerForeignHajj || 0)
                        + (report.pfizerOmrah || 0)
                        + (report.pfizerTravelers || 0)
                    ),

                dualBalance:
                    (currentBalances.dualBalance || 0)
                    + (oldReport.dualUsed || 0)
                    - (report.dualUsed || 0),

                fluBalance:
                    (currentBalances.fluBalance || 0)
                    + (
                        (oldReport.fluHajj || 0)
                        + (oldReport.fluTravelers || 0)
                        + (oldReport.fluCitizens || 0)
                    )
                    - (
                        (report.fluHajj || 0)
                        + (report.fluTravelers || 0)
                        + (report.fluCitizens || 0)
                    ),

                hepBalance:
                    (currentBalances.hepBalance || 0)
                    + (oldReport.hepEgyptians || 0)
                    + (oldReport.hepForeigners || 0)
                    - (report.hepEgyptians || 0)
                    - (report.hepForeigners || 0),
            };

            // ======================================================
            // 🚫 PREVENT NEGATIVE
            // ======================================================

            for (const key in newBalances) {

                if (newBalances[key] < 0) {

                    return res.status(400).json({
                        success: false,
                        message:
                            `رصيد سالب في ${key}`
                    });
                }
            }

            // ======================================================
            // 💾 SAVE NEW BALANCES
            // ======================================================

            await balancesRef.set(newBalances);

            // ======================================================
            // 📝 AUDIT LOG
            // ======================================================

            await db.collection("auditLogs").add({

                action: "REPORT_UPDATED",

                officeCode,

                officeName,

                reportId,

                oldData: oldReport,

                newData: report,

                editedAt:
                    admin.firestore.FieldValue.serverTimestamp()
            });

            // ======================================================
            // 💾 UPDATE REPORT
            // ======================================================

            await reportRef.set({

                ...report,

                updatedAt:
                    admin.firestore.FieldValue.serverTimestamp(),

                isEdited: true
            });

            return res.json({
                success: true,
                updated: true,
                message:
                    "تم تعديل التقرير بنجاح"
            });
        }

        // ======================================================
        // 🆕 NEW REPORT
        // ======================================================

        const newBalances = {

            yellowBalance:
                (currentBalances.yellowBalance || 0)
                + (report.yellowIncoming || 0)
                - (
                    (report.yellowEgyptians || 0)
                    + (report.yellowForeigners || 0)
                ),

            choleraBalance:
                (currentBalances.choleraBalance || 0)
                + (report.choleraIncoming || 0)
                - (
                    (report.choleraDose1 || 0)
                    + (report.choleraDose2 || 0)
                ),

            solkBalance:
                (currentBalances.solkBalance || 0)
                + (report.solkIncoming || 0)
                - (report.solkUsed || 0),

            pasteurBalance:
                (currentBalances.pasteurBalance || 0)
                + (report.pasteurIncoming || 0)
                - (
                    (report.pasteurHajj || 0)
                    + (report.pasteurForeignHajj || 0)
                    + (report.pasteurOmrah || 0)
                    + (report.pasteurTravelers || 0)
                ),

            pfizerBalance:
                (currentBalances.pfizerBalance || 0)
                + (report.pfizerIncoming || 0)
                - (
                    (report.pfizerHajj || 0)
                    + (report.pfizerForeignHajj || 0)
                    + (report.pfizerOmrah || 0)
                    + (report.pfizerTravelers || 0)
                ),

            dualBalance:
                (currentBalances.dualBalance || 0)
                + (report.dualIncoming || 0)
                - (report.dualUsed || 0),

            fluBalance:
                (currentBalances.fluBalance || 0)
                + (report.fluIncoming || 0)
                - (
                    (report.fluHajj || 0)
                    + (report.fluTravelers || 0)
                    + (report.fluCitizens || 0)
                ),

            hepBalance:
                (currentBalances.hepBalance || 0)
                + (report.hepIncoming || 0)
                - (
                    (report.hepEgyptians || 0)
                    + (report.hepForeigners || 0)
                ),
        };

        // ======================================================
        // 🚫 NEGATIVE CHECK
        // ======================================================

        for (const key in newBalances) {

            if (newBalances[key] < 0) {

                return res.status(400).json({
                    success: false,
                    message:
                        `رصيد سالب في ${key}`
                });
            }
        }

        // ======================================================
        // 💾 SAVE BALANCES
        // ======================================================

        await balancesRef.set(newBalances);

        // ======================================================
        // 💾 SAVE REPORT
        // ======================================================

        await reportRef.set({

            ...report,

            reportId,

            createdAt:
                admin.firestore.FieldValue.serverTimestamp(),

            isEdited: false,

            openingBalances: currentBalances
        });

        // ======================================================
        // 📝 AUDIT LOG
        // ======================================================

        await db.collection("auditLogs").add({

            action: "REPORT_CREATED",

            officeCode,

            officeName,

            reportId,

            createdAt:
                admin.firestore.FieldValue.serverTimestamp(),

            data: report
        });

        res.json({
            success: true,
            created: true,
            message:
                "تم حفظ التقرير بنجاح"
        });

    } catch (err) {

        console.error(err);

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

        const { officeCode } = req.params;

        const snap = await db
            .collection("auditLogs")
            .where("officeCode", "==", officeCode)
            .orderBy("createdAt", "desc")
            .limit(50)
            .get();

        const logs = [];

        snap.forEach(doc => {
            logs.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.json({
            success: true,
            logs
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// ======================================================
// 🚀 START SERVER
// ======================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});