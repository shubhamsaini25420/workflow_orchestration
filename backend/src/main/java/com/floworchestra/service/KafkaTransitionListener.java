package com.floworchestra.service;
 
import com.floworchestra.dto.WorkflowTransitionEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@ConditionalOnProperty(name = "floworchestra.engine.mode", havingValue = "distributed")
public class KafkaTransitionListener {

    private final WorkflowEngine workflowEngine;

    public KafkaTransitionListener(WorkflowEngine workflowEngine) {
        this.workflowEngine = workflowEngine;
        log.info("Initialized KafkaTransitionListener for distributed transition routing");
    }

    @KafkaListener(
            topics = "floworchestra-transitions",
            groupId = "${spring.kafka.consumer.group-id:floworchestra-group}"
    )
    public void listen(WorkflowTransitionEvent event) {
        log.info("Received Kafka transition event for instance {}, node {}, status {}", 
                event.getWorkflowInstanceId(), event.getNodeId(), event.getStatus());
        try {
            workflowEngine.handleNodeTransition(
                    event.getWorkflowInstanceId(),
                    event.getNodeId(),
                    event.getStatus(),
                    event.getPayloadJson()
            );
        } catch (Exception e) {
            log.error("Failed to process Kafka transition event for instance ID: {}", 
                    event.getWorkflowInstanceId(), e);
        }
    }
}
