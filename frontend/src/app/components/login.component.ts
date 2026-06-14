import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { NotificationService } from '../services/notification.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="login-wrapper">
      <!-- Animated background orbs -->
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
      <div class="grid-bg"></div>

      <div class="login-layout animate-fade-in">

        <!-- Left: Features Panel -->
        <div class="features-panel">
          <div class="features-brand">
            <div class="feat-logo">
              <mat-icon>hub</mat-icon>
            </div>
            <h1 class="feat-title">FlowOrchestra</h1>
            <p class="feat-subtitle">Enterprise-grade workflow orchestration built for scale</p>
          </div>

          <div class="features-list">
            <div class="feature-item" *ngFor="let f of features">
              <div class="feature-icon" [style.background]="f.bg">
                <mat-icon>{{ f.icon }}</mat-icon>
              </div>
              <div class="feature-text">
                <span class="feature-title">{{ f.title }}</span>
                <span class="feature-desc">{{ f.desc }}</span>
              </div>
            </div>
          </div>

          <div class="features-footer">
            <div class="stat-item" *ngFor="let s of stats">
              <span class="stat-num">{{ s.num }}</span>
              <span class="stat-lbl">{{ s.label }}</span>
            </div>
          </div>
        </div>

        <!-- Right: Login Card -->
        <div class="login-card animate-slide-up">
          <div class="card-header">
            <h2 class="title-display">Welcome back</h2>
            <p class="card-subtitle">Sign in to your orchestration hub</p>
          </div>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
            <div class="field-group">
              <label class="field-label">Username</label>
              <div class="input-wrapper">
                <mat-icon class="input-icon">person_outline</mat-icon>
                <input class="field-input" type="text" formControlName="username" placeholder="e.g. admin" id="username-input">
              </div>
            </div>

            <div class="field-group">
              <label class="field-label">Password</label>
              <div class="input-wrapper">
                <mat-icon class="input-icon">lock_outline</mat-icon>
                <input class="field-input" [type]="showPassword ? 'text' : 'password'" formControlName="password" placeholder="Enter your password" id="password-input">
                <button type="button" class="eye-btn" (click)="showPassword = !showPassword">
                  <mat-icon>{{ showPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </div>
            </div>

            <div class="error-banner animate-fade-in" *ngIf="errorMessage">
              <mat-icon>error_outline</mat-icon>
              <span>{{ errorMessage }}</span>
            </div>

            <button type="submit" class="btn-submit" id="login-submit-btn" [disabled]="loginForm.invalid || isLoading">
              <mat-icon *ngIf="!isLoading">login</mat-icon>
              <div class="spinner" *ngIf="isLoading"></div>
              {{ isLoading ? 'Authenticating...' : 'Sign In' }}
            </button>
          </form>

          <div class="quick-access">
            <p class="quick-title"><mat-icon>vpn_key</mat-icon> Quick Access</p>
            <div class="quick-accounts">
              <button class="account-btn" type="button" (click)="fillCredentials('admin', 'password')" id="admin-quick-btn">
                <mat-icon>admin_panel_settings</mat-icon>
                <span>Admin</span>
              </button>
              <button class="account-btn" type="button" (click)="fillCredentials('developer', 'password')" id="dev-quick-btn">
                <mat-icon>code</mat-icon>
                <span>Developer</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      position: fixed;
      inset: 0;
      background: #020817;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    /* Animated background */
    .orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(100px);
      opacity: 0.3;
      animation: float-orb 8s ease-in-out infinite;
    }
    .orb-1 { width: 400px; height: 400px; background: var(--primary, #94A3B8); top: -10%; left: -5%; animation-delay: 0s; }
    .orb-2 { width: 500px; height: 500px; background: #F97316; bottom: -15%; right: -10%; animation-delay: -3s; }
    .orb-3 { width: 300px; height: 300px; background: #7C3AED; top: 40%; left: 30%; animation-delay: -6s; opacity: 0.15; }

    .grid-bg {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(148, 163, 184, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(148, 163, 184, 0.03) 1px, transparent 1px);
      background-size: 40px 40px;
    }

    /* Layout */
    .login-layout {
      position: relative;
      z-index: 10;
      display: flex;
      gap: 0;
      border-radius: 24px;
      overflow: hidden;
      border: 1px solid var(--border-color);
      box-shadow: 0 32px 80px rgba(0, 0, 0, 0.7), 0 0 60px var(--primary-glow);
      max-width: 920px;
      width: 90vw;
    }

    /* Features panel */
    .features-panel {
      width: 380px;
      flex-shrink: 0;
      background: linear-gradient(160deg, #0b0c0e 0%, #16171a 100%);
      border-right: 1px solid var(--border-color);
      padding: 40px 32px;
      display: flex;
      flex-direction: column;
      gap: 32px;
    }
    .features-brand { display: flex; flex-direction: column; gap: 10px; }
    .feat-logo {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 24px var(--primary-glow);
      margin-bottom: 4px;
    }
    .feat-logo mat-icon { color: white !important; font-size: 26px !important; width: 26px !important; height: 26px !important; }
    .feat-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 26px;
      font-weight: 800;
      background: linear-gradient(135deg, var(--primary-light) 0%, var(--primary-dark) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .feat-subtitle { font-size: 13px; color: #475569; line-height: 1.5; }

    .features-list { display: flex; flex-direction: column; gap: 16px; }
    .feature-item { display: flex; align-items: flex-start; gap: 14px; }
    .feature-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .feature-icon mat-icon { color: white !important; font-size: 18px !important; width: 18px !important; height: 18px !important; }
    .feature-text { display: flex; flex-direction: column; gap: 2px; padding-top: 4px; }
    .feature-title { font-size: 13px; font-weight: 600; color: #E2E8F0; }
    .feature-desc  { font-size: 12px; color: #475569; }

    .features-footer {
      display: flex;
      gap: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--border-subtle);
    }
    .stat-item { display: flex; flex-direction: column; gap: 2px; }
    .stat-num { font-family: 'Space Grotesk', sans-serif; font-size: 20px; font-weight: 800; color: var(--primary); }
    .stat-lbl { font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: 0.06em; }

    /* Login card */
    .login-card {
      flex: 1;
      background: var(--bg-surface-opaque);
      padding: 48px 40px;
      display: flex;
      flex-direction: column;
      gap: 28px;
      min-width: 360px;
    }
    .card-header { display: flex; flex-direction: column; gap: 6px; }
    .card-header h2 { font-size: 28px; color: #E2E8F0; }
    .card-subtitle { font-size: 14px; color: #475569; }

    .login-form { display: flex; flex-direction: column; gap: 18px; }

    .field-group { display: flex; flex-direction: column; gap: 8px; }
    .field-label { font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.06em; }

    .input-wrapper { position: relative; display: flex; align-items: center; }
    .input-icon {
      position: absolute;
      left: 12px;
      color: #334155 !important;
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
      pointer-events: none;
    }
    .field-input {
      width: 100%;
      padding: 13px 14px 13px 42px;
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      color: #E2E8F0;
      font-size: 14px;
      font-family: 'Inter', sans-serif;
      outline: none;
      transition: all 0.2s ease;
    }
    .field-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-glow);
      background: rgba(255, 255, 255, 0.05);
    }
    .field-input::placeholder { color: #334155; }
    .eye-btn {
      position: absolute;
      right: 12px;
      background: none;
      border: none;
      color: #334155;
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 0;
      transition: color 0.2s;
    }
    .eye-btn:hover { color: var(--primary); }
    .eye-btn mat-icon { font-size: 18px !important; width: 18px !important; height: 18px !important; color: currentColor !important; }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(255, 69, 114, 0.08);
      border: 1px solid rgba(255, 69, 114, 0.2);
      border-radius: 10px;
      color: #FF4572;
      font-size: 13px;
    }
    .error-banner mat-icon { font-size: 18px !important; width: 18px !important; height: 18px !important; color: currentColor !important; }

    .btn-submit {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      height: 50px;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 700;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      box-shadow: 0 4px 20px var(--primary-glow);
      transition: all 0.25s ease;
      margin-top: 4px;
    }
    .btn-submit:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 32px var(--primary-glow);
    }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-submit mat-icon { color: white !important; font-size: 20px !important; width: 20px !important; height: 20px !important; }

    .spinner {
      width: 18px; height: 18px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    /* Quick access */
    .quick-access {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-top: 20px;
      border-top: 1px solid var(--border-subtle);
    }
    .quick-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .quick-title mat-icon { font-size: 14px !important; width: 14px !important; height: 14px !important; color: #475569 !important; }
    .quick-accounts { display: flex; gap: 10px; }
    .account-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      color: #64748B;
      font-size: 13px;
      font-weight: 500;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .account-btn:hover { color: var(--primary); border-color: var(--border-active); background: var(--primary-subtle); }
    .account-btn mat-icon { font-size: 16px !important; width: 16px !important; height: 16px !important; color: currentColor !important; }

    @media (max-width: 768px) {
      .features-panel { display: none; }
      .login-card { min-width: 0; padding: 32px 24px; }
    }
  `]
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;

  features = [
    { icon: 'polyline', title: 'Visual Pipeline Designer', desc: 'Drag & drop workflow builder with live connections', bg: 'linear-gradient(135deg,var(--primary),var(--primary-dark))' },
    { icon: 'bolt',     title: 'Real-time Execution Engine', desc: 'HTTP, SSH, Script & Conditional node runners', bg: 'linear-gradient(135deg,#F97316,#EA580C)' },
    { icon: 'schedule', title: 'Smart Scheduling',  desc: 'Cron-based automated workflow triggers',  bg: 'linear-gradient(135deg,#7C3AED,#5B21B6)' },
    { icon: 'monitoring', title: 'Live Monitoring', desc: 'WebSocket-powered real-time execution trace', bg: 'linear-gradient(135deg,#00E5A0,#059669)' },
  ];

  stats = [
    { num: '4', label: 'Node Types' },
    { num: '∞', label: 'Workflows' },
    { num: 'RT', label: 'Monitoring' },
  ];

  constructor(private fb: FormBuilder, private apiService: ApiService, private router: Router, private notif: NotificationService) {}

  ngOnInit() {
    if (this.apiService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  fillCredentials(username: string, password: string) {
    this.loginForm.patchValue({ username, password });
  }

  onSubmit() {
    if (this.loginForm.invalid) return;
    this.isLoading = true;
    this.errorMessage = '';
    this.apiService.login(this.loginForm.value).subscribe({
      next: () => { this.notif.success('Welcome back! Redirecting...'); this.router.navigate(['/dashboard']); },
      error: () => { this.isLoading = false; this.errorMessage = 'Authentication failed. Please check your credentials.'; }
    });
  }
}
