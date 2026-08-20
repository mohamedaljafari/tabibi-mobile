import type { Express } from "express";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { tabibiRouter } from "./tabibi-router";
import { publicProcedure, router } from "./_core/trpc";
import { storageServe } from "./storage";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // البيانات المشتركة بين تطبيق المريض وتطبيق الشريك ولوحة التحكم (محل Supabase القديم)
  tabibi: tabibiRouter,

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;

/**
 * Serve uploaded files directly from S3-compatible storage.
 * Express 5 requires an explicit catch-all with path stripping
 * (`req.url.slice`) because `/uploads/:key` no longer matches slashes.
 */
export function registerUploadsHandler(app: Express) {
  app.get("/uploads/*", async (req, res) => {
    const key = decodeURIComponent((req.url.split("?")[0] ?? "").replace(/^\/uploads\//, ""));
    if (key.includes("..")) {
      res.status(400).json({ error: "invalid_key" });
      return;
    }
    try {
      await storageServe(key, res);
    } catch (error) {
      const status =
        error && typeof error === "object" && "status" in error
          ? (error as { status: number }).status
          : 502;
      res.status(status).json({ error: status === 404 ? "not_found" : "storage_error" });
    }
  });
}
