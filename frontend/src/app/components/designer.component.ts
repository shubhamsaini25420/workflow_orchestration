import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { NotificationService } from '../services/notification.service';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

interface CanvasNode {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  properties: any;
}

interface CanvasConnection {
  fromNodeId: string;
  toNodeId: string;
  fromPort: string;
  toPort: string;
}

@Component({
  selector: 'app-designer',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="designer-container animate-fade-in">
      <!-- Left sidebar: Node palettes -->
      <div class="palette-sidebar glass-panel">
        <div class="sidebar-header-section">
          <h3 class="title-display text-cyan">Node Palette</h3>
          <p class="section-desc">Click or drag a node to add it to the canvas workspace.</p>
        </div>

        <!-- Search input -->
        <div class="search-wrapper">
          <mat-icon>search</mat-icon>
          <input class="search-input" type="text" placeholder="Search nodes..." [(ngModel)]="searchTerm">
        </div>
        
        <div class="palette-items">
          <!-- Triggers Category -->
          <div *ngIf="showCategory('Trigger')" class="palette-section-title">
            <mat-icon style="font-size: 14px !important; width: 14px !important; height: 14px !important;">play_arrow</mat-icon>
            <span>Triggers</span>
          </div>
          <div *ngIf="showPaletteItem('START')" class="palette-item" (click)="addNode('START')" draggable="true" (dragstart)="onDragStart($event, 'START')">
            <div class="palette-icon-wrap start-bg" style="background: linear-gradient(135deg, #7C3AED, #5B21B6);">
              <mat-icon>play_circle</mat-icon>
            </div>
            <div class="palette-info">
              <span class="palette-name">Start Pipeline</span>
              <span class="palette-desc">Entry point of execution</span>
            </div>
          </div>

          <!-- Actions Category -->
          <div *ngIf="showCategory('Action')" class="palette-section-title">
            <mat-icon style="font-size: 14px !important; width: 14px !important; height: 14px !important;">bolt</mat-icon>
            <span>Actions</span>
          </div>
          <div *ngIf="showPaletteItem('HTTP')" class="palette-item" (click)="addNode('HTTP')" draggable="true" (dragstart)="onDragStart($event, 'HTTP')">
            <div class="palette-icon-wrap http-bg">
              <mat-icon>language</mat-icon>
            </div>
            <div class="palette-info">
              <span class="palette-name">HTTP Request</span>
              <span class="palette-desc">Send REST API requests</span>
            </div>
          </div>
          <div *ngIf="showPaletteItem('SSH')" class="palette-item" (click)="addNode('SSH')" draggable="true" (dragstart)="onDragStart($event, 'SSH')">
            <div class="palette-icon-wrap ssh-bg">
              <mat-icon>terminal</mat-icon>
            </div>
            <div class="palette-info">
              <span class="palette-name">SSH Executor</span>
              <span class="palette-desc">Run commands on remote hosts</span>
            </div>
          </div>
          <div *ngIf="showPaletteItem('SCRIPT')" class="palette-item" (click)="addNode('SCRIPT')" draggable="true" (dragstart)="onDragStart($event, 'SCRIPT')">
            <div class="palette-icon-wrap script-bg">
              <mat-icon>code</mat-icon>
            </div>
            <div class="palette-info">
              <span class="palette-name">Script Node</span>
              <span class="palette-desc">Evaluate SpEL expressions</span>
            </div>
          </div>
          <div *ngIf="showPaletteItem('AI')" class="palette-item" (click)="addNode('AI')" draggable="true" (dragstart)="onDragStart($event, 'AI')">
            <div class="palette-icon-wrap ai-bg" style="background: linear-gradient(135deg, #A855F7, #7E22CE);">
              <mat-icon>psychology</mat-icon>
            </div>
            <div class="palette-info">
              <span class="palette-name">AI Prompt</span>
              <span class="palette-desc">Execute LLM prompt queries</span>
            </div>
          </div>

          <!-- Logic Category -->
          <div *ngIf="showCategory('Logic')" class="palette-section-title">
            <mat-icon style="font-size: 14px !important; width: 14px !important; height: 14px !important;">alt_route</mat-icon>
            <span>Logic</span>
          </div>
          <div *ngIf="showPaletteItem('SWITCH')" class="palette-item" (click)="addNode('SWITCH')" draggable="true" (dragstart)="onDragStart($event, 'SWITCH')">
            <div class="palette-icon-wrap switch-bg">
              <mat-icon>alt_route</mat-icon>
            </div>
            <div class="palette-info">
              <span class="palette-name">Condition Switch</span>
              <span class="palette-desc">Branch execution path</span>
            </div>
          </div>

          <!-- Terminators Category -->
          <div *ngIf="showCategory('Terminator')" class="palette-section-title">
            <mat-icon style="font-size: 14px !important; width: 14px !important; height: 14px !important;">stop</mat-icon>
            <span>Terminators</span>
          </div>
          <div *ngIf="showPaletteItem('END')" class="palette-item" (click)="addNode('END')" draggable="true" (dragstart)="onDragStart($event, 'END')">
            <div class="palette-icon-wrap end-bg">
              <mat-icon>stop_circle</mat-icon>
            </div>
            <div class="palette-info">
              <span class="palette-name">End Workflow</span>
              <span class="palette-desc">Stop pipeline execution</span>
            </div>
          </div>
        </div>

        <div class="pipeline-details">
          <h4 class="title-display text-orange">Pipeline Metadata</h4>
          <div class="field-group">
            <label class="field-label">Name</label>
            <input class="field-input" [(ngModel)]="workflowName" placeholder="e.g. User Billing Pipeline" id="wf-name-field">
          </div>
          <div class="field-group">
            <label class="field-label">Description</label>
            <textarea class="field-textarea" [(ngModel)]="workflowDesc" placeholder="Describe this workflow..." rows="3"></textarea>
          </div>

          <button class="btn-primary full-width" (click)="saveWorkflow()" id="wf-save-btn">
            <mat-icon>save</mat-icon> Save Template
          </button>
        </div>
      </div>

      <!-- Center: Workspace Canvas Container -->
      <div class="canvas-workspace designer-canvas canvas-container"
           [class.panning]="isPanning"
           #canvasEl
           (mousedown)="onCanvasMouseDown($event)"
           (mousemove)="onCanvasMouseMove($event)"
           (mouseup)="onCanvasMouseUp($event)"
           (mouseleave)="onCanvasMouseUp($event)"
           (dragover)="onDragOver($event)"
           (drop)="onDrop($event)">
        
        <!-- Canvas Viewport applying Zoom & Pan -->
        <div class="canvas-viewport" 
             [style.transform]="'translate(' + panX + 'px, ' + panY + 'px) scale(' + zoomLevel + ')'">
          
          <!-- SVG Connections layer -->
          <svg class="svg-connections">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--primary, #94A3B8)"/>
              </marker>
            </defs>
            <!-- Live wire while dragging a port connection -->
            <path *ngIf="liveWire" [attr.d]="liveWire"
                  stroke="var(--primary, #94A3B8)" stroke-width="2.5" fill="none"
                  stroke-dasharray="6 4" opacity="0.8"/>
            <g *ngFor="let conn of connections; let i = index">
              <!-- Draw connection path -->
              <path [attr.d]="getConnectionPath(conn)" 
                    stroke="var(--primary, #94A3B8)" 
                    stroke-width="3" 
                    fill="none" 
                    marker-end="url(#arrow)"/>
              <!-- Delete connection link button -->
              <circle [attr.cx]="getConnectionMidPoint(conn).x" 
                      [attr.cy]="getConnectionMidPoint(conn).y" 
                      r="10" 
                      fill="#FF4572" 
                      class="btn-del-conn" 
                      (click)="deleteConnection(i)"
                      matTooltip="Delete connection"/>
              <text [attr.x]="getConnectionMidPoint(conn).x"
                    [attr.y]="getConnectionMidPoint(conn).y + 4"
                    fill="white"
                    font-size="10px"
                    font-weight="bold"
                    text-anchor="middle"
                    pointer-events="none">×</text>
            </g>
          </svg>

          <!-- Canvas Node Boxes -->
          <div class="node-box" 
               *ngFor="let node of nodes" 
               [style.left.px]="node.x" 
               [style.top.px]="node.y"
               [class.selected]="selectedNode?.id === node.id"
               [class.validation-warning]="getNodeWarnings(node).length > 0"
               (mousedown)="onNodeMouseDown($event, node)">
            
            <!-- Warning Badge -->
            <div class="validation-badge" 
                 *ngIf="getNodeWarnings(node).length > 0"
                 [matTooltip]="getNodeWarnings(node).join('\n')">
              <mat-icon>warning</mat-icon>
            </div>
            
            <div class="node-header" [ngClass]="node.type.toLowerCase() + '-header'">
              <mat-icon class="node-header-icon">{{ getNodeIcon(node.type) }}</mat-icon>
              <span class="node-title">{{ node.name }}</span>
              <span class="spacer"></span>
              <button class="btn-node-del" *ngIf="node.type !== 'START'" (click)="deleteNode(node.id); $event.stopPropagation()" matTooltip="Delete Node">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="node-preview">
              <span class="node-type-label">{{ node.type }}</span>
              <span class="node-desc-preview" *ngIf="node.type === 'HTTP'">{{ node.properties.method }} {{ node.properties.url || 'No URL' }}</span>
              <span class="node-desc-preview" *ngIf="node.type === 'SSH'">{{ node.properties.host || 'No Host' }}</span>
              <span class="node-desc-preview" *ngIf="node.type === 'SCRIPT'">{{ node.properties.script || 'No Script' }}</span>
              <span class="node-desc-preview" *ngIf="node.type === 'AI'">{{ node.properties.model || 'gpt-4o' }}: {{ node.properties.prompt || 'No Prompt' }}</span>
              <span class="node-desc-preview" *ngIf="node.type === 'SWITCH'">{{ node.properties.condition || 'No Condition' }}</span>
              <span class="node-desc-preview" *ngIf="node.type === 'START'">Entry point of run</span>
              <span class="node-desc-preview" *ngIf="node.type === 'END'">Execution halts</span>
            </div>

            <!-- Port Handles -->
            <div class="port port-in" 
                 *ngIf="node.type !== 'START'" 
                 [class.active-target]="linkingFromNodeId && linkingFromType === 'out' && linkingFromNodeId !== node.id"
                 (mousedown)="onPortMouseDown($event, node.id, 'in', 'in')"
                 (mouseup)="onPortMouseUp($event, node.id, 'in', 'in')"></div>

            <!-- Port Outs -->
            <ng-container *ngIf="node.type === 'SWITCH'; else defaultPort">
              <div class="port port-out switch-port-true"
                   [class.active-target]="linkingFromNodeId && linkingFromType === 'in' && linkingFromNodeId !== node.id"
                   (mousedown)="onPortMouseDown($event, node.id, 'true', 'out')"
                   (mouseup)="onPortMouseUp($event, node.id, 'true', 'out')"
                   matTooltip="True branch">T</div>
              <div class="port port-out switch-port-false"
                   [class.active-target]="linkingFromNodeId && linkingFromType === 'in' && linkingFromNodeId !== node.id"
                   (mousedown)="onPortMouseDown($event, node.id, 'false', 'out')"
                   (mouseup)="onPortMouseUp($event, node.id, 'false', 'out')"
                   matTooltip="False branch">F</div>
            </ng-container>
            <ng-template #defaultPort>
              <div class="port port-out"
                   *ngIf="node.type !== 'END'"
                   [class.active-target]="linkingFromNodeId && linkingFromType === 'in' && linkingFromNodeId !== node.id"
                   (mousedown)="onPortMouseDown($event, node.id, 'default', 'out')"
                   (mouseup)="onPortMouseUp($event, node.id, 'default', 'out')"
                   matTooltip="Drag connection"></div>
            </ng-template>
          </div>

          <div *ngIf="nodes.length === 0" class="canvas-hint">
            <mat-icon>touch_app</mat-icon>
            <p>Drag nodes from the Palette or click them to start building.</p>
          </div>
        </div>

        <!-- Floating Zoom / Grid Controls -->
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
          <div style="width: 1px; height: 16px; background: rgba(255, 255, 255, 0.1); margin: 0 4px;"></div>
          <button class="btn-control-tool" 
                  [class.active]="snapToGrid" 
                  (click)="snapToGrid = !snapToGrid" 
                  [matTooltip]="snapToGrid ? 'Disable Grid Snapping' : 'Enable Grid Snapping'">
            <mat-icon>grid_on</mat-icon>
          </button>
        </div>
      </div>

      <!-- Right sidebar: Configurations panel -->
      <div class="config-sidebar glass-panel" *ngIf="selectedNode">
        <div class="sidebar-header-section border-bottom">
          <h3 class="title-display text-cyan">Configure Node</h3>
          <span class="node-id-badge">{{ selectedNode.id }}</span>
        </div>
        
        <div class="config-fields">
          <div class="field-group">
            <label class="field-label">Node Display Name</label>
            <input class="field-input" [(ngModel)]="selectedNode.name" placeholder="Rename node">
          </div>

          <!-- HTTP Request configurations -->
          <div *ngIf="selectedNode.type === 'HTTP'" class="custom-fields">
            <div class="field-group">
              <label class="field-label">HTTP Method</label>
              <select class="field-select" [(ngModel)]="selectedNode.properties.method">
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div class="field-group">
              <label class="field-label">API URL</label>
              <input class="field-input" [(ngModel)]="selectedNode.properties.url" placeholder="https://api.example.com/data">
            </div>
            <div class="field-group">
              <label class="field-label">JSON Request Body</label>
              <textarea class="field-textarea" [(ngModel)]="selectedNode.properties.body" placeholder='{ "key": "value" }' rows="4"></textarea>
            </div>
          </div>

          <!-- SSH command configurations -->
          <div *ngIf="selectedNode.type === 'SSH'" class="custom-fields">
            <div class="field-group">
              <label class="field-label">Target Host IP / Domain</label>
              <input class="field-input" [(ngModel)]="selectedNode.properties.host" placeholder="192.168.1.100">
            </div>
            <div class="field-group">
              <label class="field-label">Username</label>
              <input class="field-input" [(ngModel)]="selectedNode.properties.username" placeholder="ubuntu">
            </div>
            <div class="field-group">
              <label class="field-label">SSH Command</label>
              <input class="field-input" [(ngModel)]="selectedNode.properties.command" placeholder="ls -la">
            </div>
          </div>

          <!-- Script Configurations -->
          <div *ngIf="selectedNode.type === 'SCRIPT'" class="custom-fields">
            <div class="field-group">
              <label class="field-label">SpEL Expression</label>
              <input class="field-input" [(ngModel)]="selectedNode.properties.script" placeholder="#price * #qty">
            </div>
            <div class="field-group">
              <label class="field-label">Result Key</label>
              <input class="field-input" [(ngModel)]="selectedNode.properties.resultKey" placeholder="totalCost">
            </div>
          </div>

          <!-- AI Prompt configurations -->
          <div *ngIf="selectedNode.type === 'AI'" class="custom-fields">
            <div class="field-group">
              <label class="field-label">AI Model</label>
              <select class="field-select" [(ngModel)]="selectedNode.properties.model">
                <option value="gpt-4o">GPT-4o (OpenAI)</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="claude-3-opus">Claude 3 Opus</option>
              </select>
            </div>
            <div class="field-group">
              <label class="field-label">Prompt Template</label>
              <textarea class="field-textarea" [(ngModel)]="selectedNode.properties.prompt" placeholder="Summarize this: \${total}" rows="4"></textarea>
            </div>
            <div class="field-group">
              <label class="field-label">Temperature (0.0 - 1.0)</label>
              <input class="field-input" type="number" [(ngModel)]="selectedNode.properties.temperature" step="0.1" min="0" max="1">
            </div>
            <div class="field-group">
              <label class="field-label">Result Variable Key</label>
              <input class="field-input" [(ngModel)]="selectedNode.properties.resultKey" placeholder="aiResponse">
            </div>
          </div>

          <!-- Conditional Switch configurations -->
          <div *ngIf="selectedNode.type === 'SWITCH'" class="custom-fields">
            <div class="field-group">
              <label class="field-label">SpEL Logic Condition</label>
              <input class="field-input" [(ngModel)]="selectedNode.properties.condition" placeholder="#totalCost > 500">
            </div>
          </div>

          <!-- Standard fields for task executions -->
          <div class="field-group" *ngIf="selectedNode.type !== 'START' && selectedNode.type !== 'END'">
            <label class="field-label">Max Retries</label>
            <input class="field-input" type="number" [(ngModel)]="selectedNode.properties.maxRetries" min="0" max="10">
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .designer-container {
      display: flex;
      width: 100%;
      height: 100%;
      background-color: var(--bg-main);
      overflow: hidden;
      position: relative;
    }

    /* Palette Sidebar */
    .palette-sidebar {
      width: 290px;
      height: 100%;
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      padding: 24px;
      background: var(--bg-surface-opaque) !important;
      z-index: 5;
      flex-shrink: 0;
    }
    .sidebar-header-section {
      margin-bottom: 12px;
    }
    .sidebar-header-section.border-bottom {
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-desc {
      font-size: 12px;
      color: var(--text-secondary);
      margin-top: 4px;
      line-height: 1.4;
    }

    .palette-items {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 24px;
      overflow-y: auto;
      flex: 1;
      padding-right: 4px;
    }
    .palette-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      cursor: grab;
      transition: all var(--transition-fast);
      background: rgba(255, 255, 255, 0.01);
    }
    .palette-item:hover {
      background: var(--primary-subtle);
      border-color: var(--primary);
      transform: translateX(2px);
    }
    .palette-item:active {
      cursor: grabbing;
    }
    .palette-icon-wrap {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .palette-icon-wrap mat-icon {
      color: white !important;
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
    }
    .http-bg { background: #10B981; }
    .ssh-bg { background: #3B82F6; }
    .script-bg { background: #F59E0B; }
    .switch-bg { background: #EC4899; }
    .end-bg { background: #EF4444; }

    .palette-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .palette-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .palette-desc {
      font-size: 10px;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .pipeline-details {
      border-top: 1px solid var(--border-color);
      padding-top: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .pipeline-details h4 {
      font-size: 14px;
      font-weight: 600;
    }

    .full-width { width: 100%; }

    /* Canvas Workspace */
    .canvas-workspace {
      flex: 1;
      height: 100%;
      position: relative;
      overflow: hidden;
      user-select: none;
    }
    .svg-connections {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
      pointer-events: all;
    }
    .btn-del-conn {
      cursor: pointer;
      transition: r var(--transition-fast);
    }
    .btn-del-conn:hover {
      r: 12;
    }

    /* Node Boxes */
    .node-box {
      position: absolute;
      width: 220px;
      border-radius: 12px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-sm);
      cursor: move;
      z-index: 3;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
      overflow: visible;
    }
    .node-box.selected {
      border-color: var(--primary);
      box-shadow: 0 0 16px var(--primary-glow);
    }
    .node-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-top-left-radius: 11px;
      border-top-right-radius: 11px;
      color: white;
      font-weight: 700;
      font-size: 12px;
    }
    .start-header { background: linear-gradient(135deg, #7C3AED, #5B21B6); }
    .http-header { background: #10B981; }
    .ssh-header { background: #3B82F6; }
    .script-header { background: #F59E0B; }
    .ai-header { background: linear-gradient(135deg, #A855F7, #7E22CE); }
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
    .btn-node-del {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.7);
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 0;
      transition: color var(--transition-fast);
    }
    .btn-node-del:hover {
      color: white;
    }
    .btn-node-del mat-icon {
      font-size: 14px !important;
      width: 14px !important;
      height: 14px !important;
    }

    .node-preview {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      background: rgba(2, 8, 23, 0.4);
      border-bottom-left-radius: 11px;
      border-bottom-right-radius: 11px;
    }
    .node-type-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-secondary);
      letter-spacing: 0.05em;
    }
    .node-desc-preview {
      font-size: 11px;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Port Handles */
    .port {
      position: absolute;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--primary);
      border: 3px solid var(--bg-main);
      cursor: cell;
      z-index: 10;
      transition: all var(--transition-fast);
    }
    .port:hover {
      transform: scale(1.8);
      box-shadow: 0 0 12px var(--primary-glow);
    }
    .port.active-target {
      transform: scale(1.6);
      background: var(--primary-light);
      box-shadow: 0 0 12px var(--primary-glow);
      border-color: var(--primary-dark);
    }
    .port-in {
      left: -7px;
      top: 50%;
      margin-top: -7px;
    }
    .port-out {
      right: -7px;
      top: 50%;
      margin-top: -7px;
    }
    .switch-port-true {
      right: -7px;
      top: 30%;
      margin-top: -7px;
      background: #10B981;
      font-size: 8px;
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      font-weight: 900;
      border-color: var(--bg-main);
    }
    .switch-port-false {
      right: -7px;
      top: 70%;
      margin-top: -7px;
      background: #EF4444;
      font-size: 8px;
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      font-weight: 900;
      border-color: var(--bg-main);
    }

    .canvas-hint {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: var(--text-secondary);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      z-index: 0;
      pointer-events: none;
    }
    .canvas-hint mat-icon {
      font-size: 48px !important;
      width: 48px !important;
      height: 48px !important;
      opacity: 0.3;
    }

    /* Configuration Sidebar */
    .config-sidebar {
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
    .node-id-badge {
      font-family: var(--font-mono);
      font-size: 11px;
      background: rgba(148, 163, 184, 0.1);
      color: var(--primary);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .config-fields {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 16px;
      overflow-y: auto;
      flex: 1;
    }
    .custom-fields {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
  `]
})
export class DesignerComponent implements OnInit {
  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLDivElement>;

  workflowId: number | null = null;
  workflowName = '';
  workflowDesc = '';

  nodes: CanvasNode[] = [];
  connections: CanvasConnection[] = [];

  // Canvas zoom and pan states
  zoomLevel = 1.0;
  panX = 0;
  panY = 0;
  isPanning = false;
  panStartX = 0;
  panStartY = 0;
  snapToGrid = true;
  searchTerm = '';

  // Drag states
  draggingNode: CanvasNode | null = null;
  dragOffsetX = 0;
  dragOffsetY = 0;

  // Port connection states
  linkingFromNodeId: string | null = null;
  linkingFromPort: string | null = null;
  linkingFromType: 'in' | 'out' | null = null;
  linkingFromX = 0;
  linkingFromY = 0;
  liveWire: string | null = null;

  selectedNode: CanvasNode | null = null;

  constructor(
    private apiService: ApiService,
    private notif: NotificationService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.workflowId = +idParam;
      this.loadWorkflow(this.workflowId);
    } else {
      // Create a default START node
      this.addNode('START', 100, 200);
    }
  }

  loadWorkflow(id: number) {
    this.apiService.getWorkflowById(id).subscribe({
      next: w => {
        this.workflowName = w.name;
        this.workflowDesc = w.description;
        try {
          const def = JSON.parse(w.definitionJson);
          this.nodes = def.nodes.map((n: any) => ({
            id: n.id,
            name: n.name,
            type: n.type,
            x: n.position ? n.position.x : 100,
            y: n.position ? n.position.y : 100,
            properties: n.properties || {}
          }));
          this.connections = def.connections || [];
          if (this.nodes.length > 0) {
            this.selectedNode = this.nodes[0];
          }
        } catch (err) {
          console.error('Failed to parse graph definition', err);
          this.notif.error('Failed to parse workflow definitions');
        }
      },
      error: () => {
        this.notif.error('Failed to load workflow data');
        this.router.navigate(['/dashboard']);
      }
    });
  }

  private nextNodePosition(): { x: number; y: number } {
    const cols = 3;
    const colW = 260;
    const rowH = 140;
    const startX = 80;
    const startY = 80;
    const idx = this.nodes.length;
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    return { x: startX + col * colW, y: startY + row * rowH };
  }

  addNode(type: string, x?: number, y?: number) {
    const pos = (x !== undefined && y !== undefined) ? { x, y } : this.nextNodePosition();
    const id = `${type.toLowerCase()}-${Date.now().toString().substring(8)}`;
    const newNode: CanvasNode = {
      id,
      name: type === 'START' ? 'Start' : type === 'END' ? 'End' : `${type.charAt(0) + type.slice(1).toLowerCase()} Node`,
      type,
      x: pos.x,
      y: pos.y,
      properties: {
        maxRetries: 3,
        priority: 0,
        url: 'https://jsonplaceholder.typicode.com/todos/1',
        method: 'GET',
        body: '{}',
        host: 'localhost',
        username: 'root',
        command: "echo 'Success'",
        script: '#price * #qty',
        resultKey: type === 'AI' ? 'aiResponse' : 'total',
        condition: '#total > 500',
        model: 'gpt-4o',
        prompt: 'Summarize the input: ${total}',
        temperature: 0.7
      }
    };

    if (this.snapToGrid) {
      newNode.x = Math.round(newNode.x / 15) * 15;
      newNode.y = Math.round(newNode.y / 15) * 15;
    }

    this.nodes.push(newNode);
    this.selectedNode = newNode;
  }

  deleteNode(nodeId: string) {
    if (this.nodes.find(n => n.id === nodeId)?.type === 'START') {
      this.notif.warning('Start node cannot be deleted');
      return;
    }
    
    this.nodes = this.nodes.filter(n => n.id !== nodeId);
    this.connections = this.connections.filter(c => c.fromNodeId !== nodeId && c.toNodeId !== nodeId);
    if (this.selectedNode?.id === nodeId) {
      this.selectedNode = this.nodes.length > 0 ? this.nodes[0] : null;
    }
    this.notif.info('Node deleted');
  }

  deleteConnection(index: number) {
    this.connections.splice(index, 1);
    this.notif.info('Connection removed');
  }

  private canvasRect: DOMRect | null = null;

  private getCanvasRect(): DOMRect {
    if (!this.canvasRect) {
      this.canvasRect = this.canvasEl.nativeElement.getBoundingClientRect();
    }
    return this.canvasRect;
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

  // ── Palette Search Filters ──────────────────────────────────────
  showPaletteItem(type: string): boolean {
    if (!this.searchTerm) return true;
    const term = this.searchTerm.toLowerCase();
    
    let label = '';
    if (type === 'START') label = 'start pipeline entry';
    else if (type === 'END') label = 'end workflow exit stop';
    else if (type === 'HTTP') label = 'http request rest api url';
    else if (type === 'SSH') label = 'ssh executor remote terminal command';
    else if (type === 'SCRIPT') label = 'script node expression spel evaluation';
    else if (type === 'AI') label = 'ai prompt llm openai gemini claude assistant';
    else if (type === 'SWITCH') label = 'condition switch branching boolean true false';

    return label.includes(term) || type.toLowerCase().includes(term);
  }

  showCategory(category: string): boolean {
    if (!this.searchTerm) return true;
    if (category === 'Trigger') return this.showPaletteItem('START');
    if (category === 'Action') return this.showPaletteItem('HTTP') || this.showPaletteItem('SSH') || this.showPaletteItem('SCRIPT') || this.showPaletteItem('AI');
    if (category === 'Logic') return this.showPaletteItem('SWITCH');
    if (category === 'Terminator') return this.showPaletteItem('END');
    return false;
  }

  // ── Visual Validation Rules ─────────────────────────────────────
  getNodeWarnings(node: CanvasNode): string[] {
    const warnings: string[] = [];
    
    // Check missing properties
    if (node.type === 'HTTP' && !node.properties.url) {
      warnings.push('HTTP request is missing target URL');
    }
    if (node.type === 'SSH' && !node.properties.host) {
      warnings.push('SSH executor is missing target Host IP or Domain');
    }
    if (node.type === 'SCRIPT' && !node.properties.script) {
      warnings.push('Script node is missing SpEL expression code');
    }
    if (node.type === 'AI' && !node.properties.prompt) {
      warnings.push('AI Prompt node is missing prompt template text');
    }
    if (node.type === 'SWITCH' && !node.properties.condition) {
      warnings.push('Switch conditional node has empty SpEL condition expression');
    }

    // Check orphan nodes
    if (node.type !== 'START') {
      const hasIncoming = this.connections.some(c => c.toNodeId === node.id);
      if (!hasIncoming) {
        warnings.push('Node is disconnected (no incoming path from pipeline)');
      }
    }
    if (node.type !== 'END') {
      const hasOutgoing = this.connections.some(c => c.fromNodeId === node.id);
      if (!hasOutgoing) {
        warnings.push('Node has no outgoing path (does not lead to ending node)');
      }
    }

    return warnings;
  }

  // ── Mouse & Canvas Interactions ──────────────────────────────────
  onCanvasMouseDown(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.classList.contains('canvas-container') || target.classList.contains('canvas-workspace') || target.tagName.toLowerCase() === 'svg') {
      this.isPanning = true;
      this.panStartX = event.clientX - this.panX;
      this.panStartY = event.clientY - this.panY;
      event.preventDefault();
    }
  }

  onNodeMouseDown(event: MouseEvent, node: CanvasNode) {
    const target = event.target as HTMLElement;
    if (target.classList.contains('port') ||
        target.classList.contains('btn-node-del') ||
        target.closest('button')) { return; }
    
    this.draggingNode = node;
    this.selectedNode = node;
    this.canvasRect = null;
    
    this.dragOffsetX = event.clientX;
    this.dragOffsetY = event.clientY;
    
    event.stopPropagation();
    event.preventDefault();
  }

  onCanvasMouseMove(event: MouseEvent) {
    if (this.isPanning) {
      this.panX = event.clientX - this.panStartX;
      this.panY = event.clientY - this.panStartY;
    } else if (this.draggingNode) {
      const dx = (event.clientX - this.dragOffsetX) / this.zoomLevel;
      const dy = (event.clientY - this.dragOffsetY) / this.zoomLevel;
      
      let newX = this.draggingNode.x + dx;
      let newY = this.draggingNode.y + dy;

      if (this.snapToGrid) {
        newX = Math.round(newX / 15) * 15;
        newY = Math.round(newY / 15) * 15;
      }

      this.draggingNode.x = Math.max(0, newX);
      this.draggingNode.y = Math.max(0, newY);

      this.dragOffsetX = event.clientX;
      this.dragOffsetY = event.clientY;
    }

    if (this.linkingFromNodeId) {
      const rect = this.getCanvasRect();
      const cx = (event.clientX - rect.left - this.panX) / this.zoomLevel;
      const cy = (event.clientY - rect.top - this.panY) / this.zoomLevel;
      const dx = Math.abs(cx - this.linkingFromX) * 0.5;
      if (this.linkingFromType === 'out') {
        this.liveWire = `M ${this.linkingFromX} ${this.linkingFromY} C ${this.linkingFromX + dx} ${this.linkingFromY}, ${cx - dx} ${cy}, ${cx} ${cy}`;
      } else {
        this.liveWire = `M ${cx} ${cy} C ${cx + dx} ${cy}, ${this.linkingFromX - dx} ${this.linkingFromY}, ${this.linkingFromX} ${this.linkingFromY}`;
      }
    }
  }

  onCanvasMouseUp(event?: MouseEvent) {
    this.draggingNode = null;
    this.isPanning = false;
    this.linkingFromNodeId = null;
    this.linkingFromPort = null;
    this.linkingFromType = null;
    this.liveWire = null;
  }

  // ── Port connection ─────────────────────────────────────────────
  onPortMouseDown(event: MouseEvent, nodeId: string, port: string, portType: 'in' | 'out') {
    const from = this.nodes.find(n => n.id === nodeId);
    if (!from) return;

    const nodeWidth = 220;
    const nodeHeight = 50;

    let x = from.x;
    let y = from.y + (nodeHeight / 2);

    if (portType === 'out') {
      x = from.x + nodeWidth;
      if (from.type === 'SWITCH') {
        if (port === 'true') {
          y = from.y + (nodeHeight * 0.3);
        } else if (port === 'false') {
          y = from.y + (nodeHeight * 0.7);
        }
      }
    }

    this.linkingFromNodeId = nodeId;
    this.linkingFromPort = port;
    this.linkingFromType = portType;
    this.linkingFromX = x;
    this.linkingFromY = y;
    this.liveWire = `M ${x} ${y} L ${x} ${y}`;
    
    event.stopPropagation();
    event.preventDefault();
  }

  onPortMouseUp(event: MouseEvent, targetNodeId: string, port: string, targetPortType: 'in' | 'out') {
    event.stopPropagation();
    if (this.linkingFromNodeId && this.linkingFromNodeId !== targetNodeId) {
      let fromNodeId = '';
      let fromPort = '';
      let toNodeId = '';
      let toPort = '';

      if (this.linkingFromType === 'out' && targetPortType === 'in') {
        fromNodeId = this.linkingFromNodeId;
        fromPort = this.linkingFromPort || 'default';
        toNodeId = targetNodeId;
        toPort = port;
      } else if (this.linkingFromType === 'in' && targetPortType === 'out') {
        fromNodeId = targetNodeId;
        fromPort = port;
        toNodeId = this.linkingFromNodeId;
        toPort = this.linkingFromPort || 'in';
      }

      if (fromNodeId && toNodeId) {
        const exists = this.connections.find(c =>
          c.fromNodeId === fromNodeId &&
          c.toNodeId === toNodeId &&
          c.fromPort === fromPort
        );
        if (!exists) {
          this.connections.push({
            fromNodeId,
            toNodeId,
            fromPort,
            toPort
          });
          this.notif.success('Nodes connected');
        }
      }
    }
    this.linkingFromNodeId = null;
    this.linkingFromPort = null;
    this.linkingFromType = null;
    this.liveWire = null;
  }

  // Drag and Drop Node Palette
  onDragStart(event: DragEvent, type: string) {
    event.dataTransfer?.setData('text/plain', type);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const type = event.dataTransfer?.getData('text/plain');
    if (type) {
      const rect = this.getCanvasRect();
      let x = (event.clientX - rect.left - this.panX) / this.zoomLevel - 110;
      let y = (event.clientY - rect.top - this.panY) / this.zoomLevel - 25;
      
      this.addNode(type, Math.max(0, x), Math.max(0, y));
      this.notif.success(`${type} Node added`);
    }
  }

  // SVG link draw calculations
  getConnectionPath(conn: CanvasConnection): string {
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

  getConnectionMidPoint(conn: CanvasConnection): { x: number, y: number } {
    const from = this.nodes.find(n => n.id === conn.fromNodeId);
    const to = this.nodes.find(n => n.id === conn.toNodeId);
    if (!from || !to) return { x: 0, y: 0 };

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

    return {
      x: (x1 + x2) / 2,
      y: (y1 + y2) / 2
    };
  }

  getNodeIcon(type: string): string {
    switch (type.toUpperCase()) {
      case 'START': return 'play_circle';
      case 'END': return 'stop_circle';
      case 'HTTP': return 'language';
      case 'SSH': return 'terminal';
      case 'SCRIPT': return 'code';
      case 'AI': return 'psychology';
      case 'SWITCH': return 'alt_route';
      default: return 'help_outline';
    }
  }

  saveWorkflow() {
    if (!this.workflowName) {
      this.notif.warning('Please specify a pipeline name');
      return;
    }

    const def = {
      nodes: this.nodes.map(n => ({
        id: n.id,
        name: n.name,
        type: n.type,
        position: { x: n.x, y: n.y },
        properties: n.properties
      })),
      connections: this.connections
    };

    const payload = {
      name: this.workflowName,
      description: this.workflowDesc,
      version: 1,
      definitionJson: JSON.stringify(def),
      active: true
    };

    if (this.workflowId) {
      this.apiService.updateWorkflow(this.workflowId, payload).subscribe({
        next: () => {
          this.notif.success('Workflow template updated successfully');
          this.router.navigate(['/dashboard']);
        },
        error: () => this.notif.error('Failed to update workflow template')
      });
    } else {
      this.apiService.createWorkflow(payload).subscribe({
        next: () => {
          this.notif.success('Workflow template created successfully');
          this.router.navigate(['/dashboard']);
        },
        error: () => this.notif.error('Failed to create workflow template')
      });
    }
  }
}

