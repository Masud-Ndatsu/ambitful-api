import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

const handlePrismaError = (error: any): AppError => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return new CustomError("Resource already exists", 409);
      case "P2025":
        return new CustomError("Resource not found", 404);
      case "P2003":
        return new CustomError("Foreign key constraint failed", 400);
      case "P2014":
        return new CustomError("Invalid data provided", 400);
      default:
        return new CustomError("Database operation failed", 500);
    }
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return new CustomError("Unknown database error", 500);
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return new CustomError("Database connection error", 500);
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new CustomError("Database initialization error", 500);
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new CustomError("Invalid data format", 400);
  }

  return error;
};

const handleJWTError = (): AppError => {
  return new CustomError("Invalid token", 401);
};

const handleJWTExpiredError = (): AppError => {
  return new CustomError("Token expired", 401);
};

const sendErrorDev = (err: AppError, res: Response): void => {
  console.error({
    status: "error",
    error: err,
    message: err.message,
    stack: err.stack,
  });
  res.status(err.statusCode || 500).json({
    status: "error",
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err: AppError, res: Response): void => {
  if (err.isOperational) {
    res.status(err.statusCode || 500).json({
      status: "error",
      message: err.message,
    });
  } else {
    console.error("ERROR:", err);
    res.status(500).json({
      status: "error",
      message: "Something went wrong!",
    });
  }
};

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  err.statusCode = err.statusCode || 500;

  let error = { ...err };
  error.message = err.message;

  // Handle specific error types
  if (err.code && err.code.startsWith("P2")) {
    error = handlePrismaError(err);
  }

  if (err.name === "JsonWebTokenError") {
    error = handleJWTError();
  }

  if (err.name === "TokenExpiredError") {
    error = handleJWTExpiredError();
  }

  if (err.name === "ValidationError") {
    error = new CustomError("Validation failed", 400);
  }

  if (err.type === "entity.parse.failed") {
    error = new CustomError("Invalid JSON format", 400);
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    error = new CustomError("File too large", 413);
  }

  // Send error response
  if (process.env.NODE_ENV === "development") {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const notFound = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new CustomError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};
