package com.floworchestra.controller;

import com.floworchestra.domain.*;
import com.floworchestra.repository.*;
import com.floworchestra.service.WorkflowEngine;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/instances")
public class WorkflowInstanceController {

    private final WorkflowInstanceRepository workflowInstanceRepository;
    private final TaskInstanceRepository taskInstanceRepository;
    private final AuditLogRepository auditLogRepository;
    private final WorkflowEngine workflowEngine;

    public WorkflowInstanceController(
            WorkflowInstanceRepository workflowInstanceRepository,
            TaskInstanceRepository taskInstanceRepository,
            AuditLogRepository auditLogRepository,
            WorkflowEngine workflowEngine) {
        this.workflowInstanceRepository = workflowInstanceRepository;
        this.taskInstanceRepository = taskInstanceRepository;
        this.auditLogRepository = auditLogRepository;
        this.workflowEngine = workflowEngine;
    }

    @GetMapping
    public List<WorkflowInstance> getAllInstances() {
        return workflowInstanceRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getInstanceDetails(@PathVariable Long id) {
        WorkflowInstance instance = workflowInstanceRepository.findById(id).orElse(null);
        if (instance == null) {
            return ResponseEntity.notFound().build();
        }

        List<TaskInstance> tasks = taskInstanceRepository.findByWorkflowInstanceId(id);
        
        Map<String, Object> details = new HashMap<>();
        details.put("instance", instance);
        details.put("tasks", tasks);
        
        return ResponseEntity.ok(details);
    }

    @PostMapping("/{id}/pause")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVELOPER', 'OPERATOR')")
    public ResponseEntity<?> pauseInstance(@PathVariable Long id, Principal principal) {
        String username = principal != null ? principal.getName() : "anonymous";
        workflowEngine.pauseWorkflow(id, username);
        return ResponseEntity.ok(Map.of("message", "Workflow paused successfully"));
    }

    @PostMapping("/{id}/resume")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVELOPER', 'OPERATOR')")
    public ResponseEntity<?> resumeInstance(@PathVariable Long id, Principal principal) {
        String username = principal != null ? principal.getName() : "anonymous";
        workflowEngine.resumeWorkflow(id, username);
        return ResponseEntity.ok(Map.of("message", "Workflow resumed successfully"));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVELOPER', 'OPERATOR')")
    public ResponseEntity<?> cancelInstance(@PathVariable Long id, Principal principal) {
        String username = principal != null ? principal.getName() : "anonymous";
        workflowEngine.cancelWorkflow(id, username);
        return ResponseEntity.ok(Map.of("message", "Workflow cancelled successfully"));
    }

    @GetMapping("/{id}/logs")
    public List<AuditLog> getInstanceLogs(@PathVariable Long id) {
        return auditLogRepository.findByEntityTypeAndEntityIdOrderByTimestampDesc("INSTANCE", id);
    }
}
