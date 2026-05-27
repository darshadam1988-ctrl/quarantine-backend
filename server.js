```js
const express = require("express");
const cors = require("cors");
const db = require("./firebase");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* =========================================================
   HELPERS
========================================================= */

function safeNumber(v) {
    return Number(v) || 0;
}

function calculateReport(report) {

    // =========================
    // YELLOW
    // =========================

    const yellowUsed =
        safeNumber(report.yellowEgyptians) +
        safeNumber(report.yellowForeigners);

    report.yellowRemaining =
        safeNumber(report.yellowBalance) +
        safeNumber(report.yellowIncoming) -
        yellowUsed;

    // =========================
    // CHOLERA
    // =========================

    const choleraUsed =
        safeNumber(report.choleraDose1) +
        safeNumber(report.choleraDose2);

    report.choleraRemaining =
        safeNumber(report.choleraBalance) +
        safeNumber(report.choleraIncoming) -
        choleraUsed;

    // =========================
    // SOLK
    // =========================

    report.solkRemaining =
        safeNumber(report.solkBalance) +
        safeNumber(report.solkIncoming) -
        safeNumber(report.solkUsed);

    // =========================
    // PASTEUR
    // =========================

    const pasteurUsed =
        safeNumber(report.pasteurHajj) +
        safeNumber(report.pasteurForeignHajj) +
        safeNumber(report.pasteurOmrah) +
        safeNumber(report.pasteurTravelers);

    report.pasteurRemaining =
        safeNumber(report.pasteurBalance) +
        safeNumber(report.pasteurIncoming) -
        pasteurUsed;

    // =========================
    // PFIZER
    // =========================

    const pfizerUsed =
        safeNumber(report.pfizerHajj) +
        safeNumber(report.pfizerForeignHajj) +
        safeNumber(report.pfizerOmrah) +
        safeNumber(report.pfizerTravelers);

    report.pfizerRemaining =
        safeNumber(report.pfizerBalance) +
        safeNumber(report.pfizerIncoming) -
        pfizerUsed;

    // =========================
    // DUAL
    // =========================

    report.dualRemaining =
        safeNumber(report.dualBalance) +
        safeNumber(report.dualIncoming) -
        safeNumber(report.dualUsed);

    // =========================
    // FLU
    // =========================

    const fluUsed =
        safeNumber(report.fluHajj) +
        safeNumber(report.fluTravelers) +
        safeNumber(report.fluCitizens);

    report.fluRemaining =
        safeNumber(report.fluBalance) +
        safeNumber(report.fluIncoming) -
        fluUsed;

    // =========================
    // HEP
    // =========================

    const hepUsed =
        safeNumber(report.hepEgyptians) +
        safeNumber(report.hepForeigners);

    report.hepRemaining =
        safeNumber(report.hepBalance) +
        safeNumber(report.hepIncoming) -
        hepUsed;

    return report;
}

function applyPreviousBalances(report, previousReport) {

    if (!previousReport) return report;

    report.yellowBalance =
        safeNumber(previousReport.yellowRemaining);

    report.choleraBalance =
        safeNumber(previousReport.choleraRemaining);

    report.solkBalance =
        safeNumber(previousReport.solkRemaining);

    report.pasteurBalance =
        safeNumber(previousReport.pasteurRemaining);

    report.pfizerBalance =
        safeNumber(previousReport.pfizerRemaining);

    report.dualBalance =
        safeNumber(previousReport.dualRemaining);

    report.fluBalance =
        safeNumber(previousReport.fluRemaining);

    report.hepBalance =
        safeNumber(previousReport.hepRemaining);

    return report;
}

/* =========================================================
   GET LAST REPORT BEFORE PERIOD
========================================================= */

async function getPreviousReport(officeCode, currentDateFrom) {

    const snapshot = await db
        .collection("reports")
        .where("officeCode", "==", officeCode)
        .where("dateTo", "<", currentDateFrom)
        .orderBy("dateTo", "desc")
        .limit(1)
        .get();

    if (snapshot.empty) {
        return null;
    }

    return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
    };
}

/* =========================================================
   RECALCULATE CHAIN
========================================================= */

async function recalculateFutureReports(officeCode) {

    const snapshot = await db
        .collection("reports")
        .where("officeCode", "==", officeCode)
        .orderBy("dateFrom", "asc")
        .get();

    if (snapshot.empty) return;

    let previous = null;

    for (const doc of snapshot.docs) {

        let report = {
            id: doc.id,
            ...doc.data()
        };

        // APPLY PREVIOUS BALANCES
        if (previous) {

            report.yellowBalance =
                safeNumber(previous.yellowRemaining);

            report.choleraBalance =
                safeNumber(previous.choleraRemaining);

            report.solkBalance =
                safeNumber(previous.solkRemaining);

            report.pasteurBalance =
                safeNumber(previous.pasteurRemaining);

            report.pfizerBalance =
                safeNumber(previous.pfizerRemaining);

            report.dualBalance =
                safeNumber(previous.dualRemaining);

            report.fluBalance =
                safeNumber(previous.fluRemaining);

            report.hepBalance =
                safeNumber(previous.hepRemaining);
        }

        // RECALCULATE
        report = calculateReport(report);

        // UPDATE FIRESTORE
        await db
            .collection("reports")
            .doc(doc.id)
            .update({

                yellowBalance: report.yellowBalance,
                yellowRemaining: report.yellowRemaining,

                choleraBalance: report.choleraBalance,
                choleraRemaining: report.choleraRemaining,

                solkBalance: report.solkBalance,
                solkRemaining: report.solkRemaining,

                pasteurBalance: report.pasteurBalance,
                pasteurRemaining: report.pasteurRemaining,

                pfizerBalance: report.pfizerBalance,
                pfizerRemaining: report.pfizerRemaining,

                dualBalance: report.dualBalance,
                dualRemaining: report.dualRemaining,

                fluBalance: report.fluBalance,
                fluRemaining: report.fluRemaining,

                hepBalance: report.hepBalance,
                hepRemaining: report.hepRemaining,

                recalculatedAt: new Date()
            });

        previous = report;
    }
}

/* =========================================================
   SAVE REPORT
========================================================= */

app.post("/save-report", async (req, res) => {

    try {

        const report = req.body;

        // VALIDATION
        const invalidIncoming = [

            "yellowIncoming",
            "choleraIncoming",
            "solkIncoming",
            "pasteurIncoming",
            "pfizerIncoming",
            "dualIncoming",
            "fluIncoming",
            "hepIncoming"

        ].some(field => safeNumber(report[field]) < 0);

        if (invalidIncoming) {
            return res.status(400).json({
                success: false,
                message: "الوارد لا يمكن أن يكون بالسالب"
            });
        }

        // CHECK EXISTING REPORT
        const existingSnapshot = await db
            .collection("reports")
            .where("officeCode", "==", report.officeCode)
            .where("dateFrom", "==", report.dateFrom)
            .where("dateTo", "==", report.dateTo)
            .limit(1)
            .get();

        // GET PREVIOUS REPORT
        const previousReport =
            await getPreviousReport(
                report.officeCode,
                report.dateFrom
            );

        // APPLY BALANCES
        applyPreviousBalances(report, previousReport);

        // CALCULATE
        calculateReport(report);

        report.createdAt = new Date();
        report.updatedAt = new Date();

        // =========================
        // UPDATE EXISTING
        // =========================

        let reportId = null;

        if (!existingSnapshot.empty) {

            reportId = existingSnapshot.docs[0].id;

            await db
                .collection("reports")
                .doc(reportId)
                .update(report);

        } else {

            const saved =
                await db
                    .collection("reports")
                    .add(report);

            reportId = saved.id;
        }

        // =========================
        // RECALCULATE FUTURE REPORTS
        // =========================

        await recalculateFutureReports(report.officeCode);

        return res.json({
            success: true,
            reportId
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});

/* =========================================================
   GET REPORT BY PERIOD
========================================================= */

app.get("/get-report", async (req, res) => {

    try {

        const {
            officeCode,
            dateFrom,
            dateTo
        } = req.query;

        const snapshot = await db
            .collection("reports")
            .where("officeCode", "==", officeCode)
            .where("dateFrom", "==", dateFrom)
            .where("dateTo", "==", dateTo)
            .limit(1)
            .get();

        if (snapshot.empty) {

            return res.json({
                success: false
            });
        }

        const doc = snapshot.docs[0];

        return res.json({
            success: true,
            report: {
                id: doc.id,
                ...doc.data()
            }
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false
        });
    }
});

/* =========================================================
   GET BALANCES
========================================================= */

app.get("/get-balances/:officeCode", async (req, res) => {

    try {

        const officeCode = req.params.officeCode;

        // GET LAST REPORT
        const snapshot = await db
            .collection("reports")
            .where("officeCode", "==", officeCode)
            .orderBy("dateTo", "desc")
            .limit(1)
            .get();

        // IF NO REPORTS
        if (snapshot.empty) {

            const openingDoc = await db
                .collection("opening_balances")
                .doc(officeCode)
                .get();

            if (!openingDoc.exists) {

                return res.json({
                    success: true,
                    balances: {}
                });
            }

            return res.json({
                success: true,
                balances: openingDoc.data()
            });
        }

        const lastReport = snapshot.docs[0].data();

        return res.json({
            success: true,
            balances: {

                yellowBalance:
                    safeNumber(lastReport.yellowRemaining),

                choleraBalance:
                    safeNumber(lastReport.choleraRemaining),

                solkBalance:
                    safeNumber(lastReport.solkRemaining),

                pasteurBalance:
                    safeNumber(lastReport.pasteurRemaining),

                pfizerBalance:
                    safeNumber(lastReport.pfizerRemaining),

                dualBalance:
                    safeNumber(lastReport.dualRemaining),

                fluBalance:
                    safeNumber(lastReport.fluRemaining),

                hepBalance:
                    safeNumber(lastReport.hepRemaining)
            }
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false
        });
    }
});

/* =========================================================
   GET ALL REPORTS
========================================================= */

app.get("/get-all-reports", async (req, res) => {

    try {

        const snapshot =
            await db
                .collection("reports")
                .orderBy("createdAt", "desc")
                .get();

        const reports = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return res.json({
            success: true,
            reports
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false
        });
    }
});

/* =========================================================
   ROOT
========================================================= */

app.get("/", (req, res) => {
    res.send("Server Running...");
});

/* =========================================================
   START
========================================================= */

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```
