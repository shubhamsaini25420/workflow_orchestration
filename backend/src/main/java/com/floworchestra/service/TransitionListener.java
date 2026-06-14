package com.floworchestra.service;

import com.floworchestra.dto.WorkflowTransitionEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class TransitionListener {

    private final WorkflowEngine workflowEngine;

    public TransitionListener(WorkflowEngine workflowEngine) {
        this.workflowEngine = workflowEngine;
    }

    // Handles local in-memory Spring Application Events (standalone mode)
    @EventListener
    public void handleLocalTransition(WorkflowTransitionEvent event) {
        log.debug("Received local transition event for instance {}, node {}", 
                event.getWorkflowInstanceId(), event.getNodeId());
        process(event);
    }

    private void process(WorkflowTransitionEvent event) {
        try {
            workflowEngine.handleNodeTransition(
                    event.getWorkflowInstanceId(),
                    event.getNodeId(),
                    event.getStatus(),
                    event.getPayloadJson()
            );
        } catch (Exception e) {
            log.error("Error processing transition event for instance ID: {}", 
                    event.getWorkflowInstanceId(), e);
        }
    }
}
