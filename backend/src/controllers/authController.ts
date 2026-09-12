import { Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as authService from "../services/authService";
import { env } from "../config/env";
import { AuthedRequest } from "../middleware/auth";
import { prisma } from "../config/prisma";

const REFRESH_COOKIE = "refreshToken";

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true, // not readable from JS — mitigates XSS token theft
    secure: env.isProd, // HTTPS only in production
    sameSite: "lax",
    maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    path: "/api/auth",
  });
}

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  setRefreshCookie(res, result.refreshToken);
  res.json({ accessToken: result.accessToken, user: result.user });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) return res.status(401).json({ error: { message: "No refresh token", code: "NO_REFRESH" } });
  const result = await authService.refresh(token);
  setRefreshCookie(res, result.refreshToken);
  res.json({ accessToken: result.accessToken, user: result.user });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) await authService.logout(token);
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
  res.json({ ok: true });
});

export const me = asyncHandler(async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.user!.id },
    select: { id: true, name: true, email: true, role: true },
  });
  res.json({ user });
});
