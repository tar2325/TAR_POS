import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../../models/user.model';
import { AuthService } from '../services/auth.service';

export const roleGuard = (roles: UserRole[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }
    return authService.hasRole(roles) ? true : router.createUrlTree(['/dashboard']);
  };
};
