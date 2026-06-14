import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationStart, NavigationEnd } from '@angular/router';
import { ApiService } from './services/api.service';
import { NotificationService, Toast } from './services/notification.service';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="app-shell">

      <!-- ══ Left Sidebar ══ -->
      <aside class="sidebar" [class.collapsed]="sidebarCollapsed" *ngIf="isAuthenticated()">

        <!-- Brand -->
        <div class="sidebar-brand" (click)="router.navigate(['/dashboard'])">
          <div class="brand-icon">
            <mat-icon>hub</mat-icon>
          </div>
          <div class="brand-text" *ngIf="!sidebarCollapsed">
            <span class="brand-name">FlowOrchestra</span>
            <span class="brand-tagline">Orchestration Hub</span>
          </div>
        </div>

        <div class="sidebar-divider"></div>

        <!-- Nav Items -->
        <nav class="sidebar-nav">
          <a *ngFor="let item of navItems"
             class="nav-item"
             [routerLink]="item.route"
             routerLinkActive="active"
             [matTooltip]="sidebarCollapsed ? item.label : ''"
             matTooltipPosition="right">
            <mat-icon class="nav-icon">{{ item.icon }}</mat-icon>
            <span class="nav-label" *ngIf="!sidebarCollapsed">{{ item.label }}</span>
            <span class="nav-badge" *ngIf="item.badge && !sidebarCollapsed">{{ item.badge }}</span>
          </a>
        </nav>

        <div class="sidebar-spacer"></div>

        <!-- Theme Toggle -->
        <button class="nav-item theme-btn"
                (click)="toggleTheme()"
                [matTooltip]="sidebarCollapsed ? (isDark ? 'Light Mode' : 'Dark Mode') : ''"
                matTooltipPosition="right">
          <mat-icon class="nav-icon">{{ isDark ? 'light_mode' : 'dark_mode' }}</mat-icon>
          <span class="nav-label" *ngIf="!sidebarCollapsed">{{ isDark ? 'Light Mode' : 'Dark Mode' }}</span>
        </button>

        <!-- User Section -->
        <div class="sidebar-user" *ngIf="session">
          <div class="user-avatar" [matTooltip]="sidebarCollapsed ? session.username : ''" matTooltipPosition="right">
            <mat-icon>account_circle</mat-icon>
          </div>
          <div class="user-info" *ngIf="!sidebarCollapsed">
            <span class="user-name">{{ session.username }}</span>
            <span class="user-role">{{ session.roles?.[0]?.replace('ROLE_', '') || 'USER' }}</span>
          </div>
          <button class="logout-btn"
                  (click)="logout()"
                  [matTooltip]="'Logout'"
                  matTooltipPosition="right"
                  *ngIf="!sidebarCollapsed">
            <mat-icon>logout</mat-icon>
          </button>
        </div>

        <!-- Collapse Toggle -->
        <button class="collapse-btn" (click)="toggleSidebar()" [matTooltip]="sidebarCollapsed ? 'Expand' : 'Collapse'" matTooltipPosition="right">
          <mat-icon>{{ sidebarCollapsed ? 'chevron_right' : 'chevron_left' }}</mat-icon>
        </button>
      </aside>

      <!-- ══ Main Content ══ -->
      <div class="app-content">
        <!-- Loading Bar -->
        <div class="loading-bar" [class.active]="isNavigating"></div>

        <main class="content-view">
          <router-outlet></router-outlet>
        </main>
      </div>

    </div>

    <!-- ══ Global Toast Container ══ -->
    <div class="toast-container">
      <div *ngFor="let toast of toasts" class="toast animate-slide-in" [ngClass]="toast.type">
        <mat-icon class="toast-icon">{{ notifService.getIcon(toast.type) }}</mat-icon>
        <span class="toast-msg">{{ toast.message }}</span>
        <button class="toast-close" (click)="notifService.dismiss(toast.id)">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .app-shell {
      display: flex;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: var(--bg-main);
    }

    /* ── Sidebar ── */
    .sidebar {
      width: var(--sidebar-width, 240px);
      height: 100%;
      background: var(--bg-surface-opaque);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden !important;
      position: relative;
      z-index: 50;
    }
    .sidebar.collapsed { width: 64px; }

    /* Brand */
    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 12px;
      cursor: pointer;
      text-decoration: none;
      min-height: 64px;
    }
    .brand-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 14px var(--primary-glow);
    }
    .brand-icon mat-icon { color: white !important; font-size: 20px !important; width: 20px !important; height: 20px !important; }
    .brand-text { display: flex; flex-direction: column; overflow: hidden; }
    .brand-name {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 15px;
      font-weight: 700;
      color: #E2E8F0;
      white-space: nowrap;
      background: linear-gradient(135deg, var(--primary-light), var(--primary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .brand-tagline { font-size: 10px; color: #475569; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 1px; }

    .sidebar-divider {
      height: 1px;
      background: var(--border-subtle);
      margin: 0 12px 6px;
    }

    /* Nav */
    .sidebar-nav { display: flex; flex-direction: column; gap: 2px; padding: 0 8px; }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 10px;
      cursor: pointer;
      text-decoration: none;
      color: #64748B;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s ease;
      white-space: nowrap;
      position: relative;
      border: none;
      background: transparent;
      width: 100%;
      font-family: 'Inter', sans-serif;
    }
    .nav-item:hover { color: #E2E8F0; background: rgba(255, 255, 255, 0.04); }
    .nav-item.active {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.06);
      font-weight: 600;
    }
    .nav-item.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      background: var(--primary);
      border-radius: 0 3px 3px 0;
    }
    .nav-icon { font-size: 18px !important; width: 18px !important; height: 18px !important; flex-shrink: 0; color: currentColor !important; }
    .nav-label { flex: 1; }
    .nav-badge {
      background: rgba(249, 115, 22, 0.2);
      color: #F97316;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 999px;
    }

    .sidebar-spacer { flex: 1; }

    /* User */
    .sidebar-user {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 10px;
      margin: 0 8px 6px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color);
    }
    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(148, 163, 184, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .user-avatar mat-icon { color: var(--primary) !important; font-size: 18px !important; width: 18px !important; height: 18px !important; }
    .user-info { display: flex; flex-direction: column; flex: 1; overflow: hidden; min-width: 0; }
    .user-name { font-size: 13px; font-weight: 600; color: #E2E8F0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .user-role { font-size: 10px; color: #475569; text-transform: uppercase; letter-spacing: 0.06em; }
    .logout-btn {
      background: none;
      border: none;
      color: #475569;
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 4px;
      border-radius: 6px;
      transition: color 0.2s, background 0.2s;
    }
    .logout-btn:hover { color: #FF4572; background: rgba(255, 69, 114, 0.1); }
    .logout-btn mat-icon { font-size: 16px !important; width: 16px !important; height: 16px !important; color: currentColor !important; }

    /* Collapse button */
    .collapse-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 32px;
      margin: 4px 8px 8px;
      background: transparent;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      color: #475569;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .collapse-btn:hover { color: var(--text-primary); border-color: var(--border-active); background: var(--primary-subtle); }
    .collapse-btn mat-icon { color: currentColor !important; font-size: 18px !important; width: 18px !important; height: 18px !important; }

    .theme-btn { color: #64748B; }
    .theme-btn:hover { color: #F97316; background: rgba(249, 115, 22, 0.06); }

    /* ── Content ── */
    .app-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
      position: relative;
    }

    .loading-bar {
      height: 2px;
      background: linear-gradient(90deg, var(--primary), var(--primary-dark));
      width: 0%;
      transition: width 0.3s ease;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 100;
    }
    .loading-bar.active {
      width: 100%;
      animation: none;
    }

    .content-view {
      flex: 1;
      position: relative;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* ── Toast override position ── */
    :host ::ng-deep .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
    }
  `]
})
export class AppComponent implements OnInit {
  sidebarCollapsed = false;
  isDark = true;
  isNavigating = false;
  session: any = null;
  toasts: Toast[] = [];

  navItems: NavItem[] = [
    { label: 'Dashboard',      icon: 'dashboard',    route: '/dashboard' },
    { label: 'Visual Designer', icon: 'polyline',    route: '/designer' },
    { label: 'Schedules',      icon: 'schedule',     route: '/schedules' },
    { label: 'Monitoring',     icon: 'monitoring',   route: '/monitoring/1' },
  ];

  constructor(
    public router: Router,
    private apiService: ApiService,
    public notifService: NotificationService
  ) {}

  ngOnInit() {
    this.apiService.auth$.subscribe(state => {
      this.session = state;
      if (!state) {
        this.router.navigate(['/login']);
      }
    });

    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart)  this.isNavigating = true;
      if (event instanceof NavigationEnd)    setTimeout(() => this.isNavigating = false, 300);
    });

    this.notifService.toasts$.subscribe(t => this.toasts = t);
  }

  isAuthenticated(): boolean { return this.apiService.isAuthenticated(); }

  toggleSidebar() { this.sidebarCollapsed = !this.sidebarCollapsed; }

  toggleTheme() {
    this.isDark = !this.isDark;
    document.body.classList.toggle('light-theme', !this.isDark);
  }

  logout() {
    this.apiService.logout();
    this.router.navigate(['/login']);
  }
}
