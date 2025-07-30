import { prisma } from '../database/prisma';
import { User, Token, TokenType } from '@prisma/client';

export class AuthRepository {
  async createUser(userData: {
    name: string;
    email: string;
    password: string;
    country: string;
    interests: string[];
  }): Promise<User> {
    return await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        password: userData.password,
        country: userData.country,
        interests: userData.interests,
        status: 'ACTIVE',
        verified: false,
        role: 'USER'
      }
    });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { email }
    });
  }

  async findUserById(id: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id }
    });
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data
    });
  }

  async createToken(tokenData: {
    token: string;
    type: TokenType;
    userId: string;
    expiresAt: Date;
  }): Promise<Token> {
    return await prisma.token.create({
      data: tokenData
    });
  }

  async findTokenByValue(token: string, type: TokenType): Promise<Token | null> {
    return await prisma.token.findFirst({
      where: {
        token,
        type,
        used: false,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        user: true
      }
    });
  }

  async markTokenAsUsed(id: string): Promise<Token> {
    return await prisma.token.update({
      where: { id },
      data: { used: true }
    });
  }

  async deleteExpiredTokens(): Promise<void> {
    await prisma.token.deleteMany({
      where: {
        OR: [
          { used: true },
          { expiresAt: { lt: new Date() } }
        ]
      }
    });
  }

  async updateLastActive(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { lastActive: new Date() }
    });
  }
}