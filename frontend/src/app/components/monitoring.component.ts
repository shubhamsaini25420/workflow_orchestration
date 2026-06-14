import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../services/api.service';
import { NotificationService } from '../services/notification.service';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

interface RenderNode {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
}

interface RenderConnection {
  fromNodeId: string;
  toNodeId: string;
  fromPort: string;
  toPort: string;
}

@Component({
  selector: 'app-monitoring',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="monitoring-container animate-fade-in">
      
      <!-- Left sidebar: Run state metrics, executions list, & terminal logs -->
      <div class="monitor-sidebar glass-panel">
        <div class="sidebar-header">
          <button class="btn-icon" routerLink="/dashboard" matTooltip="Back to Dashboard" id="monitor-back-btn">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <h3 class="title-display text-cyan">Execution Trace</h3>
        </div>

        <!-- Instance details -->
        <div class="instance-details" *ngIf="instance">
          <div class="detail-row">
            <span class="detail-label">Status</span>
            <span class="status-badge status-chip" [ngClass]="instance.status.toLowerCase()">
              {{ instance.status }}
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Instance ID</span>
            <span class="detail-val font-mono">#{{ instance.id }}</span>
          </div>
          <div class="detail-row" *ngIf="instance.errorMessage">
            <span class="detail-label text-danger">Error Detail</span>
            <span class="detail-val danger-desc">{{ instance.errorMessage }}</span>
          </div>
        </div>

        <!-- Action Controls -->
        <div class="run-controls" *ngIf="instance">
          <button class="btn-ctrl btn-pause" 
                  *ngIf="instance.status === 'RUNNING'" 
                  (click)="pauseInstance()" id="pause-run-btn">
            <mat-icon>pause</mat-icon> Pause Run
          </button>
          <button class="btn-ctrl btn-resume" 
                  *ngIf="instance.status === 'PAUSED'" 
                  (click)="resumeInstance()" id="resume-run-btn">
            <mat-icon>play_arrow</mat-icon> Resume Run
          </button>
          <button class="btn-ctrl btn-cancel" 
                  *ngIf="instance.status === 'RUNNING' || instance.status === 'PAUSED'" 
                  (click)="cancelInstance()" id="cancel-run-btn">
            <mat-icon>stop</mat-icon> Force Cancel
          </button>
          <button class="btn-ctrl btn-retrigger" 
                  *ngIf="instance.status === 'COMPLETED' || instance.status === 'FAILED' || instance.status === 'CANCELLED'" 
                  (click)="retriggerWorkflow()" id="retrigger-run-btn">
            <mat-icon>replay</mat-icon> Re-Run Workflow
          </button>
        </div>

        <!-- Navigation of other executions -->
        <div class="run-history-section" *ngIf="recentWorkflowInstances.length > 1">
          <h4 class="title-display text-cyan" style="font-size: 11px; text-transform: uppercase; margin-bottom: 6px;">
            <mat-icon style="font-size: 14px !important; width: 14px !important; height: 14px !important; vertical-align: middle; margin-right: 4px;">history</mat-icon>
            Recent Executions
          </h4>
          <div class="run-navigation-panel">
            <a *ngFor="let run of recentWorkflowInstances.slice(0, 5)"
               class="run-navigation-item"
               [class.active-run]="run.id === instanceId"
               [routerLink]="['/monitoring', run.id]"
               (click)="navigateToRun(run.id)">
              <span class="run-nav-id">#{{ run.id }}</span>
              <span class="status-chip" [ngClass]="run.status.toLowerCase()" style="font-size: 9px; padding: 1px 6px;">{{ run.status }}</span>
              <span class="run-nav-time">{{ run.startedAt | date:'HH:mm' }}</span>
            </a>
          </div>
          <div style="height: 16px;"></div>
        </div>

        <!-- Real-time console logs -->
        <div class="console-logs">
          <div class="console-title-row">
            <h4 class="title-display text-orange"><mat-icon>terminal</mat-icon> Live Logging Console</h4>
            <button class="btn-log-download" (click)="downloadLogs()" *ngIf="consoleLogs.length > 0" matTooltip="Download logs">
              <mat-icon>download</mat-icon>
            </button>
          </div>
          <div class="terminal-view">
            <div class="terminal-line" *ngFor="let logLine of consoleLogs" [ngClass]="getLogLevelClass(logLine.message)">
              <span class="term-time">[{{ logLine.timestamp }}]</span>
              <span class="term-msg">{{ logLine.message }}</span>
            </div>
            <div *ngIf="consoleLogs.length === 0" class="term-empty">
              Listening for pipeline state transitions...
            </div>
          </div>
        </div>
      </div>

      <!-- Center: Status Visual Canvas -->
      <div class="monitor-workspace designer-canvas canvas-container"
           [class.panning]="isPanning"
           (mousedown)="onCanvasMouseDown($event)"
           (mousemove)="onCanvasMouseMove($event)"
           (mouseup)="onCanvasMouseUp($event)"
           (mouseleave)="onCanvasMouseUp($event)">
        
        <!-- Viewport supporting Zoom & Pan -->
        <div class="canvas-viewport"
             [style.transform]="'translate(' + panX + 'px, ' + panY + 'px) scale(' + zoomLevel + ')'">
          
          <svg class="svg-connections">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569"/>
              </marker>
              <marker id="arrow-active" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#00E5A0"/>
              </marker>
            </defs>
            <!-- Connections layers -->
            <path *ngFor="let conn of connections" 
                  [attr.d]="getConnectionPath(conn)" 
                  [attr.stroke]="getConnectionStroke(conn)" 
                  [attr.stroke-dasharray]="getConnectionDash(conn)"
                  [class.flowing-connection]="isConnectionFlowing(conn)"
                  stroke-width="3.5" 
                  fill="none" 
                  [attr.marker-end]="getConnectionMarker(conn)"/>
          </svg>

          <!-- Canvas Node highlights -->
          <div class="node-box" 
               *ngFor="let node of nodes" 
               [style.left.px]="node.x" 
               [style.top.px]="node.y"
               [class.selected]="selectedTraceNode?.id === node.id"
               [ngClass]="getNodeStateClass(node.id)"
               (click)="selectNodeForInspect(node); $event.stopPropagation()">
            
            <div class="node-header" [ngClass]="node.type.toLowerCase() + '-header'">
              <mat-icon class="node-header-icon">{{ getNodeIcon(node.type) }}</mat-icon>
              <span class="node-title">{{ node.name }}</span>
              <span class="spacer"></span>
              <!-- Task state mini status badge -->
              <mat-icon class="state-mini-icon" [ngClass]="getNodeStateClass(node.id)">
                {{ getMiniStateIcon(node.id) }}
              </mat-icon>
            </div>

            <div class="node-body">
              <div class="node-body-row">
                <span class="task-state-label" [ngClass]="getNodeStateClass(node.id)">
                  {{ getTaskState(node.id) }}
                </span>
                <span class="task-retry" *ngIf="getTaskRetryCount(node.id) > 0">
                  Retry: {{ getTaskRetryCount(node.id) }}
                </span>
              </div>
              <span class="node-type-label">{{ node.type }}</span>
            </div>
          </div>
        </div>

        <!-- Floating Zoom / Canvas Controls -->
        <div class="canvas-controls">
          <button class="btn-control-tool" (click)="zoomIn()" matTooltip="Zoom In">
            <mat-icon>zoom_in</mat-icon>
          </button>
          <span class="zoom-factor-label">{{ getZoomPercent() }}%</span>
          <button class="btn-control-tool" (click)="zoomOut()" matTooltip="Zoom Out">
            <mat-icon>zoom_out</mat-icon>
          </button>
          <button class="btn-control-tool" (click)="resetZoom()" matTooltip="Fit Screen">
            <mat-icon>fullscreen_exit</mat-icon>
          </button>
        </div>
      </div>

      <!-- Right sidebar: inspector or variables outputs inspector -->
      <ng-container *ngIf="selectedTraceNode; else globalContextSidebar">
        <!-- Node specific inspector -->
        <div class="inspector-sidebar glass-panel">
          <div class="inspector-header">
            <div class="inspector-header-row">
              <h3 class="title-display text-cyan">Node Execution</h3>
              <button class="btn-icon" (click)="selectedTraceNode = null" matTooltip="Close inspector">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <span class="inspector-node-type">{{ selectedTraceNode.type }} • ID: {{ selectedTraceNode.id }}</span>
            <span class="font-bold" style="color: var(--text-primary);">{{ selectedTraceNode.name }}</span>
          </div>
          
          <div class="inspector-body">
            <!-- Metrics info -->
            <div>
              <h4 class="inspector-section-title">Execution State</h4>
              <div class="inspector-metrics-grid">
                <div class="metric-box">
                  <span class="metric-label">Status</span>
                  <span class="metric-value status-chip" [ngClass]="getTaskState(selectedTraceNode.id).toLowerCase()">
                    {{ getTaskState(selectedTraceNode.id) }}
                  </span>
                </div>
                <div class="metric-box">
                  <span class="metric-label">Duration</span>
                  <span class="metric-value">{{ getDuration(getTaskForNode(selectedTraceNode.id)) }}</span>
                </div>
              </div>
            </div>

            <!-- Timing and Retries -->
            <div *ngIf="getTaskForNode(selectedTraceNode.id) as task">
              <div class="inspector-metrics-grid">
                <div class="metric-box">
                  <span class="metric-label">Started At</span>
                  <span class="metric-value text-sm">{{ task.startedAt ? (task.startedAt | date:'HH:mm:ss') : '—' }}</span>
                </div>
                <div class="metric-box">
                  <span class="metric-label">Completed At</span>
                  <span class="metric-value text-sm">{{ task.completedAt ? (task.completedAt | date:'HH:mm:ss') : '—' }}</span>
                </div>
              </div>
              <div class="metric-box" style="margin-top: 12px;" *ngIf="task.retryCount > 0 || task.maxRetries > 0">
                <span class="metric-label">Retries</span>
                <span class="metric-value text-orange">{{ task.retryCount }} / {{ task.maxRetries }}</span>
              </div>
            </div>

            <!-- Failure Error Detail -->
            <div *ngIf="getTaskForNode(selectedTraceNode.id)?.errorMessage as errorMsg">
              <h4 class="inspector-section-title text-danger">Error Detail</h4>
              <div class="inspector-error-box">
                {{ errorMsg }}
              </div>
            </div>

            <!-- Task Inputs Json -->
            <div *ngIf="getTaskForNode(selectedTraceNode.id) as task">
              <h4 class="inspector-section-title">Task Inputs</h4>
              <div class="inspector-json-box">
                <pre class="inspector-json-pre">{{ getFormattedJson(task.inputJson) }}</pre>
              </div>
            </div>

            <!-- Task Outputs Json -->
            <div *ngIf="getTaskForNode(selectedTraceNode.id) as task">
              <h4 class="inspector-section-title">Task Outputs</h4>
              <div class="inspector-json-box">
                <pre class="inspector-json-pre">{{ getFormattedJson(task.outputJson) }}</pre>
              </div>
            </div>
          </div>
        </div>
      </ng-container>

      <ng-template #globalContextSidebar>
        <!-- Global Context Sidebar (Default) -->
        <div class="variables-sidebar glass-panel">
          <h3 class="title-display text-cyan"><mat-icon>data_object</mat-icon> Execution Context</h3>
          <p class="section-desc">Incremental updates merging throughout path execution</p>
          
          <div class="context-inspector">
            <pre class="json-code">{{ formattedContext }}</pre>
          </div>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .monitoring-container {
      display: flex;
      width: 100%;
      height: 100%;
      background-color: var(--bg-main);
      overflow: hidden;
      position: relative;
    }

    /* Monitor Sidebar */
    .monitor-sidebar {
      width: 330px;
      height: 100%;
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      padding: 24px;
      background: var(--bg-surface-opaque) !important;
      z-index: 5;
      flex-shrink: 0;
    }
    .sidebar-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    .sidebar-header h3 {
      font-size: 18px;
      font-weight: 700;
    }

    .instance-details {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 16px;
      background: rgba(148, 163, 184, 0.03);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      margin-bottom: 16px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }
    .detail-label {
      color: var(--text-secondary);
      font-weight: 500;
    }
    .detail-val {
      font-weight: 700;
      color: var(--text-primary);
    }
    .danger-desc {
      color: var(--danger);
      font-size: 11px;
      max-width: 160px;
      word-break: break-all;
      text-align: right;
    }

    .run-controls {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 20px;
    }
    .btn-ctrl {
      width: 100%;
      height: 40px;
      border-radius: 10px;
      font-weight: 600;
      font-family: var(--font-body);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: white;
      transition: all var(--transition-fast);
      box-shadow: var(--shadow-sm);
    }
    .btn-ctrl mat-icon {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
      color: white !important;
    }
    .btn-pause { background: linear-gradient(135deg, var(--warning), var(--warning-glow)); }
    .btn-pause:hover { transform: translateY(-1px); box-shadow: 0 4px 12px var(--warning-glow); }
    .btn-resume { background: linear-gradient(135deg, var(--success), var(--success-glow)); }
    .btn-resume:hover { transform: translateY(-1px); box-shadow: 0 4px 12px var(--success-glow); }
    .btn-cancel { background: linear-gradient(135deg, var(--danger), var(--danger-glow)); }
    .btn-cancel:hover { transform: translateY(-1px); box-shadow: 0 4px 12px var(--danger-glow); }
    .btn-retrigger { background: linear-gradient(135deg, var(--primary), var(--primary-glow)); }
    .btn-retrigger:hover { transform: translateY(-1px); box-shadow: 0 4px 12px var(--primary-glow); }

    .console-logs {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 200px;
      overflow: hidden;
    }
    .console-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .console-logs h4 {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
    }
    .console-logs h4 mat-icon {
      color: var(--accent) !important;
    }
    .btn-log-download {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 4px;
      border-radius: 4px;
      transition: all var(--transition-fast);
    }
    .btn-log-download:hover {
      color: var(--primary);
      background: var(--primary-subtle);
    }
    .btn-log-download mat-icon {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
    }

    .terminal-view {
      flex: 1;
      background: #01040a;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 14px;
      font-family: var(--font-mono);
      font-size: 11px;
      color: #8892b0;
      overflow-y: auto;
      line-height: 1.5;
      box-shadow: inset 0 0 10px rgba(0,0,0,0.8);
    }
    .terminal-line {
      margin-bottom: 6px;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .term-time {
      color: #475569;
      margin-right: 6px;
    }
    .term-empty {
      color: #334155;
      font-style: italic;
    }
    
    /* Log level styles */
    .log-error { color: var(--danger); }
    .log-warn { color: var(--warning); }
    .log-success { color: var(--success); }

    /* Canvas monitoring */
    .monitor-workspace {
      flex: 1;
      height: 100%;
      position: relative;
      overflow: hidden;
    }
    .svg-connections {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
    }

    .flowing-connection {
      stroke-dasharray: 8, 8;
      animation: data-flow 1.5s linear infinite;
    }

    .node-box {
      position: absolute;
      width: 220px;
      border-radius: 12px;
      background: var(--bg-card);
      border: 2px solid var(--border-color);
      box-shadow: var(--shadow-sm);
      z-index: 3;
      user-select: none;
      transition: all var(--transition-base);
    }
    
    /* Node states */
    .node-box.running {
      border-color: var(--primary);
      box-shadow: 0 0 16px var(--primary-glow);
      animation: border-flow 2s infinite ease-in-out;
    }
    .node-box.completed {
      border-color: var(--success);
      box-shadow: 0 0 12px rgba(0, 229, 160, 0.15);
    }
    .node-box.failed, .node-box.dlq {
      border-color: var(--danger);
      box-shadow: 0 0 16px var(--danger-glow);
    }

    .node-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-top-left-radius: 10px;
      border-top-right-radius: 10px;
      color: white;
      font-weight: 700;
      font-size: 12px;
    }
    .start-header { background: linear-gradient(135deg, #7C3AED, #5B21B6); }
    .http-header { background: #10B981; }
    .ssh-header { background: #3B82F6; }
    .script-header { background: #F59E0B; }
    .switch-header { background: #EC4899; }
    .end-header { background: #EF4444; }

    .node-header-icon {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
      color: white !important;
    }
    .node-title {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 120px;
    }

    .state-mini-icon {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
    }
    .state-mini-icon.completed { color: var(--success) !important; }
    .state-mini-icon.running { color: var(--primary) !important; animation: spin 2s infinite linear; }
    .state-mini-icon.failed, .state-mini-icon.dlq { color: var(--danger) !important; }

    .node-body {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      background: rgba(2, 8, 23, 0.4);
      border-bottom-left-radius: 10px;
      border-bottom-right-radius: 10px;
    }
    .node-body-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .task-state-label {
      font-weight: 700;
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: 0.05em;
    }
    .task-state-label.completed { color: var(--success); }
    .task-state-label.running { color: var(--primary); }
    .task-state-label.failed, .task-state-label.dlq { color: var(--danger); }
    .task-state-label.pending { color: var(--text-secondary); }

    .node-type-label {
      font-size: 8px;
      color: var(--text-secondary);
      text-transform: uppercase;
      font-weight: 500;
    }
    .task-retry {
      color: var(--warning);
      font-size: 9px;
      font-weight: 700;
    }

    /* Variables Sidebar */
    .variables-sidebar {
      width: 320px;
      height: 100%;
      border-left: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      padding: 24px;
      background: var(--bg-surface-opaque) !important;
      z-index: 5;
      flex-shrink: 0;
    }
    .variables-sidebar h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      margin-bottom: 4px;
    }
    .variables-sidebar h3 mat-icon {
      color: var(--primary) !important;
    }
    .context-inspector {
      flex: 1;
      background: #01040a;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 16px;
      overflow-y: auto;
      box-shadow: inset 0 0 10px rgba(0,0,0,0.8);
      margin-top: 12px;
    }
    .json-code {
      font-family: var(--font-mono);
      font-size: 12px;
      color: #CBD5E1;
      margin: 0;
      white-space: pre-wrap;
    }
  `]
})
export class MonitoringComponent implements OnInit, OnDestroy {
  instanceId!: number;
  instance: any = null;
  tasks: any[] = [];
  
  nodes: RenderNode[] = [];
  connections: RenderConnection[] = [];
  
  consoleLogs: any[] = [];
  formattedContext = '{}';

  // Zoom and Pan states
  zoomLevel = 1.0;
  panX = 0;
  panY = 0;
  isPanning = false;
  panStartX = 0;
  panStartY = 0;

  // Clicking inspectors
  selectedTraceNode: any = null;
  recentWorkflowInstances: any[] = [];

  private wsClient: WebSocket | null = null;

  constructor(
    private apiService: ApiService,
    private notif: NotificationService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.instanceId = +this.route.snapshot.paramMap.get('id')!;
    this.loadInitialTrace();
  }

  ngOnDestroy() {
    if (this.wsClient) {
      this.wsClient.close();
    }
  }

  loadInitialTrace() {
    this.apiService.getInstanceDetails(this.instanceId).subscribe({
      next: (data: any) => {
        this.instance = data.instance;
        this.tasks = data.tasks;
        this.formattedContext = JSON.stringify(JSON.parse(this.instance.contextJson), null, 2);

        this.apiService.getWorkflowById(this.instance.workflowId).subscribe({
          next: w => {
            try {
              const def = JSON.parse(w.definitionJson);
              this.nodes = def.nodes.map((n: any) => ({
                id: n.id,
                name: n.name,
                type: n.type,
                x: n.position ? n.position.x : 100,
                y: n.position ? n.position.y : 100
              }));
              this.connections = def.connections || [];
            } catch (e) {
              console.error('Failed to parse graph nodes', e);
            }
          }
        });

        // Load other run executions
        this.apiService.getInstances().subscribe({
          next: list => {
            this.recentWorkflowInstances = list
              .filter(i => i.workflowId === this.instance.workflowId)
              .sort((a, b) => b.id - a.id);
          }
        });

        this.bindWebSocket();
        this.loadAuditLogs();
      },
      error: () => {
        this.notif.error('Failed to load instance trace');
        this.router.navigate(['/dashboard']);
      }
    });
  }

  navigateToRun(runId: number) {
    this.instanceId = runId;
    if (this.wsClient) {
      this.wsClient.close();
    }
    this.selectedTraceNode = null;
    this.loadInitialTrace();
  }

  loadAuditLogs() {
    this.apiService.getInstanceLogs(this.instanceId).subscribe({
      next: data => {
        this.consoleLogs = data.map(item => ({
          timestamp: new Date(item.timestamp).toLocaleTimeString(),
          message: item.details
        })).reverse();
      }
    });
  }

  bindWebSocket() {
    this.wsClient = this.apiService.connectToWebSocket(this.instanceId, (update: any) => {
      if (update.status) {
        this.instance.status = update.status;
      }
      if (update.tasks) {
        this.tasks = update.tasks;
      }
      
      const newLog = {
        timestamp: new Date().toLocaleTimeString(),
        message: update.message
      };
      this.consoleLogs.push(newLog);

      this.apiService.getInstanceDetails(this.instanceId).subscribe({
        next: data => {
          this.instance = data.instance;
          this.formattedContext = JSON.stringify(JSON.parse(this.instance.contextJson), null, 2);
        }
      });
    });
  }

  // ── Node Inspector helper methods ────────────────────────────────
  selectNodeForInspect(node: any) {
    this.selectedTraceNode = node;
  }

  getTaskForNode(nodeId: string): any {
    return this.tasks.find(t => t.nodeId === nodeId);
  }

  getDuration(task: any): string {
    if (!task || !task.startedAt) return '—';
    const start = new Date(task.startedAt).getTime();
    const end = task.completedAt ? new Date(task.completedAt).getTime() : Date.now();
    const diff = end - start;
    if (diff < 1000) return `${diff}ms`;
    return `${(diff / 1000).toFixed(1)}s`;
  }

  getFormattedJson(jsonStr: string): string {
    if (!jsonStr) return '{}';
    try {
      return JSON.stringify(JSON.parse(jsonStr), null, 2);
    } catch {
      return jsonStr;
    }
  }

  // ── Zoom & Pan Controls ─────────────────────────────────────────
  zoomIn() {
    this.zoomLevel = Math.min(2.0, this.zoomLevel + 0.15);
  }

  zoomOut() {
    this.zoomLevel = Math.max(0.4, this.zoomLevel - 0.15);
  }

  resetZoom() {
    this.zoomLevel = 1.0;
    this.panX = 0;
    this.panY = 0;
  }

  getZoomPercent(): number {
    return Math.round(this.zoomLevel * 100);
  }

  onCanvasMouseDown(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.classList.contains('canvas-container') || target.classList.contains('canvas-workspace') || target.tagName.toLowerCase() === 'svg') {
      this.isPanning = true;
      this.panStartX = event.clientX - this.panX;
      this.panStartY = event.clientY - this.panY;
      event.preventDefault();
    }
  }

  onCanvasMouseMove(event: MouseEvent) {
    if (this.isPanning) {
      this.panX = event.clientX - this.panStartX;
      this.panY = event.clientY - this.panStartY;
    }
  }

  onCanvasMouseUp(event?: MouseEvent) {
    this.isPanning = false;
  }

  // ── Standard status and layout handlers ──────────────────────────
  getLogLevelClass(msg: string): string {
    const text = msg.toLowerCase();
    if (text.includes('error') || text.includes('fail') || text.includes('invalid')) return 'log-error';
    if (text.includes('warn') || text.includes('retry')) return 'log-warn';
    if (text.includes('success') || text.includes('completed') || text.includes('started')) return 'log-success';
    return '';
  }

  getTaskState(nodeId: string): string {
    const match = this.tasks.find(t => t.nodeId === nodeId);
    return match ? match.status : 'PENDING';
  }

  getNodeStateClass(nodeId: string): string {
    return this.getTaskState(nodeId).toLowerCase();
  }

  getTaskRetryCount(nodeId: string): number {
    const match = this.tasks.find(t => t.nodeId === nodeId);
    return match ? match.retryCount : 0;
  }

  getMiniStateIcon(nodeId: string): string {
    const state = this.getTaskState(nodeId);
    switch (state) {
      case 'COMPLETED': return 'check_circle';
      case 'RUNNING': return 'autorenew';
      case 'FAILED':
      case 'DLQ': return 'error';
      default: return 'radio_button_unchecked';
    }
  }

  getNodeIcon(type: string): string {
    switch (type.toUpperCase()) {
      case 'START': return 'play_circle';
      case 'END': return 'stop_circle';
      case 'HTTP': return 'language';
      case 'SSH': return 'terminal';
      case 'SCRIPT': return 'code';
      case 'SWITCH': return 'alt_route';
      default: return 'help_outline';
    }
  }

  getConnectionPath(conn: RenderConnection): string {
    const from = this.nodes.find(n => n.id === conn.fromNodeId);
    const to = this.nodes.find(n => n.id === conn.toNodeId);
    if (!from || !to) return '';

    const nodeWidth = 220;
    const nodeHeight = 50;

    let x1 = from.x + nodeWidth;
    let y1 = from.y + (nodeHeight / 2);

    if (from.type === 'SWITCH') {
      if (conn.fromPort === 'true') {
        y1 = from.y + (nodeHeight * 0.3);
      } else if (conn.fromPort === 'false') {
        y1 = from.y + (nodeHeight * 0.7);
      }
    }

    const x2 = to.x;
    const y2 = to.y + (nodeHeight / 2);

    const dx = Math.abs(x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  }

  getConnectionStroke(conn: RenderConnection): string {
    const state = this.getTaskState(conn.fromNodeId);
    return state === 'COMPLETED' ? '#00E5A0' : '#334155';
  }

  getConnectionDash(conn: RenderConnection): string {
    const state = this.getTaskState(conn.fromNodeId);
    return state === 'RUNNING' ? '5,5' : 'none';
  }

  isConnectionFlowing(conn: RenderConnection): boolean {
    return this.getTaskState(conn.fromNodeId) === 'RUNNING';
  }

  getConnectionMarker(conn: RenderConnection): string {
    const state = this.getTaskState(conn.fromNodeId);
    return state === 'COMPLETED' ? 'url(#arrow-active)' : 'url(#arrow)';
  }

  pauseInstance() {
    this.apiService.pauseInstance(this.instanceId).subscribe({
      next: () => {
        this.notif.info('Pausing execution...');
        this.loadAuditLogs();
      },
      error: () => this.notif.error('Failed to pause instance')
    });
  }

  resumeInstance() {
    this.apiService.resumeInstance(this.instanceId).subscribe({
      next: () => {
        this.notif.success('Resuming execution...');
        this.loadAuditLogs();
      },
      error: () => this.notif.error('Failed to resume instance')
    });
  }

  cancelInstance() {
    this.apiService.cancelInstance(this.instanceId).subscribe({
      next: () => {
        this.notif.warning('Cancelling execution...');
        this.loadAuditLogs();
      },
      error: () => this.notif.error('Failed to cancel instance')
    });
  }

  retriggerWorkflow() {
    if (!this.instance) return;
    this.apiService.triggerWorkflow(this.instance.workflowId, JSON.parse(this.instance.contextJson)).subscribe({
      next: res => {
        this.notif.success('Workflow re-triggered! Redirecting to new run...');
        this.router.navigate(['/monitoring', res.instanceId]).then(() => {
          this.instanceId = res.instanceId;
          this.loadInitialTrace();
        });
      },
      error: () => this.notif.error('Failed to re-trigger workflow')
    });
  }

  downloadLogs() {
    const logsText = this.consoleLogs.map(l => `[${l.timestamp}] ${l.message}`).join('\n');
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `floworchestra-run-${this.instanceId}.log`;
    a.click();
    window.URL.revokeObjectURL(url);
    this.notif.success('Logs download started');
  }
}

