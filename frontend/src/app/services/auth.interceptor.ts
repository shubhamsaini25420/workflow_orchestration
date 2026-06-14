import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ApiService } from './api.service';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from './notification.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiService = inject(ApiService);
  const router = inject(Router);
  const notif = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // If unauthorized or forbidden, redirect to login
      if (error.status === 401 || error.status === 403) {
        if (apiService.isAuthenticated()) {
          apiService.logout();
          notif.error('Session expired. Please log in again.');
          router.navigate(['/login']);
        }
      }
      return throwError(() => error);
    })
  );
};
