import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let authService: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideRouter([{ path: 'login', children: [] }]),
      ],
    });
    authService = TestBed.inject(AuthService);
  });

  it('should not add Authorization header if no token exists', () => {
    const req = new HttpRequest('GET', '/api/v1/products');
    const next = vi.fn().mockReturnValue(of({}));

    TestBed.runInInjectionContext(() => {
      authInterceptor(req, next);
    });

    expect(next).toHaveBeenCalledWith(req);
  });

  it('should not add Authorization header for /auth/login request', () => {
    (authService as any).session.set({
      accessToken: 'real-jwt-token',
      refreshToken: 'refresh-token',
      user: { id: 1, username: 'admin', displayName: 'Admin', role: 'ADMIN' },
    });

    const req = new HttpRequest('POST', '/api/v1/auth/login', {});
    const next = vi.fn().mockReturnValue(of({}));

    TestBed.runInInjectionContext(() => {
      authInterceptor(req, next);
    });

    expect(next).toHaveBeenCalledWith(req);
  });

  it('should not add Authorization header if token is a mock token', () => {
    (authService as any).session.set({
      accessToken: 'mock-token-admin',
      refreshToken: 'mock-refresh-admin',
      user: { id: 1, username: 'admin', displayName: 'Admin', role: 'ADMIN' },
    });

    const req = new HttpRequest('GET', '/api/v1/products');
    const next = vi.fn().mockReturnValue(of({}));

    TestBed.runInInjectionContext(() => {
      authInterceptor(req, next);
    });

    expect(next).toHaveBeenCalledWith(req);
  });

  it('should add Bearer token for protected requests with real token', () => {
    (authService as any).session.set({
      accessToken: 'real-jwt-token-xyz',
      refreshToken: 'refresh-token',
      user: { id: 1, username: 'admin', displayName: 'Admin', role: 'ADMIN' },
    });

    const req = new HttpRequest('GET', '/api/v1/products');
    const next = vi.fn().mockReturnValue(of({}));

    TestBed.runInInjectionContext(() => {
      authInterceptor(req, next);
    });

    expect(next).toHaveBeenCalled();
    const clonedReq: HttpRequest<any> = next.mock.calls[0][0];
    expect(clonedReq.headers.get('Authorization')).toBe('Bearer real-jwt-token-xyz');
  });

  it('should call authService.logout on 401 error with real token', () => {
    (authService as any).session.set({
      accessToken: 'real-jwt-token-expired',
      refreshToken: 'refresh-token',
      user: { id: 1, username: 'admin', displayName: 'Admin', role: 'ADMIN' },
    });
    const logoutSpy = vi.spyOn(authService, 'logout').mockImplementation(() => {});

    const req = new HttpRequest('GET', '/api/v1/products');
    const next = vi.fn().mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })),
    );

    TestBed.runInInjectionContext(() => {
      authInterceptor(req, next).subscribe({
        error: () => {},
      });
    });

    expect(logoutSpy).toHaveBeenCalled();
  });
});
