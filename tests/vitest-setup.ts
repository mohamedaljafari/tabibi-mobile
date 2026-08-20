/**
 * إعداد بيئة الاختبار (vitest / node).
 *
 * 1) يحمل متغيرات البيئة من `.env.local` (إذا وُجد) لأن `dotenv/config`
 *    في vitest.config.ts يقرأ `.env` الافتراضية فقط.
 * 2) يعرّف ADMIN_PIN من app.config.ts حتى تعمل اختبارات admin-auth
 *    دون الحاجة إلى ملف بيئة محلي (الرمز العام موجود في الكود).
 * 3) يجهّز محاكاة expo-constants ببيانات extra الصحيحة.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

const root = path.resolve(__dirname, "..");

// 1. Load .env.local variables (KEY=VALUE lines, skipping comments/empty).
const envLocalPath = path.join(root, ".env.local");
if (fs.existsSync(envLocalPath)) {
  for (const rawLine of fs.readFileSync(envLocalPath, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [key, ...rest] = line.split("=");
    if (!key) continue;
    const value = rest.join("=").trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// 2. Resolve the admin pin: prefer the env var, otherwise read it from
//    app.config.ts statically (it is a public constant in the source).
let adminPin = process.env.ADMIN_PIN || process.env.EXPO_PUBLIC_ADMIN_PIN;
if (!adminPin) {
  try {
    const src = fs.readFileSync(path.join(root, "app.config.ts"), "utf8");
    const match = src.match(/ADMIN_PIN:\s*"([^"]+)"/);
    if (match) adminPin = match[1];
  } catch {
    // غير متاح — يبقى فارغًا وتتعامل معه الاختبارات.
  }
}
if (adminPin) {
  process.env.ADMIN_PIN = adminPin;
  process.env.EXPO_PUBLIC_ADMIN_PIN = adminPin;
}

// 3. expo-constants mock replacement (aliased via vitest.config.ts resolve).
//    Must be re-exported after env resolution so extra reflects the pin.
const Constants = {
  expoConfig: {
    extra: {
      ADMIN_PIN: adminPin,
      EXPO_PUBLIC_ADMIN_PIN: adminPin,
    },
  },
};
(globalThis as Record<string, unknown>).Constants = Constants;

export default Constants;
