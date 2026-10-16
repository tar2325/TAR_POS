import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthService } from './auth.service';
import { AUTH_STORAGE_KEY } from '../constants/auth.constants';

describe('AuthService', () => {
  let service: AuthService;
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

    service = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should be created and start unauthenticated', () => {
    expect(service).toBeTruthy();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(service.accessToken()).toBeNull();
  });

  it('should persist session, set isAuthenticated to true, and save to localStorage on successful mock login', async () => {
    const res = await firstValueFrom(service.login({ username: 'admin', password: 'admin123' }));
    expect(res).toBeTruthy();
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()?.username).toBe('admin');
    expect(service.currentUser()?.role).toBe('ADMIN');
    expect(service.accessToken()).toBeTruthy();

    // Check localStorage
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.user.username).toBe('admin');
    expect(parsed.accessToken).toBeTruthy();
  });

  it('should fail login when mock credentials are wrong', async () => {
    await expect(
      firstValueFrom(service.login({ username: 'admin', password: 'wrongpassword' })),
    ).rejects.toThrow('ไม่ถูกต้อง');

    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('should clear session and localStorage on logout and navigate to login', async () => {
    await firstValueFrom(service.login({ username: 'admin', password: 'admin123' }));
    expect(service.isAuthenticated()).toBe(true);

    service.logout();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(service.accessToken()).toBeNull();
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should check roles correctly with hasRole', async () => {
    await firstValueFrom(service.login({ username: 'admin', password: 'admin123' }));
    expect(service.hasRole(['ADMIN'])).toBe(true);
    expect(service.hasRole(['ADMIN', 'MANAGER'])).toBe(true);
    expect(service.hasRole(['CASHIER'])).toBe(false);
  });
});
