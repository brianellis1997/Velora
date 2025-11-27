import { APIGatewayProxyResult } from 'aws-lambda';
import { ApiResponse } from '@velora/shared';

export function successResponse<T>(data: T, statusCode: number = 200): APIGatewayProxyResult {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(response),
  };
}

export function errorResponse(
  message: string,
  statusCode: number = 500,
  code?: string
): APIGatewayProxyResult {
  const response: ApiResponse = {
    success: false,
    error: {
      message,
      code,
    },
  };

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(response),
  };
}

export function wsSuccessResponse(data: any = {}) {
  return {
    statusCode: 200,
    body: JSON.stringify(data),
  };
}

export function wsErrorResponse(message: string, statusCode: number = 500) {
  return {
    statusCode,
    body: JSON.stringify({ message }),
  };
}
