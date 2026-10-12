import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { DEMO_STORE_NAME } from "../config/demo";
import { signAccessToken } from "../config/jwt";
import { Customer, Store, User } from "../models";
import { loginSchema, registerSchema } from "../schemas/auth";

const authRouter = Router();

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

    const accessToken = signAccessToken({
      userId: user.id,
      storeId: user.storeId,
      role: user.role,
      email: user.email,
    });

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

    const accessToken = signAccessToken({
      userId: user.id,
      storeId: user.storeId,
      role: user.role,
      email: user.email,
    });

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
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default authRouter;
