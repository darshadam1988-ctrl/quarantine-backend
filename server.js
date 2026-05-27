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

function calculateRemaining(balance, incoming, used) {
return num(balance) + num(incoming) - num(used);
}

/* =========================================================
ROOT
========================================================= */

app.get("/", (req, res) => {
res.send("Server Running...");
});

/* =========================================================
GET CURRENT BALANCES
========================================================= */

app.get("/get-balances/:officeCode", async (req, res) => {

```
try {

    const officeCode = req.params.officeCode;

    const balanceDoc = await db
        .collection("balances")
        .doc(officeCode)
        .get();

    if (balanceDoc.exists) {

        return res.json({
            success: true,
            balances: balanceDoc.data()
        });
    }

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

} catch (err) {

    console.error(err);

    return res.status(500).json({
        success: false,
        message: err.message
    });
}
```

});

/* =========================================================
GET REPORT
========================================================= */

app.get("/get-report", async (req, res) => {

```
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

    const reportDoc = snapshot.docs[0];

    return res.json({
        success: true,
        report: {
            id: reportDoc.id,
            ...reportDoc.data()
        }
    });

} catch (err) {

    console.error(err);

    return res.status(500).json({
        success: false,
        message: err.message
    });
}
```

});

/* =========================================================
SAVE REPORT
========================================================= */

app.post("/save-report", async (req, res) => {

```
try {

    const report = {
        ...req.body
    };

    if (
        !report.officeCode ||
        !report.dateFrom ||
        !report.dateTo
    ) {

        return res.status(400).json({
            success: false,
            message: "بيانات ناقصة"
        });
    }

    /* =========================
       CALCULATIONS
    ========================= */

    const yellowUsed =
        num(report.yellowEgyptians) +
        num(report.yellowForeigners);

    report.yellowRemaining =
        calculateRemaining(
            report.yellowBalance,
            report.yellowIncoming,
            yellowUsed
        );

    const choleraUsed =
        num(report.choleraDose1) +
        num(report.choleraDose2);

    report.choleraRemaining =
        calculateRemaining(
            report.choleraBalance,
            report.choleraIncoming,
            choleraUsed
        );

    report.solkRemaining =
        calculateRemaining(
            report.solkBalance,
            report.solkIncoming,
            report.solkUsed
        );

    const pasteurUsed =
        num(report.pasteurHajj) +
        num(report.pasteurForeignHajj) +
        num(report.pasteurOmrah) +
        num(report.pasteurTravelers);

    report.pasteurRemaining =
        calculateRemaining(
            report.pasteurBalance,
            report.pasteurIncoming,
            pasteurUsed
        );

    const pfizerUsed =
        num(report.pfizerHajj) +
        num(report.pfizerForeignHajj) +
        num(report.pfizerOmrah) +
        num(report.pfizerTravelers);

    report.pfizerRemaining =
        calculateRemaining(
            report.pfizerBalance,
            report.pfizerIncoming,
            pfizerUsed
        );

    report.dualRemaining =
        calculateRemaining(
            report.dualBalance,
            report.dualIncoming,
            report.dualUsed
        );

    const fluUsed =
        num(report.fluHajj) +
        num(report.fluTravelers) +
        num(report.fluCitizens);

    report.fluRemaining =
        calculateRemaining(
            report.fluBalance,
            report.fluIncoming,
            fluUsed
        );

    const hepUsed =
        num(report.hepEgyptians) +
        num(report.hepForeigners);

    report.hepRemaining =
        calculateRemaining(
            report.hepBalance,
            report.hepIncoming,
            hepUsed
        );

    report.updatedAt = new Date();

    /* =========================
       CHECK EXISTING REPORT
    ========================= */

    const existingSnapshot = await db
        .collection("reports")
        .where("officeCode", "==", report.officeCode)
        .where("dateFrom", "==", report.dateFrom)
        .where("dateTo", "==", report.dateTo)
        .limit(1)
        .get();

    let reportId = null;

    if (!existingSnapshot.empty) {

        reportId =
            existingSnapshot.docs[0].id;

        await db
            .collection("reports")
            .doc(reportId)
            .update(report);

    } else {

        report.createdAt = new Date();

        const savedDoc = await db
            .collection("reports")
            .add(report);

        reportId = savedDoc.id;
    }

    /* =========================
       UPDATE LIVE BALANCES
    ========================= */

    const balances = {

        yellowBalance:
            num(report.yellowRemaining),

        choleraBalance:
            num(report.choleraRemaining),

        solkBalance:
            num(report.solkRemaining),

        pasteurBalance:
            num(report.pasteurRemaining),

        pfizerBalance:
            num(report.pfizerRemaining),

        dualBalance:
            num(report.dualRemaining),

        fluBalance:
            num(report.fluRemaining),

        hepBalance:
            num(report.hepRemaining),

        updatedAt:
            new Date()
    };

    await db
        .collection("balances")
        .doc(report.officeCode)
        .set(balances);

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
```

});

/* =========================================================
GET ALL REPORTS
========================================================= */

app.get("/get-all-reports", async (req, res) => {

```
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
```

});

/* =========================================================
START SERVER
========================================================= */

app.listen(PORT, () => {

console.log("Server running on port " + PORT);

});
