import { describe, expect, it } from "vitest";

import { isValidAdminPin } from "../lib/admin-auth";

describe("الرمز السري للوحة التحكم", () => {
  it("يقبل الرمز السري الصحيح المحفوظ في ADMIN_PIN", () => {
    expect(isValidAdminPin(process.env.ADMIN_PIN!)).toBe(true);
  });

  it("يرفض رمزًا خاطئًا", () => {
    expect(isValidAdminPin("00000000")).toBe(false);
  });

  it("يرفض رمزًا فارغًا", () => {
    expect(isValidAdminPin("")).toBe(false);
  });

  it("يرفض رمزًا غير موجود", () => {
    expect(isValidAdminPin(undefined as unknown as string)).toBe(false);
  });
});
