const db = require("./firebase");

const offices = [

    { code: "CAI001", name: "الـ 63 متر" },
    { code: "CAI002", name: "عيادة تحصين مطار القاهرة الدولي" },
    { code: "CAI003", name: "الأمل (الهجانة سابقاً)" },
    { code: "CAI004", name: "مكتب تحصين الأندلس" },
    { code: "CAI005", name: "مكتب تحصين الاسمرات" },
    { code: "CAI006", name: "مكتب تحصين التجمع الأول" },
    { code: "CAI007", name: "مكتب تحصين التجمع الثالث" },
    { code: "CAI008", name: "مكتب تحصين التجمع الخامس" },
    { code: "CAI009", name: "مكتب تحصين الست خضرة" },
    { code: "CAI010", name: "مكتب تحصين العباسية" },
    { code: "CAI011", name: "مكتب تحصين المحكمة" },
    { code: "CAI012", name: "مكتب تحصين المعادي" },
    { code: "CAI013", name: "مكتب تحصين المنيل" },
    { code: "CAI014", name: "مكتب تحصين النزهة الجديدة" },
    { code: "CAI015", name: "مكتب تحصين الوايلي الكبير" },
    { code: "CAI016", name: "مكتب تحصين حدائق حلوان" },
    { code: "CAI017", name: "مكتب تحصين رعاية طفل مصر القديمة" },
    { code: "CAI018", name: "مكتب تحصين روض الفرج" },
    { code: "CAI019", name: "مكتب تحصين شريف" },
    { code: "CAI020", name: "مكتب تحصين عابدين" },
    { code: "CAI021", name: "مكتب تحصين قصر النيل" },
    { code: "CAI022", name: "مكتب تحصين مجاورة 5" },
    { code: "CAI023", name: "مكتب تحصين مصر الجديدة" },
    { code: "CAI024", name: "مكتب تحصين نصر أول" },
    { code: "CAI025", name: "مكتب تحصين نصر ثان" }

];

async function seedData() {

    try {

        for (const office of offices) {

            await db.collection("users").doc(office.code).set({

                username: office.code,
                password: "Cairo@123",

                officeName: office.name,

                role: "office",

                createdAt: new Date()

            });

            console.log(`✅ Added ${office.code}`);

        }

        // Admin
        await db.collection("users").doc("admin").set({

            username: "admin",

            password: "admin123",

            officeName: "Super Admin",

            role: "admin",

            createdAt: new Date()

        });

        console.log("✅ Admin Added");

        process.exit();

    } catch (error) {

        console.log(error);

    }

}

seedData();