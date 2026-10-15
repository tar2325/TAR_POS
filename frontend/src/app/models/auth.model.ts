import { User } from './user.model';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: User;
}
