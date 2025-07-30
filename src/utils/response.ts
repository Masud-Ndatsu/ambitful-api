import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export const SuccessResponse = <T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode: number = 200,
  meta?: ApiResponse<T>['meta']
): void => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    meta
  };

  res.status(statusCode).json(response);
};

export const ErrorResponse = (
  res: Response,
  error: string,
  statusCode: number = 500,
  data?: any
): void => {
  const response: ApiResponse = {
    success: false,
    error,
    data
  };

  res.status(statusCode).json(response);
};