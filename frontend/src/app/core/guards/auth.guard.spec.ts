import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { authGuard } from './auth.guard';
import { roleGuard } from './role.guard';
import { AuthService } from '../services/auth.service';

describe('Auth Guards', () => {
  let authService: AuthService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideRouter([
          { path: 'login', children: [] },
          { path: 'dashboard', children: [] },
        ]),
      ],
    });

    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('authGuard', () => {
    it('should redirect unauthenticated users to /login', () => {
      const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
      expect(result instanceof UrlTree).toBe(true);
      expect((result as UrlTree).toString()).toBe('/login');
    });

    it('should allow access when authenticated', async () => {
      await firstValueFrom(authService.login({ username: 'admin', password: 'admin123' }));
      const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
      expect(result).toBe(true);
    });
  });

  describe('roleGuard', () => {
    it('should redirect unauthenticated users to /login', () => {
      const guardFn = roleGuard(['ADMIN']);
      const result = TestBed.runInInjectionContext(() => guardFn({} as any, {} as any));
      expect(result instanceof UrlTree).toBe(true);
      expect((result as UrlTree).toString()).toBe('/login');
    });

    it('should allow user with matching role', async () => {
      await firstValueFrom(authService.login({ username: 'admin', password: 'admin123' }));
      const guardFn = roleGuard(['ADMIN', 'MANAGER']);
      const result = TestBed.runInInjectionContext(() => guardFn({} as any, {} as any));
      expect(result).toBe(true);
    });

    it('should redirect user without required role to /dashboard', async () => {
      await firstValueFrom(authService.login({ username: 'cashier', password: 'cashier123' }));
      const guardFn = roleGuard(['ADMIN', 'MANAGER']);
      const result = TestBed.runInInjectionContext(() => guardFn({} as any, {} as any));
      expect(result instanceof UrlTree).toBe(true);
      expect((result as UrlTree).toString()).toBe('/dashboard');
    });
  });
});
