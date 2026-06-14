import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, Routes } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { LoginComponent }     from './components/login.component';
import { DashboardComponent } from './components/dashboard.component';
import { DesignerComponent }  from './components/designer.component';
import { MonitoringComponent } from './components/monitoring.component';
import { ScheduleComponent }  from './components/schedule.component';
import { authInterceptor } from './services/auth.interceptor';

const routes: Routes = [
  { path: 'login',          component: LoginComponent },
  { path: 'dashboard',      component: DashboardComponent },
  { path: 'designer',       component: DesignerComponent },
  { path: 'designer/:id',   component: DesignerComponent },
  { path: 'schedules',      component: ScheduleComponent },
  { path: 'monitoring/:id', component: MonitoringComponent },
  { path: '',               redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**',             redirectTo: '/dashboard' }
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations()
  ]
};

