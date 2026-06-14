package com.floworchestra.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.floworchestra.domain.*;
import com.floworchestra.dto.*;
import com.floworchestra.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class WorkflowEngineTest {

    @Mock
    private WorkflowRepository workflowRepository;
    @Mock
    private WorkflowInstanceRepository workflowInstanceRepository;
    @Mock
    private TaskInstanceRepository taskInstanceRepository;
    @Mock
    private AuditLogRepository auditLogRepository;
    @Mock
    private WorkflowParser workflowParser;
    @Mock
    private LockService lockService;
    @Mock
    private TransitionPublisher transitionPublisher;
    @Mock
    private SimpMessagingTemplate messagingTemplate;
    @Mock
    private NodeRunnerRegistry nodeRunnerRegistry;

    private WorkflowEngine workflowEngine;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final String mockDefinitionJson = "{\"nodes\":[],\"connections\":[]}";

    @BeforeEach
    public void setUp() {
        workflowEngine = new WorkflowEngine(
                workflowRepository,
                workflowInstanceRepository,
                taskInstanceRepository,
                auditLogRepository,
                workflowParser,
                lockService,
                transitionPublisher,
                objectMapper,
                messagingTemplate,
                nodeRunnerRegistry
        );
    }

    @Test
    public void testTriggerWorkflow_Success() throws Exception {
        Workflow mockWorkflow = Workflow.builder()
                .id(1L)
                .name("Test Workflow")
                .active(true)
                .definitionJson(mockDefinitionJson)
                .build();

        WorkflowDefinition mockDef = new WorkflowDefinition();
        WorkflowNode startNode = new WorkflowNode("start-1", "Start Node", "START", new HashMap<>(), null);
        WorkflowNode endNode = new WorkflowNode("end-1", "End Node", "END", new HashMap<>(), null);
        mockDef.setNodes(List.of(startNode, endNode));

        when(workflowRepository.findById(1L)).thenReturn(Optional.of(mockWorkflow));
        when(workflowParser.parseAndValidate(anyString())).thenReturn(mockDef);
        when(workflowParser.getStartNode(any(WorkflowDefinition.class))).thenReturn(startNode);

        WorkflowInstance mockInstance = WorkflowInstance.builder()
                .id(100L)
                .workflowId(1L)
                .status(WorkflowStatus.RUNNING)
                .build();
        when(workflowInstanceRepository.save(any(WorkflowInstance.class))).thenReturn(mockInstance);

        Long instanceId = workflowEngine.triggerWorkflow(1L, new HashMap<>(), "tester");

        assertEquals(100L, instanceId);
        verify(workflowInstanceRepository, times(1)).save(any(WorkflowInstance.class));
        verify(taskInstanceRepository, times(1)).save(any(TaskInstance.class));
        verify(transitionPublisher, times(1)).publishTransition(any(WorkflowTransitionEvent.class));
    }

    @Test
    public void testTriggerWorkflow_InactiveFails() {
        Workflow mockWorkflow = Workflow.builder()
                .id(1L)
                .name("Inactive Workflow")
                .active(false)
                .build();

        when(workflowRepository.findById(1L)).thenReturn(Optional.of(mockWorkflow));

        assertThrows(IllegalStateException.class, () -> {
            workflowEngine.triggerWorkflow(1L, new HashMap<>(), "tester");
        });
    }
}
