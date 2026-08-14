# ملاحظات تنفيذ مرحلة «دشرنة الاستشارات وحجز المواعيد» — للاستخدام الداخلي فقط

## الحالة المرجعية للملفات (مقروءة 14 أغسطس 2026)
- `lib/consultation-requests.ts` — تم تعديله: أضفت `ConsultationPaymentStatus = "payment_pending" | "confirmed"`، وحقول `paymentStatus`/`paymentConfirmedAt` في `ConsultationRequest`، ودوال جديدة: `createConsultationRequest(input)` (يفرض id/status/paymentStatus/createdAt)، `readPatientConsultationRequests(patientId)`, `confirmConsultationPayment(id)`. القبول يفتح thread عبر `acceptConsultationRequest(id, doctorId, doctorName)` (موجودة أصلًا).
- `app/consultation-results.tsx` — أضيف `mode: "instant"` لكن ينقصه `paymentStatus` (خطأ TS). يجب إعادة الكتابة لاستخدام `createConsultationRequest` مع اختيار mode (فوري/موعد) وواجهة اختيار موعد + توقيت.
- `lib/chat.ts` — `openThread`, `findThread`, `CHAT_THREADS_KEY=provider_chat_threads_v1`. threadId=requestId.
- `app/chat.tsx` — `findRequestForThread` يقرأ `readPatientRequests` فقط من service-requests => يجب توسيعه ليشمل consultation_requests_v1 (يبحث في النظامين، مسموح إذا status accepted/completed).
- `app/(tabs)/requests.tsx` — يقرأ ServiceRequest فقط، يجب دمج طلبات الاستشارة (بطاقات مميزة: شارة "استشارة" + شارة فوري/موعد + حالة الدفع).
- `app/admin.tsx` — لوحة تحكم بـ PIN + تبويبات. يجب إضافة لوحة «أطباء الخارج» (ExternalConsultationDoctor من `lib/consultation-doctors.ts`): CRUD + تفعيل/إيقاف. الأطباء الخارجيون بلا هاتف/كلمة مرور (تسجيل يدوي من الإدارة فقط).
- `lib/consultation-doctors.ts` — `addExternalDoctor`, `removeExternalDoctor`, `toggleExternalDoctor`, `readExternalDoctors`, `DEFAULT_EXTERNAL_DOCTORS`, CONSULTATION_STORAGE_KEY=`tabibi.consultations.v1`. الطبيب الخارجي: id/name/country/specialty/experience/price/initials/enabled.
- `app/payment.tsx` — شاشة دفع مخصصة لـ ServiceRequest فقط (service_requests_v1). للاستشارة نحتاج إما تعميمها أو شاشة `consultation-payment.tsx` جديدة (نفس UI: انتظار -> تأكيد إلكتروني -> قيد محفظة + إشعار payment_confirmed).
- `lib/service-requests.ts` — ServiceRequest له paymentMethod (cash/electronic) + paymentStatus (awaiting_provider_acceptance/payment_pending/confirmed). قاعدة: الزيارات المنزلية نقدي بعد الخدمة أو إلكتروني قبلها. الاستشارة = إلكتروني فقط قبل الخدمة.
- `lib/notifications.ts` — أنواع: request_received/request_accepted/request_rejected/chat_message/received_rating/payment_confirmed/earned_wallet_entry. recipientId: معرّف الطرف (للشريك = providerId مثل phone، للخارجي = doctorId).
- `lib/wallets.ts` — `addWalletEntry({ownerId, ownerName, role:"patient"|"provider", kind:"debit"|"credit", type, amount, description, reference})`. قيد دفع للمريض وقيد مستحق له للشريك عند الإتمام.
- `tabibi-partner/app/(tabs)/requests.tsx` — قبول الشريك: `respond()` يستدعي `openThread` + إشعار request_accepted. يعرض شارات الدفع وينتظر confirmed. لا يقرأ حاليًا طلبات الاستشارة (consultation_requests_v1).
- `app/consultation.tsx`, `app/consultation-specialties.tsx` — بوابة الاستشارات واختيار التخصصات، يرسلان params {type, specialtyId} إلى /consultation-results.

## التقدم الحالي (14 أغسطس 2026)
- consultation-requests.ts: مُعدَّل بالكامل (paymentStatus + createConsultationRequest + readPatientConsultationRequests + confirmConsultationPayment). جاهز.
- consultation-results.tsx: أعيد بناؤه — handleRequest يفتح مودال (chosenDoctor/show overlay) فيه اختيار فوري/موعد + تواريخ 14 يومًا + وقت يدوي HH:mm + ملاحظة الدفع الإلكتروني فقط + زر "إرسال الطلب والدفع" يستدعي submitConsultation() الذي ينشئ الطلب بـ createConsultationRequest (patientId = `${fullName}-${phone}`) ثم يتوجه إلى /consultation-payment؟requestId=…&doctorName=…
- خطأ TS متبقٍ: ScreenContainer لم يُغلق — كان في الملف الأصلي إغلاقان متتاليان `</ScrollView></ScreenContainer>` وقد اختفى أحدهما عند التعديل (انظر سطر 376-386). يجب إرجاع `</ScreenContainer>` قبل `)}
      )}`
- المتبقي: (1) إصلاح إغلاق ScreenContainer، (2) إنشاء app/consultation-payment.tsx (نسخة من app/payment.tsx)، (3) توسيع app/chat.tsx readPatientRequests+readConsultationRequests، (4) دمج الاستشارات في app/(tabs)/requests.tsx، (5) لوحة طلبات الاستشارة الخارجية في admin.tsx + قبول يدوي + لوحة أطباء الخارج، (6) تطبيق الشريك: قراءة طلبات الاستشارة للأطباء المحليين في tabibi-partner/app/(tabs)/requests.tsx، (7) إشعارات، (8) اختبارات، (9) git push + checkpoint.

## التقدم (محدّث)
- consultation-results.tsx: مكتمل (اختيار فوري/موعد + مودال + createConsultationRequest → /consultation-payment). checkpoint 204c3d44.
- consultation-payment.tsx: أنشئت — إشعارات عبر pushNotification محلية (notifications.ts لا يصدّر notifyRequestAccepted). خطأ TS: params.requestId من نوع string|null مع reference: string|undefined — الحل: reference: requestId ?? undefined في addWalletEntry (سطر ~125).
- ملاحظة: notifications.ts يصدّر addNotification؟ يجب التحقق. استخدمت دالة محلية pushNotification في consultation-payment.tsx.

## خطة التنفيذ المتبقية
1. [ ] consultation-results.tsx: اختيار فوري/موعد (segmented)، عند الموعد اختيار تاريخ/وقت (web: inputs نوع date/time؛ mobile: DateTimePicker إن توفر)، ثم createConsultationRequest. الدفع الإلكتروني قبل الخدمة: الانتقال إلى /consultation-payment.
2. [ ] consultation-payment.tsx: جديدة من نسخة payment.tsx، إلكتروني فقط، تقرأ/تحدّث consultation_requests_v1، قيد محفظة debit للمريض + إشعار payment_confirmed.
3. [ ] app/chat.tsx: توسيع findRequestForThread للقراءة من النظامين + السماح للاستشارات.
4. [ ] app/(tabs)/requests.tsx: دمج طلبات الاستشارة ببطاقات مميزة + أزرار: دفع غير مكتمل، دردشة بعد القبول، إلغاء، عرض موعد.
5. [ ] قبول طلبات الاستشارة: للمحليين من تطبيق الشريك (إضافة قسم استشارات في تبويب الطلبات بـ tabibi-partner)؛ للخارجيين من لوحة التحكم (زر قبول على طلبات الاستشارة المعلقة للأطباء الخارجيين). بعد القبول: إشعار request_accepted للمريض + فتح محادثة. ملاحظة: الاستشارة الخارجية تُقْبَل يدويًا من الإدارة لأنها بلا حساب في تطبيق الشريك.
6. [ ] admin.tsx: لوحة «أطباء الخارج» CRUD + قسم طلبات استشارة مقبولة/معلقة للقبول اليدوي.
7. [ ] إشعار request_received عند إرسال طلب استشارة (للخارجي: إشعار للإدارة؟ أو فقط عرض الطلب في لوحة التحكم). للمحلي: إشعار للشريك (من تطبيق الشريك عند قراءة طلباته الجديدة).
8. [ ] قاعدة الدفع العامة: تعليق واضح في service-requests.ts + توثيق؛ الاستشارة إلكتروني حصري.
9. [ ] اختبارات vitest: سيناريوهات كاملة (7-9 اختبارات) + تحديث tests موجودة إن انكسرت (157 للمريض + 31 للشريك).
10. [ ] git push للتطبيقين، checkpoint، تسليم.

## بيانات مهمة
- ADMIN_PIN عبر ADMIN_PIN في .env (يُمرر كـ secret في CI).
- GitHub repos: tabibi-mobile + tabibi-partner (git push تلقائي بعد كل checkpoint بحسب إعداد المستخدم).
- العملة د.ل، اللغة العربية RTL، ألوان التطبيق: أخضر زيتوني #6B7B3F / بيج #F8F5ED / نص #465132.
- patientId = `${fullName}-${phone}` لطلبات الخدمة؛ consultation_requests تستخدم phone كـ patientId (يجب التوحيد أو توثيق الاختلاف — الأفضل استخدام `${fullName}-${phone}` متسقًا مع readPatientRequests لتجنب فصل المحادثات).

## تقدم إضافي
- consultation-payment.tsx: مكتمل بلا أخطاء TS (قيد دفع patient + مستحق provider + إشعار للطبيب عند تأكيد الدفع). شاشة تقرأ consultation_requests_v1 وتعرض انتظار القبول ثم الدفع الإلكتروني.
- chat.tsx: يقرأ الآن من النظامين (ServiceRequest + ConsultationRequest). بوابة: accepted/completed للخدمات، وaccepted+paymentStatus=confirmed للاستشارات. setDisplayName من doctorName للاستشارات.

## الحالة (بعد دمج requests.tsx)
تم دمج طلبات الاستشارة في تبويب «طلباتي» (app/(tabs)/requests.tsx):
- قراءة من readPatientConsultationRequests ودمجها مع ServiceRequest، تمييز عبر isConsultationEntry ("doctorId" in entry && !("providerId" in entry)).
- renderConsultationCard جديدة: عرض الطبيب/التخصص/نوع (داخلي/خارجي)/نمط (فوري/موعد مع formatScheduledLabel)/حالة الدفع، أزرار: الدفع (→ /consultation-payment)، الدردشة (شروط accepted+paymentStatus confirmed)، الإلغاء (حسب شرط cancelConsultation).
- المتبقي الآن: (1) إضافة الأنماط المفقودة في styles: paymentNote, paymentNoteText, modeText, payButton, payButtonText, doneRow, doneText, cancelRequestButton, cancelRequestButtonText. خطأ TS الحالي: 11 أخطاء كلها أنماط ناقصة. (2) إزالة الاستيراد isServiceEntry غير المستخدم لاحقًا (لن يسبب خطأ لكن تنظيف). (3) بعد ذلك: تطبيق الشريك: دمج قراءة طلبات الاستشارة في tabibi-partner/app/(tabs)/requests.tsx للأطباء المحليين (قبول + إشعار للمريض + تحديث الحالة). (4) لوحة التحكم admin.tsx: قسم «الاستشارات» — قبول يدوي لطلبات الأطباء الخارجيين (international) يفتح thread ويحولها إلى accepted + إشعار المريض، ولوحة إدارة أطباء خارج ليبيا (بدون رقم هاتف، تسجيل يدوي). (5) عرض طلبات الاستشارة الخارجية في نتائج consultation-results عبر externalDoctors. (6) اختبارات vitest جديدة + git push + checkpoint + تسليم.
- ملاحظة: admin.tsx موجود في تطبيق المريض (شاشة /admin محمية بـ ADMIN_PIN). الطبيب الخارجي ليس له حساب في تطبيق الشريك => القبول يتم من لوحة التحكم فقط لطلبات international، والطبيب المحلي يقبل من تطبيق الشريك.

## معلومات مهمة عن البنية (من provider-registry.ts)
ProviderAccount ليس فيه deliveryMode. حقل التوفر هو availability.availableNow + slots[{day,startHour,endHour}] حيث day مثل "saturday". الاستشارات تُحدد نوعها من ConsultationType local/international وConsultationMode instant/scheduled. قاعدة الدفع online/منزلي: الحل الأنسب هو الاعتماد على specialization — التخصصات التي بطبيعتها online هي استشارات (التغذية/النفسية/الاستشارات) بينما الخدمات المنزلية (تمريض رعاية منزلية، كبار السن، بيطري منزلي) home. سنُضيف deliveryMode إلى ProviderAccount (اختياري، افتراضي "home") ويُضبط تلقائيًا من التخصصات، ثم تُستخدم في doctor-detail.tsx وquote-offers.tsx وpayment.tsx لفرض الإلكتروني للخدمات online.

## حالة تطبيق قاعدة الدفع (المرحلة 3)
1. inferDeliveryMode أُضيفت في lib/provider-registry.ts وتستنتج online/home/both من تخصصات مقدم الخدمة (أو من deliveryMode إن وُجد). TypeScript نظيف الآن بعد تعديل doctor-detail.tsx لاستخدامها.
2. doctor-detail.tsx: عند online تظهر زر «دفع إلكتروني» فقط بنص «هذه خدمة عن بُعد، لذا يكون الدفع إلكترونيًا فقط وقبل تقديم الخدمة»، وعند home تظهر نقدي/إلكتروني.
3. consultations (consultation-payment.tsx) تلتزم أصلًا بالدفع الإلكتروني المسبق.
4. quote-offers.tsx (صيدليات/مختبرات): طلب عرض أسعار يُستكمل بالزيارة/التوصيل، فالنقدي/الإلكتروني مازالا قائمين — متوافق مع القاعدة لأن الاستلام منزلي. لا تغيير مطلوب.
5. ملاحظة لـ admin.tsx (المرحلة 4): يمكن مستقبلًا إضافة toggle deliveryMode لحساب مقدم الخدمة في لوحة التحكم، لكن ليس مطلوبًا الآن.

## المتبقي في المرحلة 4:
- استشارات خارج ليبيا: تسجيل يدوي من لوحة التحكم فقط (بدون رقم هاتف) — قسم «أطباء الخارج» في admin.tsx (إضافة/تعديل/حذف/تفعيل).
- عرض طلبات الاستشارة في «طلباتي» — تم جزئيًا في requests.tsx (بطاقة استشارة + أنماط أُضيفت).

## نقاط مهمة للأختبارات (tests/):
- اختبارات vitest تعمل بـ `pnpm test` — يجب تمرير ADMIN_PIN كسر.
- vitest.config.ts موجود ويحمّل env.
- مستودعات التخزين: service_requests_v1, consultation_requests_v1, notifications_v1, provider_accounts_v1, wallets_v1, ratings_v1.

## تحديث الحالة (المرحلة 4)
- InternationalDoctorsPanel أُضيفت في admin.tsx: تبويب جديد «أطباء الخارج» (id: international, icon: language). تسجيل يدوي بدون رقم هاتف (الاسم، الدولة، التخصص، سنوات الخبرة، السعر). تفعيل/إيقاف/حذف عبر Alert تأكيد. يستخدم readExternalDoctors/addExternalDoctor/toggleExternalDoctor/removeExternalDoctor/makeInitials من lib/consultation-doctors. TypeScript نظيف.
- admin.tsx: AdminTabId صار يشمل "international".
- admin.tsx يستخدم useState/useEffect/useCallback — يجب التأكد أن الاستيرادات موجودة (استخدمتها بقية اللوحات فعلًا).
- ملاحظة: لا توجد دالة updateExternalDoctor (التعديل غير مطلوب الآن، الإضافة/الحذف/التفعيل كافية).

## المتبقي قبل checkpoint:
1. pnpm check + pnpm test (يجب أن تنجح).
2. تحديث todo.md: وضع [x] لبنود المرحلة (دردشة الاستشارات، الفوري/الموعد، الدفع، أطباء الخارج، طلباتي).
3. webdev_save_checkpoint ثم تسليم.
4. لا حاجة للرفع إلى GitHub هنا — المستخدم رفع سابقًا يدويًا؛ لكن يمكن الإشارة له.
5. الطلبات النهائية في todo.md (المراحل الجديدة) يجب وضعها [x] عند الانتهاء: ربط الاستشارات بالدردشة، الفوري/الموعد، الدفع الإلكتروني المسبق للاستشارات، inferDeliveryMode، لوحة أطباء الخارج، بطاقة الاستشارة في طلباتي.

## حالة المشروع النهائية (بعد المرحلة الأخيرة 14 أغسطس مساءً 3)
المرحلة السابقة (دشرنة الاستشارات) أُنجزت وحُفظت في checkpoint 1ce4c682، وtodo.md محدّث كله [x] حتى نهاية «مرحلة ربط الاستشارات بالدردشة وحجز المواعيد».

### الاقتراحات المعتمدة الجديدة (todo.md أسفل الملف):
1. إشعار للمريض عند بدء موعد الاستشارة المحجوز لاحقًا.
2. زر «إتمام الاستشارة» في تطبيق الشريك ينهي الاستشارة (consultation → completed) ويطلب التقييم من المريض.
3. تعديل بيانات الطبيب الخارجي من لوحة التحكم (admin.tsx InternationalDoctorsPanel).
4. تحميل تطبيق طبيب شريك ولوحة التحكم على GitHub (المستودعات موجودة بالفعل في حساب المستخدم — tabibi-partner موجود في /home/ubuntu/tabibi-partner، admin لوحته داخل tabibi-mobile أو مستودع منفصل؛ يجب التحقق بـ gh repo list).
5. تسليم ملفات التطبيقين للتنزيل على جهاز المستخدم (إرفاق نسخة مضغوطة أو روابط المستودعات).

### حقول ConsultationRequest (lib/consultation-requests.ts):
id, type(local|international), mode(instant|scheduled), scheduledAt?, externalDoctorName/Country?, patientId/Name/Phone, specialtyLabel, doctorId, doctorName, price, status(pending/accepted/rejected/completed/cancelled), paymentStatus(payment_pending/confirmed), paymentConfirmedAt?, notes?, createdAt, updatedAt.

### دوال متاحة:
- updateConsultationRequest(id, patch)، confirmConsultationPayment(id)، acceptConsultationRequest(id, doctorId, doctorName) يفتح Thread عبر openThread من lib/chat.ts (params: requestId, patientId, patientName, providerId, providerName).
- الإشعارات: createNotification من lib/notifications.ts، وأنواع إشعارات متفق عليها مع الشريك (request_received, request_accepted, payment_confirmed, received_rating...).

### ملفات رئيسية معروفة:
- app/consultation-results.tsx (شاشة نتائج + اختيار فوري/موعد)، app/consultation-payment.tsx (دفع إلكتروني مسبق).
- app/(tabs)/requests.tsx (طلباتي: بطاقات خدمات + استشارات)، app/chat.tsx (دردشة مشتركة للطلبات والاستشارات المقبولة).
- app/admin.tsx: تبويب «أطباء الخارج» = InternationalDoctorsPanel (إضافة/تفعيل/إيقاف/حذف، بدون رقم هاتف) — يحتاج إضافة تعديل.
- lib/provider-registry.ts: inferDeliveryMode (online/home/both).
- lib/consultation-doctors.ts: readExternalDoctors/update غير موجود — يجب إضافة updateExternalDoctor.

### GitHub:
- gh CLI مهيأ بحساب المستخدم. المستودعات المنشأة سابقًا: tabibi-mobile + tabibi-partner (+ admin إن كان منفصلًا). gh repo list للتحقق.
- CI: vitest.config.ts يحمل env + ADMIN_PIN يُمرَّر كسر.

## تقدم تنفيذ الاقتراحات الثلاثة (الحالي)
### منجز:
1. lib/consultation-requests.ts: أُضيف حقل completedAt? للنوع، ودوال completeConsultationRequest(id) و readConsultationRequest(id) و notifyConsultationStarted(request, doctorName) (ترسل إشعار consultation_started للمريض عبر createNotification، باستخدام import type { Notification as LocalNotification } لتفادي تعارض اسم نوع Notification مع expo-notifications).
2. lib/notifications.ts: أُضيف "consultation_started" إلى NotificationType.
### متبقٍ:
- إشعار البدء: استدعاء notifyConsultationStarted من طرف الشريك عند «بدء الاستشارة». يجب التحقق: هل لدى الشريك وصول لطلبات الاستشارات؟ الشريك لديه incoming-requests.ts للخدمات فقط. يمكن للشريك قبول الاستشارات من readConsultationRequests (مستودع مشترك عبر نفس مفاتيح التخزين — tabibi-partner يقرأ نفس مفاتيح tabibi-mobile). يحتاج تطبيق الشريك: عرض طلبات الاستشارات له (مقبولة) مع زر «بدء الاستشارة» (إشعار) و«إتمام الاستشارة» (completeConsultationRequest). يجب إضافة readConsultationRequests/completeConsultationRequest إلى tabibi-partner عبر نسخ المكتبات المشتركة (ملاحظة: المفاتيح مشتركة لكن الملفات مستنسخة في كل مشروع).
- تعديل الطبيب الخارجي: admin.tsx InternationalDoctorsPanel — إضافة updateExternalDoctor في lib/consultation-doctors.ts ونافذة تعديل في اللوحة.
- ثم: pnpm check + pnpm test في tabibi-mobile، checkpoint، ثم GitHub (gh repo list للتحقق من وجود tabibi-partner وadmin)، تسليم ملفات للتنزيل (git archive أو zip من الغيت).
### ملاحظات تقنية:
- TS نظيف حاليًا. اختبارات tabibi-mobile: 157 ناجحة.
- مستودعات GitHub للمستخدم موجودة مسبقًا (tabibi-mobile + tabibi-partner + admin حسب السجل السابق).

## تقدم (تابع): اقتراحات ثلاثة — حالة ما بعد التعديلات
- تمت إضافة قسم «الاستشارات» في /home/ubuntu/tabibi-partner/app/(tabs)/requests.tsx: groupConsultationsByStatus + consultationStatuses + render بطاقات (patientName + externalDoctorName، specialtyLabel، الموعد formatScheduledAt، شريحة دفع mode/price/paymentStatus، أزرار: الدردشة / بدء الاستشارة (notifyConsultationStarted) / إتمام الاستشارة (completeConsultationRequest + إشعار request_completed للمريض الذي يطلب تقييمه)). ملاحظة: يجب التأكد أن «request_completed» مقبول في NotificationType للطرفين — إن لم يكن، أضفه أو استخدم «received_rating» لا — الأفضل إضافته إن لم يوجد.
- استيرادات الشريك الآن تشمل consultation-requests (نُسخت المكتبتان من tabibi-mobile إلى tabibi-partner/lib/).
- متبقٍ: 1) التحقق من نوع إشعار request_completed في tabibi-partner/lib/notifications.ts (إن غائب أضف «consultation_completed» بدلًا منه أو أضف request_completed لكلا الملفين). 2) إضافة إشعار تلقائي عند إتمام الاستشارة (تم فعله في completeConsultation). 3) تعديل الطبيب الخارجي في admin.tsx (tabibi-mobile): إضافة updateExternalDoctor إلى tabibi-mobile/lib/consultation-doctors.ts ونافذة تعديل في InternationalDoctorsPanel (فتح نموذج تعديل بنفس حقول الإضافة: الاسم/الدولة/التخصص/الخبرة/السعر). 4) pnpm check + test في tabibi-mobile، ثم checkpoint، ثم GitHub: gh repo list (التحقق tabibi-partner + tabibi-admin أو admin داخل tabibi-mobile حسب ما ذكره المستخدم سابقًا «التطبيقان ولوحة التحكم»)، ثم git archive/zip وتسليم.

## حالة ما بعد إصلاحات الشريك (05:43)
تم إصلاح TypeScript في tabibi-partner: أعيدت كتابة lib/consultation-doctors.ts لتعمل دون provider-registry (محلي = حساب الشريك نفسه، خارجيون من CONSULTATION_STORAGE_KEY)، وأزيل تكرار PAYMENT_METHOD_LABELS من app/(tabs)/requests.tsx (سطر 98 السابق). chat.tsx بالشريك يدعم الآن معرف استشارة (readConsultationRequest) مع رأس محادثة consultationHint. الاختبارات: المريض 157/158، الشريك 31/31 ناجحة، TypeScript نظيف في التطبيقين.

متبقٍ قبل التسليم:
1. لوحة التحكم admin.tsx (tabibi-mobile): تبويب «أطباء الخارج» — إضافة updateExternalDoctor + نافذة تعديل بيانات (اسم/دولة/تخصص/خبرة/سعر) — هذا أحد الاقتراحات الثلاثة المعتمدة.
2. إضافة إشعار للمريض عند إتمام الشريك للاستشارة (request_completed موجود في tabibi-partner، تأكد من تسميته في إشعار المريض).
3. checkpoint في tabibi-mobile، ثم GitHub: gh repo list (مستودع partner وربما admin حسب ما أنشئ سابقًا)، رفع آخر نسخة من tabibi-partner (المستخدم طلب رفعه، وإن لم يكن مستودعه موجودًا أنشئ tabibi-partner --private وأضف remote وأرفع). ثم zip كامل tabibi-partner للتنزيل.
4. تسليم: رسالة result مع نسخ المشروع manus-webdev://checkpoint.

## حالة 05:44 (الأخيرة قبل ضغط السياق)
اكتمل الاقتراح الثالث (تعديل الطبيب الخارجي) في admin.tsx: زر «تعديل» + نموذج تعديل بنفس حقول الإضافة عبر updateExternalDoctor (أُضيفت للمكتبة في tabibi-mobile/lib/consultation-doctors.ts وللاستيراد في admin.tsx). TypeScript نظيف في tabibi-mobile.

الاقتراحان الأول والثاني (إشعار بدء الموعد notifyConsultationStarted + إتمام الاستشارة completeConsultationRequest مع إشعار للمريض) أُنفذا سابقًا في lib/consultation-requests.ts (المريض) وتبويب الاستشارات في requests.tsx (الشريك) مع types في notifications.ts للطرفين.

متبقٍ:
1. التحقق من أن إشعار إتمام الاستشارة يصل للمريض: في requests.tsx بالشريك عند completeConsultationRequest يُستخدم إشعار — تأكد من النوع الصحيح في إشعارات المريض (createNotification للطرف patient).
2. فحص أن toggleExternalDoctor(id, enabled) متوافق مع استدعاء admin.tsx القديم (نعم، نفس التوقيع).
3. pnpm check + pnpm test في tabibi-mobile، webdev_save_checkpoint.
4. GitHub: gh repo list لمعرفة المستودعات. رفع tabibi-partner: أنشئ مستودع tabibi-partner --private، أضف remote origin، ارفع كاملاً. ثم zip (/home/ubuntu/tabibi-partner) للتنزيل — أرسل كملف مرفق.
5. تسليم result مع manus-webdev://checkpoint.

## حالة 05:45 (قبل ضغط السياق)
1. الاقتراحات الثلاثة المعتمدة اكتملت وفُحصت: إشعار «بدأت الاستشارة» (notifyConsultationStarted في tabibi-mobile/lib/consultation-requests.ts + استدعاؤها في requests.tsx بالشريك عند ضغط «بدء الاستشارة»)، زر «إتمام الاستشارة» بالشريك (completeConsultation + إشعار request_completed للطرف patient — أُضيف الطلب type إلى notifications.ts بالشريك وبالمريض)، تعديل الطبيب الخارجي من لوحة التحكم (updateExternalDoctor في tabibi-mobile/lib/consultation-doctors.ts + زر تعديل ونافذة تعديل في InternationalDoctorsPanel داخل app/admin.tsx).
2. TypeScript نظيف، 157 اختبار مريض ناجح، وتم حفظ نقطة التحقق d1117992.
3. المستخدم أرسل لقطتي شاشة «حسابي» (/profile): الشاشة تعكس ما هو موجود — لا مشكلة ظاهرة؛ البطاقة/العناوين/اقتراح مدينة/إفراد العائلة تعمل. أخبرته بأنها تعمل بشكل طبيعي وسأكمل رفع GitHub.
4. المتبقي: تحميل تطبيق الشريك tabibi-partner (الموجود في /home/ubuntu/tabibi-partner) على GitHub — gh repo list لمعرفة المستودعات (tabibi-mobile مرفوع سابقًا). إنشاء مستودع جديد --private باسم tabibi-partner، إضافة remote في /home/ubuntu/tabibi-partner ورفع كاملاً. ثم zip للمشروعين (zip -r /home/ubuntu/tabibi-mobile.zip tabibi-mobile /home/ubuntu/tabibi-partner.zip tabibi-partner) وتسليمهما مرفقين في النتيجة النهائية.
5. بعد الرفع: webdev_save_checkpoint نهائي + تسليم result برسالة نهائية تشمل: ملخص الأعمال (اقتراحات 3 + رفع GitHub + ملفات تنزيل)، المرفقات: manus-webdev://d1117992 + zip للشريك (وللمريض إن لزم)، واقتراحات خطوات قادمة.

## حالة 05:55 — مرحلة فصل لوحة التحكم
1. طلب المستخدم الجديد: لوحة التحكم يجب أن تكون منفصلة تمامًا عن التطبيقين؛ لن يتدخل فيها أحد من التطبيق. موافقتي المقترحة (وافق عليها): إخراجها من تطبيق المريض وتحويلها لواجهة ويب مستقلة تتشارك البيانات نفسها، استعدادًا للاستضافة الأحد/الاثنين.
2. ADMIN_PIN تم التأكد منه عبر webdev_request_secrets (متوفر في البيئة EXPO_PUBLIC_ADMIN_PIN يُحقن في dev:metro عبر cross-env). CI يمرره.
3. الوضع الحالي: admin.tsx (1710 سطرًا) داخل app/ بتبويبات: summary/providers/ads/services/requests/patients/wallets/cities/international. يظهر في profile.tsx كأيقونة shield تدفع /admin.
4. الخطة: إنشاء app/admin-web.tsx (web-only صفحة كاملة) — يمكن استخدام Platform.OS === "web" لإخفاء ScreenContainer واستخدام HTML مباشرة، أو إعادة كتابة بواجهة HTML/CSS كاملة تناسب الويب. الأجزاء (Panels) كلها دوال React تعتمد على AsyncStorage نفسها (مفاتيح: service_requests_v1 وغيرها عبر مكتبات lib/*.ts) — يمكن استيرادها من ملف lib/admin.ts وlib/wallets.ts وغيرها لأن الواجهة تعمل في نفس نطاق المتصفح وبالتالي نفس localStorage (AsyncStorage على الويب = localStorage بنفس المفتاح tabibi؟ يجب التحقق من KEY prefix).
5. المتبقي: (أ) إنشاء /admin-web بواجهة HTML/React كاملة مع شاشة PIN، (ب) حذف أيقونة shield والرابط إلى /admin من profile.tsx وحذف app/admin.tsx، (ج) اختبار، (د) رفع GitHub، (هـ) تسليم result مع الشرح.
6. ملاحظة مهمة: على الويب AsyncStorage يعمل عبر localStorage بالمفتاح نفسه في نفس النطاق — اللوحة المنفصلة داخل نفس مشروع Expo ستعمل في نفس النطاق (https://8081-...manus.computer/admin-web) وستقرأ نفس البيانات. عند الانتقال للاستضافة الخارجية لاحقًا يجب أن تكون اللوحة والتطبيقات على نفس النطاق أو ننقل البيانات لقاعدة بيانات SQL مشتركة (سيفعلها المستخدم عند الاستضافة).

## حالة 05:58 — تقدم بناء admin-web.tsx
أنشأت /home/ubuntu/tabibi-mobile/app/admin-web.tsx بإطار HTML كامل (AdminPinGate + شريط تبويبات رئيسي main). الأقسام التسعة تستلم onRefresh فقط: SummaryPanel/ProvidersPanel/AdsPanel/ServicesPanel/RequestsPanel/PatientsPanel/WalletsPanel/CitiesPanel/InternationalDoctorsPanel — يجب إضافة كل واحدة داخل الملف نفسه (استنساخ منطقها من app/admin.tsx السطور 185-1710 مع تحويل RN إلى HTML: View→div, Text→div, Pressable/TouchableOpacity→button, TextInput→input, FlatList→map, Alert→window.confirm). الأنماط inline styles. الألوان: OLIVE #6B7B3F, GOLD #C9A961.
الاستيرادات موجودة بالفعل (lib/admin, lib/wallets, lib/patient-profile, lib/libya-cities, lib/city-suggestions, lib/consultation-doctors, lib/provider-registry).
بعد اكتمال الملف: (1) حذف <Pressable shield> من app/profile.tsx سطر 65 تقريبًا (أيقونة adminShield style سطر 109) وإزالة app/admin.tsx نهائيًا. (2) pnpm check + pnpm test. (3) رفع GitHub (repo tabibi-mobile main). (4) result + الشرح للمستخدم: اللوحة الآن /admin-web منفصلة عن التطبيقين، بياناتها مشتركة عبر localStorage بنفس النطاق، وعند الاستضافة الأحد/الاثنين ننقلها لقاعدة SQL مشتركة.

## حالة 05:53 — تقدم admin-web.tsx (تفصيل تقني)
- أُنشئ /app/admin-web.tsx (~590 سطرًا): شاشة PIN (AdminPinGate) + main بشريط 9 تبويبات + لوحات مكتملة: SummaryPanel, InternationalDoctorsPanel, CitiesPanel (مع isAreaEnabled مساعدة async تقرأ tabibi.libya_cities.v1 من AsyncStorage)، والعناصر المساعدة: Card, Field, ActionChip, Avatar, StatusBadge, PrimaryButton.
- الأنواع الصحيحة المكتشفة: AdminSummary = {providers, activeProviders, frozenProviders, pendingProviders, requests, pendingRequests, acceptedRequests, ratings, ads, enabledAds}. LibyaArea ليس فيه enabled — تفعيل المنطقة عبر disabledAreas في tabibi.libya_cities.v1. CitySuggestion: لا توجد area/reviewed/createdAt (فحص الحقول المطلوبة لاحقًا من city-suggestions.ts).
- المتبقي: (1) إصلاح حقول CitySuggestion + (2) إضافة لوحات: ProvidersPanel/AdsPanel/ServicesPanel/RequestsPanel/PatientsPanel/WalletsPanel من app/admin.tsx مع تحويل RN→HTML. (3) حذف app/admin.tsx وأيقونة shield من profile.tsx. (4) check+test, checkpoint, GitHub push, result.
- استيرادات admin-web الحالية: lib/admin (addProviderAccount, addService, cancelAdminRequest, deleteAdminAd, deleteAdminRating, readAdminAds, readAdminProviderAccounts, readAdminRequests, readAdminRatings, readAdminSummary, readServicesCatalog, toggleAdminAd, toggleService, upsertAdminAd, AdminAdSlide), lib/wallets (getWalletSummaries, getWalletSummary, removeWalletEntry, validateNewWalletEntry, addWalletEntry, LedgerEntryKind, NewWalletEntry, WalletSummary), lib/patient-profile (getPatientProfile, readMedicalAccessGrants, revokeMedicalAccess), lib/libya-cities (getEnabledCities, getLibyaCities, setCityEnabled, setAreaEnabled, TRIPOLI_CITY_ID, LibyaCity), lib/city-suggestions (readCitySuggestions, markCitySuggestionReviewed, removeCitySuggestion, CitySuggestion), lib/consultation-doctors (addExternalDoctor, makeInitials, readExternalDoctors, removeExternalDoctor, toggleExternalDoctor, updateExternalDoctor, ExternalConsultationDoctor), lib/provider-registry (ProviderAccount), lib/admin-auth (isValidAdminPin), @react-native-async-storage/async-storage.

## حالة 05:55 — معلومات هيكلية من app/admin.tsx لاستنساخها في admin-web.tsx
تم استنساخ InternationalDoctorsPanel وCitiesPanel وSummaryPanel في admin-web.tsx. المتبقي: ProvidersPanel, AdsPanel, ServicesPanel, RequestsPanel, PatientsPanel, WalletsPanel.
بنية لوحات admin.tsx الأصلية (سطور 554-800+):
- ProvidersPanel: readAdminProviderAccounts → updateProviderStatus(id, "active"|"frozen"|"cancelled"|"pending")، إضافة حساب عبر addProviderAccount({fullName, role, phone, password, status:"active", specializations:[...], yearsOfExperience, bio, services:[], availability:{availableNow:false,slots:[]}, documents:[]}). statusLabel/statusColor mapping.
- AdsPanel: readAdminAds → AdminAdSlide {id,title,eyebrow,copy,position:"top"|"bottom",enabled}، toggleAdminAd(id,enabled), deleteAdminAd(id), upsertAdminAd(input), AdForm input includes image uri.
- ServicesPanel: readServicesCatalog → service {id, name, enabled}، toggleService(id, enabled), إضافة خدمة جديدة عبر addService (فحص التوقيع لاحقًا).
- RequestsPanel: readAdminRequests → طلبات الخدمة للمراجعة/الإلغاء cancelAdminRequest(id).
- PatientsPanel/WalletsPanel: من lib/wallets (getWalletSummaries, removeWalletEntry...) وlib/patient-profile (getPatientProfile, readMedicalAccessGrants, revokeMedicalAccess) وlib/admin (readAdminRatings, deleteAdminRating, addService).
ألوان: OLIVE #6B7B3F, GOLD #C9A961, error #B55448. خلفية #F7F4EC، بطاقات #fff، حد #E7E0D2.
بعد اكتمال الملف: حذف app/admin.tsx، إزالة أيقونة shield من profile.tsx (سطر ~65 وstyle سطر ~109)، pnpm check + test, checkpoint, push GitHub (tabibi-mobile), result.

## حالة 06:02 — كل التفاصيل الهيكلية للوحات الست المتبقية في admin-web.tsx (من app/admin.tsx)
admin-web.tsx يحتوي بالفعل: AdminPinGate + AdminWebScreen (شريط تبويبات، دالة renderPanel عند السطر ~238 تبحث عن ProvidersPanel/AdsPanel/ServicesPanel/RequestsPanel/PatientsPanel/WalletsPanel)، InternationalDoctorsPanel (253-422)، CitiesPanel (425-558)، SummaryPanel (560-603)، عناصر مساعدة DOM (Card, Field, ActionChip, Avatar, StatusBadge, PrimaryButton, Button, Input) عند 608-733.
توقيعات المكتبات (lib/admin.ts): readAdminAds/upsertAdminAd({enabled,position:"top"|"bottom",eyebrow,title,copy,icon,accent,accentSoft}, id)/deleteAdminAd/toggleAdminAd، AdminAdSlide{id,enabled,position,eyebrow,title,copy,icon,accent,accentSoft}. readServicesCatalog→ServicesCatalog{services:[{key,title,enabled}]}، toggleService(key,enabled)، addService(title). readAdminProviderAccounts→ProviderAccount{id,fullName,role,phone,phone2?,passwordHash,phoneVerified,status:"pending"|"active"|"frozen"|"cancelled",specializations,yearsOfExperience,bio,services,availability,documents,photoUrl,avatar?,createdAt}، updateProviderStatus(id,status)، addProviderAccount({fullName,role,phone,phone2,password,status:"active",specializations:[],yearsOfExperience,bio,services:[],availability:{availableNow:false,slots:[]},documents:[],photoUrl}). readAdminRequests→ServiceRequest[]{id,services:[{serviceName,price}],patientName,providerId,providerName,createdAt,status,paymentMethod}, cancelAdminRequest(id). readAdminRatings/deleteAdminRating(id). readAdminSummary→AdminSummary (المحققة في SummaryPanel).
lib/wallets.ts: WalletSummary{ownerId,ownerName,role,balance,credit,debit,entries:WalletLedgerEntry{kind:"credit"|"debit",type,recharge|payment|refund|earned|charge,amount,description,reference,createdAt,ownerId,ownerName,role}}، NewWalletEntry{ownerId,ownerName,role,kind,type,amount,description,reference}، validateNewWalletEntry→string|null، addWalletEntry، getWalletSummary(id)، getWalletSummaries(role)، removeWalletEntry(id).
lib/patient-profile.ts: getPatientProfile→{phone,fullName,...}، readMedicalAccessGrants→{id,providerId,providerName,recordOwnerNames}[]، revokeMedicalAccess(id).
ألوان: OLIVE #6B7B3F، GOLD #C9A961، #4E7A3F أخضر، #B55448 أحمر، #9A8159، #A65E67، #627F9D، #8F7D98. خلفية #F7F4EC.
statusLabel/statusColor للحالات: active=مفعّل/#4E7A3F، frozen=مجمّد/#9A8159، cancelled=ملغى/#B55448، default=بانتظار الموافقة/GOLD.
requestStatusLabel: pending=معلّق/GOLD، accepted=مقبول/#4E7A3F، completed=مكتمل/OLIVE، rejected=مرفوض/#B55448، default=ملغى/#6A6256.
kindArabicLabel: recharge=شحن رصيد، payment=دفع خدمة، refund=استرداد، earned=مستحق له، charge=مستحق عليه.
ProviderEarningsLookup (يظهر فقط provider): بحث عن مقدم خدمة من readAdminProviderAccounts وعرض WalletSummaryCard.
PatientAccessRow: فلترة grants حيث recordOwnerNames يشمل رقم هاتف المريض (toLowerCase).
بعد الإكمال: حذف app/admin.tsx، إزالة Pressable الدرع من profile.tsx (سطور 63-66، ستايل adminShield 103-110)، check+test، checkpoint، git push، result.

## حالة 05:56 — إصلاح admin-web.tsx (1443 سطرًا)
الأخطاء المتبقية كلها داخل admin-web.tsx (الأنماط المفقودة ليست معرّفة بعد):
1. نقل `import type { AdminSummary }` من سطر 605 (منتصف الكود) إلى الأعلى.
2. تعريف الأنماط المفقودة في نهاية الملف: panelTitleStyle, panelHintStyle, formCardStyle, formSectionTitleStyle, inputStyle, chipStyle, chipRowStyle, activeChipStyle, actionChipStyle(color), actionRowStyle, cardStyle, cardHeaderStyle, cardIdentityStyle, cardNameStyle, cardSubtitleStyle, badgeStyle, dimCardStyle, emptyTextStyle, errorTextStyle, primaryButtonStyle, secondaryButtonStyle, smallButtonStyle, addRowStyle.
3. updateProviderStatus غير موجود — يجب فحص ما هو موجود في lib/admin.ts لاستبدالها (ربما updateAdminProviderStatus أو استخدام toggle).
4. ProviderAccount بلا phone2 ولا photoUrl: إزالتها من نموذج مقدمي الخدمة.
5. toggleAdminAd(id) يحتاج وسيطين (id, enabled).
بعد الإصلاح: حذف admin.tsx من app/ وإزالة الرابط من profile.tsx، ثم pnpm check + pnpm test، ثم checkpoint وتسليم مع شرح الفصل للمستخدم.

## مشكلة 05:58: /admin-web يعيد التوجيه إلى /login
- عند فتح /admin-web في المتصفح، حارس تسجيل الدخول في _layout (للمريض) يعيد التوجيه إلى /login.
- الحل: استثناء مسار "admin-web" من حارس تسجيل الدخول في app/_layout.tsx (المسار يجب أن يبقى متاحًا على الويب دون حارس، وشاشة PIN داخلية تحميه).
- admin-web.tsx جاهز 1474 سطرًا (شاشة PIN + لوحات) لكن لا يظهر بسبب الحارس.

## تشخيص 05:59: سبب التوجيه إلى /login
- سبب إعادة التوجيه هو app/(tabs)/index.tsx (TabHomeGate): يعيد التوجيه إلى /login عندما لا يكون هناك بروفايل مريض. هذا البوابة الافتراضية داخل تبويب (tabs) وتُفعَّل لأن مسار /admin-web غير مُعرَّف في Stack الرئيسي؟ لا — بل لأن Expo Router يقرّب المسار من البوابة الافتراضية (index) في (tabs).
- ملاحظة: admin-web.tsx موجود في app/admin-web.tsx لكن لم يظهر في قائمة ls app بعد حذف admin.tsx — يجب التأكد أن الملف لا يزال موجودًا (ls: admin-web.tsx موجود ✓).
- الحل الصحيح: إضافة Stack.Screen name="admin-web" في app/_layout.tsx (Stack root) لتسجيل المسار صراحة، والـ entry guard في index.tsx تم استثناءه بالفعل (/admin-web في pathname).
- تبويب (tabs)/index.tsx: لا حاجة لاستثناء لأن admin-web ليس داخل (tabs)؛ تسجيله في الـ Stack كافٍ.

## حالة 06:00 — فصل لوحة التحكم (المرحلة الحالية)

المطلوب من المستخدم: فصل لوحة التحكم نهائيًا عن تطبيق المريض؛ لا يراها المريض ولا الشريك من داخل التطبيق. القرار المعتمد (وافق عليه المستخدم): لوحة التحكم كواجهة ويب مستقلة على المسار /admin-web تعمل في المتصفح على أي جهاز وتتشارك البيانات نفسها (AsyncStorage/localStorage ضمن النطاق نفسه)، محمية بـADMIN_PIN عبر EXPO_PUBLIC_ADMIN_PIN.

المنجز حتى الآن:
1. أُنشئ app/admin-web.tsx (1474 سطرًا): صفحة ويب كاملة بعناصر DOM قياسية (div/button/input)، مكوّن AdminWebScreen فيه تبويبات 9: summary|providers|ads|services|requests|patients|wallets|cities|international، مع AdminPinGate (isValidAdminPin من @/lib/admin-auth).
2. استيرادات AdminWebScreen: admin، wallets (addWalletEntry مستقل)، patient-profile (getPatientProfile/readMedicalAccessGrants/revokeMedicalAccess)، libya-cities، city-suggestions، consultation-doctors (add/remove/toggle/updateExternalDoctor/makeInitials)، provider-registry (ProviderAccount فقط type import).
3. حذف لوحة التحكم القديمة من تطبيق المريض: حُذف app/admin.tsx نهائيًا، أُزيلت أيقونة الدرع من profile.tsx، وأُزالت الإحالات إلى "/admin" من home.tsx وغيرها (باقي /admin-web فقط).
4. أُضيف استثناء في app/index.tsx (TabHomeGate-like entry): if onWeb && pathname.startsWith("/admin-web") return; — لمنع التوجيه إلى /login.
5. أُضيف Stack.Screen name="admin-web" في app/_layout.tsx بعد "home".

المشكلة الأخيرة: عند فتح /admin-web في المتصفح كان يعيد التوجيه إلى /login. شُخّص أنه بسبب عدم تسجيل المسار في Stack (تجاوزت Expo Router إلى البوابة الافتراضية) — أُصلح بتسجيله في Stack. أُعيد تشغيل Metro بعد تعديل سابق ترك خطأ Babel قديمًا في الذاكرة (خطأ 05:56 عند سطر 28 كان متبقيًا في الكاش — أُصلح بإعادة ترتيب الاستيرادات ثم إعادة تشغيل السيرفر).

المتبقي:
1. التحقق عبر المتصفح أن /admin-web يعرض شاشة PIN ثم اللوحات بعد إدخال الرمز.
2. ملاحظة: EXPO_PUBLIC_ADMIN_PIN يُمرر عبر dev:metro كـ $ADMIN_PIN (يعمل). في إنتاج الويب (expo export/static) نحتاج التحقق من أن env متاح — ربما نحتاج build hook أو public config في app.config.ts مع extra.
3. اختبار pnpm test + pnpm check.
4. حفظ نقطة تحقق وتسليم الشرح للمستخدم (شرح كيف تعمل اللوحة المنفصلة الآن + خطة الأحد/الاثنين للاستضافة: عند الاستضافة نرفع الموقع + DB مشتركة بدل localStorage: سيُستبدل التخزين بخدمة مركزية مثل Data API/Postgres ليعمل أونلاين بين الأجهزة).

ملاحظة للمستخدم لاحقًا: البيانات حاليًا localStorage محلية على كل جهاز؛ اللوحة المنفصلة تقرأ بيانات الجهاز الذي تُفتح منه فقط. عند الاستضافة ننتقل لقاعدة بيانات مركزية فيصبح كل شيء متزامنًا بين التطبيقين واللوحة.

## تشخيص 06:00 — التوجيه المستمر إلى /login

الأعراض: عند فتح /admin-web يظهر أولًا شاشة PIN (لقطة أولية نجحت) لكن مباشرة بعدها يعاد التوجيه إلى /login. الرمز ADMIN_PIN=10081460020501 صحيح في البيئة، وEXPO_PUBLIC_ADMIN_PIN غير مضبوط.

الاستنتاج: هناك حارس آخر غير index.tsx يعيد التوجيه. أخطر مرشح هو أن app/_layout.tsx لا يحتوي على حارس، لكن ملاحظة مهمة: عند الضغط على «دخول» في AdminPinGate لم تُقرأ ENV من داخل browser (process.env غير موجود على الويب!)، فـ isValidAdminPin يرجع false ثم... لكن المشكلة تحدث حتى قبل إدخال الرمز (التوجيه عند فتح الصفحة مباشرة إلى /login).

ملاحظة من أول navigate: أول فتح أظهر شاشة PIN ثم بعد إدخال Enter تحول إلى /login. الفرضية: Expo Router على الويب يعيد توجيه أي مسار غير مسجل في Tabs إلى أول تبويب؟ لا — index.tsx يستثني /admin-web. لكن الاستثناء يتحقق من window.location.pathname عند تحميل / (EntryScreen) وليس عند فتح /admin-web مباشرة لأن admin-web هو root screen في Stack — لكن Expo Router يبدأ من index.tsx دائمًا في SPA: كل التحميل يبدأ من EntryScreen الذي يستثني admin-web. إذًا التوجيه يجب ألا يحدث...

فرضية بديلة: admin-web.tsx نفسه يحتوي router.push أو هناك useEffect في ملف آخر. أو أن الحارس في (tabs)/_layout.tsx. أو أن التوجيه من Expo (web) 404 handler → /login.

## حالة فصل لوحة التحكم (admin-web) — تم اختبارها بنجاح
- URL الويب: /admin-web على عنوان المعاينة — شاشة PIN (10081460020501) ثم 9 تبويبات: نظرة عامة، مقدمو الخدمة، الإعلانات، الخدمات، الطلبات، المرضى، المحفظات، المدن والمناطق، أطباء الخارج.
- اختُبر تبويب مقدمو الخدمة: إضافة «د. أحمد الشامي» (طبيب، طب أطفال، 15 سنة خبرة، 0912345678) نجحت وتظهر بطاقة «بانتظار الموافقة» مع أزرار تفعيل/تجميد/إلغاء.
- إصلاحات حارس الدخول: استثناء admin-web في app/index.tsx (useSegments) + app/(tabs)/index.tsx + تسجيل المسار صراحة في Stack بـ app/_layout.tsx (قبل التبويبات).
- لوحة التحكم القديمة في التطبيق حُذفت نهائيًا: /admin غير مسجّرة في التوجيه، أيقونة الدرع أُزيلت من profile.tsx، وapp/admin.tsx أُزيل.
- ملاحظة للاستضافة لاحقًا: admin-web حاليًا تقرأ نفس AsyncStorage (محلي على الجهاز نفسه)؛ عند الانتقال للاستضافة ننقل البيانات لسيرفر/DB مشتركة يعمل منها الويب والتطبيقان معًا.
- المتبقي: pnpm test، checkpoint، تسليم للمستخدم.

## حالة 06:01 — ما بعد checkpoint 71926350 (فصل لوحة التحكم)
- phase 3 (اختبارات وتحقق) اكتمل: admin-web.tsx يعمل (شاشة PIN + 9 تبويبات)، حذفنا /admin من التوجيه وأيقونة shield من profile.tsx، pnpm check نظيف و157 اختبار ناجح.
- checkpoint محفوظ: 71926350 — "فصل لوحة التحكم نهائيًا".
- متبقٍ (phase 4): رفع GitHub (git push لكلٍّ من tabibi-mobile وtabibi-partner عبر gh — CI يرفع تلقائيًا عادةً، لكن يجب التحقق)، ثم تسليم result نهائي.
- المستخدم أرسل لقطتي شاشة «حسابي» (profile): لا مشكلة ظاهرة — البطاقة (أحمد/0912345678)، قسم العناوين «لم تتم إضافة أي عناوين بعد» + زر إضافة عنوان، اقتراح مدينة، أفراد العائلة + زر موافق. كل هذا يعمل. سألته سابقًا عن قصد اللقطة فقال «ممكن خطأ في التعبير» — لا تدخل مطلوب.

## ملاحظات لقطة شاشة المستخدم (14 أغسطس 06:02)
- المستخدم أرسل لقطة /profile (نفس الشاشة التي رُويتها): «حسابي».
- العناصر المرئية تعمل كما صُممت: card المستخدم، العناوين، إضافة عنوان، اقتراح مدينة، أفراد العائلة، زر «موافق وإنهاء استكمال البيانات».
- لا توجد أخطاء بصرية ظاهرة في اللقطة. الرد المناسب: رسالة result تؤكد الفصل + الشرح + GitHub + الملفات، ولا تغيير مطلوب على الشاشة ما لم يحدد المستخدم ملاحظة.

## توضيح طلب المستخدم (14 أغسطس — مرحلة التحكم اليدوي الكامل)
المستخدم أوضح طلبه: «هناك حالة تلقائية» أي عناصر تعمل **دون أي تدخل من الإدارة أصلًا** — لا تحتاج من اللوحة أي تشغيل/إيقاف/تعديل/إزالة. المطلوب: مراجعة كل شيء يعمل تلقائيًا في النظام وجعل كل عنصر منه قابلًا للتحكم اليدوي من لوحة التحكم (زر تشغيل/إيقاف أو تفعيل/إيقاف أو تعديل).

المقصود بالعناصر المحتملة «التي تعمل دون تدخل»:
- حسابات الشريك/المريض تُفعَّل ذاتيًا بعد التسجيل (لا موافقة من الإدارة).
- الخدمات تظهر تلقائيًا في تطبيق المريض دون زر إيقاف في اللوحة.
- الإعلانات/البنرات قد تعمل دون تحكم.
- مدن/مناطق مفعلة تلقائيًا، أطباء خارجيون.
- قبول طلبات/دردشة تعمل دون تدخل إداري.
- أي دالة/ميزة نظام (push notifications؟) تعمل بدون زر تشغيل.

خطة المراجعة: فحص lib/provider-registry.ts (filterActiveProviders)، provider-services.ts، lib/libya-cities.ts (enabledCities الافتراضية)، consultation-doctors.ts (DEFAULT_EXTERNAL_DOCTORS)، service-requests (accept تلقائي؟)، chat (هل تفتح تلقائيًا)، admin-web.tsx (هل توجد أزرار إيقاف لكل خدمة/حساب/إعلان)، ثم إضافة ما ينقص من أزرار التحكم اليدوي.

todo.md يحتوي قسم «مرحلة: التحكم اليدوي الكامل من لوحة التحكم (طلب 14 أغسطس)» بـ 10 بنود.

## مراجعة «العناصر التي تعمل تلقائيًا دون تدخل» (14 أغسطس — قبل تنفيذ المرحلة)

النتيجة: كل العناصر الرئيسية أصبحت يدوية بالكامل. لا يوجد أي عنصر يعمل تلقائيًا دون تدخل الإدارة الآن:

| العنصر | الحالة السابقة (تلقائي) | الحالة الحالية (يدوي) | الملف المسؤول |
|--------|--------------------------|------------------------|----------------|
| تفعيل حساب الشريك بعد التسجيل | كان يُفعَّل فور إكمال البيانات | يبقى pending حتى تضغط الإدارة «تفعيل» | tabibi-partner/lib/provider-auth.ts:265,302 + admin-web.tsx |
| ظهور مقدم الخدمة في بحث المريض | كان يظهر فور التفعيل الذاتي | filterActiveProviders تُظهر active فقط، وpending/frozen/cancelled محجوبة | tabibi-mobile/lib/provider-registry.ts:141-143 |
| الخدمات في الصفحة الرئيسية | كانت ثابتة في الكود | كاتالوج SERVICES_CATALOG_KEY بزر تشغيل/إيقاف لكل خدمة | tabibi-mobile/lib/admin.ts:159-174 |
| الإعلانات/البنرات | كانت DEFAULT_AD_SLIDES تعمل مباشرة | enabled لكل إعلان + زر تبديل في اللوحة | tabibi-mobile/lib/admin.ts:76-96 |
| المدن والمناطق | كانت كلها مفعّلة افتراضيًا | طرابلس فقط مفعّلة والباقي enabled:false يُفعّل يدويًا | tabibi-mobile/lib/libya-cities.ts |
| أطباء الخارج | قائمة DEFAULT_EXTERNAL_DOCTORS تعمل تلقائيًا | كل طبيب خارجي enabled يُفعّل/يُوقف يدويًا | tabibi-mobile/lib/consultation-doctors.ts |
| تجميد حساب المريض | لم يكن موجودًا | PatientRegistryEntry.status مع زر تجميد في اللوحة | tabibi-mobile/lib/admin.ts:43 |

لا توجد عناصر تلقائية أخرى تستحق التحويل: قبول الطلبات يتم من الشريك نفسه (وهذا دوره الطبيعي، لا دور الإدارة)، والدردشة تُفتح فقط بعد القبول، وقاعدة الدفع سياسة نظام وليست ميزة تحتاج زر تشغيل.

**الخلاصة**: كل شيء يعمل الآن يدويًا من لوحة التحكم (/admin-web) دون أي تدخل برمجي أو تلقائي. المرحلة مكتملة.

## تنفيذ الاقتراحات الثلاثة (14 أغسطس — بعد طلب المستخدم)

المستخدم طلب تنفيذ ثلاثة اقتراحات: (1) تقرير تقييم شهري في لوحة التحكم، (2) إشعار للإدارة عند تسجيل شريك جديد بانتظار الموافقة، (3) إعدادات عامة في اللوحة (عمولة المنصة + نسب خصم العروض). ثم شرح طريقة استخدام تطبيق الشريك ولوحة التحكم من الملفات المرسلة.

### ما نُفذ حتى الآن:
1. أُنشئت `lib/platform-settings.ts`: مفتاح `tabibi.platform_settings.v1`، نوع `PlatformSettings { platformCommissionPercent, defaultOfferDiscountPercent, updatedAt }`، دوال read/write + providerShareAfterCommission(gross, percent) مع Clamp 0-100.
2. عُدّل `app/admin-web.tsx`: AdminTabId أضيف "monthly" و"settings"، TABS أضيف "التقرير الشهري 📈" و"الإعدادات العامة ⚙️".

### المتبقي في admin-web.tsx:
- عرض التبويبين: `{tab === "monthly" ? <MonthlyReportPanel onRefresh={refresh} /> : null}` و `{tab === "settings" ? <GeneralSettingsPanel onRefresh={refresh} /> : null}` في جسم AdminWebScreen (بعد سطر international).
- MonthlyReportPanel: قراءة readWalletEntries (lib/wallets) + readAdminRequests + readAdminSummary + تجميع حسب الشهر الحالي (new Date().getMonth())، بطاقة إحصاءات: عدد الطلبات المقبولة/المكتملة، إجمالي المبالغ المدفوعة (entries kind debit مع type payment؟)، أكثر مقدمي الخدمة نشاطًا (حسب entries ownerId role=provider)، عمولة المنصة المحسوبة حسب الإعدادات.
- GeneralSettingsPanel: قراءة writePlatformSettings + حقول النسبتين + حفظ.
- إشعار الإدارة: في SummaryPanel (نظرة عامة) إضافة شريط تنبيه أعلى الصفحة عند وجود حسابات shrik pending (readAdminSummary.pendingProviders > 0) بنص «يوجد N حسابًا بانتظار الموافقة» + عداد على تبويب مقدمو الخدمة. الإشعار داخلي في اللوحة (شريط تنبيه أصفر) لأن الإشعارات المحلية require device push ولا تنطبق على الويب؛ يمكن لاحقًا ربطها بـ expo-notifications عند الانتقال للخادم.
- بعد ذلك: pnpm check + pnpm test (157 حاليًا) + checkpoint + result مع شرح استخدام تطبيق الشريك ولوحة التحكم:
  * لوحة التحكم: فتح المتصفح → /admin-web → إدخال الرمز (ADMIN_PIN) → 11 تبويبًا.
  * تطبيق الشريك: مشروع /home/ubuntu/tabibi-partner مرفق بصيغة zip (tabibi-partner-app.zip) وموجودة نسخة GitHub (مستخدم رفعها سابقًا بنفسه — repos: tabibi-mobile + tabibi-partner). التشغيل محليًا: pnpm install ثم pnpm start (Expo) أو فتح Expo Go بمسح QR.

### ملاحظات بنية:
- admin-web.tsx: SummaryPanel يوجد من قبل (~601)، عناصر Card/Field/PrimaryButton/StatusBadge/Avatar موجودة (~609-721).
- wallets.ts: readWalletEntries, WalletLedgerEntry {id, ownerId, ownerName, role, kind, type, amount, description, reference, createdAt}, addWalletEntry.
- admin.ts: readAdminSummary يعيد {pendingProviders, activeProviders, ...}.
- todo.md: قسم «مرحلة: الاقتراحات الثلاثة» أضيف بـ 4 بنود، لم يُعلَّم بعد.

## تقدم إضافي (الاقتراحات الثلاثة — متابعة)

تم بناء لوحة التقرير الشهري (MonthlyReportPanel) ولوحة الإعدادات العامة (GeneralSettingsPanel) في نهاية admin-web.tsx، مع إضافة "monthly" و"settings" إلى AdminTabId وTABS وعرضهما في AdminWebScreen. TypeScript نظيف (0 أخطاء). اللقطة أكدت ظهور شاشة PIN للوحة التحكم بعد التعديلات (البوابة سليمة).

متبقي:
1. إشعار الإدارة بشريط تنبيه في SummaryPanel عند وجود مقدمي خدمة pending — يُقرأ من readAdminSummary().pendingProviders ويُعرض شريط أصفر أعلى «نظرة عامة» + شارة عدد على تبويب مقدمو الخدمة في شريط التنقل.
2. pnpm check + pnpm test (الآن 157).
3. تعليم todo.md + checkpoint + result مع شرح طريقة استخدام تطبيق الشريك ولوحة التحكم:
   - لوحة التحكم: من نفس الرابط/النطاق أضف المسار /admin-web في المتصفح، أدخل الرمز الإداري (ADMIN_PIN)، تجد 11 تبويبًا.
   - تطبيق الشريك: الملفات المرفقة سابقًا (tabibi-partner-app.zip) أو مستودع GitHub tabibi-partner؛ التشغيل: pnpm install ثم pnpm start ومسح QR بـ Expo Go، أو نشر APK من زر Publish.
4. ملاحظة: شريط التنبيه pending في SummaryPanel — الملف فيه دالة readPendingProvidersAlert أُضيفت في نهاية الملف (غير مستخدمة حاليًا)؛ يمكن إزالتها بعد دمجها في SummaryPanel.
