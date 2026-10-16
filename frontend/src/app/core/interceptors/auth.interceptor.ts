import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.accessToken();
  const isMockToken = token?.startsWith('mock-token-') ?? false;

  const authReq = !token || isMockToken || req.url.includes('/auth/login')
    ? req
    : req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isMockToken &&
        !req.url.includes('/auth/login')
      ) {
        authService.logout();
      }
      return throwError(() => error);
    }),
  );
};
