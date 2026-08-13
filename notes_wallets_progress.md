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
