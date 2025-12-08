import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./db";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  type JWTPayload,
} from "./auth";

// Server functions for authentication
// These can be called from client code via RPC

// Register a new user
export const registerUser = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { email: string; password: string; name: string }) => data
  )
  .handler(async ({ data }) => {
    const { email, password, name } = data;
    console.log("[AUTH] Register attempt:", { email, name });

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log("[AUTH] Register failed: Email already exists:", email);
      throw new Error("User with this email already exists");
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
      },
    });

    // Generate token
    const token = generateToken({ userId: user.id, email: user.email });

    console.log("[AUTH] Register success:", { userId: user.id, email: user.email });
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    };
  });

// Login user
export const loginUser = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const { email, password } = data;
    console.log("[AUTH] Login attempt:", { email });

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log("[AUTH] Login failed: User not found:", email);
      throw new Error("Invalid email or password");
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      console.log("[AUTH] Login failed: Invalid password for:", email);
      throw new Error("Invalid email or password");
    }

    // Generate token
    const token = generateToken({ userId: user.id, email: user.email });

    console.log("[AUTH] Login success:", { userId: user.id, email: user.email });
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    };
  });

// Logout user (just returns success, client handles token removal)
export const logoutUser = createServerFn({ method: "POST" }).handler(
  async () => {
    return { success: true };
  }
);

// Check if email is available
export const checkEmailAvailable = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    console.log("[AUTH] Email availability check:", { email: data.email });
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
        select: { id: true },
      });
      const available = !existingUser;
      console.log("[AUTH] Email availability result:", { email: data.email, available });
      return { available };
    } catch (error) {
      console.error("[AUTH] Email availability check error:", { email: data.email, error });
      throw error;
    }
  });

// Verify token and get user
export const getCurrentUser = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string | null }) => data)
  .handler(async ({ data }) => {
    const { token } = data;
    console.log("[AUTH] Get current user:", { hasToken: !!token });

    if (!token) {
      console.log("[AUTH] Get current user: No token provided");
      return { user: null };
    }

    const payload = verifyToken(token);
    if (!payload) {
      console.log("[AUTH] Get current user: Invalid token");
      return { user: null };
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        preferences: true,
      },
    });

    if (!user) {
      console.log("[AUTH] Get current user: User not found for token");
      return { user: null };
    }

    console.log("[AUTH] Get current user success:", { userId: user.id, email: user.email });
    return { user };
  });
