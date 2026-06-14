package com.floworchestra.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.floworchestra.domain.TaskInstance;
import com.floworchestra.domain.TaskStatus;
import com.floworchestra.domain.WorkflowInstance;
import com.floworchestra.domain.WorkflowStatus;
import com.floworchestra.dto.WorkflowNode;
import com.floworchestra.dto.WorkflowTransitionEvent;
import com.floworchestra.repository.TaskInstanceRepository;
import com.floworchestra.repository.WorkflowInstanceRepository;
import com.floworchestra.worker.NodeRunner;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.*;

@Service
@Slf4j
public class NodeRunnerRegistry {

    private final Map<String, NodeRunner> runners = new ConcurrentHashMap<>();
    private final TaskInstanceRepository taskInstanceRepository;
    private final WorkflowInstanceRepository workflowInstanceRepository;
    private final TransitionPublisher transitionPublisher;
    private final WorkflowEngine workflowEngine;
    private final ObjectMapper objectMapper;

    private final ExecutorService executorService = Executors.newFixedThreadPool(8);
    private final ScheduledExecutorService scheduledExecutor = Executors.newScheduledThreadPool(2);

    public NodeRunnerRegistry(
            List<NodeRunner> runnerList,
            TaskInstanceRepository taskInstanceRepository,
            WorkflowInstanceRepository workflowInstanceRepository,
            TransitionPublisher transitionPublisher,
            @Lazy WorkflowEngine workflowEngine,
            ObjectMapper objectMapper) {
        this.taskInstanceRepository = taskInstanceRepository;
        this.workflowInstanceRepository = workflowInstanceRepository;
        this.transitionPublisher = transitionPublisher;
        this.workflowEngine = workflowEngine;
        this.objectMapper = objectMapper;

        for (NodeRunner runner : runnerList) {
            runners.put(runner.getType().toUpperCase(), runner);
            log.info("Registered NodeRunner plugin: {}", runner.getType());
        }
    }

    public void executeTask(TaskInstance task, WorkflowNode node) {
        executorService.submit(() -> {
            try {
                // Check if instance is still running
                WorkflowInstance instance = workflowInstanceRepository.findById(task.getWorkflowInstanceId()).orElse(null);
                if (instance == null || instance.getStatus() != WorkflowStatus.RUNNING) {
                    log.info("Workflow instance is not RUNNING (status={}), cancelling task {}", 
                            instance != null ? instance.getStatus() : "null", task.getId());
                    task.setStatus(TaskStatus.CANCELLED);
                    taskInstanceRepository.save(task);
                    return;
                }

                task.setStatus(TaskStatus.RUNNING);
                task.setStartedAt(LocalDateTime.now());
                taskInstanceRepository.save(task);
                workflowEngine.broadcastStatusUpdate(task.getWorkflowInstanceId(), "Running task: " + task.getName());

                NodeRunner runner = runners.get(node.getType().toUpperCase());
                if (runner == null) {
                    throw new IllegalArgumentException("Unsupported node type: " + node.getType());
                }

                runner.execute(task, node);
            } catch (Exception e) {
                log.error("Execution failed for task: {}", task.getId(), e);
                handleTaskFailure(task, node, e.getMessage());
            }
        });
    }

    public void handleTaskSuccess(TaskInstance task, String outputJson) {
        try {
            task.setStatus(TaskStatus.COMPLETED);
            task.setOutputJson(outputJson);
            task.setCompletedAt(LocalDateTime.now());
            taskInstanceRepository.save(task);

            workflowEngine.broadcastStatusUpdate(task.getWorkflowInstanceId(), "Task " + task.getName() + " completed.");

            // Trigger engine transitions
            transitionPublisher.publishTransition(new WorkflowTransitionEvent(
                    task.getWorkflowInstanceId(), task.getNodeId(), "COMPLETED", outputJson));
        } catch (Exception e) {
            log.error("Failed to process task completion", e);
        }
    }

    public void handleTaskFailure(TaskInstance task, WorkflowNode node, String errorMsg) {
        try {
            int currentRetry = task.getRetryCount();
            int maxRetries = task.getMaxRetries();

            if (currentRetry < maxRetries) {
                task.setRetryCount(currentRetry + 1);
                task.setStatus(TaskStatus.RETRIED);
                task.setErrorMessage(errorMsg);
                taskInstanceRepository.save(task);

                long delaySeconds = (long) Math.pow(2, currentRetry + 1); // Exponential backoff: 2s, 4s, 8s...
                workflowEngine.broadcastStatusUpdate(task.getWorkflowInstanceId(), 
                        "Task " + task.getName() + " failed: " + errorMsg + ". Retrying in " + delaySeconds + "s.");

                scheduledExecutor.schedule(() -> executeTask(task, node), delaySeconds, TimeUnit.SECONDS);
            } else {
                // DLQ Escalation
                task.setStatus(TaskStatus.DLQ);
                task.setErrorMessage("All retries exhausted. Error: " + errorMsg);
                task.setCompletedAt(LocalDateTime.now());
                taskInstanceRepository.save(task);

                workflowEngine.broadcastStatusUpdate(task.getWorkflowInstanceId(), 
                        "Task " + task.getName() + " failed permanently and sent to Dead Letter Queue (DLQ).");

                // Mark workflow instance as failed
                WorkflowInstance instance = workflowInstanceRepository.findById(task.getWorkflowInstanceId()).orElse(null);
                if (instance != null) {
                    instance.setStatus(WorkflowStatus.FAILED);
                    instance.setCompletedAt(LocalDateTime.now());
                    instance.setErrorMessage("Task " + task.getName() + " failed permanently (DLQ): " + errorMsg);
                    workflowInstanceRepository.save(instance);
                }
            }
        } catch (Exception e) {
            log.error("Failed to handle task failure details", e);
        }
    }
}
