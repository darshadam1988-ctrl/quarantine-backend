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

function num(v) {
    return Number(v) || 0;
}

function calculateReport(report) {

    // YELLOW
    const yellowUsed =
        num(report.yellowEgyptians) +
        num(report.yellowForeigners);

    report.yellowRemaining =
        num(report.yellowBalance) +
        num(report.yellowIncoming) -
        yellowUsed;

    // CHOLERA
    const choleraUsed =
        num(report.choleraDose1) +
        num(report.choleraDose2);

    report.choleraRemaining =
        num(report.choleraBalance) +
        num(report.choleraIncoming) -
        choleraUsed;

    // SOLK
    report.solkRemaining =
        num(report.solkBalance) +
        num(report.solkIncoming) -
        num(report.solkUsed);

    // PASTEUR
    const pasteurUsed =
        num(report.pasteurHajj) +
        num(report.pasteurForeignHajj) +
        num(report.pasteurOmrah) +
        num(report.pasteurTravelers);

    report.pasteurRemaining =
        num(report.pasteurBalance) +
        num(report.pasteurIncoming) -
        pasteurUsed;

    // PFIZER
    const pfizerUsed =
        num(report.pfizerHajj) +
        num(report.pfizerForeignHajj) +
        num(report.pfizerOmrah) +
        num(report.pfizerTravelers);

    report.pfizerRemaining =
        num(report.pfizerBalance) +
        num(report.pfizerIncoming) -
        pfizerUsed;

    // DUAL
    report.dualRemaining =
        num(report.dualBalance) +
        num(report.dualIncoming) -
        num(report.dualUsed);

    // FLU
    const fluUsed =
        num(report.fluHajj) +
        num(report.fluTravelers) +
        num(report.fluCitizens);

    report.fluRemaining =
        num(report.fluBalance) +
        num(report.fluIncoming) -
        fluUsed;

    // HEP
    const hepUsed =
        num(report.hepEgyptians) +
        num(report.hepForeigners);

    report.hepRemaining =
        num(report.hepBalance) +
        num(report.hepIncoming) -
        hepUsed;

    return report;
}

/* =========================================================
   GET PREVIOUS REPORT
========================================================= */

async function getPreviousReport(
    officeCode,
    currentDateFrom
) {

    const snapshot = await db
        .collection("reports")
        .where("officeCode", "==", officeCode)
        .orderBy("dateTo", "desc")
        .get();

    if (snapshot.empty) {
        return null;
    }

    const reports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    const previous = reports.find(r =>
        r.dateTo < currentDateFrom
    );

    return previous || null;
}

/* =========================================================
   RECALCULATE REPORTS
========================================================= */

async function recalculateReports(officeCode) {

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

        // APPLY PREVIOUS REMAINING
        if (previous) {

            report.yellowBalance =
                num(previous.yellowRemaining);

            report.choleraBalance =
                num(previous.choleraRemaining);

            report.solkBalance =
                num(previous.solkRemaining);

            report.pasteurBalance =
                num(previous.pasteurRemaining);

            report.pfizerBalance =
                num(previous.pfizerRemaining);

            report.dualBalance =
                num(previous.dualRemaining);

            report.fluBalance =
                num(previous.fluRemaining);

            report.hepBalance =
                num(previous.hepRemaining);
        }

        // RECALCULATE
        report = calculateReport(report);

        // UPDATE REPORT
        await db
            .collection("reports")
            .doc(doc.id)
            .update({

                yellowBalance:
                    report.yellowBalance,

                yellowRemaining:
                    report.yellowRemaining,

                choleraBalance:
                    report.choleraBalance,

                choleraRemaining:
                    report.choleraRemaining,

                solkBalance:
                    report.solkBalance,

                solkRemaining:
                    report.solkRemaining,

                pasteurBalance:
                    report.pasteurBalance,

                pasteurRemaining:
                    report.pasteurRemaining,

                pfizerBalance:
                    report.pfizerBalance,

                pfizerRemaining:
                    report.pfizerRemaining,

                dualBalance:
                    report.dualBalance,

                dualRemaining:
                    report.dualRemaining,

                fluBalance:
                    report.fluBalance,

                fluRemaining:
                    report.fluRemaining,

                hepBalance:
                    report.hepBalance,

                hepRemaining:
                    report.hepRemaining,

                recalculatedAt:
                    new Date()
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

        // VALIDATE NEGATIVE INCOMING
        const invalidIncoming = [

            "yellowIncoming",
            "choleraIncoming",
            "solkIncoming",
            "pasteurIncoming",
            "pfizerIncoming",
            "dualIncoming",
            "fluIncoming",
            "hepIncoming"

        ].some(field => num(report[field]) < 0);

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
        const previous =
            await getPreviousReport(
                report.officeCode,
                report.dateFrom
            );

        // APPLY PREVIOUS BALANCES
        if (previous) {

            report.yellowBalance =
                num(previous.yellowRemaining);

            report.choleraBalance =
                num(previous.choleraRemaining);

            report.solkBalance =
                num(previous.solkRemaining);

            report.pasteurBalance =
                num(previous.pasteurRemaining);

            report.pfizerBalance =
                num(previous.pfizerRemaining);

            report.dualBalance =
                num(previous.dualRemaining);

            report.fluBalance =
                num(previous.fluRemaining);

            report.hepBalance =
                num(previous.hepRemaining);
        }

        // CALCULATE
        calculateReport(report);

        report.updatedAt = new Date();

        let reportId = null;

        // UPDATE EXISTING REPORT
        if (!existingSnapshot.empty) {

            reportId =
                existingSnapshot.docs[0].id;

            await db
                .collection("reports")
                .doc(reportId)
                .update(report);

        } else {

            report.createdAt = new Date();

            const saved =
                await db
                    .collection("reports")
                    .add(report);

            reportId = saved.id;
        }

        // RECALCULATE ALL FUTURE REPORTS
        await recalculateReports(
            report.officeCode
        );

        return res.json({
            success: true,
            reportId
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: err.message
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

        const officeCode =
            req.params.officeCode;

        // LAST REPORT
        const snapshot = await db
            .collection("reports")
            .where("officeCode", "==", officeCode)
            .orderBy("dateTo", "desc")
            .limit(1)
            .get();

        // NO REPORTS YET
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
                balances:
                    openingDoc.data()
            });
        }

        const lastReport =
            snapshot.docs[0].data();

        return res.json({

            success: true,

            balances: {

                yellowBalance:
                    num(lastReport.yellowRemaining),

                choleraBalance:
                    num(lastReport.choleraRemaining),

                solkBalance:
                    num(lastReport.solkRemaining),

                pasteurBalance:
                    num(lastReport.pasteurRemaining),

                pfizerBalance:
                    num(lastReport.pfizerRemaining),

                dualBalance:
                    num(lastReport.dualRemaining),

                fluBalance:
                    num(lastReport.fluRemaining),

                hepBalance:
                    num(lastReport.hepRemaining)
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

        const snapshot = await db
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
   START SERVER
========================================================= */

app.listen(PORT, () => {

    console.log("Server running on port " + PORT);

});
```
