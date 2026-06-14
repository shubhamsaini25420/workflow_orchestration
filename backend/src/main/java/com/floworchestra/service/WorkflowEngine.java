package com.floworchestra.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.floworchestra.domain.*;
import com.floworchestra.dto.WorkflowConnection;
import com.floworchestra.dto.WorkflowDefinition;
import com.floworchestra.dto.WorkflowNode;
import com.floworchestra.dto.WorkflowTransitionEvent;
import com.floworchestra.repository.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@Slf4j
public class WorkflowEngine {

    private final WorkflowRepository workflowRepository;
    private final WorkflowInstanceRepository workflowInstanceRepository;
    private final TaskInstanceRepository taskInstanceRepository;
    private final AuditLogRepository auditLogRepository;
    private final WorkflowParser workflowParser;
    private final LockService lockService;
    private final TransitionPublisher transitionPublisher;
    private final ObjectMapper objectMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final NodeRunnerRegistry nodeRunnerRegistry;

    public WorkflowEngine(
            WorkflowRepository workflowRepository,
            WorkflowInstanceRepository workflowInstanceRepository,
            TaskInstanceRepository taskInstanceRepository,
            AuditLogRepository auditLogRepository,
            WorkflowParser workflowParser,
            LockService lockService,
            TransitionPublisher transitionPublisher,
            ObjectMapper objectMapper,
            @Lazy SimpMessagingTemplate messagingTemplate,
            @Lazy NodeRunnerRegistry nodeRunnerRegistry) {
        this.workflowRepository = workflowRepository;
        this.workflowInstanceRepository = workflowInstanceRepository;
        this.taskInstanceRepository = taskInstanceRepository;
        this.auditLogRepository = auditLogRepository;
        this.workflowParser = workflowParser;
        this.lockService = lockService;
        this.transitionPublisher = transitionPublisher;
        this.objectMapper = objectMapper;
        this.messagingTemplate = messagingTemplate;
        this.nodeRunnerRegistry = nodeRunnerRegistry;
    }

    @Transactional
    public Long triggerWorkflow(Long workflowId, Map<String, Object> inputVariables, String triggeredBy) {
        Workflow workflow = workflowRepository.findById(workflowId)
                .orElseThrow(() -> new IllegalArgumentException("Workflow not found: " + workflowId));

        if (!workflow.getActive()) {
            throw new IllegalStateException("Workflow is inactive");
        }

        try {
            WorkflowDefinition def = workflowParser.parseAndValidate(workflow.getDefinitionJson());
            WorkflowNode startNode = workflowParser.getStartNode(def);

            String contextStr = objectMapper.writeValueAsString(inputVariables != null ? inputVariables : new HashMap<>());

            WorkflowInstance instance = WorkflowInstance.builder()
                    .workflowId(workflowId)
                    .status(WorkflowStatus.RUNNING)
                    .contextJson(contextStr)
                    .build();

            instance = workflowInstanceRepository.save(instance);

            // Audit
            auditLogRepository.save(AuditLog.builder()
                    .entityType("INSTANCE")
                    .entityId(instance.getId())
                    .action("TRIGGER")
                    .performedBy(triggeredBy)
                    .details("Workflow triggered with inputs: " + contextStr)
                    .build());

            // Create completed start task
            TaskInstance startTask = TaskInstance.builder()
                    .workflowInstanceId(instance.getId())
                    .nodeId(startNode.getId())
                    .name(startNode.getName())
                    .type(startNode.getType())
                    .status(TaskStatus.COMPLETED)
                    .inputJson(contextStr)
                    .outputJson(contextStr)
                    .startedAt(LocalDateTime.now())
                    .completedAt(LocalDateTime.now())
                    .build();

            taskInstanceRepository.save(startTask);
            broadcastStatusUpdate(instance.getId(), "Workflow execution started.");

            // Trigger transitions from start node
            transitionPublisher.publishTransition(new WorkflowTransitionEvent(
                    instance.getId(), startNode.getId(), "COMPLETED", contextStr));

            return instance.getId();
        } catch (Exception e) {
            log.error("Failed to trigger workflow", e);
            throw new RuntimeException("Trigger failed: " + e.getMessage(), e);
        }
    }

    public void handleNodeTransition(Long instanceId, String completedNodeId, String status, String incrementContextJson) {
        String lockKey = "lock:instance:" + instanceId;
        if (!lockService.acquireLock(lockKey, 10, 30)) {
            log.error("Unable to acquire lock for instance {}, skipping transition processing", instanceId);
            return;
        }

        try {
            processTransition(instanceId, completedNodeId, status, incrementContextJson);
        } catch (Exception e) {
            log.error("Error processing transition in engine for instance {}", instanceId, e);
        } finally {
            lockService.releaseLock(lockKey);
        }
    }

    @Transactional
    protected void processTransition(Long instanceId, String completedNodeId, String status, String incrementContextJson) throws Exception {
        WorkflowInstance instance = workflowInstanceRepository.findById(instanceId).orElse(null);
        if (instance == null || instance.getStatus() != WorkflowStatus.RUNNING) {
            return;
        }

        Workflow workflow = workflowRepository.findById(instance.getWorkflowId()).orElse(null);
        if (workflow == null) return;

        WorkflowDefinition def = workflowParser.parseAndValidate(workflow.getDefinitionJson());
        WorkflowNode completedNode = workflowParser.getNodeById(def, completedNodeId).orElse(null);
        if (completedNode == null) return;

        // Merge Context
        Map<String, Object> currentContext = objectMapper.readValue(instance.getContextJson(), new TypeReference<>() {});
        if (incrementContextJson != null) {
            Map<String, Object> incremental = objectMapper.readValue(incrementContextJson, new TypeReference<>() {});
            currentContext.putAll(incremental);
            instance.setContextJson(objectMapper.writeValueAsString(currentContext));
            workflowInstanceRepository.save(instance);
        }

        log.info("Processing node {} completed transition for instance {}", completedNodeId, instanceId);

        // Find outgoing connections
        List<WorkflowConnection> outgoing = workflowParser.getOutgoingConnections(def, completedNodeId);

        // Switch node handling
        if ("SWITCH".equalsIgnoreCase(completedNode.getType())) {
            // Find which link matches the switch output
            // Switch output returns a "port" matching the condition
            String selectedPort = "default";
            TaskInstance switchTask = taskInstanceRepository.findByWorkflowInstanceIdAndNodeId(instanceId, completedNodeId).orElse(null);
            if (switchTask != null && switchTask.getOutputJson() != null) {
                Map<String, Object> output = objectMapper.readValue(switchTask.getOutputJson(), new TypeReference<>() {});
                if (output.containsKey("port")) {
                    selectedPort = String.valueOf(output.get("port"));
                }
            }

            final String portToMatch = selectedPort;
            outgoing = outgoing.stream()
                    .filter(c -> portToMatch.equalsIgnoreCase(c.getFromPort()))
                    .toList();
        }

        if (outgoing.isEmpty() && !"END".equalsIgnoreCase(completedNode.getType())) {
            log.warn("Node {} completed but has no matching outgoing paths. Workflow stalled.", completedNodeId);
            return;
        }

        for (WorkflowConnection conn : outgoing) {
            String targetNodeId = conn.getToNodeId();
            WorkflowNode targetNode = workflowParser.getNodeById(def, targetNodeId).orElse(null);
            if (targetNode == null) continue;

            // Fork/Join logic: Ensure all incoming connections to targetNode are satisfied
            if (shouldWaitAtJoin(def, instanceId, targetNodeId)) {
                log.info("Node {} is waiting for other parallel paths to join.", targetNodeId);
                continue;
            }

            // Trigger target node
            executeNode(instance, targetNode, currentContext);
        }
    }

    private boolean shouldWaitAtJoin(WorkflowDefinition def, Long instanceId, String targetNodeId) {
        // Count all incoming connections to targetNodeId
        long incomingCount = def.getConnections().stream()
                .filter(c -> c.getToNodeId().equals(targetNodeId))
                .count();

        if (incomingCount <= 1) {
            return false; // single incoming branch, no join coordination needed
        }

        // Count how many of these incoming nodes have a COMPLETED task instance
        long completedIncomingCount = def.getConnections().stream()
                .filter(c -> c.getToNodeId().equals(targetNodeId))
                .map(WorkflowConnection::getFromNodeId)
                .map(fromNodeId -> taskInstanceRepository.findByWorkflowInstanceIdAndNodeId(instanceId, fromNodeId))
                .filter(Optional::isPresent)
                .map(Optional::get)
                .filter(task -> task.getStatus() == TaskStatus.COMPLETED)
                .count();

        return completedIncomingCount < incomingCount;
    }

    private void executeNode(WorkflowInstance instance, WorkflowNode node, Map<String, Object> context) throws Exception {
        log.info("Executing node {} [{}] for instance {}", node.getId(), node.getType(), instance.getId());

        if ("END".equalsIgnoreCase(node.getType())) {
            // Create completed task for END node
            TaskInstance endTask = TaskInstance.builder()
                    .workflowInstanceId(instance.getId())
                    .nodeId(node.getId())
                    .name(node.getName())
                    .type(node.getType())
                    .status(TaskStatus.COMPLETED)
                    .startedAt(LocalDateTime.now())
                    .completedAt(LocalDateTime.now())
                    .build();
            taskInstanceRepository.save(endTask);

            // Complete workflow
            instance.setStatus(WorkflowStatus.COMPLETED);
            instance.setCompletedAt(LocalDateTime.now());
            workflowInstanceRepository.save(instance);

            auditLogRepository.save(AuditLog.builder()
                    .entityType("INSTANCE")
                    .entityId(instance.getId())
                    .action("COMPLETE")
                    .performedBy("SYSTEM")
                    .details("Workflow completed successfully.")
                    .build());

            broadcastStatusUpdate(instance.getId(), "Workflow execution completed successfully.");
            return;
        }

        // Create TaskInstance
        TaskInstance task = TaskInstance.builder()
                .workflowInstanceId(instance.getId())
                .nodeId(node.getId())
                .name(node.getName())
                .type(node.getType())
                .status(TaskStatus.PENDING)
                .inputJson(objectMapper.writeValueAsString(context))
                .maxRetries(node.getProperties() != null && node.getProperties().containsKey("maxRetries") ? 
                        Integer.parseInt(String.valueOf(node.getProperties().get("maxRetries"))) : 3)
                .priority(node.getProperties() != null && node.getProperties().containsKey("priority") ? 
                        Integer.parseInt(String.valueOf(node.getProperties().get("priority"))) : 0)
                .build();

        task = taskInstanceRepository.save(task);
        broadcastStatusUpdate(instance.getId(), "Node " + node.getName() + " is pending execution.");

        // Dispatch task execution asynchronously
        nodeRunnerRegistry.executeTask(task, node);
    }

    public void broadcastStatusUpdate(Long instanceId, String message) {
        try {
            Map<String, Object> update = new HashMap<>();
            update.put("instanceId", instanceId);
            update.put("message", message);
            update.put("timestamp", LocalDateTime.now().toString());

            // Retrieve current nodes states
            List<TaskInstance> tasks = taskInstanceRepository.findByWorkflowInstanceId(instanceId);
            update.put("tasks", tasks);

            WorkflowInstance instance = workflowInstanceRepository.findById(instanceId).orElse(null);
            if (instance != null) {
                update.put("status", instance.getStatus().name());
            }

            messagingTemplate.convertAndSend("/topic/workflow-execution/" + instanceId, update);
            messagingTemplate.convertAndSend("/topic/workflow-executions", update);
        } catch (Exception e) {
            log.error("Failed to broadcast WebSocket update for instance {}", instanceId, e);
        }
    }

    @Transactional
    public void pauseWorkflow(Long instanceId, String username) {
        WorkflowInstance instance = workflowInstanceRepository.findById(instanceId)
                .orElseThrow(() -> new IllegalArgumentException("Instance not found: " + instanceId));
        if (instance.getStatus() == WorkflowStatus.RUNNING) {
            instance.setStatus(WorkflowStatus.PAUSED);
            workflowInstanceRepository.save(instance);
            
            auditLogRepository.save(AuditLog.builder()
                    .entityType("INSTANCE")
                    .entityId(instanceId)
                    .action("PAUSE")
                    .performedBy(username)
                    .details("Workflow execution paused.")
                    .build());
            broadcastStatusUpdate(instanceId, "Workflow execution paused.");
        }
    }

    @Transactional
    public void resumeWorkflow(Long instanceId, String username) {
        WorkflowInstance instance = workflowInstanceRepository.findById(instanceId)
                .orElseThrow(() -> new IllegalArgumentException("Instance not found: " + instanceId));
        if (instance.getStatus() == WorkflowStatus.PAUSED) {
            instance.setStatus(WorkflowStatus.RUNNING);
            workflowInstanceRepository.save(instance);

            auditLogRepository.save(AuditLog.builder()
                    .entityType("INSTANCE")
                    .entityId(instanceId)
                    .action("RESUME")
                    .performedBy(username)
                    .details("Workflow execution resumed.")
                    .build());
            broadcastStatusUpdate(instanceId, "Workflow execution resumed.");

            // Find all pending tasks and trigger them
            List<TaskInstance> pendingTasks = taskInstanceRepository.findByWorkflowInstanceIdAndStatus(instanceId, TaskStatus.PENDING);
            Workflow workflow = workflowRepository.findById(instance.getWorkflowId()).orElse(null);
            if (workflow != null) {
                try {
                    WorkflowDefinition def = workflowParser.parseAndValidate(workflow.getDefinitionJson());
                    for (TaskInstance t : pendingTasks) {
                        WorkflowNode node = workflowParser.getNodeById(def, t.getNodeId()).orElse(null);
                        if (node != null) {
                            nodeRunnerRegistry.executeTask(t, node);
                        }
                    }
                } catch (Exception e) {
                    log.error("Failed to resume tasks", e);
                }
            }
        }
    }

    @Transactional
    public void cancelWorkflow(Long instanceId, String username) {
        WorkflowInstance instance = workflowInstanceRepository.findById(instanceId)
                .orElseThrow(() -> new IllegalArgumentException("Instance not found: " + instanceId));
        if (instance.getStatus() == WorkflowStatus.RUNNING || instance.getStatus() == WorkflowStatus.PAUSED) {
            instance.setStatus(WorkflowStatus.CANCELLED);
            instance.setCompletedAt(LocalDateTime.now());
            workflowInstanceRepository.save(instance);

            // Cancel active tasks
            List<TaskInstance> active = taskInstanceRepository.findByWorkflowInstanceId(instanceId).stream()
                    .filter(t -> t.getStatus() == TaskStatus.RUNNING || t.getStatus() == TaskStatus.PENDING)
                    .toList();
            for (TaskInstance t : active) {
                t.setStatus(TaskStatus.CANCELLED);
                taskInstanceRepository.save(t);
            }

            auditLogRepository.save(AuditLog.builder()
                    .entityType("INSTANCE")
                    .entityId(instanceId)
                    .action("CANCEL")
                    .performedBy(username)
                    .details("Workflow execution cancelled.")
                    .build());
            broadcastStatusUpdate(instanceId, "Workflow execution cancelled.");
        }
    }
}
