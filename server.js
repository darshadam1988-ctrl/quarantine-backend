const express = require("express");
const cors = require("cors");
const db = require("./firebase");

const app = express();

app.use(cors());
app.use(express.json());

// =======================================================
// 🔐 LOGIN
// =======================================================

app.post("/login", async (req, res) => {

    try {

        const {
            username,
            password
        } = req.body;

        if (!username || !password) {

            return res.status(400).json({

                success: false,
                message: "برجاء إدخال اسم المستخدم وكلمة المرور"
            });
        }

        const snapshot =
            await db
                .collection("users")
                .where("username", "==", username)
                .where("password", "==", password)
                .get();

        if (snapshot.empty) {

            return res.json({

                success: false,
                message: "بيانات الدخول غير صحيحة"
            });
        }

        const userData =
            snapshot.docs[0].data();

        res.json({

            success: true,
            user: userData
        });

    } catch (err) {

        console.error(
            "Login Error:",
            err
        );

        res.status(500).json({

            success: false,
            message: "حدث خطأ في الخادم"
        });
    }
});

// =======================================================
// 🟢 GET BALANCES
// =======================================================

app.get("/get-balances/:officeCode", async (req, res) => {

    try {

        const {
            officeCode
        } = req.params;

        const doc =
            await db
                .collection("balances")
                .doc(officeCode)
                .get();

        if (!doc.exists) {

            return res.json({

                success: false,
                message: "لا توجد أرصدة"
            });
        }

        res.json({

            success: true,
            balances: doc.data()
        });

    } catch (err) {

        console.error(
            "Get Balances Error:",
            err
        );

        res.status(500).json({

            success: false
        });
    }
});

// =======================================================
// 💾 SAVE REPORT
// =======================================================

app.post("/save-report", async (req, res) => {

    try {

        const report = {

            ...req.body,

            lostCertificates:
                Number(
                    req.body.lostCertificates
                ) || 0,

            covidStatements:
                Number(
                    req.body.covidStatements
                ) || 0,

            visitors:
                Number(
                    req.body.visitors
                ) || 0,

            createdAt:
                new Date()
        };

        await db
            .collection("reports")
            .add(report);

        res.json({

            success: true
        });

    } catch (err) {

        console.error(
            "Save Report Error:",
            err
        );

        res.status(500).json({

            success: false
        });
    }
});

// =======================================================
// 💾 SAVE BALANCES
// =======================================================

app.post("/save-balances", async (req, res) => {

    try {

        const {
            officeCode,
            balances
        } = req.body;

        if (!officeCode || !balances) {

            return res.status(400).json({

                success: false,
                message: "بيانات ناقصة"
            });
        }

        await db
            .collection("balances")
            .doc(officeCode)
            .set(balances);

        res.json({

            success: true
        });

    } catch (err) {

        console.error(
            "Save Balances Error:",
            err
        );

        res.status(500).json({

            success: false
        });
    }
});

// =======================================================
// 🔥 FILTER REPORTS
// =======================================================
// ✅ الإصلاح الحقيقي هنا
// الفلترة أصبحت تعتمد على:
// dateFrom + dateTo
// وليس createdAt
// =======================================================

app.get("/get-all-reports", async (req, res) => {

    try {

        const {
            from,
            to
        } = req.query;

        if (!from || !to) {

            return res.status(400).json({

                success: false,
                message: "from & to required"
            });
        }

        const snapshot =
            await db
                .collection("reports")
                .get();

        const reports = [];

        snapshot.forEach((doc) => {

            const r = {

                id: doc.id,
                ...doc.data()
            };

            const reportFrom =
                r.dateFrom || "";

            const reportTo =
                r.dateTo || "";

            // ==================================
            // التحقق من التداخل بين الفترتين
            // ==================================

            const overlaps =

                reportFrom <= to &&
                reportTo >= from;

            if (overlaps) {

                reports.push(r);
            }
        });

        // ======================================
        // BALANCES
        // ======================================

        const balancesSnapshot =
            await db
                .collection("balances")
                .get();

        const balances = {};

        balancesSnapshot.forEach((doc) => {

            balances[doc.id] =
                doc.data();
        });

        res.json({

            success: true,
            reports,
            balances
        });

    } catch (err) {

        console.error(
            "GET REPORTS ERROR:",
            err
        );

        res.status(500).json({

            success: false,
            error: err.message
        });
    }
});

// =======================================================
// 🏢 GET OFFICES
// =======================================================

app.get("/get-all-offices", async (req, res) => {

    try {

        const snapshot =
            await db
                .collection("users")
                .where("role", "==", "office")
                .get();

        const offices = [];

        snapshot.forEach((doc) => {

            offices.push({

                id: doc.id,
                ...doc.data()
            });
        });

        res.json({

            success: true,
            offices
        });

    } catch (err) {

        console.error(
            "Get Offices Error:",
            err
        );

        res.status(500).json({

            success: false
        });
    }
});

// =======================================================
// ✏️ UPDATE OFFICE ACCOUNT
// =======================================================

app.post("/update-office-account", async (req, res) => {

    try {

        const {
            officeId,
            username,
            password
        } = req.body;

        await db
            .collection("users")
            .doc(officeId)
            .update({

                username,
                password
            });

        res.json({

            success: true
        });

    } catch (err) {

        console.error(
            "Update Office Error:",
            err
        );

        res.status(500).json({

            success: false
        });
    }
});

// =======================================================
// ➕ ADD OFFICE
// =======================================================

app.post("/add-office-account", async (req, res) => {

    try {

        const {
            officeName,
            username,
            password
        } = req.body;

        const newDoc =
            await db
                .collection("users")
                .add({

                    officeName,
                    username,
                    password,
                    role: "office"
                });

        res.json({

            success: true,
            id: newDoc.id
        });

    } catch (err) {

        console.error(
            "Add Office Error:",
            err
        );

        res.status(500).json({

            success: false
        });
    }
});

// =======================================================
// 🗑 DELETE OFFICE
// =======================================================

app.post("/delete-office-account", async (req, res) => {

    try {

        const {
            officeId
        } = req.body;

        await db
            .collection("users")
            .doc(officeId)
            .delete();

        res.json({

            success: true
        });

    } catch (err) {

        console.error(
            "Delete Office Error:",
            err
        );

        res.status(500).json({

            success: false
        });
    }
});

// =======================================================
// 🔐 UPDATE ADMIN PASSWORD
// =======================================================

app.post("/update-admin-password", async (req, res) => {

    try {

        const {
            username,
            newPassword
        } = req.body;

        const snapshot =
            await db
                .collection("users")
                .where("username", "==", username)
                .where("role", "==", "admin")
                .get();

        if (snapshot.empty) {

            return res.status(404).json({

                success: false,
                message: "الأدمن غير موجود"
            });
        }

        const adminId =
            snapshot.docs[0].id;

        await db
            .collection("users")
            .doc(adminId)
            .update({

                password: newPassword
            });

        res.json({

            success: true
        });

    } catch (err) {

        console.error(
            "Admin Password Error:",
            err
        );

        res.status(500).json({

            success: false
        });
    }
});

// =======================================================
// 📊 DASHBOARD STATS
// =======================================================

app.get("/get-dashboard-stats", async (req, res) => {

    try {

        const {
            from,
            to
        } = req.query;

        if (!from || !to) {

            return res.status(400).json({

                success: false,
                message: "from & to required"
            });
        }

        const snapshot =
            await db
                .collection("reports")
                .get();

        const stats = {

            totalVisitors: 0,

            totalCost: 0,

            vaccineUsage: {

                yellow: 0,
                cholera: 0,
                solk: 0,
                pasteur: 0,
                pfizer: 0,
                dual: 0,
                flu: 0,
                hep: 0
            },

            officePerformance: {}
        };

        snapshot.forEach((doc) => {

            const r =
                doc.data();

            const reportFrom =
                r.dateFrom || "";

            const reportTo =
                r.dateTo || "";

            const overlaps =

                reportFrom <= to &&
                reportTo >= from;

            if (!overlaps) return;

            const office =
                r.officeName ||
                r.officeCode ||
                "غير معروف";

            if (
                !stats.officePerformance[office]
            ) {

                stats.officePerformance[office] = {

                    visitors: 0,
                    cost: 0
                };
            }

            // ==================================
            // VISITORS
            // ==================================

            const visitors =
                Number(
                    r.visitors || 0
                );

            stats.totalVisitors +=
                visitors;

            stats.officePerformance[office]
                .visitors += visitors;

            // ==================================
            // COST
            // ==================================

            const rawCost =

                r.totalCost ??
                r.cost ??
                r.total ??
                r.price ??
                r.amount ??
                0;

            const totalCost =
                parseFloat(

                    String(rawCost)
                        .replace(/,/g, "")
                        .replace(/[^\d.-]/g, "")
                        .trim()

                ) || 0;

            stats.totalCost +=
                totalCost;

            stats.officePerformance[office]
                .cost += totalCost;

            // ==================================
            // VACCINES
            // ==================================

            stats.vaccineUsage.yellow +=

                Number(r.yellowEgyptians || 0) +
                Number(r.yellowForeigners || 0);

            stats.vaccineUsage.cholera +=

                Number(r.choleraDose1 || 0) +
                Number(r.choleraDose2 || 0);

            stats.vaccineUsage.solk +=

                Number(r.solkUsed || 0);

            stats.vaccineUsage.pasteur +=

                Number(r.pasteurHajj || 0) +
                Number(r.pasteurForeignHajj || 0) +
                Number(r.pasteurOmrah || 0) +
                Number(r.pasteurTravelers || 0);

            stats.vaccineUsage.pfizer +=

                Number(r.pfizerHajj || 0) +
                Number(r.pfizerForeignHajj || 0) +
                Number(r.pfizerOmrah || 0) +
                Number(r.pfizerTravelers || 0);

            stats.vaccineUsage.dual +=

                Number(r.dualUsed || 0);

            stats.vaccineUsage.flu +=

                Number(r.fluHajj || 0) +
                Number(r.fluTravelers || 0) +
                Number(r.fluCitizens || 0);

            stats.vaccineUsage.hep +=

                Number(r.hepEgyptians || 0) +
                Number(r.hepForeigners || 0);
        });

        res.json({

            success: true,
            stats
        });

    } catch (err) {

        console.error(
            "Dashboard Error:",
            err
        );

        res.status(500).json({

            success: false,
            message: err.message
        });
    }
});

// =======================================================
// 🚀 START SERVER
// =======================================================

const PORT =
    process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {

    console.log(

        `⚡ Server running on port ${PORT}`
    );
});