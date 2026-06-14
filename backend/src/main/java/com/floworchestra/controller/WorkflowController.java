package com.floworchestra.controller;

import com.floworchestra.domain.Workflow;
import com.floworchestra.repository.WorkflowRepository;
import com.floworchestra.service.WorkflowEngine;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/workflows")
public class WorkflowController {

    private final WorkflowRepository workflowRepository;
    private final WorkflowEngine workflowEngine;

    public WorkflowController(WorkflowRepository workflowRepository, WorkflowEngine workflowEngine) {
        this.workflowRepository = workflowRepository;
        this.workflowEngine = workflowEngine;
    }

    @GetMapping
    public List<Workflow> getAllWorkflows() {
        return workflowRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Workflow> getWorkflowById(@PathVariable Long id) {
        return workflowRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVELOPER')")
    public Workflow createWorkflow(@RequestBody Workflow workflow) {
        if (workflow.getVersion() == null) {
            workflow.setVersion(1);
        }
        return workflowRepository.save(workflow);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVELOPER')")
    public ResponseEntity<Workflow> updateWorkflow(@PathVariable Long id, @RequestBody Workflow details) {
        return workflowRepository.findById(id)
                .map(w -> {
                    w.setName(details.getName());
                    w.setDescription(details.getDescription());
                    w.setDefinitionJson(details.getDefinitionJson());
                    w.setActive(details.getActive());
                    w.setVersion(details.getVersion());
                    return ResponseEntity.ok(workflowRepository.save(w));
                }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteWorkflow(@PathVariable Long id) {
        return workflowRepository.findById(id)
                .map(w -> {
                    workflowRepository.delete(w);
                    return ResponseEntity.ok().build();
                }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/trigger")
    public ResponseEntity<Map<String, Object>> triggerWorkflow(
            @PathVariable Long id, 
            @RequestBody(required = false) Map<String, Object> variables,
            Principal principal) {
        String username = principal != null ? principal.getName() : "anonymous";
        Long instanceId = workflowEngine.triggerWorkflow(id, variables, username);
        return ResponseEntity.ok(Map.of(
                "instanceId", instanceId,
                "status", "RUNNING",
                "message", "Workflow instance successfully spawned."
        ));
    }
}
