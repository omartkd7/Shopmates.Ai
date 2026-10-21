from pathlib import Path
from html import escape
import re, json, hashlib

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/pdf'
chapters = []
descriptions = {}

def read(path):
    return (ROOT/path).read_text(encoding='utf-8-sig')

def para(title, text):
    return ('text', title, text)

def code(path, anchor, count=14, before=0):
    lines = read(path).splitlines()
    start = next(i for i,l in enumerate(lines) if anchor in l) - before
    start = max(0,start)
    text = '\n'.join(f'{i+1:>4}  {l}' for i,l in enumerate(lines[start:start+count],start))
    return ('code', path, text)

def lesson(title, files, intro, blocks):
    chapters.append({'title':title,'files':files,'intro':intro,'blocks':blocks})
    for f in files:
        descriptions.setdefault(f, intro)

lesson('من الفكرة للكود: النسخة الموسعة', [], 'ShopMate AI • Omar Fahid • مراجعة تعليمية بتاريخ 21 أكتوبر 2026', [
para('شنو تزاد؟', 'هاد الجزء كيمشي مع الملفات والدوال الفعلية. كل مقطع كود فيه أرقام السطور من النسخة المحلية، ومن بعدو شرح بالدارجة. فالآخر كاين فهرس ملفات، وملحق فيه الدليل الأول ديال الأساسيات.'),
para('كيفاش تستعملو؟', 'بدا برحلة الدخول، من بعد الكاتالوغ والطلب، ومن بعد RAG والشات. فكل مقطع جاوب: شنو دخل؟ شنو تحققنا منو؟ فين قرينا أو كتبنا؟ شنو رجع؟ هاد الأسئلة كتحول القراية لفهم.'),
para('الحدود ديال هاد الوثيقة', 'الشرح كيغطي أجزاء التطبيق والـscripts، وكيشرح المقاطع المهمة بالتفصيل. ماشي تعليق مستقل على كل سطر تنسيق أو كل مكتبة خارجية. نسخة HTML المرافقة فيها ملفات المصدر المختارة كاملة ومرقمة باش تتابع أي سطر خارج المقتطفات.'),
para('المصدر والدليل', 'النسخة المحلية مربوطة بـgithub.com/omartkd7/Shopmates.Ai، وHEAD اللي تقرا هو 73187a0. فتح GitHub عبر أداة الويب فشل؛ ما كنأكدوش التطابق مع آخر نسخة بعيدة. هادي مراجعة كود، ماشي نتيجة اختبارات جديدة ولا إثبات تشغيل الإنتاج.'),
para('مهم للمناقشة', 'التعليق فالكود يقدر يكون قديم. التنفيذ هو اللي كنشرحوه. ملي كاين فرق أو حد معروف، كتلقاه مذكور باش ما تقدمش ضمان أكبر من الموجود.'),
])

lesson('01 • اللغة اللي مكتوب بها المشروع', ['backend/src/models/Product.ts','mobile/src/components/Button.tsx'], 'TypeScript كيوصف البيانات، وJavaScript هو السلوك اللي كيتنفذ. TSX كيخلينا نكتب واجهة React مع الكود.', [
para('import و export', 'import كيدخل دالة أو component من ملف آخر. export كيخلي ملفات أخرى تستعملها. المسار اللي كيبدا بنقطة نسبي للملف؛ @/ فالموبايل alias مضبوط فإعدادات TypeScript.'),
para('const و let و function', 'const كيثبت الربط ديال الاسم بالقيمة، ولكن object داخل const يقدر يتبدل. let كتستعمل لقيمة غادي نبدلوها بحال total. function كتجمع تعليمات قابلة لإعادة الاستعمال.'),
code('backend/src/models/Product.ts','interface ProductData',16),
para('شرح الأنواع', 'number عدد، string نص. price: number | string كتعني الثمن يقدر يجي بأي واحد من هاد النوعين؛ DECIMAL من PostgreSQL يقدر يرجع كنص. ? كتعني الخاصية اختيارية. null قيمة صريحة كتقول ما كايناش معلومة.'),
para('as و ! و ?. و ??', 'as كيوجه TypeScript وما كيحققش المدخلات وقت التشغيل. req.user! كيقول للمحلل افترض موجود؛ authenticate هو اللي خاصو يضمن هادشي. ?. وصول آمن إلا القيمة غائبة. ?? قيمة بديلة غير ملي تكون null أو undefined، وكيحافظ على 0.'),
para('تمرين', 'علاش stock ?? 0 مناسب؟ حيث مخزون 0 قيمة صحيحة. علاش as Product ماشي حماية؟ حيث ما كيبدلش البيانات الخارجية ولا كيتحقق منها.'),
])

lesson('02 • async و await و try/catch', ['backend/src/server.ts'], 'اتصال قاعدة البيانات والشبكة كيحتاجو وقت. Promise كتمثل نتيجة غادي تجي من بعد.', [
code('backend/src/server.ts','async function startServer',15),
para('سطر بسطر', 'async كتخلي الدالة ترجع Promise. await sequelize.authenticate كينتظر التأكد من الاتصال بالقاعدة. app.listen كيبدا استقبال HTTP غير بعد نجاح الاتصال. callback ديال listen كيتنفذ ملي السيرفر يبدا يسمع.'),
para('إلا وقع خطأ', 'catch كيلتقط فشل الربط، كيطبع الخطأ وكيحدد exitCode = 1. هاد الرمز كيخبر النظام أن التشغيل فشل. ماشي نفس res.status(500)، حيت هنا مازال كنشغلو العملية.'),
para('try / catch / finally', 'try فيه الخدمة اللي تقدر تفشل. catch فيه المعالجة. finally كيتنفذ بعد النجاح أو الفشل، وكيصلح نسدو connection أو نطفيو loading.'),
para('Promise.all', 'كيشغل عمليات مستقلة مع بعضيتها وكيجمع النتائج. إلا وحدة فشلات كيترفض التجميع؛ ما كيلغيش آلياً الباقي. فعملية شراء مترابطة كنحتاجو transaction، ماشي غير Promise.all.'),
])

lesson('03 • app.ts: ترتيب استقبال الطلب', ['backend/src/app.ts'], 'هاد الملف كيبني تطبيق Express ويربط كل مجموعة URLs بالـrouter ديالها.', [
code('backend/src/app.ts','const appserver',15),
para('المراحل', 'express() كينشئ التطبيق. helmet كيزيد headers أمنية. cors كيتحقق من origin حسب الإعداد. globalRateLimiter كيحد عدد الطلبات. express.json كيحوّل body JSON لـobject فـreq.body.'),
code('backend/src/app.ts','appserver.use("/api/auth"',11),
para('تركيب URL', 'الـprefix /api/auth مع /login داخل authRouter كيعطي /api/auth/login. هاد التقسيم كيخلي app.ts صغير، وكل router مسؤول على مجال واحد.'),
para('الخطأ والصحة', 'errorHandler مركب فالآخر باش يستقبل next(err) من المسارات السابقة. /health كيرجع جواب ثابت؛ نجاحه بوحدو ما كيثبتش أن LLM وMCP وRAG خدامين.'),
])

lesson('04 • middleware: حراس قبل الخدمة', ['backend/src/middlewares/auth.ts','backend/src/middlewares/roles.ts','backend/src/middlewares/tenant.ts'], 'Middleware دالة كتدخل بين الطلب والتنفيذ. إما تكمل بـnext، وإما تجاوب وترجع.', [
code('backend/src/middlewares/auth.ts','const authHeader',18),
para('شرح المقطع', 'headers.authorization فيه Bearer ثم التوكن. substring(7) كينحي كلمة Bearer والمسافة. verifyAccessToken كيتحقق من التوقيع والصلاحية. payload كيتحط فـreq.user. next كيمرر للمرحلة اللي من بعد.'),
para('علاش return مهم؟', 'ملي رجعنا 401 خاص الدالة توقف. إلا كملات حتى next، تقدر تنفذ خدمة لمستخدم ما ثبتش هويتو أو ترسل جوج أجوبة.'),
para('requireRole', 'هاد middleware كيتأكد أن الدور داخل اللائحة المسموحة. authenticate كيعرف شكون دخل، وrequireRole كيتحقق واش يقدر يدير العملية. إخفاء زر ADMIN فالواجهة ما كيعوضوش.'),
para('injectTenant و resolveStoreTenant', 'الأول كيستعمل storeId من الهوية المتحقق منها وكيحيد تأثير القيمة المرسلة من العميل. الثاني يسمح بقراية كاتالوغ متجر الديمو بلا دخول، أو يستعمل المتجر من JWT إلا كان موجود وصالح.'),
])

lesson('05 • Zod: التحقق وقت التشغيل', ['backend/src/middlewares/validate.ts','backend/src/schemas/order.ts','backend/src/schemas/auth.ts','backend/src/schemas/product.ts','backend/src/schemas/category.ts'], 'الطلب الخارجي ما نثقوش فالشكل ديالو. Zod كيرجع بيانات مقبولة أو أخطاء قبل الوصول للخدمة.', [
code('backend/src/middlewares/validate.ts','const parseResult',15),
para('safeParse', 'كيعطي success: true ومعاه data، أو success: false ومعاه error. flatten().fieldErrors كينظم أخطاء الحقول. من بعد النجاح req.body كيتعوض بالبيانات اللي خرجات من schema.'),
code('backend/src/schemas/order.ts','export const createOrderSchema',11),
para('شرح قواعد الطلب', 'z.literal(true) كيقبل غير true، ماشي false ولا النص "true". items خاصها عنصر واحد على الأقل. كل عنصر عندو productId موجب وquantity عدد صحيح من 1 لفوق. optional كيسمح بغياب الحقل.'),
para('coerce و infer', 'coerce.number كيحول قيمة نصية بحال "42" لعدد قبل باقي التحقق. z.infer كيشتق type ديال TypeScript من schema باش ما نكتبووش نفس الوصف مرتين.'),
para('تفصيل Express', 'validate كيعالج body مباشرة. بالنسبة query وparams كيستعمل Object.defineProperty باش يحط البيانات المتحققة فنسخة Express المستعملة هنا.'),
])

lesson('06 • register: خلق الحساب خطوة بخطوة', ['backend/src/routes/auth.ts'], 'الواجهة كترسل الاسم والبريد وكلمة السر، والخادم هو اللي كيحدد المتجر والدور.', [
code('backend/src/routes/auth.ts','const passwordHash = await bcrypt.hash',16),
para('قبل هاد المقطع', 'registerSchema كيتحقق من body. Store.findOne كيقلب على متجر الديمو. User.findOne كيشوف واش نفس البريد موجود فنفس المتجر؛ إلا موجود كيرجع 409.'),
para('المقطع', 'bcrypt.hash(password,10) كيحسب hash بتكلفة 10. User.create كيخزن الحساب بالدور CUSTOMER. storeId جا من المتجر اللي اختارو الخادم. كلمة السر الأصلية ما كتترجعش فالجواب.'),
para('Customer', 'Customer.findOrCreate كيضمن ملف زبون للطلبات مرتبط بـstoreId وemail. معرف User ما خاصوش يتخلط مع معرف Customer. هما جوج جداول عندهم دور مختلف.'),
para('نهاية المسار', 'issueTokenPair كينشئ access وrefresh. res.status(201).json كيرجع بيانات المستخدم المسموحة والتوكنات. الرد ما فيهش hash ديال كلمة السر.'),
para('حد التنفيذ', 'خطوات إنشاء User وCustomer والتوكنات ماشي مجمعة كلها فمعاملة واحدة هنا. خاص نفهمو هاد الفرق قبل ما نقولو التسجيل كله atomic.'),
])

lesson('07 • JWT و إصدار زوج التوكنات', ['backend/src/config/jwt.ts','backend/src/routes/auth.ts'], 'Access token بطاقة موقعة للاستعمال مع الطلبات. Refresh token سر عشوائي لتجديد الجلسة.', [
code('backend/src/routes/auth.ts','const rawRefreshToken',13),
para('raw و hashed', 'rawRefreshToken كيمشي للعميل. hashedRefreshToken كيتخزن فالقاعدة. إلا تسرب جدول refresh، القيم المخزنة ماشي هي التوكنات الخام اللي كتتقدم للتجديد.'),
code('backend/src/config/jwt.ts','export function generateRefreshToken',7),
para('randomBytes و SHA-256', 'randomBytes(40) كيولد 40 بايت عشوائية، وhex كيحولها لنص. hashToken كيحسب بصمة SHA-256 باش نقدر نقلب على توكن بلا تخزينو خام. bcrypt لكلمات السر، وSHA-256 هنا لسر عشوائي قوي.'),
para('Access token', 'signAccessToken كيوقع userId وstoreId وrole وemail. المدة الافتراضية 15 دقيقة، وrefresh سبعة أيام. التوقيع ما كيخبيش محتوى JWT؛ ما نحطوش فيه أسرار.'),
para('الإعداد الحالي', 'jwt.ts فيه fallback ثابت محلي للسر. فالإنتاج خاص JWT_SECRET قوي ومضبوط؛ fallback معروف ما يصلحش كأساس آمن للإنتاج. القيمة نفسها ما محتاجينهاش فهاد الدليل.'),
])

lesson('08 • login ثم refresh ثم logout', ['backend/src/routes/auth.ts'], 'هاد المسارات كيتعاونو باش يبقى المستخدم داخل بلا ما يعاود كلمة السر كل دقيقة.', [
code('backend/src/routes/auth.ts','const isMatch = await bcrypt.compare',10),
para('login', 'الخادم كيلقى الحساب بنفس المتجر والبريد. bcrypt.compare كيقارن الكلمة المدخلة مع hash. إلا الحساب أو الكلمة غلط، نفس رسالة Invalid email or password كتخرج. إلا صحيح كنصدر زوج توكنات.'),
code('backend/src/routes/auth.ts','// ROTATION:',9),
para('refresh', 'كنحسبو hash ديال التوكن المرسل، كنلقاو السجل، كنشوفو expiresAt والمستخدم. كنحيدو القديم وكنصدرو الجديد. الاستعمال اللاحق للقديم كيترفض ملي السجل تحيد.'),
para('logout و me', 'logout كيمسح سجل refresh المطابق. /me كيرجع الهوية المستخرجة من JWT، ماشي قراءة جديدة كاملة لملف User. لذلك الاسم فالواجهة بعد الاسترجاع كيتعوض مؤقتاً باسم مشتق من البريد.'),
para('الحدود', 'access القديم يقدر يبقى صالح حتى expires. rotation هنا ماشي transaction بقفل، لذلك تجربة تسلسلية ناجحة ما كتثبتش سلامة سباق جوج refresh فنفس اللحظة.'),
])

lesson('09 • models و migrations و associations', ['backend/src/models/Product.ts','backend/src/models/index.ts','backend/src/models/tenantScope.ts'], 'Model كيوصف التعامل مع سجل فالكود. Migration كتبدل بنية قاعدة البيانات. Association كتربط النماذج ببعضياتها.', [
code('backend/src/models/Product.ts','price: {',15),
para('قراءة Product.init', 'DataTypes.DECIMAL(10,2) كيوصف الثمن بعشرة أرقام إجمالاً وجوج بعد الفاصلة. stock عدد صحيح وافتراضه 0. allowNull:false كيمنع NULL، ولكن ماشي بوحدو شرط stock >= 0.'),
para('Primary و foreign keys', 'Primary key كيحدد سجل وحيد. Foreign key كيربط عمود بسجل فجدول آخر. وجود productId كـnumber فـinterface ما كينشئش foreign key؛ migration هي اللي كتدير القيد فالقاعدة.'),
code('backend/src/models/tenantScope.ts','export function addStoreScope',11),
para('forStore', 'addStoreScope كيسجل scope اسمي كيضيف where.storeId. forStore كيطبقو بعد التحقق أن المعرف موجب وآمن. كل query خاصو scope أو شرط واضح؛ Sequelize ما كيعرفش المتجر الحالي بوحدو.'),
para('Associations', 'Order.hasMany(OrderItem) كتسمح بـinclude items. OrderItem.belongsTo(Product) كتسمح بمنتوج السطر. aliases بحال items وproduct خاصها توافق أسماء include فالمسارات.'),
])

lesson('10 • GET products: البحث والتقسيم', ['backend/src/routes/products.ts'], 'هاد المسار كيحول الفلاتر اللي فالواجهة لشروط استعلام محددة.', [
code('backend/src/routes/products.ts','const page = query.page',16),
para('حساب الصفحات', 'page=1 وlimit=20 كيعطيو offset=0. page=2 كتعطي offset=20. offset هو عدد السجلات اللي غادي نتجاوزو. schema كتحد القيم قبل الحساب.'),
para('الفلاتر', 'Op.or كيعني الاسم أو الوصف. Op.iLike بحث نصي ما كيفرقش الحروف الكبيرة والصغيرة. Op.gte هو أكبر أو يساوي، وOp.lte أصغر أو يساوي. categoryId كيزيد شرط الصنف.'),
code('backend/src/routes/products.ts','const scopedProduct',13),
para('findAndCountAll', 'rows هي الصفحة الحالية وcount هو العدد المطابق. include category كيجيب صنف المنتوج. required:false كيسمح بمنتوج بلا صنف. Math.ceil(total/limit) كيعطي عدد الصفحات.'),
para('مساران آخران', '/:id كيجيب التفاصيل، و/:id/stock كيجيب الثمن والمخزون الحاليين مع inStock. القراءة الحالية ما كتحجزش السلعة؛ الحجز الفعلي كيتقرر وقت معاملة الطلب.'),
])

lesson('11 • تعديل المنتجات والأصناف', ['backend/src/routes/products.ts','backend/src/routes/categories.ts'], 'الإدارة كتحتاج التحقق من الدور والمتجر والمدخلات، حتى إلا الواجهة عطلات الأزرار لغير المسؤول.', [
code('backend/src/routes/products.ts','productsRouter.post(',12),
para('ترتيب الحماية', 'authenticate ثم injectTenant ثم requireRole("ADMIN") ثم validate. من بعد الخدمة كتقلب على category داخل نفس المتجر، وكتفحص SKU إذا تعطى قبل إنشاء المنتوج.'),
code('backend/src/routes/products.ts','await product.update({',12),
para('التعديل الجزئي', '... هو spread كيدخل خصائص object داخل object آخر. الشرط !== undefined كيفرق بين حقل ما ترسلش وبين قيمة بحال 0 أو null. بهاذ الطريقة stock=0 يتطبق فعلاً.'),
para('الأصناف', 'categories.ts فيه list/detail/create/update/delete. الاسم كيتفحص داخل المتجر قبل الإنشاء أو التعديل. product.categoryId رابط لصنف؛ ماشي النص ديال اسم الصنف مخزن فكل منتوج.'),
para('الحذف', 'destroy كيطلب حذف السجل. إلا عندو علاقات بقيود فالقاعدة، النتيجة كتتبع القيود. تنبيه الحذف فالواجهة كيساعد المستخدم ولكن ما كيغيرش قواعد قاعدة البيانات.'),
])

lesson('12 • إنشاء طلب من REST', ['backend/src/routes/orders.ts','backend/src/schemas/order.ts'], 'POST /api/orders كيحتاج confirmed:true وكيحسب الثمن من القاعدة.', [
code('backend/src/routes/orders.ts','const result = await sequelize.transaction',15),
para('بداية المعاملة', 'sequelize.transaction(async t => ...) كيدير commit إلا callback نجح، وrollback إلا رمى خطأ. كل query تابع للمعاملة خاصو transaction:t. resolveCustomer وتحديث الهاتف اللي قبلها خارج هاد المعاملة.'),
code('backend/src/routes/orders.ts','const product = (await Product.findOne',10),
para('القفل', 'where فيه productId وstoreId. lock: t.LOCK.UPDATE كيقفل السجل فالمعاملة. من بعد كيتراجع المخزون؛ إذا ما كافيش throw كيوقف العملية ويرجع أثرها.'),
para('الحساب والتخزين', 'unitPrice كيتقرا من product.price. total كيتجمع بالكمية. decrement كينقص المخزون. Order.create كيخلق طلب PENDING. OrderItem.bulkCreate كيحفظ السطور بunitPrice وقت الشراء.'),
para('بعد commit', 'notifyOrderCreated كيتنادى بعد المعاملة بـvoid؛ فشل n8n ما يرجعش البيع لور. الجواب 201 فيه الطلب والسطور. confirmed:true شرط API، ولكن ماشي إثبات تشفيري أن شخص ضغط زر فعلاً.'),
])

lesson('13 • قراية الطلب وإلغاؤه', ['backend/src/routes/orders.ts'], 'نفس storeId ما كافيش؛ الزبون خاص يشوف غير طلباتو.', [
code('backend/src/routes/orders.ts','if (!customer || order.customerId !== customer.id)',6),
para('GET /orders', 'إذا CUSTOMER، كنلقاو Customer بالبريد والمتجر وكنفلتروا الطلبات بcustomerId. ADMIN يقدر يشوف طلبات متجره. include كيرجع سطور الطلب والمنتجات المرتبطة.'),
para('GET /orders/:id', 'أولاً طلب من نفس المتجر، ثم ملكية الزبون. الطلب ديال شخص آخر كيرجع 404 باش ما نكشفوش وجوده بسهولة. الدور موثوق لأنه من JWT متحقق منه.'),
code('backend/src/routes/orders.ts','if (order.status === "SHIPPED"',9),
para('الإلغاء العادي', 'POST /:id/cancel كيطلب confirmed:true. كيقفل الطلب، كيتحقق من الملكية ومن الحالة، كيجيب السطور ويرجع المخزون بـincrement ثم يبدل الحالة CANCELLED داخل المعاملة.'),
para('PATCH ديال ADMIN', '/:id/status كيقبل حالة من enum وكيعيد المخزون عند الانتقال للإلغاء. ما كايناش آلة انتقالات كاملة تمنع جميع القفزات بين الحالات؛ خاص ما نصفوش كل انتقال بأنه محمي بقواعد تجارة كاملة.'),
])

lesson('14 • RAG: upload والـtransaction', ['backend/src/routes/documents.ts'], 'الملف المرفوع كيتحول لنص، ثم مقاطع، ثم embeddings، ثم سجلات قابلة للبحث.', [
code('backend/src/routes/documents.ts','const upload = multer',13),
para('Multer', 'memoryStorage كيحط الملف فالذاكرة. الحد 2*1024*1024 بايت. الصيغ المقبولة md وtxt حسب MIME أو الامتداد. upload.single("file") كيتوقع اسم الحقل file فـFormData.'),
para('الدخول', 'documentsRouter.use كيركب authenticate وinjectTenant وADMIN لجميع مسارات الوثائق. التعليق اللي كيقول search متاح لكل مستخدم ما كيبدلش هاد الحماية العامة.'),
code('backend/src/routes/documents.ts','const textChunks = chunkText(rawText)',14),
para('الخطوات', 'Document كيتخلق processing داخل transaction. chunkText كيقسم rawText. ملف بلا نص مفيد كيرجع 422. embedChunks كينادي المزود، ثم bulkCreate كيحفظ محتوى كل مقطع والمتجه ديالو.'),
para('النجاح والفشل', 'completed وcommit يعني المقاطع تحفضو. إلا وقع فشل كنديرو rollback ثم سجل failed برسالة آمنة. processing داخل نفس المعاملة ماشي بالضرورة حالة مرئية للائحة من connection أخرى أثناء الانتظار.'),
])

lesson('15 • chunkText: تتبع المؤشر', ['backend/src/services/rag.ts'], 'هاد الدالة كتخدم بالنص فقط، بلا database وبلا LLM.', [
code('backend/src/services/rag.ts','const normalised',14),
para('normalised و start و end', 'كنوحدو نهايات السطور وكنحيدو الفراغ من الطرفين. start هو بداية المقطع. end هو الأصغر بين start+800 ونهاية النص. while كتكمل مادام start ما وصلش للنهاية.'),
para('حدود طبيعية', 'قبل القطع كنجربو نلقاو نهاية فقرة، سطر أو مسافة. lastIndexOf كيقلب لور من end. الهدف ما نقطعوش الكلمة وسطها إلا ما لقيناش حد مناسب.'),
code('backend/src/services/rag.ts','const chunk = normalised.slice',10),
para('slice و overlap', 'slice كتاخذ الجزء بين start وend. push كتزيدو فاللائحة. end-100 كيخلي تداخل مع المقطع السابق. Math.max(start+1,...) كيضمن المؤشر يتقدم وما يبقاش loop لا نهائية.'),
para('ملاحظة فعلية فالكود', 'ملي end توصل لنهاية النص، ما كاينش break؛ start كيرجع لور بمقدار overlap ثم كيتقدم. هذا يقدر يولد مقاطع ذيلية متكررة بزاف. الهدف ~800/100 واضح، ولكن التنفيذ الحالي خاصو مراجعة نهاية الحلقة.'),
])

lesson('16 • embedding ثم SQL similarity', ['backend/src/services/rag.ts','backend/sql/001_init_pgvector.sql'], 'البحث كيقارن تمثيل السؤال العددي بتمثيلات المقاطع داخل متجر واحد.', [
code('backend/src/services/rag.ts','export async function embedText',8),
para('embedText و embedChunks', 'الأولى كتبعث نص واحد وترجع embedding من الجواب. الثانية كتقسم لائحة المقاطع لدفعات 100 وتجمع المتجهات. النموذج الافتراضي text-embedding-3-small، والعمود مضبوط على 1536 بُعد.'),
code('backend/src/services/rag.ts','    SELECT',14),
para('شرح SQL', 'JOIN كيربط المقطع بالوثيقة باش نجيبو اسم المصدر. <=> هي cosine distance. 1-distance كتستعمل كscore. WHERE كيحدد storeId ومتجه غير فارغ وscore فوق العتبة. ORDER BY كيقدم الأقرب وLIMIT كيحد العدد.'),
para('replacements', 'القيم كتتعطى منفصلة عبر أسماء vector وstoreId وthreshold وtopK. ما كنركبوش السؤال الخام داخل نص SQL. هادي كتقلل خطر حقن SQL فهاد الاستعلام.'),
para('العثور ماشي صحة مؤكدة', '0.75 عتبة قرب دلالي ماشي نسبة احتمال صحة. HNSW كيسرع البحث التقريبي. خاص تقييم أسئلة حقيقية باش تختار العتبة، وكتراجع الوثيقة نفسها واش صحيحة.'),
])

lesson('17 • حذف وإعادة فهرسة الوثائق', ['backend/src/routes/documents.ts','backend/src/seed.ts'], 'وجود Document ماشي هو وجود معرفة مفهرسة وقابلة للاسترجاع.', [
para('GET اللائحة', 'findAll كيجيب metadata. Chunk.findAll مع COUNT وgroup كيحسب chunksCreated لكل وثيقة. Map كتجمع العدد مع كل document فالجواب بلا قراءة النصوص كاملة.'),
para('reingest', 'PUT /:id/reingest كيتحقق من الوثيقة داخل المتجر، كيبدا transaction، كيحيد المقاطع القديمة، كيقسم وكيولد embeddings الجديدة ثم commit. إلا فشل كيرجع rollback.'),
para('delete', 'كيجيب الوثيقة بالمتجر ثم كيحذف chunks بstoreId وdocumentId والوثيقة داخل transaction. من بعد الحذف ما خاصش هاد المقاطع تبقى مصدر للاسترجاع.'),
code('backend/src/seed.ts','      await Chunk.findOrCreate',12),
para('تفصيل seed', 'المقطع هنا embedding:null، والوثيقة فseed pending. retrieveContext كيستبعد embedding الفارغ. خاص ingestion أو reingestion حقيقية باش وثائق الديمو تدخل البحث المتجهي.'),
para('ترتيب route', '/:id معلنة قبل /search فهاد router. Express يقدر ياخذ search كأنه id. هاد endpoint خاص ترتيب أكثر دقة؛ agent كيستعمل retrieveContext مباشرة، ما كيمرش من endpoint search.'),
])

lesson('18 • llm.ts: الاتصال بالمزود', ['backend/src/services/llm.ts'], 'هاد الملف كيجمع إعدادات الاتصال وتعليمات المساعد وآلية قراءة streaming من المزود.', [
code('backend/src/services/llm.ts','export function getLlmClient',10),
para('إعدادات المزود', 'getLlmBaseUrl وgetLlmApiKey كيقراو أسماء البيئة بالترتيب المحدد. getLlmClient كينشئ SDK بtimeout 30 ثانية وmaxRetries=2. هادي مهلة للطلب، ماشي ضمان أن الدور كامل يسالي ف30 ثانية.'),
para('buildSystemPrompt', 'كيوصف دور ShopMate واللغة والمصادر والرفض والأدوات. النص كيتضاف لmessages. التحقق من الملكية والصلاحيات خاصو يبقى حتى فالدوال البرمجية.'),
code('backend/src/services/llm.ts','const createStream',15),
para('parameters', 'model اسم النموذج؛ messages الحوار؛ tools وصف القدرات؛ tool_choice:auto يخلي النموذج يقترحها؛ stream:true يطلب جواب متدرج؛ max_tokens حد خرج الطلب؛ temperature:0.3 تقلل التنوع وماشي ضمان صحة.'),
para('التوافق', 'الكود كيجرب include_usage. إلا المزود رفض هاد الخيار، كيعاود بلا بيه. usage الغائبة خاصها تبقى غير متوفرة، ما نفهموهاش كاستهلاك صفر.'),
])

lesson('19 • streamChat: جمع أجزاء الجواب', ['backend/src/services/llm.ts'], 'المزود يقدر يرجع النص أو اسم الأداة وarguments مقطعين على عدة chunks.', [
code('backend/src/services/llm.ts','for await (const chunk',18),
para('for await', 'كتقرا stream جزء بجزء. delta هو التغيير الجديد. fullText كيجمع النص. onToken callback كيبلغ المستعمل ديال هاد الدالة؛ فـagent.ts المستعمل كيخزن النص حتى يدوز moderation.'),
para('Tool calls', 'كل tool call عندو index وid. accumulatedToolCalls كيجمع name وarguments اللي جاو على دفعات. JSON ما خاصوش يتنفذ قبل ما يكتمل؛ onToolCalls كيتنادى بعد نهاية الجمع.'),
para('ترتيب callbacks', 'onToolCalls كيكون awaited قبل onDone. بهذا agent يقدر يضيف نتائج الأدوات لmessages ثم يقرر واش ينادي النموذج مرة أخرى.'),
para('Abort و error', 'AbortSignal كيتعطى لطلب المزود. إذا تبطل، الدالة كتخرج بهدوء. خطأ آخر كيمشي لـonError. هادشي مختلف عن جواب رفض عادي من قواعد المتجر.'),
para('chat()', 'الدالة الأخيرة كتطلب completion بلا streaming وترجع content أو نص فارغ. ما تفترضش أن كل export مستعمل فالمسار الرئيسي؛ agent عندو حتى loop JSON خاص به.'),
])

lesson('20 • agent.ts: بداية الدور', ['backend/src/routes/agent.ts'], 'هاد route هو المنظم: هوية → محادثة → حمايات → مصادر → نموذج وأدوات → جواب وسجل.', [
code('backend/src/routes/agent.ts','const chatMessageSchema',5),
para('المدخلات', 'message بين 1 و2000 حرف بعد trim. conversationId اختياري موجب. authenticate وinjectTenant مركبين على router كامل، وagentRateLimiter على /chat.'),
code('backend/src/routes/agent.ts','if (conversationId)',15),
para('المحادثة', 'البحث كيجمع id وuserId داخل scope المتجر. إذا ما لقاهاش كيخلق جديدة بعنوان أول 40 حرف. معرفة conversationId ديال شخص آخر ما كتسمحش بتحميل محادثتو.'),
para('الحفظ والحماية', 'Message.create كيحفظ سؤال المستخدم. بعدها checkPromptInjection ثم checkProhibitedIntent. الرسالة المشبوهة كتتعوض فالتاريخ بنص محجوب باش ما يعاودش النموذج يتعرض ليها كحوار عادي.'),
para('المسار القصير', 'الرفض كيتسجل ويرجع بلا استدعاء LLM. التأكيد على pending action حتى هو مسار مباشر، ولكن بعد فحص الرسالة الممنوعة باش ما تؤكدش عملية بالخطأ.'),
])

lesson('21 • agent.ts: السياق والتاريخ', ['backend/src/routes/agent.ts'], 'السؤال الحالي كيحتاج سياق، ولكن كل سياق خاصنا نعرفو المصدر والثقة ديالو.', [
code('backend/src/routes/agent.ts','const retrievedChunks',14),
para('RAG filtering', 'retrieveContext كيرجع المقاطع القريبة. filter كيستبعد المقطع إذا source أو content فيه نمط مشبوه. ragSources كيسجل حتى واش المقطع omitted باش يبقى الأثر.'),
code('backend/src/routes/agent.ts','const history = await Message.findAll',8),
para('تركيب messages', 'System prompt أولاً، ثم جزء من التاريخ، ثم context فيه المقاطع المنقاة، ثم السؤال الحالي. سياق RAG كيتغلف بعلامات context مع تعليمات اعتباره بيانات.'),
para('ملاحظة على history', 'الاستعلام ASC مع limit:10 كيجيب أول عشرة، ماشي آخر عشرة. history.slice(0,-1) مفترض يحيد السؤال اللي تزاد، ولكن بعد طول المحادثة هاد الافتراض ما يبقاش صحيح. خاص تشرح الحد الحالي بوضوح.'),
para('سؤال للفهم', 'واش النموذج كيذكر كل محادثات الناس؟ لا. الخادم هو اللي كيختار messages من المحادثة المسموحة ويرسلها فكل طلب. الذاكرة هنا مخزنة فالقاعدة ومركبة بالكود.'),
])

lesson('22 • loop ديال الأدوات', ['backend/src/routes/agent.ts','backend/src/services/agentTools.ts'], 'اقتراح الأداة من النموذج كيرجع للخادم؛ الخادم ينفذ ويرجع النتيجة للنموذج.', [
code('backend/src/routes/agent.ts','const validation = validateToolCall(toolName',12),
para('ثلاث خطوات', 'validateToolCall كيتحقق. executeToolCall كيعيد التحقق وينفذ. toolsCalled كيسجل args المتحققة وحالة validation. toolCallCount كيزيد حتى إلا كانت النتيجة خطأ، باش المحاولات ما تكونش بلا حد.'),
para('messages ديال الأدوات', 'الرسالة assistant كتحتوي tool_calls. من بعد كنضيفو role:tool مع tool_call_id باش المزود يعرف نتيجة أي استدعاء. content منقى بـsanitizeContextData.'),
para('الحد 3', 'canCallAnotherTool كيسمح مادام العدد أقل من 3. الحد كيتطبق على الاستدعاءات المنفذة، ماشي على عدد الكلمات أو عدد رسائل المستخدم.'),
para('الحد الحالي', 'ملي كيتستنفد الحد أثناء tool calls، loop JSON يقدر يبقى آخر عنصر فيه role:tool ويخرج finalResponse فارغ. كذلك دفعة فيها أدوات أكثر من السقف تحتاج إكمال بروتوكول النتائج بعناية. هادشي نقطة مراجعة، ماشي وعد بجواب كامل فكل حالة.'),
para('العلاقة بالثمن', 'الأداة كتجيب رقم حقيقي من DB، ولكن صياغة LLM النهائية ممكن تبقى تخطئ. مراجعة المخرجات الحالية ما كتقارنش كل رقم بالناتج بشكل شامل.'),
])

lesson('23 • allowlist و Zod و dispatcher', ['backend/src/services/agentTools.ts','backend/src/schemas/agentTools.ts'], 'هاد الطبقة كتحدد شنو يقدر المساعد يدير وبأي مدخلات.', [
code('backend/src/services/agentTools.ts','delete parsedArgs.storeId',13),
para('قبل المقطع', 'الاسم خاصو يكون داخل ALLOWED_TOOLS. rawArguments إذا نص، JSON.parse كيقراه. malformed JSON كيرجع خطأ. خاص حتى الحالات JSON بحال null تتراجع قبل التعامل معها كobject.'),
para('المقطع', 'كنحيدو storeId وuserId وcustomerId من اقتراح النموذج. schema.safeParse كيتحقق من باقي args. context الحقيقي كيبقى من الخادم. حذف identity من args ما يعنيش أن جميع النتائج مصرح بها؛ كل أداة خاصها فلترة.'),
para('dispatcher', 'switch على validation.toolName كيربط الاسم بالدالة الفعلية. ما كاينش eval ديال كود كتب النموذج. tool definitions اللي كتتبعت للمزود كتشرح المدخلات، وZod كيطبقها وقت التنفيذ.'),
para('أدوات القراية', 'searchProductsTool لائحة محدودة وفلاتر؛ getProductDetailsTool تفاصيل؛ checkStockTool مخزون وثمن؛ getOrderStatusTool طلب مملوك؛ listMyOrdersTool آخر الطلبات بسقف20. getShipmentStatusTool كيتحقق من الملكية ثم MCP.'),
para('تنبيه التأكيد', 'schema ديال createOrder/cancelOrder كتقبل confirmed:boolean من النموذج، وdispatcher يقدر ينادي executeConfirmedAction إذا true مع pending موجود. هذا ما كيعطيش وحدو ضمان أن التأكيد جا من المستخدم؛ خاص ربط الإثبات بمسار موثوق.'),
])

lesson('24 • recap و pending confirmation', ['backend/src/services/orderConfirmation.ts'], 'initiateCreateOrderRecap كتقرا المعطيات وتحضر ملخص، وتخزن نية العملية مؤقتاً.', [
code('backend/src/services/orderConfirmation.ts','pendingConfirmations.set(conversationId',14),
para('القيم', 'token معرف عشوائي للملخص؛ conversationId رابط المحادثة؛ storeId وuserId الهوية؛ args العناصر؛ totalAmount المجموع؛ createdAt وقت البداية؛ executed واش تنفذات.'),
para('قبل الحفظ', 'الدالة كتقرا كل product داخل المتجر، كتتأكد من stock وكتحسب subtotal ثم calculatedTotal. كتجهز recap فيه المبلغ وCOD والعنوان والهاتف.'),
para('Map فالذاكرة', 'pendingConfirmations كتموت مع restart وما كتتشركش بين نسختين API. getPendingConfirmation وhasPendingConfirmation كينفذو مهلة15 دقيقة. ما نفسروش هاد التخزين على أنه سجل دائم.'),
para('affirmative', 'isAffirmativeConfirmation كتصغر الحروف وتحيد بعض العلامات وكتقلب على oui/ok/wakha وغيرها. مطابقة كلمة داخل جملة تقدر تغلط مع النفي. زر الواجهة كيرسل Oui، ولكن النص الحر خاص تعامل أقوى.'),
para('رفض الملخص', 'الواجهة كترسل Non, annuler وكتبدل حالة البطاقة. الكود اللي كيجهز pending ما فيهش مسار واضح لمسحها بهاد النص. ما نساويوش تغيير لون البطاقة مع إلغاء pending فالخادم.'),
])

lesson('25 • executeConfirmedAction: الشراء الفعلي', ['backend/src/services/orderConfirmation.ts'], 'التنفيذ كيقفل المخزون ويكتب الطلب، مع تنسيق مؤقت ضد تكرار نفس العملية.', [
code('backend/src/services/orderConfirmation.ts','const activeExecution',13),
para('Promise مشتركة', 'إلا نفس conversation عندها تنفيذ جاري، كنرجعو نفس Promise. finally كيمسحها من confirmationExecutions. pending.executedResult كيسمح بإرجاع نتيجة سابقة بدل كتابة جديدة.'),
para('performConfirmedAction', 'كتجيب pending ثم تختار createOrder أو cancelOrder. مسار الإنشاء كيعيد قراية المنتجات بقفل ومعاملة، كينقص المخزون، كيخلق Order بحالة CONFIRMED وOrderItems.'),
para('فرق REST والشات', 'REST كيبدأ الطلب PENDING، والشات المؤكد كيبدأه CONFIRMED. جوج مسارات كينفذو منطق متشابه فملفين؛ لهذا خاص مقارنة السلوك عند أي تعديل.'),
para('حدود خاص ما نخبيوهاش', 'performConfirmedAction ما كتعاودش تحقق TTL والهوية المخزنة فpending بشكل مستقل. ومسار الإلغاء ما كيعاودش نفس منع SHIPPED/DELIVERED ديال REST وقت التنفيذ. ضمانات المسار الأعلى ما كتغنيش عن حماية الدالة نفسها.'),
para('بيانات العنوان', 'العنوان كيبان فالrecap ولكن نموذج Order الحالي ما فيهش shippingAddress. فـREST حتى الحقل المقبول فschema ما كيتحفظش فOrder.create. اختيار الحجم فالواجهة حتى هو ما كيمشيش فالطلب. هادو حدود بيانات، ماشي مجرد تنسيق.'),
])

lesson('26 • guardrails.ts بالتفصيل', ['backend/src/services/guardrails.ts'], 'هاد الملف فيه قواعد نصية للرفض وتنقية السياق ومراجعة الجواب.', [
code('backend/src/services/guardrails.ts','export function checkPromptInjection',14),
para('RegExp', 'regex.test كيشوف واش النص كيوافق نمط. find كيرجع أول نمط مطابق. replace كينحي علامات تحاول تنتحل system أو instructions. الأنماط ما كتفهمش كل معاني اللغة.'),
para('sanitizeContextData', 'إذا النص فيه injection معروفة، كتبدلو برسالة محتوى محجوب. إلا ما بانش نمط، كتنحي بعض tags. هادي كتستعمل للوثائق ونتائج الأدوات.'),
para('checkProhibitedIntent', 'كتجرب مجموعات discount ثم refund ثم بيانات الآخرين ثم medical/legal ثم off-topic. كترجع shouldRefuse وcategory وrefusalMessage. false معناها الأنماط ما شداتش الطلب، ماشي إثبات أن كل محتوى آمن.'),
para('moderateAgentOutput', 'كتبحث على تسريب تعليمات/أسرار ووعود تخفيض معروفة، وترجع passed والنص البديل. ما كتتحققش من كل ادعاء طبي ولا من كل رقم مقارنة بDB.'),
para('الرسالة والإشعار', 'STANDARD_REFUSALS ديال remise كتقول تم الإحالة، بينما n8n best-effort. العبارة ما خاصهاش تعتبر دليل توصل المسؤول؛ خاص فصل عرض الإحالة عن نجاح الإرسال.'),
])

lesson('27 • SSE: النص النهائي كيخرج بعد المراجعة', ['backend/src/routes/agent.ts','mobile/src/api/agentChat.ts'], 'الاتصال واحد، والخادم كيكتب فيه أحداث JSON مفصولة بسطرين.', [
code('backend/src/routes/agent.ts','const safeSend',6),
para('wire format', 'data: ثم JSON ثم سطرين. type كيحدد شنو وقع: start للمحادثة، source للمصادر، tool_call/tool_result للأدوات، token للنص، done للنهاية، error للفشل.'),
code('backend/src/routes/agent.ts','// Enforce the RAG abstention',12),
para('منع اختلاق جواب بلا مصدر', 'إذا ما كاين لا ragChunks لا allToolsUsed، النص النهائي كيتعوض بجملة عدم المعرفة. استعمال أداة فاشلة كيبقى محسوب فallToolsUsed؛ لذلك هاد الشرط ماشي إثبات أن كل أداة أعطات سند صالح.'),
para('moderation أولاً', 'onToken ديال provider كيجمع fullResponse. من بعد كيدوز moderation، ثم safeSend كيخرج النص النهائي. telemetry تقدر توصل أثناء العمل، والنص ما كيتعرضش حرف بحرف فور توليده.'),
para('فصل الاتصال', 'النسخة الحالية كتسمع res.on("close") وكتفحص !res.writableEnded قبل abort. هادي أحسن دلالة على انقطاع الجواب من إغلاق request وحده؛ التحقق العملي من كل مزود باقي مستقل.'),
])

lesson('28 • AgentLog: شنو كيتسجل؟', ['backend/src/routes/agent.ts','backend/src/middlewares/sanitizeLogs.ts','backend/src/models/AgentLog.ts'], 'السجل مخصص لتتبع دور المساعد، والرسائل مخصصة لتاريخ الحوار.', [
code('backend/src/routes/agent.ts','await AgentLog.create',18),
para('مفاتيح التتبع', 'conversationId وmessageId كيربطو السجل بالمحادثة والجواب. input/output النصوص؛ toolsCalled فيه args المتحققة؛ ragSources المصادر؛ latencyMs فرق Date.now؛ tokenUsage مجموع الأرقام اللي عطا المزود.'),
para('التنقية', 'sanitizeForLogging كيمشي داخل arrays وobjects، كيحجب أسماء الحقول الحساسة وأنماط أسرار فالنص. promptTokens/completionTokens مقاييس عددية مسموحة، ماشي access tokens.'),
para('الطول والغياب', 'input/output مقطوعين عند4000 حرف وerror عند2000. usage تقدر تكون null. therefore full trace هنا أثر منظم محدود، ماشي نسخة غير محدودة من كل شيء.'),
para('GET /logs', 'ADMIN مع store scope. فلاتر page/limit/date/status/disposition/conversation. customerId فهاد endpoint كيتفسر كـUser ID عبر Conversation.userId، ماشي Customer.id ديال الطلبات.'),
para('حدود التغطية', 'طلبات مرفوضة فmiddleware قبل route، بحال401 أو429، ما كتوصلش لـrecordTurn. وتنقية AgentLog ما كتطبقش آلياً على كل console.error فالمشروع ولا على كل Message.'),
])

lesson('29 • MCP client والخادم المنفصل', ['backend/src/services/mcpShipmentClient.ts','backend/src/mcp/shipmentServer.ts'], 'getShipmentStatusTool كيتأكد من صاحب الطلب قبل التواصل مع خدمة التتبع.', [
code('backend/src/services/mcpShipmentClient.ts','await client.connect',13),
para('الخطوات', 'transport كيعرف URL وطريقة HTTP. client.connect كيبدا التواصل. callTool كيرسل الاسم وorderId وorderStatus. result.content كيتقلب فيه على نص، ومن بعد JSON.parse وZod قبل إرجاع البيانات.'),
para('finally', 'client.close كيتنادى حتى إلا وقع خطأ. fetchWithTimeout كيصنع AbortController ومؤقت5 ثوان لكل fetch، وكيحيد المؤقت والمستمع من بعد. المدة الإجمالية لعدة طلبات بروتوكول ماشي بالضرورة5 ثوان فقط.'),
para('الخادم', 'shipmentServer كيسجل الأداة بسكيما مدخلات. statusByOrder كيحول الحالة الداخلية لوصف نقل محاكى. trackingNumber مشتق من orderId، والموعد التقديري محسوب من الوقت الحالي؛ ماشي معلومة من ناقل حقيقي.'),
para('Node HTTP', 'الخادم كيجمع body، كيبني Web Request، كيمررو للhandler، وكيحول Web Response لجواب Node. SIGINT/SIGTERM كيناديو shutdown باش يسد الموارد.'),
para('الأمان', 'خادم MCP المعروض ما عندوش مصادقة مستقلة فهاد الملف. التحقق التجاري موجود فAPI قبل الاتصال، وهذا ما كيمنعش وحده الاتصال المباشر بخادم MCP إذا كان مكشوفاً.'),
])

lesson('30 • n8n والإشعار بعد commit', ['backend/src/services/n8nNotifications.ts','backend/n8n/shopmate-manager-notifications.json'], 'إشعار المسؤول عملية خارجية اختيارية، منفصلة على نجاح معاملة الشراء.', [
code('backend/src/services/n8nNotifications.ts','const response = await fetch',14),
para('sendToN8n', 'كيقرا URL من البيئة؛ إلا غائب يرجع false. headers فيها JSON وممكن X-ShopMate-Webhook-Secret. body فيه الحدث والتفاصيل. AbortSignal.timeout كيوقف الطلب الطويل.'),
para('نوعا الحدث', 'notifyOrderCreated كيزيد event:order.created وcreatedAt. notifyManagerRequest كيزيد manager.request للخصم أو الاسترجاع. TypeScript union كيوصف أشكال payload الممكنة.'),
para('best effort', 'response.ok كيعطي نجاح HTTP. فشل الشبكة أو رد غير ناجح كيرجع false وكيكتب تحذير مختصر بلا payload. ما كايناش queue دائمة وإعادة إرسال مضمونة فهاد الملف.'),
para('workflow JSON', 'ملف n8n هو وصف قابل للاستيراد. خاص إعداد credentials والقناة وتفعيل webhook فخدمة n8n. مجرد وجود الملف فالريبو ما كيعنيش أنه خدام.'),
])

lesson('31 • React: state و props و hooks', ['mobile/src/components/Button.tsx','mobile/app/(auth)/login.tsx'], 'Component دالة كتنتج واجهة. State بيانات كتبدل العرض، وprops مدخلات جاية من component آخر.', [
code('mobile/app/(auth)/login.tsx','const [email, setEmail]',12),
para('useState', 'email هي القيمة الحالية. setEmail كتطلب تحديثها وإعادة رسم الواجهة. TextInput.value كيعرضها وonChangeText كيربط الكتابة بـsetEmail. هادشي يسمى controlled input.'),
para('useEffect و useCallback و useMemo', 'useEffect كيشغل أثر بحال تحميل API بعد render. dependencies كتحكم إمتى يعاود. useCallback كيحافظ على مرجع دالة حسب dependencies. useMemo كيحافظ على نتيجة حساب، ماشي على بيانات دائمة.'),
code('mobile/src/components/Button.tsx','const isDisabled',15),
para('props والشرط', 'Button كيتلقى title وonPress وloading وغيرها. loading أو disabled كيعطلو الضغط. styles array كيجمع style الأساسي والنوع والحجم والحالة. JSX داخل return وصف الواجهة، ماشي HTML ديال المتصفح فنسخة native.'),
para('useRef', 'كيحتافظ بقيمة بين renders بلا ما يسبب render عند تغييرها. مناسب لمرجع stream اللي نحتاجو نوقفوه أو FlatList باش نديرو scroll.'),
])

lesson('32 • navigation و استرجاع الدخول', ['mobile/app/_layout.tsx','mobile/app/(tabs)/_layout.tsx','mobile/app/(auth)/_layout.tsx'], 'Expo Router كيربط بنية الملفات بالشاشات، وRootLayout كيتابع حالة الجلسة.', [
code('mobile/app/_layout.tsx','const inAuthGroup',12),
para('الرحلة', 'initializeAuth كيتنادى عند البداية. مادام isLoading صحيح كيبان splash. من بعد useSegments كيعرف واش المستخدم فمجموعة auth. router.replace كيدخلو login أو tabs حسب حالة الجلسة.'),
para('Stack و Tabs', 'Stack كينظم شاشة فوق أخرى بحال تفاصيل منتوج. Tabs كيخلي التنقل بين Assistant وBoutique وCommandes وProfil. (auth) و(tabs) مجموعات تنظيمية فالأسماء.'),
para('[id]', 'product/[id].tsx route ديناميكية؛ /product/42 كتعطي id نصي42 داخل useLocalSearchParams. خاص تحويله والتحقق قبل طلب API.'),
para('الإدارة', 'href:null كيخبي صفحات الإدارة من شريط tabs. كل شاشة كتراجع role، والخادم حتى هو كيراجع ADMIN. إخفاء route ماشي حاجز أمان كافي.'),
])

lesson('33 • authStore و tokenStorage', ['mobile/src/stores/authStore.ts','mobile/src/auth/tokenStorage.ts'], 'Zustand كيجمع حالة الجلسة والدوال اللي كتغيرها فبلاصة واحدة.', [
code('mobile/src/stores/authStore.ts','const { user, accessToken, refreshToken } = response.data',15),
para('login و register', 'الدالة كتدير loading، كترسل API، كتخزن التوكنات، ثم set كيحدث user وisAuthenticated. الفشل كيرجع false ويخزن error باش الشاشة تعرضه.'),
para('initializeAuth', 'كتقرا tokens من التخزين. إذا غايبين الجلسة خارجية. إذا موجودين كتطلب /me؛ Axios يقدر يجدد access. كتعاود تقرا التوكنات من التخزين باش ما تستعملش القيمة القديمة بعد rotation.'),
para('التخزين', 'native كيستعمل SecureStore. نسخة web كتستعمل localStorage. مستوى الحماية مختلف؛ localStorage قابل للقراية من JavaScript ديال نفس الأصل. ما نخلطوش هاد التخزين مع DB ديال المنتجات.'),
para('logout', 'كيحاول يبطل refresh فالخادم ثم clearTokens وset كيرجعو الحالة فارغة. إذا الشبكة فشلات، الخروج المحلي كيوقع، ولكن الإبطال فالخادم ما تأكدش.'),
para('set و get', 'set كيبدل الحالة، get كيقرا الحالة الحالية داخل الدوال. useAuthStore(selector) فالشاشة كيتابع الجزء اللي محتاجاه بحال role أو isLoading.'),
])

lesson('34 • Axios interceptors و refreshPromise', ['mobile/src/api/client.ts','mobile/src/config/api.ts'], 'باش ما نكتبوش Authorization ومعالجة401 فكل شاشة، client كيجمعهم.', [
code('mobile/src/api/client.ts','apiClient.interceptors.request.use',11),
para('قبل الإرسال', 'getTokens كيجيب access الحالي. interceptor كيضيف Bearer للheaders ثم يرجع config. apiClient عندو baseURL وJSON timeout10 ثوان للطلبات العادية.'),
para('بعد401', 'response interceptor كيتأكد من error.config ويمنع إعادة login/refresh أو request عندها _retry. ثم كيستعمل refreshPromise مشتركة، باش عدة طلبات ما يجددوش نفس refresh فآن واحد.'),
code('mobile/src/api/client.ts','const newAccessToken = await refreshPromise',10),
para('إعادة الطلب', 'بعد التجديد، التوكن الجديد كيتخزن وcallbacks كتخبر authStore. Authorization ديال الطلب الفاشل كيتبدل ثم apiClient(originalRequest) كيعيدو مرة واحدة.'),
para('العنوان', 'EXPO_PUBLIC_API_URL كيتقدم على defaultHost. Android emulator كيتوجه10.0.2.2، والتليفون الحقيقي يحتاج عنوان LAN مناسب أو HTTPS منشور. localhost فالتليفون هو التليفون نفسه.'),
])

lesson('35 • الكاتالوغ فالموبايل', ['mobile/src/stores/catalogStore.ts','mobile/app/(tabs)/index.tsx','mobile/app/product/[id].tsx'], 'الشاشة كتعرض وتجمع الاختيارات، والـstore كيرسل الفلاتر وكيحتافظ بالنتائج.', [
code('mobile/src/stores/catalogStore.ts','const response = await apiClient.get<{',15),
para('fetchProducts', 'كتحضر params من search/category/minPrice/maxPrice، كتطلب الصفحة الأولى وكتعوض products. hasMore كيتحسب من page وtotalPages. status كيوضح loading أو success أو error.'),
para('loadMore', 'كيمنع الطلب إذا ما بقاش صفحات أو تحميل جاري. nextPage=page+1، ثم products:[...products,...newProducts] كتجمع القديم والجديد. دير بالك من نتائج طلب قديم بعد تبديل filters؛ الكود ما عندوش إلغاء شامل لهاد السباقات.'),
para('FlatList', 'data اللائحة؛ renderItem كيفاش نرسم عنصر؛ keyExtractor معرف ثابت؛ onEndReached كيطلب المزيد؛ RefreshControl لإعادة التحميل. الحالة الفارغة مختلفة على حالة الخطأ.'),
para('تفاصيل المنتوج', 'fetchDetails كتجيب المنتج ثم stock. Image عندها fallback إذا الصورة غائبة أو فشلات. handleOrderCOD كيظهر Alert وبعد التأكيد كيرسل items وconfirmed:true. الحجم المختار ما كيتبعتش فbody الحالي.'),
])

lesson('36 • streamAgentChat: فك أحداث SSE', ['mobile/src/api/agentChat.ts'], 'الشات كيستعمل XMLHttpRequest مباشرة باش يقرا جواب كيتزاد تدريجياً.', [
code('mobile/src/api/agentChat.ts','const processBuffer',15),
para('lastIndex و buffer', 'responseText فيه جميع البيانات الواصلة. slice(lastIndex) كتاخذ غير الجديد. buffer كيحتافظ بحدث ناقص، وsplit بسطرين كيعزل الأحداث الكاملة. parts.pop كيرجع الباقي غير المكتمل.'),
para('dispatch', 'سطر كيبدأ data: كيتحول من JSON لevent. switch كينادي callback المناسب. onStart يحفظ conversationId، onSources يعرض المصادر، onToolResult يجهز البطاقات، onToken يزيد النص.'),
para('حالات الاتصال', 'readyState3 أثناء التحميل، و4 عند النهاية. 429 رسالة انتظار، و401 session expirée. abort كيعلم isAborted ثم xhr.abort. onerror كيعالج فشل الشبكة.'),
para('فرق مهم عن Axios', 'هاد XHR ما كيمرش من interceptor ديال apiClient. 401 فالشات ما عندهاش نفس التجديد التلقائي الموجود فالطلبات العادية. fetchConversationHistory وfetchSingleConversation كيمرو عبر Axios.'),
])

lesson('37 • chat.tsx: النص والبطاقات', ['mobile/app/(tabs)/chat.tsx'], 'الشاشة كتدير state ديال المحادثة، بينما الخادم هو اللي كينفذ الخدمات.', [
code('mobile/app/(tabs)/chat.tsx','setMessages((prev) => [...prev, userMessage, assistantMessage])',10),
para('sendMessage', 'كتحيد الفراغ، كتمنع إرسال فارغ أو مزدوج أثناء isSending، كتزيد رسالة المستخدم وplaceholder فارغ للمساعد. من بعد streamAgentChat كيعطي callbacks لتحديث نفس placeholder بالـid.'),
para('تحديث immutable', 'prev.map كيرجع لائحة جديدة. العنصر المطلوب كيتبدل بـ{...m, sources} أو نص جديد. هادشي كيخلي React يعرف التغيير بلا تعديل عشوائي لنفس object.'),
para('البطاقات', 'searchProducts result.products كيتحول لProductCardData. createOrder requiresConfirmation كتخلق orderRecap. success مع orderId كيخلق createdOrder. onDone كيطفي isStreaming وisSending.'),
para('التأكيد والتاريخ', 'handleConfirmOrder كيبعث Oui. حالة البطاقة كتتبدل قبل جواب الخادم، إذن اللون ماشي إثبات نجاح DB. التاريخ كيرجع الرسائل النصية، وبعض البطاقة كيتعاد بناؤها باستخراج رقم من النص.'),
para('اختلاف شكل البيانات', 'فرع getProductDetails فالواجهة كيتوقع result.product، بينما الأداة الحالية كترجع خصائص المنتوج مباشرة. هذا يفسر علاش بطاقة التفاصيل تقدر ما تظهرش رغم وجود جواب الأداة.'),
])

lesson('38 • orders و profile والشاشات الإضافية', ['mobile/app/(tabs)/orders.tsx','mobile/app/(tabs)/profile.tsx','mobile/app/+not-found.tsx','mobile/app/+html.tsx','mobile/app/modal.tsx'], 'كل شاشة كتربط state وعناصر العرض بدالة أو API واضحة.', [
code('mobile/app/(tabs)/orders.tsx','await apiClient.post(`/api/orders/',6),
para('OrdersScreen', 'fetchOrders كيطلب /api/orders ويعوض orders. onRefresh كيظهر التحميل. getStatusBadge كيختار اللون والنص وgetStatusStepIndex كيختار موضع التقدم. الإلغاء كيحتاج Alert ثم confirmed:true ثم إعادة تحميل.'),
para('الخطوات المرئية', 'شريط الحالة فيه En cours، ولكن OrderStatus فالخادم ما فيهش نفس الحالة كقيمة مستقلة. خط تقدم بصري ماشي دائماً model كامل ديال حالات النقل.'),
para('ProfileScreen', 'كيقرا user من store، كيعرض الاسم والبريد والدور، وكيظهر روابط الإدارة للـADMIN. الصورة والموقع الظاهرين فيهم قيم ديمو؛ ماشي تحديد موقع مباشر ولا صورة رفعها كل مستخدم.'),
para('الملفات الإضافية', '+not-found صفحة لمسار غير موجود. +html قالب web. modal شاشة إضافية. وجود ملف قابل للتوجيه ما كيثبتش أنه جزء ضروري من رحلة الشراء الحالية.'),
])

lesson('39 • إدارة الكاتالوغ فالموبايل', ['mobile/app/(tabs)/admin-catalogue.tsx'], 'الفورمولير كيحتافظ بالنصوص، وكيحول الأرقام قبل الإرسال.', [
code('mobile/app/(tabs)/admin-catalogue.tsx','const saveProduct',15),
para('ProductDraft', 'price وstock نصوص أثناء الكتابة. Number كيحولهم. Number.isFinite كيرفض NaN وInfinity، وNumber.isInteger كيطلب مخزون صحيح. name.trim كيمنع اسم فراغ.'),
para('إنشاء أو تعديل', 'editingProduct فيه ID إلا كنعدلو. PUT مع ID للتعديل، POST بلا ID للإنشاء. من بعد النجاح كتفرغ draft وكتعاود loadCatalogue. saving كيعطل الزر أثناء العملية.'),
para('التصنيفات', 'useMemo كيبني Map من categoryId للاسم. saveCategory نفس منطق POST/PUT. deleteProduct/deleteCategory كيطلبو Alert ومن بعد DELETE وإعادة تحميل.'),
para('حدود الشاشة', 'loadCatalogue كيطلب limit100 بلا pagination إدارة كاملة. ProductDraft الحالي ما فيهش imageUrl رغم أن API وmodel كيدعموه. عرض الصور فالزبون ما كيعنيش أن المسؤول عندو رفع/تعديل صور من هاد الفورمولير.'),
])

lesson('40 • إدارة الوثائق والسجلات', ['mobile/app/(tabs)/admin-documents.tsx','mobile/app/(tabs)/admin-agent-logs.tsx'], 'كل شاشة كتراجع ADMIN فالواجهة وكتتواصل مع endpoints محمية فالخادم.', [
code('mobile/app/(tabs)/admin-documents.tsx','const form = new FormData',12),
para('رفع الوثيقة', 'DocumentPicker كيرجع الملف المختار. كنراجعو الامتداد والحجم، ثم FormData فيه file وname. رفع native كيعطي uri/name/type. نجاح الرد كيعرض chunksCreated وكيعاود يحمل اللائحة.'),
para('المعالجة', 'uploading كيعرض spinner ورسالة إنشاء embeddings. هادشي حالة محلية عامة؛ ماشي نسبة تقدم حقيقية. timeout Axios10 ثوان يقدر يكون قصير لعملية embedding كبيرة.'),
para('فلاتر السجلات', 'draft fields منفصلين عن filters المطبقة. applyFilters كيتحقق من ID والتواريخ ثم يبدل filters. loadLogs كيرسل params، وappend كيضيف صفحة أخرى.'),
para('التفاصيل', 'showDetail كيطالب /api/agent/logs/:id. TurnDetail كيعرض السؤال والجواب والأدوات والمصادر والتكلفة والمدة. null فtokens ما خاصهاش تتفسر كأن الخدمة مجانية.'),
])

lesson('41 • theme والمكونات والتصميم', ['mobile/src/theme/tokens.ts','mobile/src/components/Button.tsx','mobile/src/components/Input.tsx','mobile/src/components/Card.tsx','mobile/src/components/BrandHeader.tsx','mobile/src/components/Loader.tsx','mobile/src/components/EmptyState.tsx','mobile/src/components/ErrorState.tsx'], 'القيم المشتركة كتخلي الشاشات تستعمل نفس اللغة البصرية.', [
para('tokens', 'colorTokens ألوان، spacingTokens مسافات، radiusTokens تدوير، typographyTokens كتابة. تعديل قيمة مركزية كيأثر على المكونات اللي كتستعملها؛ ماشي على كل قيمة مكتوبة يدوياً.'),
para('Button و Input', 'Button كيجمع الشكل والتعطيل والتحميل وonPress. Input كيجمع الحقل والعنوان والخطأ حسب props. props كتخلي نفس component يتستعمل بأشكال متعددة.'),
para('Card و BrandHeader', 'Card كيوفر سطحاً ومسافات وحدوداً. BrandHeader كيوحد رأس الشاشات. children كيدخل المحتوى داخل component عام بدل نسخ نفس هيكل العرض.'),
para('ثلاث حالات', 'Loader انتظار، EmptyState بيانات فارغة، ErrorState فشل مع إمكانية retry. الفراغ ماشي خطأ: لائحة طلبات جديدة ممكن تكون فارغة بشكل طبيعي.'),
para('StyleSheet', 'flex:1 كيعطي مساحة متاحة. flexDirection:row ترتيب أفقي. padding فراغ داخلي، margin خارجي، gap بين العناصر. colors وsizes ما عندهمش تأثير على authorization أو transaction.'),
para('stitch_shopmate', 'المجلد مرجع ماكيت وتصميم. كود React Native هو التنفيذ اللي كيظهر للمستخدم. الشاشة اللي فالصورة ما كتثبتش أنها مربوطة بAPI.'),
])

lesson('42 • Dockerfile و docker-entrypoint', ['backend/Dockerfile','backend/docker-entrypoint.sh','docker-compose.yml','backend/docker-compose.yml'], 'الصورة كتجمع التطبيق، وCompose كيربطه بقاعدة البيانات.', [
code('backend/Dockerfile','FROM node:22-alpine AS build',8),
para('build و dependencies', 'npm ci كيستعمل lockfile باش التثبيت يكون مضبوط. npx tsc كيخرج JavaScript فdist. مرحلة production-dependencies كتثبت غير dependencies اللازمة للتشغيل.'),
para('runtime', 'كتنسخ dist وnode_modules والمigrations وSQL. USER shopmate كيشغل بصلاحيات أقل. EXPOSE توثيق للمنفذ؛ ports فCompose هي اللي كتربط منفذ الجهاز بالحاوية.'),
code('backend/docker-entrypoint.sh','echo "Running database migrations',16),
para('الترتيب', 'set -eu كيوقف السكريبت عند أخطاء وأسماء متغيرات غير موجودة حسب الاستعمال. migrations أولاً، pgvector SQL من بعد، seed اختياري، ثم exec node كيخلي عملية Node تستقبل إشارات الإيقاف مباشرة.'),
para('Compose', 'db كتستعمل pgvector:pg16 وvolume. API كتستنى DB healthy. DB_HOST=db داخل الشبكة. health ديال API كينادي /health. ملفات env المكونة للحاوية وتوسيع متغيرات Compose خاصها قيم متوافقة.'),
])

lesson('43 • seed و SQL و migrations', ['backend/src/seed.ts','backend/src/scripts/applyPgvectorSql.ts','backend/sql/001_init_pgvector.sql'], 'هنا كنجهزو البيانات والبنية باش API تلقى شنو تخدم عليه.', [
para('seed()', 'كيطلب SEED_ADMIN_PASSWORD بطول أدنى12، كيحسب hash وكيخلق أو يحدث admin، كيضمن متجر وأصناف ومنتجات حسب SKU. إعادة التشغيل ما كتخلقش نفس السجل دائماً، ولكن كتقدر تحدث admin وتزيد صور ناقصة.'),
para('الوثائق الأولية', 'knowledgeDocuments نصوص ديمو عامة، كتتحفظ بمقاطع بلا embeddings. خاص index حقيقية باش تولي قابلة للبحث. ما تقولش seed بوحدو جهز agent للإجابة من وثائق مفهرسة.'),
code('backend/src/scripts/applyPgvectorSql.ts','const sqlPath',8),
para('سكريبت SQL', 'readFile كيقرا SQL من مسار محسوب بالنسبة للكود المترجم. sequelize.query كينفذو. finally كيسد الاتصال، وcatch كيحدد exitCode عند الفشل.'),
para('up و down', 'كل migration عندها up للتطبيق وdown للتراجع. أسماء التواريخ كتحدد الترتيب. create-users كتخلق الجدول، align-model-constraints كتبدل قيود، add-role كتضيف الدور وكتحيد قيد متجر واحد/مستخدم واحد القديم.'),
para('قبل الحفظ', 'تعديل Model بوحدو ما كيغيرش قاعدة موجودة تلقائياً فهاد التشغيل. خاص migration مناسبة، وإلا تقدر تشوف column does not exist وقت API كتطلب عمود جديد.'),
])

lesson('44 • package.json و CI و scripts', ['backend/package.json','mobile/package.json','.github/workflows/backend-tests.yml'], 'npm run كيشغل الأمر المسجل تحت scripts، وماشي جميع أسماء scripts اختبارات.', [
para('Backend', 'dev يشغل tsx watch للسيرفر. mcp وmcp:dev يشغلو خدمة التتبع. db:migrate يشغل Sequelize CLI بالمسار والإعداد. seed يشغل بيانات البداية. test يبني TypeScript ثم يشغل مجموعة محددة من ملفات الاختبار.'),
para('Mobile', 'start كيبدأ Expo، android وios وweb كيطلبو فتح المنصة المناسبة. هاد الأوامر ماشي بالضرورة إنتاج APK. app.json فيه اسم التطبيق والأيقونة وplugins، وtsconfig فيه قواعد الأنواع والمسارات.'),
code('.github/workflows/backend-tests.yml','jobs:',16),
para('CI', 'GitHub Actions كيخدم على push أوpull_request حسب paths. checkout كيجيب الكود، setup-node كيجهز Node22، npm ci يثبت وnpm test يختبر. هاد workflow ما فيهش نشر تلقائي ولا هاتف حقيقي.'),
para('شنو ما درناش هنا', 'فجلسة إعداد الدليل ما شغلناش اختبارات التطبيق. راجعنا محتوى السكريبتات باش نفهمو نطاقها. نجاح build ديال الوثيقة ماشي نجاح التطبيق.'),
])

lesson('45 • قراءة test: arrange / act / assert', ['backend/src/scripts/test-agent-cost-limits.ts','backend/src/scripts/test-auth-tenant.ts','backend/src/scripts/test-order-confirmation.ts','backend/src/scripts/test-agent-tools.ts','backend/src/scripts/test-read-tools.ts','backend/src/scripts/test-guardrails.ts','backend/src/scripts/test-n8n-notifications.ts','backend/src/scripts/test-llm.ts'], 'Arrange تجهيز الحالة، Act تنفيذ العملية، Assert مقارنة النتيجة بالمتوقع.', [
code('backend/src/scripts/test-agent-cost-limits.ts','for (let i = 0; i < 21',14),
para('cost limits', 'السكريبت كيدير خادم Express مؤقت ويعطي user اختباري، ويرسل21 طلب. كيتأكد الأول20 عندهم200 والواحد21 عندو429. فحص ثابت1024 ما كيقيسش فاتورة provider كاملة.'),
para('auth-tenant', 'كيستعمل HTTP حقيقي محلي مع بدائل لجزء من models: دخول، refresh rotation، رفض القديم، logout وعزل منتوج/طلب. هذا مفيد للـroute contract وماشي برهان لكل قيود SQL.'),
para('confirmation', 'كيختبر كلمات التأكيد وschema REST. كيجرب اتصال DB؛ إذا متوفر يدير حالات DB، وإذا غائب يمشي mocks. خاص تقرا أي فرع خدم فالنتائج قبل ما تقول integration حقيقية.'),
para('باقي scripts', 'agent-tools للتحقق والـallowlist؛ read-tools لقراءات الأدوات؛ guardrails للأنماط والرفض والمخرجات؛ n8n لخادم webhook اختباري؛ llm اتصال بالمزود. test:read-tools وtest:llm ما داخلينش فالأمر npm test الحالي.'),
])

lesson('46 • كيفاش تتبع bug وتجاوب اللجنة', [], 'شرح الكود كيبان ملي تقدر تربط نتيجة فالشاشة بسببها فالخادم.', [
para('مثال: الشات رجع401', 'بدا من mobile/src/api/agentChat.ts: XHR كيحمل access من التخزين. شوف واش صالح؛ هاد المسار ما كيديرش refresh ديال Axios. من بعد authenticate فالخادم كيقرر401. ما تبدأش بتغيير RAG.'),
para('مثال: وثيقة موجودة وما كتستعملش', 'شوف status وchunks، ومن بعد embedding واش NULL، ومن بعد storeId والعتبة. seed بوحدو ما كيعمرش المتجهات. وثيقة مفهرسة ممكن تبقى ما تجيبش السؤال بسبب similarity.'),
para('مثال: طلب نجح وما وصلش إشعار', 'الـtransaction commit أولاً، n8n من بعد وبشكل best-effort. شوف إعداد webhook وحالة HTTP وخدمة n8n؛ فشل الإشعار ما كيعنيش نقص المخزون ترجع.'),
para('عرض فدقيقتين', 'ورّي الشاشة اللي كتجمع الطلب، دالة API client، route، schema، query بstoreId، transaction إذا كتابة، ثم response وتحديث state. هادي رحلة كاملة مفهومة أكثر من سرد أسماء التقنيات.'),
para('أجوبة صادقة', 'قول: هاد الجزء قرأتو وها مسارو. هاد الحالة جربتها وها الدليل. هاد الحد لقيتو ومازال خاصو إصلاح. استعمال AI فالبناء ما يمنعش التعلم؛ المهم تقدر تفسر السلوك والحدود.'),
])

# Inventory: every source file in the application, migrations and relevant configuration.
model_notes = {
'Store':'المتجر الجذر. id ديالو كيربط بيانات المتجر. جدول Store نفسه ما خاصوش storeId كمرجع لنفسه.',
'User':'حساب الدخول: الاسم والبريد وhash كلمة السر والدور. uniqueness ديال البريد داخل المتجر، ماشي ضروري عبر جميع المتاجر.',
'RefreshToken':'hash ديال refresh مع userId وstoreId وexpiresAt. الحذف كيبطل التجديد بذلك التوكن.',
'Category':'صنف منتجات تابع لمتجر، عندو الاسم والوصف. Product كيشير ليه بcategoryId.',
'Product':'منتوج بثمن ومخزون وSKU وصورة URL وصنف اختياري. المصدر الحي للثمن والمخزون.',
'Customer':'هوية تجارية للزبون فالطلبات. كتتحل من User بواسطة البريد والمتجر فالمسارات الحالية.',
'Order':'رأس الطلب: storeId وcustomerId والحالة والمجموع. ما فيهش عمود عنوان الشحن فهاد النسخة.',
'OrderItem':'سطر شراء: orderId وproductId وcustomerId والكمية وunitPrice. كيحفظ الثمن وقت الشراء.',
'Conversation':'حوار تابع لمستخدم ومتجر، بعنوان وحالة. هو الرابط بين الرسائل.',
'Message':'رسالة داخل محادثة: role وcontent. واجهة الشات كتستعملها باش ترجع التاريخ.',
'Document':'metadata ديال الوثيقة: الاسم، uploader، mimeType، status، errorMessage وfileUrl وصفي.',
'Chunk':'نص مقطع تابع لوثيقة، مع embedding VECTOR(1536) أو NULL. المقاطع بلا embedding مستبعدة من retrieval.',
'AgentLog':'أثر دور AI: السؤال والجواب والأدوات والمصادر والاستهلاك والمدة والرفض. ماشي نفس Message.',
}
for name, note in model_notes.items(): descriptions['backend/src/models/'+name+'.ts'] = note
descriptions.update({
'backend/src/config/database.ts':'كيخلق Sequelize PostgreSQL connection من DB_HOST/PORT/NAME/USER/PASSWORD. logging:false كيوقف طباعة SQL الاعتيادي.',
'backend/src/config/demo.ts':'قيم تعريف متجر وحساب الديمو اللي كيستعملهم auth وseed؛ هادي اختيارات خادم، ماشي متجر يختارو العميل فbody.',
'backend/src/config/sequelize-cli.js':'إعداد خاص بSequelize CLI باش migrations تلقى نفس قاعدة البيانات حسب البيئة.',
'backend/src/config/cors.ts':'كيقرأ origins المسموحين؛ الطلب بلا Origin مسموح لnative/curl. CORS ماشي بديل JWT.',
'backend/src/middlewares/errorHandler.ts':'كيحول الأخطاء لأجوبة HTTP: JSON خاطئ400، duplicate409، JWT401، و500 عام. console logging هنا منفصل عن sanitizeLogs.',
'backend/src/middlewares/rateLimiter.ts':'حد عام افتراضي100 طلب/15 دقيقة، وحد AI20/دقيقة حسب userId. default memory store ماشي عداد موزع.',
'backend/src/middlewares/index.ts':'Barrel exports: كيجمع تصدير middlewares باش imports فالمسارات يكونو مختصرين.',
'backend/src/types/express.d.ts':'توسيع TypeScript لأنواع Express باش req.user وreq.storeId يكونو معروفين للمحلل؛ ما كيعمرهمش وقت التشغيل.',
'backend/src/docs/swagger.ts':'وصف OpenAPI وSwagger UI للمسارات والمدخلات والأجوبة. التوثيق ما كيشغلش قواعد البيع؛ خاص يوافق routes.',
'mobile/src/components/index.ts':'كيجمع exports ديال المكونات المشتركة.',
'mobile/components/index.ts':'نقطة export للمكونات حسب الملف الحالي، باش تسهل imports.',
'mobile/constants/Colors.ts':'تعريف ألوان إضافي. تحقق واش الشاشة كتستعمل هاد الملف أو theme/tokens قبل أي تعديل لون.',
'mobile/app.json':'إعداد Expo: الاسم والأيقونة وsplash والمنصات والplugins. ماشي كود معالجة طلبات.',
'mobile/tsconfig.json':'قواعد تحليل TypeScript وalias المسارات فالموبايل.',
'backend/tsconfig.json':'كيفاش TypeScript ديال الخادم كيتحول لJavaScript ومكان الخرج.',
})

files = []
for folder in ['backend/src','backend/migrations','backend/sql','mobile/src','mobile/app','mobile/components','mobile/constants']:
    files += [p for p in (ROOT/folder).rglob('*') if p.is_file() and p.suffix in ['.ts','.tsx','.js','.sql']]
for f in ['backend/package.json','mobile/package.json','backend/tsconfig.json','mobile/tsconfig.json','mobile/app.json','backend/Dockerfile','backend/docker-entrypoint.sh','docker-compose.yml','backend/docker-compose.yml','backend/n8n/shopmate-manager-notifications.json','.github/workflows/backend-tests.yml']:
    if (ROOT/f).exists(): files.append(ROOT/f)
files = sorted(set(files))

for p in files:
    rel=p.relative_to(ROOT).as_posix()
    if '/migrations/' in rel:
        slug=p.stem.split('-',1)[-1]
        desc='Migration '+slug+': up كيطبق تغيير بنية القاعدة وdown كيرجعو. كتتقرا حسب ترتيب التاريخ فاسم الملف.'
        if 'create-' in slug: desc+=' كتخلق جدول '+slug.replace('create-','')+' مع الأعمدة والقيود المذكورة فالمقتطف.'
        if 'add-role' in slug: desc+=' كتضيف role وكتحيد users_storeId_unique باش عدة حسابات يدخلو لنفس المتجر.'
        if 'align-model' in slug: desc+=' كتعدل uniqueness وربط OrderItem بCustomer/Order؛ migration اللي بعدها كتراجع قيد المستخدم الواحد لكل متجر.'
        if 'agent-log' in slug and 'add-' in slug: desc+=' كتضيف metadata ديال trace للاستهلاك والأدوات والمصادر والمدة.'
        if 'image-url' in slug: desc+=' كتزيد imageUrl اختياري للمنتوج.'
        if 'error-message' in slug: desc+=' كتزيد errorMessage باش الإدارة تشوف فشل ingestion.'
        descriptions[rel]=desc
    descriptions.setdefault(rel,'ملف مساعد داخل '+p.parent.name+'. قرا declarations والمقتطف باش تربط الدور ديالو بالمسار المشروح قبل.')

lesson('47 • قاموس ملفات المشروع', [], 'هاد الفهرس كيغطي ملفات المصدر ديال backend وmobile والـmigrations وإعدادات التشغيل المختارة. الصور وlockfiles والمكتبات المولدة ماشي scripts ديال منطق التطبيق.', [])
inventory = chapters[-1]
for p in files:
    rel=p.relative_to(ROOT).as_posix()
    text=read(rel)
    symbols=[]
    for i,line in enumerate(text.splitlines(),1):
        if re.search(r'^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s|^export\s+(?:const|class|interface|type)\s',line):
            symbols.append(f'L{i}: '+line.strip().split('{')[0].strip())
    fields=re.findall(r'^\s*declare\s+(?:readonly\s+)?(\w+)',text,re.M)
    details=descriptions[rel]
    if fields: details+='\nالحقول: '+', '.join(fields)
    if symbols: details+='\nنقاط الدخول: '+'; '.join(symbols[:8])
    inventory['blocks'].append(para(rel,details))

# Individual model and migration reading cards with actual source.
for name,note in model_notes.items():
    f='backend/src/models/'+name+'.ts'
    lesson('Model • '+name,[f],note,[
        code(f,name+'.init(',18),
        para('كيفاش تقرا هاد التعريف؟','اسم الخاصية هو العمود. type النوع، allowNull واش الفراغ مسموح، defaultValue قيمة تلقائية، primaryKey معرف فريد. init كيربط التعريف بsequelize وtableName. declare كيوصف TypeScript، وinit كيوصف ORM وقت التشغيل.'),
        para('ربط بالخدمة','قلب على اسم '+name+' فـroutes أو services. findOne/findAll قراءة، create/bulkCreate إنشاء، update تعديل وdestroy حذف. المعاملة ما كتدخلش تلقائياً لمجرد أن model كاين داخل دالة async.'),
    ])

lesson('48 • قراءة migrations بالترتيب', [], 'المقتطفات كتوريك العملية البنيوية. up وdown خاصهم يتراجعو معاً، وما نشغلوش down على بيانات مهمة بلا خطة.', [])
for p in sorted((ROOT/'backend/migrations').glob('*.js')):
    rel=p.relative_to(ROOT).as_posix()
    ch=chapters[-1]
    ch['blocks'] += [para(p.name,descriptions[rel]),code(rel,'async up',12)]

lesson('49 • تمارين تطبيقية بأجوبة', [], 'حل بصوتك قبل ما تشوف الجواب. الأمثلة افتراضية، وما كنشغلو حتى عملية شراء هنا.', [
para('طلب quantity:-2', 'الرحلة: شاشة → HTTP → validate → schema.quantity.min(1) →400. ما خاصناش نوصلو لـdecrement. TypeScript فالتليفون ما كيمنعش شخص يرسل request يدوي.'),
para('متجر A باغي منتوج B', 'JWT كيحدد A. forStore كيضيف شرط A. ID ديال B بوحدو ما كيبدلش scope. الجواب404 إذا ما كاينش منتوج مطابق داخل A.'),
para('جوج طلبات على آخر قطعة', 'المعاملة الأولى كتقفل السجل وتقرا stock1 ثم تنقصو. الثانية كتستنى القفل ثم كتلقى القيمة الجديدة وتراجعها. خاص اختبار بDB حقيقية باش نثبت السلوك العملي تحت التزامن.'),
para('بغيت remise', 'checkProhibitedIntent كتشد الصياغات المعروفة وترجع رفض، ومع discount/refund كيوقع استدعاء إشعار best-effort. ما كايناش أداة معتمدة لتغيير الثمن.'),
para('مخزون تبدل بين recap وOui', 'التنفيذ كيعيد قراءة stock بقفل. إذا ما بقا كافي، المعاملة كتفشل بدل الاعتماد على الصورة القديمة فالملخص.'),
para('شنو تكتب فالjournal؟', 'كتب بكلامك أنك ربطت الواجهة بالمسارات وبالقاعدة، فهمت الفرق بين RAG والأدوات، ولقيت حدود فالتأكيد والذاكرة والتوثيق. ما تكتبش أنك شغلت اختبارات ما شغلتهاش.'),
])

def safe_source(text):
    # Avoid distributing literal secret-like defaults or test credential values.
    text=re.sub(r'(process\.env\.(?:JWT_SECRET|\w*API_KEY|\w*PASSWORD|\w*SECRET)\s*=\s*)[\"\'][^\"\']*[\"\']',r'\1"<REDACTED>"',text)
    text=text.replace('shopmate-super-secret-jwt-key-2026-local','<LOCAL_SECRET_FALLBACK_REDACTED>')
    return text

def blocks_html(blocks):
    out=[]
    for typ,title,text in blocks:
        if typ=='code': out.append('<div class="block codeblock"><div class="path">'+escape(title)+'</div><pre>'+escape(safe_source(text))+'</pre></div>')
        else:
            body=''.join('<p dir="auto">'+escape(s)+'</p>' for s in text.split('\n'))
            out.append('<div class="block"><h2 dir="auto">'+escape(title)+'</h2>'+body+'</div>')
    return ''.join(out)

css='''
@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font-family:"Segoe UI",Tahoma,Arial;color:#213947;background:#fff}
.page{width:210mm;height:297mm;padding:17mm 17mm 19mm;position:relative;break-after:page;overflow:hidden}.page:last-child{break-after:auto}
.top{font:10px/1.4 Arial;letter-spacing:1.3px;color:#a75b3b;direction:ltr;border-bottom:1px solid #d9e2e6;padding-bottom:10px;margin-bottom:14px}
h1{font-size:23px;line-height:1.5;margin:0 0 8px;color:#174b55}.intro{font-size:15px;line-height:1.8;color:#65747d;border-bottom:2px solid #dcb28b;padding-bottom:10px;margin-bottom:15px}
h2{font-size:16px;line-height:1.6;color:#9d4d2d;margin:0 0 4px;overflow-wrap:anywhere}p{font-size:14px;line-height:1.7;margin:0 0 5px;overflow-wrap:anywhere}.block{margin-bottom:10px;break-inside:avoid}
.path{font:10px/1.5 Consolas;direction:ltr;text-align:left;color:#6a7b81;overflow-wrap:anywhere}pre{direction:ltr;text-align:left;font:10.5px/1.5 Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;background:#eff4f5;border-left:3px solid #d1a477;padding:10px;margin:4px 0}
.foot{position:absolute;bottom:8mm;left:17mm;right:17mm;border-top:1px solid #d9e2e6;padding-top:6px;display:flex;justify-content:space-between;direction:ltr;font:10px Arial;color:#6e828c}
.source-list{font:10px/1.5 Consolas;direction:ltr;text-align:left;color:#647b84;margin-bottom:10px;overflow-wrap:anywhere}.tocrow{display:flex;justify-content:space-between;gap:12px;font-size:13px;line-height:1.7;padding:4px 0;border-bottom:1px solid #edf1f2}.tocrow a{color:#254955;text-decoration:none}
#source{display:none}
'''
article=[]
for n,ch in enumerate(chapters):
    article.append(f'<article data-id="chapter-{n}"><h1>{escape(ch["title"])}</h1><div class="intro">{escape(ch["intro"])}</div><div class="source-list">'+ '<br>'.join(escape(f) for f in ch['files'])+'</div>'+blocks_html(ch['blocks'])+'</article>')
pagination='''
function makePage(title,continued=false){const p=document.createElement('section');p.className='page';p.innerHTML='<div class="top">SHOPMATE AI / LE CODE EXPLIQUE / 21 OCTOBRE 2026</div><div class="body"></div><div class="foot"><span>Omar Fahid • Version 2</span><span class="number"></span></div>';document.querySelector('#pages').append(p);if(continued){let h=document.createElement('h1');h.textContent=title+' • تابع';p.querySelector('.body').append(h);}return p;}
function fits(p){let b=p.querySelector('.body');return b.getBoundingClientRect().bottom < p.querySelector('.foot').getBoundingClientRect().top-16;}
window.paginate=()=>{document.querySelector('#pages').innerHTML='';let starts=[];for(const a of document.querySelectorAll('#source article')){let title=a.querySelector('h1').textContent,p=makePage(title);p.id=a.dataset.id;starts.push({id:p.id,title,page:p});for(const child of a.children){let copy=child.cloneNode(true);p.querySelector('.body').append(copy);if(!fits(p)){copy.remove();p=makePage(title,true);p.querySelector('.body').append(copy);if(!fits(p))throw Error('Oversized block: '+title);}}}let pages=[...document.querySelectorAll('.page')];pages.forEach((p,i)=>p.querySelector('.number').textContent=(i+1)+' / '+pages.length);window.chapterStarts=starts.map(s=>({id:s.id,title:s.title,page:pages.indexOf(s.page)+1}));window.overflow=pages.filter(p=>!fits(p)).length;return {pages:pages.length,overflow:window.overflow};};
'''
html='<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>ShopMate AI - شرح الكود بالدارجة</title><style>'+css+'</style><div id="pages"></div><div id="source">'+''.join(article)+'</div><script>'+pagination+'</script></html>'
(OUT/'shopmate-code-darija-v2.html').write_text(html,encoding='utf-8')

# Complete source companion: local, searchable, no credentials/env files.
parts=['<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>ShopMate - ملفات الكود</title><style>body{font:17px/1.8 Segoe UI,Tahoma;margin:30px auto;max-width:1150px;padding:20px;color:#234}summary{cursor:pointer;background:#edf3f5;padding:14px;margin-top:15px;direction:ltr;text-align:left}pre{direction:ltr;text-align:left;font:13px/1.7 Consolas;white-space:pre-wrap;overflow-wrap:anywhere;background:#f7f8fa;padding:18px}input{width:100%;padding:15px;font:inherit}h1{color:#174b55}</style><h1>ملفات ShopMate مع خريطة الشرح</h1><p>نسخة المصدر المحلية بتاريخ 21 أكتوبر 2026. افتح اسم الملف باش تشوف الكود كامل بأرقام السطور. قرا الشرح التفصيلي فالـPDF المرافق. بعض القيم الحساسة الثابتة محجوبة؛ ملفات البيئة والأسرار ما مدرجينش.</p><input id="search" placeholder="قلب باسم الملف: auth / chat / migration ...">']
manifest=[]
for p in files:
    rel=p.relative_to(ROOT).as_posix(); raw=read(rel)
    numbered='\n'.join(f'{i:4}  {l}' for i,l in enumerate(safe_source(raw).splitlines(),1))
    parts.append('<details><summary>'+escape(rel)+'</summary><p>'+escape(descriptions[rel])+'</p><pre>'+escape(numbered)+'</pre></details>')
    manifest.append({'path':rel,'lines':len(raw.splitlines()),'sha256':hashlib.sha256(raw.encode()).hexdigest(),'explanation':descriptions[rel]})
parts.append('<script>document.getElementById("search").oninput=e=>document.querySelectorAll("details").forEach(d=>d.style.display=d.querySelector("summary").textContent.toLowerCase().includes(e.target.value.toLowerCase())?"":"none");</script></html>')
(OUT/'shopmate-code-source.html').write_text(''.join(parts),encoding='utf-8')
(OUT/'shopmate-code-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'chapters':len(chapters),'source_files':len(files),'source_lines':sum(x['lines'] for x in manifest)}))
