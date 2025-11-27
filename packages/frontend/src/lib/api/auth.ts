import { apiRequest } from './client';

export interface RegisterInput {
  email: string;
  password: string;
  username: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    userId: string;
    email: string;
    username: string;
    subscriptionTier: string;
  };
  tokens?: {
    accessToken: string;
    idToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  message?: string;
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: input,
  });
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: input,
  });
}

export async function getProfile(token: string) {
  return apiRequest('/users/profile', {
    method: 'GET',
    token,
  });
}
