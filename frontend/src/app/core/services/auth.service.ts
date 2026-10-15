import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { delay, map, Observable, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthSession, LoginRequest, LoginResponse } from '../../models/auth.model';
import { User, UserRole } from '../../models/user.model';
import { AUTH_STORAGE_KEY, MOCK_USERS } from '../constants/auth.constants';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly session = signal<AuthSession | null>(this.readStoredSession());

  readonly currentUser = computed(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly accessToken = computed(() => this.session()?.accessToken ?? null);

  login(request: LoginRequest): Observable<LoginResponse> {
    if (!environment.production) {
      return this.mockLogin(request);
    }
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, request);
  }

  logout(): void {
    this.session.set(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    this.router.navigate(['/login']);
  }

  hasRole(roles: UserRole[]): boolean {
    const user = this.currentUser();
    return !!user && roles.includes(user.role);
  }

  private mockLogin(request: LoginRequest): Observable<LoginResponse> {
    const account = MOCK_USERS.find(
      (user) => user.username === request.username.trim() && user.password === request.password,
    );

    if (!account) {
      return throwError(() => new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')).pipe(delay(400));
    }

    const response: LoginResponse = {
      accessToken: `mock-token-${account.username}`,
      refreshToken: `mock-refresh-${account.username}`,
      user: {
        id: account.id,
        username: account.username,
        displayName: account.displayName,
        role: account.role,
      },
    };

    return of(response).pipe(
      delay(400),
      map((result) => {
        this.persistSession(result);
        return result;
      }),
    );
  }

  private persistSession(response: LoginResponse): void {
    const session: AuthSession = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: response.user,
    };
    this.session.set(session);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }

  private readStoredSession(): AuthSession | null {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  }
}
