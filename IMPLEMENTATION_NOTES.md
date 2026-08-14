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
