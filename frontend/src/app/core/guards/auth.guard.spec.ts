import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router, UrlTree } from '@angular/router';
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
        provideHttpClient(),
        provideRouter([]),
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

    it('should allow access when authenticated', (done) => {
      authService.login({ username: 'admin', password: 'password123' }).subscribe(() => {
        const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
        expect(result).toBe(true);
        done();
      });
    });
  });

  describe('roleGuard', () => {
    it('should redirect unauthenticated users to /login', () => {
      const guardFn = roleGuard(['ADMIN']);
      const result = TestBed.runInInjectionContext(() => guardFn({} as any, {} as any));
      expect(result instanceof UrlTree).toBe(true);
      expect((result as UrlTree).toString()).toBe('/login');
    });

    it('should allow user with matching role', (done) => {
      authService.login({ username: 'admin', password: 'password123' }).subscribe(() => {
        const guardFn = roleGuard(['ADMIN', 'MANAGER']);
        const result = TestBed.runInInjectionContext(() => guardFn({} as any, {} as any));
        expect(result).toBe(true);
        done();
      });
    });

    it('should redirect user without required role to /dashboard', (done) => {
      authService.login({ username: 'cashier', password: 'password123' }).subscribe(() => {
        const guardFn = roleGuard(['ADMIN', 'MANAGER']);
        const result = TestBed.runInInjectionContext(() => guardFn({} as any, {} as any));
        expect(result instanceof UrlTree).toBe(true);
        expect((result as UrlTree).toString()).toBe('/dashboard');
        done();
      });
    });
  });
});
