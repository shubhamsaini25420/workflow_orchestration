import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'http://localhost:8081/api/v1';
  private wsUrl  = 'ws://localhost:8081/ws';

  private authState = new BehaviorSubject<any>(null);
  public  auth$ = this.authState.asObservable();

  constructor(private http: HttpClient) {
    const saved = localStorage.getItem('flow_session');
    if (saved) { try { this.authState.next(JSON.parse(saved)); } catch { } }
  }

  private getHeaders(): HttpHeaders {
    let h = new HttpHeaders({ 'Content-Type': 'application/json' });
    const s = this.authState.value;
    if (s?.token) h = h.set('Authorization', `Bearer ${s.token}`);
    return h;
  }

  // ── Auth ──────────────────────────────────────────────
  login(credentials: any): Observable<any> {
    return new Observable(obs => {
      this.http.post(`${this.baseUrl}/auth/login`, credentials).subscribe({
        next: (res: any) => {
          localStorage.setItem('flow_session', JSON.stringify(res));
          this.authState.next(res);
          obs.next(res); obs.complete();
        },
        error: err => obs.error(err)
      });
    });
  }

  logout() { localStorage.removeItem('flow_session'); this.authState.next(null); }
  isAuthenticated(): boolean { return this.authState.value !== null; }
  getUserRoles(): string[] { return this.authState.value ? Array.from(this.authState.value.roles) : []; }
  hasRole(role: string): boolean { return this.getUserRoles().includes(role); }

  // ── Workflows ─────────────────────────────────────────
  getWorkflows():                       Observable<any[]> { return this.http.get<any[]>(`${this.baseUrl}/workflows`, { headers: this.getHeaders() }); }
  getWorkflowById(id: number):          Observable<any>   { return this.http.get<any>(`${this.baseUrl}/workflows/${id}`, { headers: this.getHeaders() }); }
  createWorkflow(w: any):               Observable<any>   { return this.http.post<any>(`${this.baseUrl}/workflows`, w, { headers: this.getHeaders() }); }
  updateWorkflow(id: number, w: any):   Observable<any>   { return this.http.put<any>(`${this.baseUrl}/workflows/${id}`, w, { headers: this.getHeaders() }); }
  deleteWorkflow(id: number):           Observable<any>   { return this.http.delete<any>(`${this.baseUrl}/workflows/${id}`, { headers: this.getHeaders() }); }
  triggerWorkflow(id: number, vars: any): Observable<any> { return this.http.post<any>(`${this.baseUrl}/workflows/${id}/trigger`, vars, { headers: this.getHeaders() }); }

  // ── Instances ─────────────────────────────────────────
  getInstances():                         Observable<any[]> { return this.http.get<any[]>(`${this.baseUrl}/instances`, { headers: this.getHeaders() }); }
  getInstanceDetails(id: number):         Observable<any>   { return this.http.get<any>(`${this.baseUrl}/instances/${id}`, { headers: this.getHeaders() }); }
  pauseInstance(id: number):              Observable<any>   { return this.http.post<any>(`${this.baseUrl}/instances/${id}/pause`, {}, { headers: this.getHeaders() }); }
  resumeInstance(id: number):             Observable<any>   { return this.http.post<any>(`${this.baseUrl}/instances/${id}/resume`, {}, { headers: this.getHeaders() }); }
  cancelInstance(id: number):             Observable<any>   { return this.http.post<any>(`${this.baseUrl}/instances/${id}/cancel`, {}, { headers: this.getHeaders() }); }
  getInstanceLogs(id: number):            Observable<any[]> { return this.http.get<any[]>(`${this.baseUrl}/instances/${id}/logs`, { headers: this.getHeaders() }); }

  // ── Schedules ─────────────────────────────────────────
  getSchedules():                              Observable<any[]> { return this.http.get<any[]>(`${this.baseUrl}/schedules`, { headers: this.getHeaders() }); }
  createSchedule(s: any):                      Observable<any>   { return this.http.post<any>(`${this.baseUrl}/schedules`, s, { headers: this.getHeaders() }); }
  updateSchedule(id: number, s: any):          Observable<any>   { return this.http.put<any>(`${this.baseUrl}/schedules/${id}`, s, { headers: this.getHeaders() }); }
  deleteSchedule(id: number):                  Observable<any>   { return this.http.delete<any>(`${this.baseUrl}/schedules/${id}`, { headers: this.getHeaders() }); }
  toggleSchedule(id: number, active: boolean): Observable<any>   {
    return this.http.patch<any>(`${this.baseUrl}/schedules/${id}`, { active }, { headers: this.getHeaders() });
  }

  // ── WebSocket ─────────────────────────────────────────
  connectToWebSocket(instanceId: number, onUpdate: (data: any) => void): WebSocket {
    const socket = new WebSocket(this.wsUrl);

    socket.onopen = () => {
      socket.send(`CONNECT\naccept-version:1.1,1.0\nheart-beat:10000,10000\n\n\u0000`);
      setTimeout(() => {
        socket.send(`SUBSCRIBE\nid:sub-0\ndestination:/topic/workflow-execution/${instanceId}\n\n\u0000`);
      }, 500);
    };

    socket.onmessage = (event) => {
      const data = event.data as string;
      if (data.includes('{"instanceId"')) {
        const start = data.indexOf('\n\n') + 2;
        const end   = data.lastIndexOf('\u0000');
        try { onUpdate(JSON.parse(data.substring(start, end).trim())); } catch { }
      }
    };

    socket.onerror = err => console.warn('WebSocket error:', err);
    return socket;
  }
}
