import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { delay, map, Observable, of, tap, throwError, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthSession, LoginRequest, LoginResponse } from '../../models/auth.model';
import { User, UserRole } from '../../models/user.model';
import { AUTH_STORAGE_KEY, MOCK_USERS } from '../constants/auth.constants';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly router = inject(Router);
  private readonly session = signal<AuthSession | null>(this.readStoredSession());

  readonly currentUser = computed(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly accessToken = computed(() => this.session()?.accessToken ?? null);

  login(request: LoginRequest): Observable<LoginResponse> {
    if (!this.http) {
      return this.mockLogin(request);
    }
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, request)
      .pipe(
        tap((response) => {
          this.persistSession(response);
        }),
        catchError((err) => {
          // Fallback to mock login if backend is unreachable in dev mode
          if (!environment.production && (!err.status || err.status === 0 || err.status >= 500)) {
            console.warn('Backend unavailable, falling back to mock login:', err?.message || err);
            return this.mockLogin(request);
          }
          const msg =
            err?.error?.message ||
            (err.status === 401 ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : err?.message || 'เข้าสู่ระบบไม่สำเร็จ');
          return throwError(() => new Error(msg));
        }),
      );
  }

  fetchMe(): Observable<User> {
    if (!this.http) {
      const user = this.currentUser();
      return user ? of(user) : throwError(() => new Error('ไม่ได้เข้าสู่ระบบ'));
    }
    return this.http.get<User>(`${environment.apiUrl}/auth/me`).pipe(
      tap((user) => {
        const cur = this.session();
        if (cur) {
          const updated: AuthSession = { ...cur, user };
          this.session.set(updated);
          if (typeof window !== 'undefined') {
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
          }
        }
      }),
    );
  }

  logout(): void {
    this.session.set(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    void this.router.navigate(['/login']).catch(() => false);
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
      return throwError(() => new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'));
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

    this.persistSession(response);
    return of(response);
  }

  private persistSession(response: LoginResponse): void {
    const session: AuthSession = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: response.user,
    };
    this.session.set(session);
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    }
  }

  private readStoredSession(): AuthSession | null {
    if (typeof window === 'undefined') {
      return null;
    }
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
