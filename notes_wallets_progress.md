# ملاحظات تقدم مهمة المحفظة (للاستمرارية بعد ضغط السياق)

## الحالة الحالية (بعد إضافة WalletsPanel في admin.tsx)
- WalletsPanel مكتمل في app/admin.tsx داخل تبويب "المحفظات" (AdminTabId يشمل "wallets").
- WalletsPanel يعرض: مبدّل محفظة المريض/الشريك، نموذج إضافة قيد يدوي (اسم، معرّف، نوع القيد [شحن رصيد/دفع/استرداد للمريض — مستحق له/مستحق عليه للشريك]، مبلغ، وصف، مرجع)، وقائمة ملخصات المحافظ مع قيودها وزر حذف لكل قيد.
- استيرادات admin.tsx سليمة: wallets (addWalletEntry, getWalletSummaries, removeWalletEntry, validateNewWalletEntry, NewWalletEntry, WalletSummary, WalletLedgerEntry, LedgerEntryKind, LedgerEntryType) + expo-haptics + Alert/Platform...
- TypeScript: 0 أخطاء. screenshot لشاشة PIN تعمل.
- توقيعات wallets.ts: WALLETS_KEY=wallets_v1؛ WalletLedgerEntry{id,ownerId,ownerName,role:"patient"|"provider",kind, type, amount, description, reference?, createdAt}؛ NewWalletEntry نفس الحقول؛ validateNewWalletEntry(entry)=> string|null؛ addWalletEntry(input)=>WalletLedgerEntry؛ getWalletSummary(ownerId)=>WalletSummary|null؛ getWalletSummaries(role?)=>WalletSummary[]؛ removeWalletEntry(entryId)=>boolean.
- أنماط WalletsPanel أضيفت كلها (roleSwitch, kindChip, balanceBox...).

## الخطوات المتبقية (من todo.md)
1. تبويب المحفظات في لوحة التحكم — قيد التنفيذ (شاشة UI جاهزة؛ يلزم اختبار بصري بإدخال PIN 10081460020501 ثم التبويب).
2. شاشة المحفظة في تطبيق المريض: تبويب "المحفظة" في app/(tabs) للمريض. اقرأ lib/wallets.ts: getWalletSummary(patientPhone) لعرض الرصيد والسجل (recharge/payment/refund). يجب التحقق من كيفية تخزين رقم المريض (useAuth أو patient-profile phone). أنماط NativeWind: className="bg-background..."، استخدم شاشة ScreenContainer من components/screen-container.
3. شاشة الأرباح في تطبيق الشريك: تبويب "الأرباح" في تطبيق الشريك (app/(tabs) الخاص بالشريك إن وجد — تحقق من بنية المشروع: هل يوجد تطبيقان منفصلان في نفس repo؟ يبدو أن الشريك في نفس المشروع تحت app/(tabs) أو app/partner — تحقق من ls app/). استخدم getWalletSummary(providerId). عرض credit (مستحق له) وdebit (مستحق عليه) والرصيد.
4. اختبارات مكتبة المحفظة wallets.ts: اختبارات موجودة مسبقًا للوجيك (ذكرت أنها اجتازت)، أضف اختبارات تكاملية للواجهات إن أمكن؛ شغّل pnpm test.
5. ربط عرض أسعار مدفوع (offers) بقيد محاسبي؟ المستخدم طلب: المريض دفع مقابل خدمة -> قيد payment؛ إتمام الخدمة -> قيد earned للشريك (اختياري، تحقق من منطق إتمام الخدمة في lib/service-requests.ts هل يستدعي wallets).
6. تحديث todo.md: ضع [x] على البنود المنجزة، ثم checkpoint، ثم رسالة للمستخدم مرفق بها manus-webdev://versionId.

## معطيات أساسية
- PIN لوحة التحكم: 10081460020501 (EXPO_PUBLIC_ADMIN_PIN).
- الهوية: زيتوني #6B7B3F وذهبي #C9A961؛ RTL عربي.
- المعاينة: https://8081-i4i95wqp8gqqhyfvnhioj-385e6272.us4.manus.computer
- الاختبارات: pnpm test (vitest). التأكيد قبل checkpoint: كل البنود المكتملة [x] في todo.md.
- لا تطلب نشرًا؛ النشر بزر Publish من الواجهة.


## تحديث 13 أغسطس 22:48
- تبويب المحفظات في لوحة التحكم: مكتمل (WalletsPanel في admin.tsx مع roleSwitch/نموذج قيد/حذف، TypeScript 0 أخطاء).
- شاشة المحفظة بالمريض: app/(tabs)/wallet.tsx مكتملة — بطاقة رصيد زيتونية (وارد/صادر/قيود) + قائمة سجل القيود مرتبة من الأحدث. أُضيف تبويبها في app/(tabs)/_layout.tsx بعد "طلباتي" بعنوان "المحفظة" بأيقونة wallet.pass.fill (مضافة إلى icon-symbol.tsx mapping "account-balance-wallet").
- ملاحظة مهمة: لا يوجد تطبيق شريك منفصل في هذا المشروع! بنية المشروع تحتوي فقط على app/(tabs) للمريض + admin.tsx. شاشة "الأرباح" للشريك ستُبنى داخل admin.tsx كواجهة عرض "الأرباح" بمعرّف مقدم الخدمة (يمكن للإدارة إدخال معرّف الشريك وعرض ملخصه) — أو عبر إدخال ownerId يدويًا في WalletsPanel الموجودة أصلاً.
- wallets.test.ts موجودة (282 سطرًا، ~10 اختبارات تحقق/إضافة/حذف/ملخصات) — اجتازت سابقًا.
- المتبقي: (1) شاشة أرباح الشريك (ضمن admin — إدخال معرّف الشريك + عرض ملخصه)، (2) تشغيل pnpm test، (3) checkpoint، (4) إبلاغ المستخدم.
- ملاحظة: admin.tsx تبويبه لا يتضمن شريط تبويبات سفلي؛ يضاف نموذج "عرض أرباح مقدم خدمة" داخل تبويب المحفظات (role=provider) موجود فعلاً — يكفي إضافة قسم "استعلام أرباح شريك" يطلب ownerId ويعرض ملخصه.
- معاينة: https://8081-i4i95wqp8gqqhyfvnhioj-385e6272.us4.manus.computer/admin


## المرحلة التالية (طلبات المستخدم الجديدة — 14 أغسطس)
البنود المعلقة في todo.md:
1. قيد دفع تلقائي عند تأكيد العرض المدفوع — [x منجز] في app/quote-offers.tsx: confirmOffer يضيف قيد debit/payment لمحفظة المريض (profile.phone/ownerName) بقيمة selectedOffer.total مع reference.
2. قيد «مستحق له» للشريك عند إتمام الخدمة — [ ] لم يُنفذ. ملاحظة مهمة: لا توجد نقطة تغيير حالة إلى completed في الواجهة الحالية! لم يوجد استدعاء updateRequestStatus في أي شاشة app/*.tsx (فقط admin.tsx سطر 637 يعرض زرًا؛ updateRequestStatus في lib/service-requests.ts:117). يبدو أن تغيير الحالة إلى completed يحدث عبر e2e فقط أو أن هناك زر في admin غير محدد. يجب إضافة زر «إنهاء الخدمة» للمريض في requests.tsx (البطاقة completed) أو عبر admin + إضافة القيود عند التحول إلى completed.
3. ربط الصفحة الرئيسية بإعلانات لوحة التحكم المفعّلة — [ ] لم يُنفذ. الإعلانات تُقرأ من admin.ts عبر readAdminAds() (lib/admin.ts:72، AdminAdSlide) — يجب استبدال الـ banners الثابتة في index.tsx بإعلانات مفعّلة من لوحة التحكم.
4. إصلاح أول تسجيل: بعد إنشاء الحساب ينتقل مباشرة إلى صفحة إتمام البيانات بدل شاشة تسجيل الدخول — [ ] لم يُنفذ. تدفق التسجيل: register.tsx (شاشة الاسم/الهاتف/كلمة المرور) وhome.tsx وregistration-success.tsx. عند أول فتح يظهر نموذج تسجيل دخول (الاسم+كلمة المرور) تحت اسم — يجب حفظ جلسة/جلسة تسجيل بعد createAccount والانتقال لصفحة البيانات.

حقائق تقنية:
- wallets.ts: addWalletEntry({ownerId, ownerName, role:"patient"|"provider", kind:"credit"|"debit", type:"recharge"|"payment"|"refund"| "earned"|"charge", amount, description, reference?}).
- getPatientProfile() من lib/patient-profile يعطي {phone, fullName, ...}.
- quote-offers.tsx عروض ثابتة محلية (QUOTE_OFFERS) ولا تحتوي patientPhone/providerId.
- ServiceRequest: providerId, providerName, specialtyLabel, services[{serviceId,serviceName,price}], total, status, createdAt...
- admin.tsx تبويب المحفظات موجود (WalletsPanel + ProviderEarningsLookup).
- الاختبارات: 152 ناجحة (pnpm test).


## حقائق إضافية بعد الفحص (14 أغسطس)
- المستخدم أوضح: يريد صفحة تسجيل الدخول كأول صفحة في التطبيقين (المريض + الشريك). من له حساب يدخل بالاسم وكلمة المرور؛ من ليس له حساب يختار «إنشاء حساب» (زر أسفل) → صفحة التسجيل → صفحة إتمام البيانات (/profile).
- المريض: screen entry هو app/index.tsx → router.replace حسب profile (حاليًا: profile → home أو profile، لا profile → /register). كلمة المرور تُدخل في register.tsx (form.password) لكن savePatientProfile في lib/patient-profile.ts لا تحفظ كلمة المرور! (PatientProfile بلا حقل password). يجب: حفظ passwordHash في حسابات المريض (مفتاح مستقل أو في profile) + التحقق في شاشة تسجيل الدخول الجديدة.
- المريض لا يوجد لديه passwordHash مسبقًا في حسابات مسجلة قديمة — يجب التوافق: عند تسجيل الدخول يتحقق من hash محفوظ، وإن لم يكن محفوظًا (حسابات قديمة) يقبل ويحفظ hash من أول دخول، أو يطلب تسجيل جديد.
- الشريك: لا توجد حاليًا شاشة دخول شريك في app! دوال provider-auth.ts (lib/_e2e/provider-auth.ts، STORAGE_SESSION_KEY=provider_session_v1، hashPassword، validateRegistration، createProviderAccount، verifyProviderLogin موجودة في provider-auth) والـ admin يحفظ password: "" كـ passwordHash عبر addProviderAccount من lib/admin. يجب إنشاء شاشة دخول شريك (/provider-login) تستخدم verifyProviderLogin.
- قيد «مستحق له» عند إتمام الخدمة: لا توجد نقطة إتمام في واجهة المريض أو الشريك (updateRequestStatus موجودة في lib/service-requests.ts سطر 117، تستخدمها اختبارات e2e فقط). الحل: إضافة زر «إنهاء الخدمة/تم إتمام الخدمة» للمريض في app/(tabs)/requests.tsx للطلبات المقبولة (accepted) → عند الضغط يؤكد Alert ثم updateRequestStatus(completed) + قيد earned للشريك + قيد payment للمريض (المريض يدفع مقابل الخدمة المنجزة) + إشعار للشريك.
- الإعلانات المفعلة: تُقرأ من lib/admin.ts (readAdminAds، AdminAdSlide) — يجب استبدال banners في app/(tabs)/index.tsx بإعلانات loop تلقائي من لوحة التحكم.
- quote-offers.tsx: قيد الدفع أُضيف (confirmOffer async مع getPatientProfile + addWalletEntry). TypeScript نظيف.
