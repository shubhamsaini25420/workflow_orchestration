package com.floworchestra.service;

import com.floworchestra.dto.WorkflowTransitionEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
@Slf4j
public class TransitionPublisher {

    private final String mode;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ApplicationEventPublisher localEventPublisher;
    private final ExecutorService localExecutor = Executors.newFixedThreadPool(4);

    public TransitionPublisher(
            @Value("${floworchestra.engine.mode:standalone}") String mode,
            @Autowired(required = false) KafkaTemplate<String, Object> kafkaTemplate,
            ApplicationEventPublisher localEventPublisher) {
        this.mode = mode;
        this.kafkaTemplate = kafkaTemplate;
        this.localEventPublisher = localEventPublisher;
        log.info("Initialized TransitionPublisher in {} mode", mode);
    }

    public void publishTransition(WorkflowTransitionEvent event) {
        log.info("Publishing transition event for instance {}: node {} is {}", 
                event.getWorkflowInstanceId(), event.getNodeId(), event.getStatus());

        if ("distributed".equalsIgnoreCase(mode) && kafkaTemplate != null) {
            try {
                kafkaTemplate.send("floworchestra-transitions", event.getWorkflowInstanceId().toString(), event);
                return;
            } catch (Exception e) {
                log.error("Failed to publish to Kafka, falling back to local processing", e);
            }
        }

        // Local execution async
        localExecutor.submit(() -> {
            try {
                localEventPublisher.publishEvent(event);
            } catch (Exception e) {
                log.error("Failed to process local transition event for instance {}", event.getWorkflowInstanceId(), e);
            }
        });
    }
}
