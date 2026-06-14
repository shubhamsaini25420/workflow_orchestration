import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../services/api.service';
import { NotificationService } from '../services/notification.service';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="dashboard-wrapper">

      <!-- Page Header -->
      <div class="page-header">
        <div class="header-left">
          <h1 class="title-display page-title">System Overview</h1>
          <p class="page-subtitle">Orchestrate and supervise your enterprise pipelines in real-time</p>
        </div>
        <div class="header-actions">
          <button class="btn-ghost" (click)="loadData()" id="refresh-btn">
            <mat-icon [class.spin-icon]="isLoading">refresh</mat-icon>
            Refresh
          </button>
          <button class="btn-primary" (click)="openCreateModal()" id="create-workflow-btn">
            <mat-icon>add</mat-icon>
            New Workflow
          </button>
        </div>
      </div>

      <!-- Stat Cards -->
      <div class="stat-grid">
        <div class="stat-card glass-card" *ngFor="let stat of statCards">
          <div class="stat-icon-wrap" [style.background]="stat.gradient">
            <mat-icon>{{ stat.icon }}</mat-icon>
          </div>
          <div class="stat-body">
            <span class="stat-value">{{ stat.value }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
          <div class="stat-trend" [class.up]="stat.trend > 0" [class.neutral]="stat.trend === 0">
            <mat-icon>{{ stat.trend > 0 ? 'trending_up' : 'trending_flat' }}</mat-icon>
          </div>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="content-grid">

        <!-- Workflows Table -->
        <div class="panel glass-card">
          <div class="panel-header">
            <div class="panel-title-row">
              <mat-icon class="panel-icon">hub</mat-icon>
              <h2>Workflow Templates</h2>
              <span class="count-badge">{{ workflows.length }}</span>
            </div>
          </div>

          <div class="table-wrapper">
            <table class="data-table" *ngIf="workflows.length > 0">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Version</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let w of workflows" class="table-row">
                  <td>
                    <div class="wf-name-cell">
                      <div class="wf-dot"></div>
                      <span class="font-bold">{{ w.name }}</span>
                    </div>
                  </td>
                  <td><span class="ver-tag">v{{ w.version }}</span></td>
                  <td class="desc-cell">{{ w.description || '—' }}</td>
                  <td>
                    <div class="action-btns">
                      <button class="btn-icon" (click)="triggerWorkflow(w)" matTooltip="Trigger Run" id="trigger-btn-{{w.id}}">
                        <mat-icon>play_arrow</mat-icon>
                      </button>
                      <button class="btn-icon" (click)="editWorkflow(w.id)" matTooltip="Edit Designer" id="edit-btn-{{w.id}}">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button class="btn-icon btn-icon-danger" (click)="confirmDelete(w)" matTooltip="Delete Workflow" id="delete-btn-{{w.id}}">
                        <mat-icon>delete_outline</mat-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="empty-state" *ngIf="workflows.length === 0 && !isLoading">
              <mat-icon class="empty-icon">hub</mat-icon>
              <h4>No Workflows Yet</h4>
              <p>Create your first workflow template to get started</p>
              <button class="btn-primary" (click)="openCreateModal()"><mat-icon>add</mat-icon> Create Workflow</button>
            </div>
          </div>
        </div>

        <!-- Recent Executions -->
        <div class="panel glass-card">
          <div class="panel-header">
            <div class="panel-title-row">
              <mat-icon class="panel-icon orange">trending_up</mat-icon>
              <h2>Live Executions</h2>
              <span class="count-badge">{{ instances.length }}</span>
            </div>
          </div>

          <div class="table-wrapper">
            <table class="data-table" *ngIf="instances.length > 0">
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Workflow</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let inst of instances.slice(0, 12)" class="table-row">
                  <td><span class="run-id">#{{ inst.id }}</span></td>
                  <td class="font-bold">{{ getWorkflowName(inst.workflowId) }}</td>
                  <td>
                    <span class="status-chip" [ngClass]="inst.status.toLowerCase()">
                      {{ inst.status }}
                    </span>
                  </td>
                  <td class="text-muted">{{ inst.startedAt | date:'HH:mm:ss' }}</td>
                  <td>
                    <button class="btn-ghost btn-sm" (click)="viewInstance(inst.id)" id="monitor-btn-{{inst.id}}">
                      <mat-icon>query_stats</mat-icon>
                      Trace
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="empty-state" *ngIf="instances.length === 0 && !isLoading">
              <mat-icon class="empty-icon">schedule</mat-icon>
              <h4>No Executions Found</h4>
              <p>Trigger a workflow to see live execution records here</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ Create Workflow Modal ══ -->
    <div class="modal-overlay" *ngIf="showCreateModal" (click)="closeModal($event)">
      <div class="modal-panel animate-scale-in" id="create-workflow-modal">
        <div class="modal-header">
          <h3>Create New Workflow</h3>
          <button class="btn-icon" (click)="showCreateModal = false"><mat-icon>close</mat-icon></button>
        </div>
        <div class="modal-body">
          <div class="field-group">
            <label class="field-label">Workflow Name *</label>
            <input class="field-input" [(ngModel)]="newWorkflow.name" placeholder="e.g. User Onboarding Pipeline" id="wf-name-input">
          </div>
          <div class="field-group">
            <label class="field-label">Description</label>
            <textarea class="field-textarea" [(ngModel)]="newWorkflow.description" rows="3" placeholder="Briefly describe what this workflow does..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" (click)="showCreateModal = false">Cancel</button>
          <button class="btn-primary" (click)="createAndDesign()" [disabled]="!newWorkflow.name" id="create-design-btn">
            <mat-icon>polyline</mat-icon> Create & Design
          </button>
        </div>
      </div>
    </div>

    <!-- ══ Trigger Modal ══ -->
    <div class="modal-overlay" *ngIf="showTriggerModal" (click)="closeModal($event)">
      <div class="modal-panel animate-scale-in" id="trigger-modal">
        <div class="modal-header">
          <div>
            <h3>Trigger Workflow</h3>
            <p class="modal-subtitle">{{ selectedWorkflow?.name }}</p>
          </div>
          <button class="btn-icon" (click)="showTriggerModal = false"><mat-icon>close</mat-icon></button>
        </div>
        <div class="modal-body">
          <div class="info-box">
            <mat-icon>info_outline</mat-icon>
            <span>Provide input variables as JSON key-value pairs for this execution context.</span>
          </div>
          <div class="field-group">
            <label class="field-label">Input Variables (JSON)</label>
            <textarea class="field-textarea" [(ngModel)]="triggerVariablesJson" rows="8" id="trigger-vars-input"
              placeholder='{ "price": 150, "qty": 4, "username": "john" }'></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" (click)="showTriggerModal = false">Cancel</button>
          <button class="btn-accent" (click)="executeTrigger()" id="execute-trigger-btn">
            <mat-icon>play_arrow</mat-icon> Execute
          </button>
        </div>
      </div>
    </div>

    <!-- ══ Delete Confirm Modal ══ -->
    <div class="modal-overlay" *ngIf="showDeleteModal" (click)="closeModal($event)">
      <div class="modal-panel modal-sm animate-scale-in" id="delete-confirm-modal">
        <div class="modal-header">
          <h3>Delete Workflow</h3>
          <button class="btn-icon" (click)="showDeleteModal = false"><mat-icon>close</mat-icon></button>
        </div>
        <div class="modal-body">
          <div class="danger-box">
            <mat-icon>warning</mat-icon>
            <div>
              <strong>This action cannot be undone.</strong>
              <p>Are you sure you want to delete <strong>{{ workflowToDelete?.name }}</strong>? All associated executions will be lost.</p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" (click)="showDeleteModal = false">Cancel</button>
          <button class="btn-danger" (click)="executeDelete()" id="confirm-delete-btn">
            <mat-icon>delete</mat-icon> Delete Permanently
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-wrapper {
      padding: 28px 32px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      height: 100%;
      overflow-y: auto;
      background: #020817;
    }

    /* Header */
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .page-title { font-size: 26px; color: #E2E8F0; }
    .page-subtitle { font-size: 13px; color: #475569; margin-top: 4px; }
    .header-actions { display: flex; gap: 10px; align-items: center; }

    .spin-icon { animation: spin 1s linear infinite; }

    /* Stat Grid */
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }
    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      position: relative;
      overflow: hidden;
    }
    .stat-card::after {
      content: '';
      position: absolute;
      top: 0; right: 0;
      width: 80px; height: 80px;
      background: radial-gradient(circle, currentColor 0%, transparent 70%);
      opacity: 0.03;
      transform: translate(20px, -20px);
    }
    .stat-icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 14px rgba(0,0,0,0.3);
    }
    .stat-icon-wrap mat-icon { color: white !important; font-size: 22px !important; width: 22px !important; height: 22px !important; }
    .stat-body { display: flex; flex-direction: column; flex: 1; }
    .stat-value {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 28px;
      font-weight: 800;
      color: #E2E8F0;
      line-height: 1;
    }
    .stat-label { font-size: 12px; color: #475569; font-weight: 500; margin-top: 4px; }
    .stat-trend { color: #475569; }
    .stat-trend.up { color: #00E5A0; }
    .stat-trend mat-icon { font-size: 16px !important; width: 16px !important; height: 16px !important; color: currentColor !important; }

    /* Content Grid */
    .content-grid {
      display: grid;
      grid-template-columns: 1fr 1.4fr;
      gap: 20px;
      flex: 1;
      min-height: 0;
    }
    @media (max-width: 1100px) { .content-grid { grid-template-columns: 1fr; } }

    .panel {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 300px;
    }
    .panel-header {
      padding: 20px 20px 0;
    }
    .panel-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
    }
    .panel-title-row h2 { font-size: 15px; font-weight: 700; color: #E2E8F0; }
    .panel-icon { color: var(--primary) !important; font-size: 18px !important; width: 18px !important; height: 18px !important; }
    .panel-icon.orange { color: #F97316 !important; }
    .count-badge {
      background: rgba(148, 163, 184, 0.12);
      color: var(--primary);
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 999px;
    }

    /* Table */
    .table-wrapper { flex: 1; overflow-y: auto; padding: 0 4px 4px; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th {
      text-align: left;
      padding: 8px 12px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #475569;
      border-bottom: 1px solid var(--border-color);
      background: rgba(148, 163, 184, 0.02);
      position: sticky;
      top: 0;
    }
    .table-row td {
      padding: 12px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.03);
      font-size: 13px;
      color: #CBD5E1;
      vertical-align: middle;
    }
    .table-row:hover td { background: var(--primary-subtle); }
    .table-row:last-child td { border-bottom: none; }

    .wf-name-cell { display: flex; align-items: center; gap: 10px; }
    .wf-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--primary); flex-shrink: 0; box-shadow: 0 0 6px var(--primary-glow); }
    .font-bold { font-weight: 600; color: #E2E8F0; }
    .desc-cell { color: #475569; font-size: 12px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .run-id { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #475569; }
    .ver-tag {
      background: rgba(148, 163, 184, 0.1);
      color: var(--primary);
      font-size: 11px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 5px;
      font-family: 'JetBrains Mono', monospace;
    }

    .action-btns { display: flex; gap: 4px; }
    .btn-icon-danger:hover { color: #FF4572 !important; border-color: rgba(255,69,114,0.3) !important; background: rgba(255,69,114,0.08) !important; }

    .btn-sm { padding: 6px 12px; font-size: 12px; }
    .btn-sm mat-icon { font-size: 14px !important; width: 14px !important; height: 14px !important; }

    /* Modal extras */
    .modal-subtitle { font-size: 13px; color: #475569; margin-top: 2px; }
    .modal-sm { max-width: 400px; }
    .info-box {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 12px 16px;
      background: rgba(148, 163, 184, 0.06);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      font-size: 13px;
      color: #64748B;
    }
    .info-box mat-icon { color: var(--primary) !important; font-size: 18px !important; width: 18px !important; height: 18px !important; flex-shrink: 0; margin-top: 1px; }
    .danger-box {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 16px;
      background: rgba(255, 69, 114, 0.06);
      border: 1px solid rgba(255, 69, 114, 0.15);
      border-radius: 10px;
      font-size: 13px;
      color: #CBD5E1;
    }
    .danger-box mat-icon { color: #FF4572 !important; font-size: 22px !important; width: 22px !important; height: 22px !important; flex-shrink: 0; }
    .danger-box strong { color: #FF4572; display: block; margin-bottom: 4px; font-size: 14px; }
    .danger-box p { color: #64748B; margin-top: 4px; }

    /* Button overrides for template */
    .btn-primary, .btn-ghost, .btn-accent, .btn-danger, .btn-icon { font-family: 'Inter', sans-serif; }
    .btn-accent {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 20px;
      background: linear-gradient(135deg, #F97316, #EA580C);
      color: white; border: none; border-radius: 10px;
      font-size: 14px; font-weight: 600; cursor: pointer;
      box-shadow: 0 4px 14px rgba(249,115,22,0.35);
      transition: all 0.25s ease;
    }
    .btn-accent:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(249,115,22,0.4); }
    .btn-accent mat-icon, .btn-primary mat-icon, .btn-ghost mat-icon, .btn-danger mat-icon {
      font-size: 16px !important; width: 16px !important; height: 16px !important; color: currentColor !important;
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  workflows: any[] = [];
  instances: any[] = [];
  isLoading = false;

  showCreateModal = false;
  showTriggerModal = false;
  showDeleteModal = false;
  selectedWorkflow: any = null;
  workflowToDelete: any = null;
  triggerVariablesJson = '';
  newWorkflow = { name: '', description: '' };

  private refreshTimer: any;

  statCards: any[] = [];

  constructor(private apiService: ApiService, private router: Router, private notif: NotificationService) {}

  ngOnInit() { this.loadData(); }
  ngOnDestroy() { if (this.refreshTimer) clearInterval(this.refreshTimer); }

  loadData() {
    this.isLoading = true;
    this.apiService.getWorkflows().subscribe({ next: data => { this.workflows = data; this.buildStats(); this.isLoading = false; }, error: () => this.isLoading = false });
    this.apiService.getInstances().subscribe({ next: data => { this.instances = data.sort((a, b) => b.id - a.id); this.buildStats(); }, error: () => {} });
  }

  buildStats() {
    this.statCards = [
      { label: 'Total Workflows', value: this.workflows.length, icon: 'hub', gradient: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', trend: this.workflows.length > 0 ? 1 : 0 },
      { label: 'Running Instances', value: this.getCount('RUNNING'), icon: 'bolt', gradient: 'linear-gradient(135deg,#F97316,#EA580C)', trend: this.getCount('RUNNING') > 0 ? 1 : 0 },
      { label: 'Completed Runs', value: this.getCount('COMPLETED'), icon: 'check_circle', gradient: 'linear-gradient(135deg,#00E5A0,#059669)', trend: 1 },
      { label: 'Failed Runs', value: this.getCount('FAILED'), icon: 'error', gradient: 'linear-gradient(135deg,#FF4572,#be123c)', trend: 0 },
    ];
  }

  getCount(status: string): number { return this.instances.filter(i => i.status === status).length; }
  getWorkflowName(id: number): string { return this.workflows.find(w => w.id === id)?.name ?? 'Unknown'; }
  viewInstance(id: number) { this.router.navigate(['/monitoring', id]); }
  editWorkflow(id: number) { this.router.navigate(['/designer', id]); }

  openCreateModal() {
    this.newWorkflow = { name: '', description: '' };
    this.showCreateModal = true;
  }

  createAndDesign() {
    if (!this.newWorkflow.name) return;
    const payload = { name: this.newWorkflow.name, description: this.newWorkflow.description, version: 1, definitionJson: '{"nodes":[],"connections":[]}', active: true };
    this.apiService.createWorkflow(payload).subscribe({
      next: (res) => { this.showCreateModal = false; this.notif.success(`Workflow "${res.name}" created!`); this.router.navigate(['/designer', res.id]); },
      error: () => this.notif.error('Failed to create workflow. Please try again.')
    });
  }

  triggerWorkflow(w: any) {
    this.selectedWorkflow = w;
    this.triggerVariablesJson = JSON.stringify({ price: 150, qty: 4, username: 'johndoe', host: 'localhost', condition: '#price * #qty > 500', script: '#price * #qty' }, null, 2);
    this.showTriggerModal = true;
  }

  executeTrigger() {
    let vars = {};
    try { vars = JSON.parse(this.triggerVariablesJson); } catch { this.notif.error('Invalid JSON in variables.'); return; }
    this.apiService.triggerWorkflow(this.selectedWorkflow.id, vars).subscribe({
      next: (res) => {
        this.showTriggerModal = false;
        this.notif.success(`Workflow triggered! Instance #${res.instanceId} started.`);
        this.loadData();
        setTimeout(() => this.router.navigate(['/monitoring', res.instanceId]), 800);
      },
      error: () => this.notif.error('Failed to trigger workflow.')
    });
  }

  confirmDelete(w: any) { this.workflowToDelete = w; this.showDeleteModal = true; }

  executeDelete() {
    this.apiService.deleteWorkflow(this.workflowToDelete.id).subscribe({
      next: () => { this.showDeleteModal = false; this.notif.success(`Workflow "${this.workflowToDelete.name}" deleted.`); this.loadData(); },
      error: () => this.notif.error('Failed to delete workflow.')
    });
  }

  closeModal(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.showCreateModal = false;
      this.showTriggerModal = false;
      this.showDeleteModal = false;
    }
  }
}
