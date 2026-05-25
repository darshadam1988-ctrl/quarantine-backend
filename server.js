const express = require("express");
const cors = require("cors");
const db = require("./firebase");

const app = express();

app.use(cors());
app.use(express.json());

// =======================================================
// 🔐 منظومة تسجيل الدخول (LOGIN SYSTEM)
// =======================================================
app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "برجاء إدخال اسم المستخدم وكلمة المرور"
            });
        }

        const snapshot = await db
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

        const userData = snapshot.docs[0].data();
        console.log("LOGIN SUCCESS:", userData);

        res.json({
            success: true,
            user: userData
        });

    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ success: false, message: "حدث خطأ في الخادم" });
    }
});

// =======================================================
// 🟢 جلب الأرصدة الحالية لمكتب معين عبر الـ Params
// =======================================================
app.get("/get-balances/:officeCode", async (req, res) => {
    try {
        const { officeCode } = req.params;

        if (!officeCode) {
            return res.status(400).json({ success: false, message: "كود المكتب مطلوب" });
        }

        const doc = await db.collection("balances").doc(officeCode).get();

        if (!doc.exists) {
            return res.json({ success: false, message: "لا توجد أرصدة مسجلة لهذا المكتب" });
        }

        res.json({
            success: true,
            balances: doc.data()
        });

    } catch (err) {
        console.error("Get Balances Error:", err);
        res.status(500).json({ success: false });
    }
});

// =======================================================
// 💾 حفظ التقرير اليومي الصادر من المكاتب
// =======================================================
app.post("/save-report", async (req, res) => {
    try {
        const report = {
            ...req.body,
            lostCertificates: Number(req.body.lostCertificates) || 0,
            covidStatements: Number(req.body.covidStatements) || 0,
            visitors: Number(req.body.visitors) || 0,
            createdAt: new Date()
        };

        await db.collection("reports").add(report);
        res.json({ success: true });

    } catch (err) {
        console.error("Save Report Error:", err);
        res.status(500).json({ success: false });
    }
});

// =======================================================
// ⚙️ حفظ وتحديث الأرصدة الحية
// =======================================================
app.post("/save-balances", async (req, res) => {
    try {
        const { officeCode, balances } = req.body;

        if (!officeCode || !balances) {
            return res.status(400).json({ success: false, message: "بيانات ناقصة" });
        }

        await db.collection("balances")
            .doc(officeCode)
            .set(balances);

        res.json({ success: true });

    } catch (err) {
        console.error("Save Balances Error:", err);
        res.status(500).json({ success: false });
    }
});

// =======================================================
// 📋 جلب كافة التقارير المجمعة والأرصدة لشاشة التقارير المتقدمة
// =======================================================
app.get("/get-all-reports", async (req, res) => {
    try {
        const { from, to } = req.query;

        if (!from || !to) {
            return res.status(400).json({ success: false, message: "نطاق تاريخ الفلترة مطلوب (from & to)" });
        }

        const startOfDay = new Date(`${from}T00:00:00.000Z`);
        const endOfDay = new Date(`${to}T23:59:59.999Z`);

        const reportsSnapshot = await db.collection("reports")
            .where("createdAt", ">=", startOfDay)
            .where("createdAt", "<=", endOfDay)
            .get();

        const reports = [];
        reportsSnapshot.forEach(doc => {
            reports.push({ id: doc.id, ...doc.data() });
        });

        const balancesSnapshot = await db.collection("balances").get();
        const balances = {};
        balancesSnapshot.forEach(doc => {
            balances[doc.id] = doc.data();
        });

        res.json({
            success: true,
            reports: reports,
            balances: balances
        });

    } catch (err) {
        console.error("Error inside get-all-reports endpoint:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// =======================================================
// 🏢 جلب قائمة جميع المكاتب لـ شاشة الإدارة
// =======================================================
app.get("/get-all-offices", async (req, res) => {
    try {
        const snapshot = await db.collection("users")
            .where("role", "==", "office")
            .get();

        const offices = [];
        snapshot.forEach(doc => {
            offices.push({ id: doc.id, ...doc.data() });
        });

        res.json({ success: true, offices });
    } catch (err) {
        console.error("Error fetching offices:", err);
        res.status(500).json({ success: false, message: "حدث خطأ في جلب المكاتب" });
    }
});

// =======================================================
// 🔄 تحديث بيانات حساب المكتب (اسم المستخدم أو كلمة السر)
// =======================================================
app.post("/update-office-account", async (req, res) => {
    try {
        const { officeId, username, password } = req.body;

        if (!officeId || !username || !password) {
            return res.status(400).json({ success: false, message: "جميع الحقول مطلوبة" });
        }

        await db.collection("users").doc(officeId).update({
            username: username,
            password: password
        });

        res.json({ success: true, message: "تم تحديث بيانات الحساب بنجاح" });
    } catch (err) {
        console.error("Error updating office account:", err);
        res.status(500).json({ success: false, message: "حدث خطأ أثناء التحديث" });
    }
});

// =======================================================
// ➕ إضافة وإنشاء مستند مكتب تحصين جديد كلياً
// =======================================================
app.post("/add-office-account", async (req, res) => {
    try {
        const { officeName, username, password } = req.body;
        
        if (!officeName || !username || !password) {
            return res.status(400).json({ success: false, message: "جميع الخانات مطلوبة" });
        }

        const newDocRef = await db.collection("users").add({
            officeName: officeName,
            username: username,
            password: password,
            role: "office"
        });

        res.json({ success: true, message: "تمت إضافة حساب المكتب الجديد بنجاح", id: newDocRef.id });
    } catch (err) {
        console.error("Error adding office account:", err);
        res.status(500).json({ success: false, message: "خطأ داخلي بالسيرفر أثناء الحفظ" });
    }
});

// =======================================================
// 🗑 حذف وإزالة مكتب تحصين نهائياً من قاعدة البيانات
// =======================================================
app.post("/delete-office-account", async (req, res) => {
    try {
        const { officeId } = req.body;
        if (!officeId) {
            return res.status(400).json({ success: false, message: "معرف المكتب مطلوب للحذف" });
        }

        await db.collection("users").doc(officeId).delete();
        res.json({ success: true, message: "تم حذف حساب المكتب نهائياً من قاعدة البيانات" });
    } catch (err) {
        console.error("Error deleting office account:", err);
        res.status(500).json({ success: false, message: "حدث خطأ بالسيرفر أثناء معالجة الحذف" });
    }
});

// =======================================================
// 🔐 تحديث كلمة سر حساب الأدمن الرئيسي
// =======================================================
app.post("/update-admin-password", async (req, res) => {
    try {
        const { username, newPassword } = req.body;

        if (!username || !newPassword) {
            return res.status(400).json({ success: false, message: "البيانات المطلوبة ناقصة" });
        }

        const snapshot = await db.collection("users")
            .where("username", "==", username)
            .where("role", "==", "admin")
            .get();

        if (snapshot.empty) {
            return res.status(444).json({ success: false, message: "حساب الأدمن غير موجود أو غير مصرح له" });
        }

        const adminDocId = snapshot.docs[0].id;
        await db.collection("users").doc(adminDocId).update({
            password: newPassword
        });

        res.json({ success: true, message: "تم تحديث كلمة مرور الأدمن بنجاح" });
    } catch (err) {
        console.error("Error updating admin password:", err);
        res.status(500).json({ success: false, message: "حدث خطأ داخلي بالسيرفر أثناء تحديث كلمة السر" });
    }
});

// =======================================================
// 📊 [مطور بالكامل] جلب الإحصائيات المجمعة للداشبورد والترتيب والتأكد من مسميات الحقول
// =======================================================
// استبدل جزء التجميع في server.js بهذا الكود الدقيق:
// =======================================================
// 📊 جلب إحصائيات الداشبورد
// =======================================================

app.get("/get-dashboard-stats", async (req, res) => {

    try {

        const { from, to } = req.query;

        if (!from || !to) {

            return res.status(400).json({

                success: false,
                message: "from & to required"
            });
        }

        const startOfDay =
            new Date(`${from}T00:00:00.000Z`);

        const endOfDay =
            new Date(`${to}T23:59:59.999Z`);

        // ======================================
        // قراءة التقارير الصحيحة
        // ======================================

        const snapshot =
            await db
                .collection("reports")
                .where(
                    "createdAt",
                    ">=",
                    startOfDay
                )
                .where(
                    "createdAt",
                    "<=",
                    endOfDay
                )
                .get();

        // ======================================
        // موديل الإحصائيات
        // ======================================

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

        // ======================================
        // تجميع البيانات
        // ======================================

        snapshot.forEach((doc) => {

            const r =
                doc.data();

            const office =
                r.officeName ||
                r.officeCode ||
                "غير معروف";

            // ==================================
            // إنشاء المكتب
            // ==================================

            if (
                !stats.officePerformance[office]
            ) {

                stats.officePerformance[office] = {

                    visitors: 0,
                    cost: 0
                };
            }

            // ==================================
            // المترددين
            // ==================================

            const visitors =
                Number(r.visitors || 0);

            stats.totalVisitors +=
                visitors;

            stats.officePerformance[office]
                .visitors += visitors;

            // ==================================
// تنظيف التكلفة
// ==================================

const rawCost =

    r.totalCost ??
    r.cost ??
    r.total ??
    r.price ??
    r.amount ??
    r.money ??
    r.fees ??
    0;

// تحويل ذكي للنصوص
const totalCost = parseFloat(

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
            // الحمى الصفراء
            // ==================================

            stats.vaccineUsage.yellow +=

                Number(
                    r.yellowEgyptians || 0
                ) +

                Number(
                    r.yellowForeigners || 0
                );

            // ==================================
            // الكوليرا
            // ==================================

            stats.vaccineUsage.cholera +=

                Number(
                    r.choleraDose1 || 0
                ) +

                Number(
                    r.choleraDose2 || 0
                );

            // ==================================
            // سولك
            // ==================================

            stats.vaccineUsage.solk +=

                Number(
                    r.solkUsed || 0
                );

            // ==================================
            // باستير
            // ==================================

            stats.vaccineUsage.pasteur +=

                Number(
                    r.pasteurHajj || 0
                ) +

                Number(
                    r.pasteurForeignHajj || 0
                ) +

                Number(
                    r.pasteurOmrah || 0
                ) +

                Number(
                    r.pasteurTravelers || 0
                );

            // ==================================
            // فايزر
            // ==================================

            stats.vaccineUsage.pfizer +=

                Number(
                    r.pfizerHajj || 0
                ) +

                Number(
                    r.pfizerForeignHajj || 0
                ) +

                Number(
                    r.pfizerOmrah || 0
                ) +

                Number(
                    r.pfizerTravelers || 0
                );

            // ==================================
            // الثنائي
            // ==================================

            stats.vaccineUsage.dual +=

                Number(
                    r.dualUsed || 0
                );

            // ==================================
            // الإنفلونزا
            // ==================================

            stats.vaccineUsage.flu +=

                Number(
                    r.fluHajj || 0
                ) +

                Number(
                    r.fluTravelers || 0
                ) +

                Number(
                    r.fluCitizens || 0
                );

            // ==================================
            // الكبدي
            // ==================================

            stats.vaccineUsage.hep +=

                Number(
                    r.hepEgyptians || 0
                ) +

                Number(
                    r.hepForeigners || 0
                );
        });

        // ======================================
        // إرسال النتيجة
        // ======================================

        res.json({

            success: true,
            stats
        });

    } catch (err) {

        console.error(
            "Dashboard Stats Error:",
            err
        );

        res.status(500).json({

            success: false,
            message: err.message
        });
    }
});

// =======================================================
// 🚀 تشغيل الخادم والإنصات للمنافذ
// =======================================================
const PORT = process.env.PORT || 5000;
// أضف '0.0.0.0' هنا:
app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ Cairo Quarantine Backend is running securely on port ${PORT}`);
});