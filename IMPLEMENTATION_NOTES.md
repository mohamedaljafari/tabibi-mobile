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
