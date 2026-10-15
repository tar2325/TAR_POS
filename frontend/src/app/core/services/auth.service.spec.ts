import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { AUTH_STORAGE_KEY } from '../constants/auth.constants';
import { LoginResponse } from '../../models/auth.model';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created and start unauthenticated', () => {
    expect(service).toBeTruthy();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(service.accessToken()).toBeNull();
  });

  it('should persist session, set isAuthenticated to true, and save to localStorage on successful mock login', (done) => {
    service.login({ username: 'admin', password: 'password123' }).subscribe({
      next: (res) => {
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

        done();
      },
    });
  });

  it('should fail login when mock credentials are wrong', (done) => {
    service.login({ username: 'admin', password: 'wrongpassword' }).subscribe({
      error: (err) => {
        expect(err.message).toContain('ไม่ถูกต้อง');
        expect(service.isAuthenticated()).toBe(false);
        expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
        done();
      },
    });
  });

  it('should clear session and localStorage on logout', (done) => {
    service.login({ username: 'admin', password: 'password123' }).subscribe({
      next: () => {
        expect(service.isAuthenticated()).toBe(true);

        service.logout();

        expect(service.isAuthenticated()).toBe(false);
        expect(service.currentUser()).toBeNull();
        expect(service.accessToken()).toBeNull();
        expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();

        done();
      },
    });
  });

  it('should check roles correctly with hasRole', (done) => {
    service.login({ username: 'admin', password: 'password123' }).subscribe({
      next: () => {
        expect(service.hasRole(['ADMIN'])).toBe(true);
        expect(service.hasRole(['ADMIN', 'MANAGER'])).toBe(true);
        expect(service.hasRole(['CASHIER'])).toBe(false);
        done();
      },
    });
  });
});
