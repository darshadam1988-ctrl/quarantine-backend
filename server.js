// =======================================================
// 📋 جلب كافة التقارير المجمعة والأرصدة لشاشة التقارير المتقدمة
// =======================================================

app.get("/get-all-reports", async (req, res) => {

    try {

        const { from, to } = req.query;

        if (!from || !to) {

            return res.status(400).json({

                success: false,
                message: "from & to required"
            });
        }

        // ==========================================
        // قراءة كل التقارير
        // ==========================================

        const snapshot =
            await db
                .collection("reports")
                .get();

        const reports = [];

        // ==========================================
        // فلترة ذكية بالفترة الحقيقية للتقرير
        // ==========================================

        snapshot.forEach((doc) => {

            const report = {
                id: doc.id,
                ...doc.data()
            };

            // ======================================
            // تاريخ التقرير الحقيقي
            // ======================================

            const reportFrom =
                String(report.dateFrom || "").trim();

            const reportTo =
                String(report.dateTo || "").trim();

            // لو التقرير ناقص تاريخ نتجاهله
            if (!reportFrom || !reportTo) return;

            // ======================================
            // هل يوجد تداخل بين الفترتين ؟
            // ======================================

            const overlaps = !(
                reportTo < from ||
                reportFrom > to
            );

            if (overlaps) {

                reports.push(report);
            }
        });

        // ==========================================
        // ترتيب التقارير
        // ==========================================

        reports.sort((a, b) => {

            const officeCompare =
                String(a.officeCode || "")
                    .localeCompare(
                        String(b.officeCode || "")
                    );

            if (officeCompare !== 0)
                return officeCompare;

            return String(a.dateFrom || "")
                .localeCompare(
                    String(b.dateFrom || "")
                );
        });

        // ==========================================
        // تحميل الأرصدة
        // ==========================================

        const balancesSnapshot =
            await db
                .collection("balances")
                .get();

        const balances = {};

        balancesSnapshot.forEach((doc) => {

            balances[doc.id] =
                doc.data();
        });

        // ==========================================
        // إرسال النتيجة
        // ==========================================

        res.json({

            success: true,
            reports,
            balances
        });

    } catch (err) {

        console.error(
            "GET REPORTS ERROR =>",
            err
        );

        res.status(500).json({

            success: false,
            error: err.message
        });
    }
});