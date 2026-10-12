import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { DEMO_STORE_NAME } from "../config/demo";
import {
  generateRefreshToken,
  hashToken,
  REFRESH_TOKEN_TTL_MS,
  signAccessToken,
} from "../config/jwt";
import { Customer, RefreshToken, Store, User } from "../models";
import {
  authenticate,
  injectTenant,
  requireRole,
  validate,
} from "../middlewares";
import {
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
} from "../schemas/auth";

const authRouter = Router();

// Helper to issue access + rotating refresh token pair
async function issueTokenPair(user: User): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = signAccessToken({
    userId: user.id,
    storeId: user.storeId,
    role: user.role,
    email: user.email,
  });

  const rawRefreshToken = generateRefreshToken();
  const hashedRefreshToken = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await RefreshToken.create({
    storeId: user.storeId,
    userId: user.id,
    token: hashedRefreshToken,
    expiresAt,
  });

  return { accessToken, refreshToken: rawRefreshToken };
}

// POST /api/auth/register
authRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { name, email, password } = parseResult.data;

    const store = await Store.findOne({ where: { name: DEMO_STORE_NAME } });
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    const existingUser = await User.findOne({
      where: { storeId: store.id, email },
    });
    if (existingUser) {
      return res.status(409).json({ error: "A user with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      storeId: store.id,
      name,
      email,
      password: passwordHash,
      role: "CUSTOMER",
    });

    // Ensure customer record exists for store orders
    await Customer.findOrCreate({
      where: { storeId: store.id, email },
      defaults: {
        storeId: store.id,
        name,
        email,
      },
    });

    const { accessToken, refreshToken } = await issueTokenPair(user);

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        storeId: user.storeId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/login
authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { email, password } = parseResult.data;

    const store = await Store.findOne({ where: { name: DEMO_STORE_NAME } });
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    const user = await User.findOne({
      where: { storeId: store.id, email },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const { accessToken, refreshToken } = await issueTokenPair(user);

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        storeId: user.storeId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/refresh
authRouter.post("/refresh", async (req: Request, res: Response) => {
  try {
    const parseResult = refreshSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { refreshToken: rawToken } = parseResult.data;
    const tokenHash = hashToken(rawToken);

    const tokenRecord = await RefreshToken.findOne({
      where: { token: tokenHash },
    });

    if (!tokenRecord) {
      // Reuse of old or invalid refresh token is rejected
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    // Check expiration
    if (new Date() > tokenRecord.expiresAt) {
      await tokenRecord.destroy();
      return res.status(401).json({ error: "Refresh token has expired" });
    }

    const user = await User.findByPk(tokenRecord.userId);
    if (!user) {
      await tokenRecord.destroy();
      return res.status(401).json({ error: "User not found" });
    }

    // ROTATION: Invalidate the previous refresh token
    await tokenRecord.destroy();

    // Issue a brand-new token pair
    const { accessToken, refreshToken } = await issueTokenPair(user);

    return res.status(200).json({
      message: "Token refreshed successfully",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Refresh error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/logout
authRouter.post("/logout", async (req: Request, res: Response) => {
  try {
    const parseResult = logoutSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { refreshToken: rawToken } = parseResult.data;
    const tokenHash = hashToken(rawToken);

    // Invalidate refresh token so it cannot be used again
    await RefreshToken.destroy({
      where: { token: tokenHash },
    });

    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/auth/me (Protected - Any authenticated user, scoped to storeId from token)
authRouter.get(
  "/me",
  authenticate,
  injectTenant,
  (req: Request, res: Response) => {
    res.status(200).json({
      user: req.user,
      storeId: req.storeId,
    });
  }
);

// GET /api/auth/admin-only (Protected - ADMIN role only)
authRouter.get(
  "/admin-only",
  authenticate,
  injectTenant,
  requireRole("ADMIN"),
  (req: Request, res: Response) => {
    res.status(200).json({
      message: "Welcome to admin dashboard",
      user: req.user,
      storeId: req.storeId,
    });
  }
);

export default authRouter;
