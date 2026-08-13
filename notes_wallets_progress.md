# ملاحظات التقدم — 14 أغسطس (مشروع تطبيق الشريك قيد الإنشاء)

## الحالة
- المشروع الجديد: /home/ubuntu/tabibi-partner (نسخة من tabibi-mobile ثم تنظيف شاشات المريض)
- تم حذف: كل شاشات المريض + _layout.tsx + (tabs) + tests + lib/_e2e (نُقلت incoming-requests وprovider-auth إلى lib/)
- lib/ الحالي في الشريك: _core/ + chat.ts + notifications.ts + ratings.ts + utils.ts + wallets.ts + provider-auth.ts + incoming-requests.ts
- مفاتيح مشتركة: provider_accounts_v1، provider_session_v1، service_requests_v1، provider_chat_threads_v1/..._messages_v1، notifications_v1، ratings_v1، wallets_v1

## آلية الدفع النهائية (توضيح المستخدم — يجب التنفيذ هكذا)
1. المريض يختار الخدمات في doctor-detail ويضغط «طلب الآن» → ينتقل لصفحة الدفع لكن الطلب يبقى «معلق بانتظار قبول مقدم الخدمة».
2. عند قبول مقدم الخدمة:
   - نقدي: المريض يؤكد «الدفع نقدي» → إشعار للشريك «تم التأكيد» + قيود المحفظة (مستحق له) → الشريك يتحرك.
   - إلكتروني: يتم الدفع الإلكتروني أولاً (واجهة بوابة مستقبلية الآن) → تأكيد اكتمال → الشريك يتحرك.
3. الحقول الجديدة في ServiceRequest: paymentMethod "cash"|"electronic" (تُحفظ عند «طلب الآن»)، paymentStatus "awaiting_provider_acceptance"|"payment_pending"|"confirmed" (يُحدث عند قبول الشريك والتأكيد).
4. الشريك في طلباته يرى: الخدمات + طريقة الدفع + حالة الدفع، ولا «يتحرك» قبل confirmation.

## المكتبات المنقولة في مشروع الشريك
- lib/provider-auth.ts: PROVIDER_ROLES، PROVIDER_SPECIALIZATIONS، ProviderAccount، hashPassword، validateRegistration، registerProvider، completeProviderProfile، signInProvider، getSessionAccount، signOutProvider، STORAGE_SESSION_KEY
- lib/incoming-requests.ts: دوال قراءة/تحديث طلبات الشريك من service_requests_v1
- lib/service-requests.ts وprovider-registry.ts محذوفة في الشريك (المنطق في incoming-requests) — يجب إعادة فحص هل incoming-requests يحوي كل ما يلزم (updateStatus...)

## قرار نهائي (بعد restart أثبت الارتباط بـ tabibi-mobile)
- بيئة webdev ثابتة على tabibi-mobile؛ لا يمكن توجيهها إلى tabibi-partner داخل نفس المهمة.
- الحل المتفق مع المستخدم: إكمال كل شيء في هذا المشروع. مشروع tabibi-partner (هيكل + مكتبات مشتركة) سيُسلّم كحزمة ملفات/zip مع نسخة نهائية، ويُنشأ مشروع الشريك الفعلي في مهمة جديدة حيث تكون بيئة webdev خاصة به.
- آلية الدفع عند الحجز تُنفَّذ في tabibi-mobile (صفحة /payment، حقول paymentMethod/paymentStatus في request).

## حالة بيئة webdev
- preview/webdev tools مرتبطة حاليًا بـ tabibi-mobile فقط (المسار الافتراضي للمشروع النشط). مشروع tabibi-partner أنشئ يدويًا كنسخة من tabibi-mobile، لا يمكن تشغيله عبر نفس dev-server دون إعادة تهيئة المشروع النشط (webdev_init_project سيعيد تعيين المسار).
- القرار: يجب إخبار المستخدم أن المشروعين المتزامنين في نفس المهمة قد يسبب تعارضًا، وأنسب مسار هو إنشاء مشروع الشريك في مهمة (session) جديدة بطلب مباشر، أو إكمال العمل في هذا المشروع مع العلم أن الاختبارات والتشغيل لمشروع الشريك ستكون يدوية (pnpm dev داخل المسار).
- ملاحظة: نسخة المريض تعمل الآن على المنفذ 8081، أي dev-server آخر سيتعارض مع المنفذ.

## بقي لمشروع الشريك (tabibi-partner)
1. app.config.ts: appName=طبيب شريك (الاسم الرسمي المطلوب)، logoUrl جديد
2. توليد شعار جديد وحفظه assets/images/ + app.config.ts
3. app/_layout.tsx (root) + app/index.tsx (بوابة: getSessionAccount → login أو home/setup)
4. app/login.tsx (هاتف+كلمة مرور)، app/register.tsx (اسم/صفة/هاتف/كلمة مرور/تأكيد)، app/setup.tsx (تخصصات متعددة، مستندات، خبرة، نبذة، صورة)
5. (tabs): _layout.tsx + index.tsx (الرئيسية+حالة موثق) + services.tsx (إدارة خدمات/أسعار/مدد) + availability.tsx (متاح الآن + توقيتات) + requests.tsx (واردة: قبول/رفض، بعد القبول تظهر طريقة الدفع وحالة التأكيد) + chat.tsx + wallet.tsx (أرباح)
6. ربط الدردشة والأرباح: chat.ts يحتاج chat_v1 من المريض (المفاتيح provider_chat_threads_v1) — موجودة منقولة
7. اختبارات + نقطة تفتيش لمشروع الشريك

## آلية الدفع في تطبيق المريض (tabibi-mobile) — منجزة
- [x] service-requests.ts: أنواع PaymentMethod/PaymentStatus وحقول paymentMethod/paymentStatus/paymentConfirmedAt + updatePaymentStatus
- [x] doctor-detail.tsx: اختيار طريقة الدفع Alert ثم العنوان → submitRequest مع paymentMethod → router إلى /payment
- [x] /payment.tsx: حالة «بانتظار قبول مقدم الخدمة»، بعد القبول: تأكيد نقدي أو إلكتروني → updatePaymentStatus('confirmed') + قيود المحفظة (debit/payment للمريض، credit/earned للشريك) + إشعار payment_confirmed للشريك
- [x] كل شيء TS نظيف — بقي: اختبار تشغيل كامل + checkpoint، ثم التركيز على حزمة تطبيق الشريك

## نقاط مرجعية
- admin PIN: 10081460020501 (EXPO_PUBLIC_ADMIN_PIN)
- هوية: زيتوني #6B7B3F، ذهبي #C9A961، خلفية كريمية #F5F0E6


## لقطات التحقق (قبل checkpoint آلية الدفع)
- / يعرض شاشة تسجيل الدخول (الشعار صحي، حقول الاسم وكلمة المرور، رابط إنشاء حساب) — جيد.
- /payment يعرض بطاقة الدفع النقدي ٠ دينار + حالة «بانتظار قبول مقدم الخدمة للطلب» + زر متابعة (يعمل كواجهة) — جيد.
- كل الاختبارات 152 ناجحة، TS نظيف.
- نقطة التفتيش القادمة: آلية الدفع عند الحجز (service-requests + doctor-detail + /payment).
- بعده: بناء حزمة تطبيق الشريك /home/ubuntu/tabibi-partner (شاشات كاملة) ثم التغليف والتسليم zip.
