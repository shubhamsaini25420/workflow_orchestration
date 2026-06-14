import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../services/api.service';
import { NotificationService } from '../services/notification.service';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="page-wrapper">
      <div class="page-header">
        <div>
          <h1 class="title-display page-title">Schedules</h1>
          <p class="page-subtitle">Automate workflow triggers with cron-based scheduling</p>
        </div>
        <button class="btn-primary" (click)="openCreate()" id="new-schedule-btn">
          <mat-icon>add</mat-icon> New Schedule
        </button>
      </div>

      <div class="glass-card schedules-panel">
        <div class="panel-header">
          <div class="panel-title-row">
            <mat-icon class="panel-icon">schedule</mat-icon>
            <h2>Active Schedules</h2>
            <span class="count-badge">{{ schedules.length }}</span>
          </div>
        </div>

        <div class="table-wrapper" *ngIf="schedules.length > 0">
          <table class="data-table">
            <thead>
              <tr>
                <th>Workflow</th>
                <th>Cron Expression</th>
                <th>Human Readable</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of schedules" class="table-row">
                <td class="font-bold">{{ getWorkflowName(s.workflowId) }}</td>
                <td><code class="cron-code">{{ s.cronExpression }}</code></td>
                <td class="text-muted">{{ parseCron(s.cronExpression) }}</td>
                <td>
                  <span class="status-chip" [ngClass]="s.active ? 'active' : 'inactive'">
                    {{ s.active ? 'Active' : 'Paused' }}
                  </span>
                </td>
                <td>
                  <div class="action-btns">
                    <button class="btn-icon" (click)="toggleActive(s)" [matTooltip]="s.active ? 'Pause' : 'Activate'" id="toggle-btn-{{s.id}}">
                      <mat-icon>{{ s.active ? 'pause' : 'play_arrow' }}</mat-icon>
                    </button>
                    <button class="btn-icon" (click)="openEdit(s)" matTooltip="Edit" id="edit-sched-{{s.id}}">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button class="btn-icon btn-icon-danger" (click)="confirmDelete(s)" matTooltip="Delete" id="del-sched-{{s.id}}">
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="empty-state" *ngIf="schedules.length === 0 && !isLoading">
          <mat-icon class="empty-icon">schedule</mat-icon>
          <h4>No Schedules Configured</h4>
          <p>Add a cron schedule to automatically trigger workflows at defined intervals</p>
          <button class="btn-primary" (click)="openCreate()"><mat-icon>add</mat-icon> Create Schedule</button>
        </div>
      </div>

      <!-- Cron Reference Card -->
      <div class="glass-card ref-card">
        <div class="panel-header">
          <div class="panel-title-row">
            <mat-icon class="panel-icon">help_outline</mat-icon>
            <h2>Cron Expression Reference</h2>
          </div>
        </div>
        <div class="cron-ref-grid">
          <div class="cron-example" *ngFor="let ex of cronExamples">
            <code class="cron-code">{{ ex.cron }}</code>
            <span class="cron-desc">{{ ex.desc }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Create / Edit Modal -->
    <div class="modal-overlay" *ngIf="showModal" (click)="closeModal($event)">
      <div class="modal-panel animate-scale-in" id="schedule-modal">
        <div class="modal-header">
          <h3>{{ editMode ? 'Edit Schedule' : 'New Schedule' }}</h3>
          <button class="btn-icon" (click)="showModal = false"><mat-icon>close</mat-icon></button>
        </div>
        <div class="modal-body">
          <div class="field-group">
            <label class="field-label">Workflow *</label>
            <select class="field-select" [(ngModel)]="form.workflowId" id="sched-workflow-select">
              <option value="" disabled>Select a workflow...</option>
              <option *ngFor="let w of workflows" [value]="w.id">{{ w.name }}</option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-label">Cron Expression *</label>
            <input class="field-input" [(ngModel)]="form.cronExpression" placeholder="0 0 * * *" id="cron-input">
            <span class="field-hint" *ngIf="form.cronExpression">{{ parseCron(form.cronExpression) }}</span>
          </div>
          <div class="toggle-row">
            <span class="field-label">Enable immediately</span>
            <button class="toggle-btn" [class.on]="form.active" (click)="form.active = !form.active" id="active-toggle">
              <span class="toggle-knob"></span>
            </button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" (click)="showModal = false">Cancel</button>
          <button class="btn-primary" (click)="saveSchedule()" [disabled]="!form.workflowId || !form.cronExpression" id="save-sched-btn">
            <mat-icon>save</mat-icon> {{ editMode ? 'Update' : 'Create' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirm -->
    <div class="modal-overlay" *ngIf="showDeleteModal" (click)="closeModal($event)">
      <div class="modal-panel animate-scale-in" style="max-width:400px" id="del-sched-confirm">
        <div class="modal-header">
          <h3>Delete Schedule</h3>
          <button class="btn-icon" (click)="showDeleteModal = false"><mat-icon>close</mat-icon></button>
        </div>
        <div class="modal-body">
          <div class="danger-box">
            <mat-icon>warning</mat-icon>
            <span>Delete the schedule for <strong>{{ getWorkflowName(schedToDelete?.workflowId) }}</strong>? This cannot be undone.</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" (click)="showDeleteModal = false">Cancel</button>
          <button class="btn-danger" (click)="doDelete()" id="confirm-del-sched">
            <mat-icon>delete</mat-icon> Delete
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-wrapper { padding: 28px 32px; display: flex; flex-direction: column; gap: 20px; height: 100%; overflow-y: auto; background: var(--bg-main); }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .page-title { font-size: 26px; color: #E2E8F0; }
    .page-subtitle { font-size: 13px; color: #475569; margin-top: 4px; }

    .schedules-panel, .ref-card { padding: 0; overflow: hidden; }
    .panel-header { padding: 20px 20px 0; }
    .panel-title-row { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
    .panel-title-row h2 { font-size: 15px; font-weight: 700; color: #E2E8F0; }
    .panel-icon { color: var(--primary) !important; font-size: 18px !important; width: 18px !important; height: 18px !important; }
    .count-badge { background: rgba(148,163,184,0.12); color: var(--primary); font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }

    .table-wrapper { overflow-x: auto; padding: 0 4px 12px; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th { text-align: left; padding: 8px 14px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #475569; border-bottom: 1px solid var(--border-color); background: rgba(148,163,184,0.02); }
    .table-row td { padding: 14px 14px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 13px; color: #CBD5E1; vertical-align: middle; }
    .table-row:hover td { background: var(--primary-subtle); }
    .table-row:last-child td { border-bottom: none; }
    .font-bold { font-weight: 600; color: #E2E8F0; }
    .text-muted { color: #475569; font-size: 12px; }
    .cron-code { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text-primary); background: rgba(148,163,184,0.08); padding: 3px 8px; border-radius: 5px; }
    .action-btns { display: flex; gap: 4px; }
    .btn-icon-danger:hover { color: #FF4572 !important; border-color: rgba(255,69,114,0.3) !important; background: rgba(255,69,114,0.08) !important; }

    .cron-ref-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; padding: 0 20px 20px; }
    .cron-example { display: flex; flex-direction: column; gap: 4px; padding: 12px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; }
    .cron-desc { font-size: 12px; color: #475569; }

    .toggle-row { display: flex; align-items: center; justify-content: space-between; }
    .toggle-btn { position: relative; width: 42px; height: 24px; background: #1e293b; border: 1px solid var(--border-color); border-radius: 999px; cursor: pointer; transition: all 0.25s ease; }
    .toggle-btn.on { background: var(--primary); border-color: var(--primary); }
    .toggle-knob { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: white; transition: transform 0.25s ease; box-shadow: 0 1px 4px rgba(0,0,0,0.4); }
    .toggle-btn.on .toggle-knob { transform: translateX(18px); }

    .field-hint { font-size: 12px; color: var(--primary); margin-top: 4px; font-style: italic; }
    .danger-box { display: flex; align-items: flex-start; gap: 12px; padding: 16px; background: rgba(255,69,114,0.06); border: 1px solid rgba(255,69,114,0.15); border-radius: 10px; font-size: 13px; color: #CBD5E1; }
    .danger-box mat-icon { color: #FF4572 !important; font-size: 22px !important; width: 22px !important; height: 22px !important; flex-shrink: 0; }
    .danger-box strong { color: #FF4572; }

    .btn-primary, .btn-ghost, .btn-danger, .btn-icon { font-family: 'Inter', sans-serif; }
    .btn-primary mat-icon, .btn-ghost mat-icon, .btn-danger mat-icon, .btn-icon mat-icon { font-size: 16px !important; width: 16px !important; height: 16px !important; color: currentColor !important; }

    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 60px 20px; color: #475569; text-align: center; }
    .empty-icon { font-size: 48px !important; width: 48px !important; height: 48px !important; opacity: 0.4; color: var(--primary) !important; }
    .empty-state h4 { font-size: 16px; font-weight: 600; color: #E2E8F0; }
    .empty-state p { font-size: 13px; max-width: 280px; }
  `]
})
export class ScheduleComponent implements OnInit {
  schedules: any[] = [];
  workflows: any[] = [];
  isLoading = false;
  showModal = false;
  showDeleteModal = false;
  editMode = false;
  schedToDelete: any = null;

  form: any = { workflowId: '', cronExpression: '0 * * * *', active: true };

  cronExamples = [
    { cron: '* * * * *',    desc: 'Every minute' },
    { cron: '0 * * * *',    desc: 'Every hour' },
    { cron: '0 9 * * *',    desc: 'Every day at 9:00 AM' },
    { cron: '0 9 * * 1',    desc: 'Every Monday at 9:00 AM' },
    { cron: '0 0 1 * *',    desc: 'First day of every month' },
    { cron: '*/15 * * * *', desc: 'Every 15 minutes' },
  ];

  constructor(private api: ApiService, private notif: NotificationService) {}

  ngOnInit() { this.loadData(); }

  loadData() {
    this.isLoading = true;
    this.api.getWorkflows().subscribe({ next: d => this.workflows = d, error: () => {} });
    this.api.getSchedules().subscribe({ next: d => { this.schedules = d; this.isLoading = false; }, error: () => { this.isLoading = false; } });
  }

  getWorkflowName(id: number): string { return this.workflows.find(w => w.id === id)?.name ?? 'Unknown'; }

  parseCron(expr: string): string {
    if (!expr) return '';
    const parts = expr.trim().split(/\s+/);
    if (parts.length !== 5) return 'Custom schedule';
    const [min, hr, dom, mon, dow] = parts;
    if (expr === '* * * * *') return 'Every minute';
    if (min === '0' && hr !== '*' && dom === '*' && mon === '*' && dow === '*') return `Every day at ${hr}:00`;
    if (min.startsWith('*/')) return `Every ${min.slice(2)} minutes`;
    if (hr === '0' && dom === '1' && mon === '*' && dow === '*') return 'First day of every month at midnight';
    return 'Custom schedule';
  }

  openCreate() { this.editMode = false; this.form = { workflowId: '', cronExpression: '0 * * * *', active: true }; this.showModal = true; }

  openEdit(s: any) {
    this.editMode = true;
    this.form = { ...s };
    this.showModal = true;
  }

  saveSchedule() {
    const op = this.editMode
      ? this.api.updateSchedule(this.form.id, this.form)
      : this.api.createSchedule(this.form);
    op.subscribe({
      next: () => { this.showModal = false; this.notif.success(this.editMode ? 'Schedule updated!' : 'Schedule created!'); this.loadData(); },
      error: () => this.notif.error('Failed to save schedule.')
    });
  }

  toggleActive(s: any) {
    this.api.updateSchedule(s.id, { ...s, active: !s.active }).subscribe({
      next: () => { s.active = !s.active; this.notif.info(`Schedule ${s.active ? 'activated' : 'paused'}.`); },
      error: () => this.notif.error('Failed to update schedule.')
    });
  }

  confirmDelete(s: any) { this.schedToDelete = s; this.showDeleteModal = true; }

  doDelete() {
    this.api.deleteSchedule(this.schedToDelete.id).subscribe({
      next: () => { this.showDeleteModal = false; this.notif.success('Schedule deleted.'); this.loadData(); },
      error: () => this.notif.error('Failed to delete schedule.')
    });
  }

  closeModal(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.showModal = false;
      this.showDeleteModal = false;
    }
  }
}
