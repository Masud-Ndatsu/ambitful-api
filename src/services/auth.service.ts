import bcrypt from "bcrypt";
import { authRepository } from "../repositories/auth.repository";
import { generateToken, generateRandomToken, JWTPayload } from "../utils/jwt";
import { sendVerificationEmail, sendPasswordResetEmail } from "../utils/email";
import { User } from "../types";
import { CustomError } from "../middleware/errorHandler";
import { TokenType } from "../enums";

export class AuthService {
  constructor() {
    // No need to initialize repository - using singleton
  }

  async register(userData: {
    name: string;
    email: string;
    password: string;
    country: string;
    interests: string[];
  }): Promise<{ user: User; token: string }> {
    const existingUser = await authRepository.findUserByEmail(
      userData.email
    );
    if (existingUser) {
      throw new CustomError("User already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(userData.password, 12);
    const user = await authRepository.createUser({
      ...userData,
      password: hashedPassword,
    });

    const verificationToken = generateRandomToken();
    await authRepository.createToken({
      token: verificationToken,
      type: TokenType.EMAIL_VERIFICATION,
      userId: user.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    try {
      await sendVerificationEmail(user.email, verificationToken);
    } catch (error) {
      console.error("Failed to send verification email:", error);
    }

    const jwtPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role.toLowerCase(),
    };

    const token = generateToken(jwtPayload);

    const formattedUser: User = {
      id: user.id,
      name: user.name,
      email: user.email,
      country: user.country,
      status: user.status.toLowerCase() as "active" | "inactive" | "suspended",
      verified: user.verified,
      signupDate: user.signupDate.toISOString(),
      lastActive: user.lastActive.toISOString(),
      interests: user.interests,
      profilePicture: user.profilePicture as string,
      role: user.role.toLowerCase() as "admin" | "user",
    };

    return { user: formattedUser, token };
  }

  async login(
    email: string,
    password: string
  ): Promise<{ user: User; token: string }> {
    const user = await authRepository.findUserByEmail(email);
    if (!user) {
      throw new CustomError("Invalid credentials", 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new CustomError("Invalid credentials", 401);
    }

    await authRepository.updateLastActive(user.id);

    const jwtPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role.toLowerCase(),
    };

    const token = generateToken(jwtPayload);

    const formattedUser: User = {
      id: user.id,
      name: user.name,
      email: user.email,
      country: user.country,
      status: user.status.toLowerCase() as "active" | "inactive" | "suspended",
      verified: user.verified,
      signupDate: user.signupDate.toISOString(),
      lastActive: new Date().toISOString(),
      interests: user.interests,
      profilePicture: user.profilePicture as string,
      role: user.role.toLowerCase() as "admin" | "user",
    };

    return { user: formattedUser, token };
  }

  async logout(): Promise<{ message: string }> {
    return { message: "Logged out successfully" };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await authRepository.findUserByEmail(email);
    if (!user) {
      return { message: "If the email exists, a reset link has been sent" };
    }

    const resetToken = generateRandomToken();
    await authRepository.createToken({
      token: resetToken,
      type: TokenType.PASSWORD_RESET,
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    try {
      await sendPasswordResetEmail(user.email, resetToken);
    } catch (error) {
      console.error("Failed to send password reset email:", error);
    }

    return { message: "If the email exists, a reset link has been sent" };
  }

  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ message: string }> {
    const tokenRecord = await authRepository.findTokenByValue(
      token,
      TokenType.PASSWORD_RESET
    );
    if (!tokenRecord) {
      throw new CustomError("Invalid or expired token", 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await authRepository.updateUser(tokenRecord.userId, {
      password: hashedPassword,
    });

    await authRepository.markTokenAsUsed(tokenRecord.id);

    return { message: "Password reset successfully" };
  }

  async verifyEmail(
    token: string
  ): Promise<{ message: string; verified: boolean }> {
    const tokenRecord = await authRepository.findTokenByValue(
      token,
      TokenType.EMAIL_VERIFICATION
    );
    if (!tokenRecord) {
      return {
        message: "Invalid or expired verification token",
        verified: false,
      };
    }

    await authRepository.updateUser(tokenRecord.userId, {
      verified: true,
    });

    await authRepository.markTokenAsUsed(tokenRecord.id);

    return { message: "Email verified successfully", verified: true };
  }
}

export const authService = new AuthService();
