import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  public toasts$ = this.toastsSubject.asObservable();

  private show(type: Toast['type'], message: string, duration = 4000) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const toast: Toast = { id, type, message, duration };
    this.toastsSubject.next([...this.toastsSubject.value, toast]);
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }

  success(message: string, duration = 4000) { this.show('success', message, duration); }
  error(message: string, duration = 6000)   { this.show('error', message, duration); }
  info(message: string, duration = 3500)    { this.show('info', message, duration); }
  warning(message: string, duration = 5000) { this.show('warning', message, duration); }

  dismiss(id: string) {
    this.toastsSubject.next(this.toastsSubject.value.filter(t => t.id !== id));
  }

  getIcon(type: Toast['type']): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error':   return 'error';
      case 'warning': return 'warning';
      case 'info':    return 'info';
    }
  }
}
