package com.floworchestra.worker;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.floworchestra.domain.TaskInstance;
import com.floworchestra.dto.WorkflowNode;
import com.floworchestra.service.NodeRunnerRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
@Slf4j
public class SshNodeRunner implements NodeRunner {

    private final NodeRunnerRegistry registry;
    private final ObjectMapper objectMapper;

    public SshNodeRunner(@org.springframework.context.annotation.Lazy NodeRunnerRegistry registry, ObjectMapper objectMapper) {
        this.registry = registry;
        this.objectMapper = objectMapper;
    }

    @Override
    public String getType() {
        return "SSH";
    }

    @Override
    public void execute(TaskInstance task, WorkflowNode node) {
        try {
            Map<String, Object> contextVariables = objectMapper.readValue(task.getInputJson(), new TypeReference<>() {});

            // SSH configurations
            String rawHost = node.getProperties() != null ? String.valueOf(node.getProperties().getOrDefault("host", "localhost")) : "localhost";
            String rawUsername = node.getProperties() != null ? String.valueOf(node.getProperties().getOrDefault("username", "root")) : "root";
            String rawCommand = node.getProperties() != null ? String.valueOf(node.getProperties().getOrDefault("command", "echo 'Hello'")) : "echo 'Hello'";

            String host = resolvePlaceholders(rawHost, contextVariables);
            String username = resolvePlaceholders(rawUsername, contextVariables);
            String command = resolvePlaceholders(rawCommand, contextVariables);

            log.info("Simulating SSH connection to {}@{} to run command: {}", username, host, command);
            
            // Simulate execution latency
            Thread.sleep(1200);

            Map<String, Object> output = new HashMap<>();
            output.put("host", host);
            output.put("username", username);
            output.put("command", command);
            output.put("stdout", "SSH command executed successfully on " + host + "\nOutput: [Done]");
            output.put("stderr", "");
            output.put("exitCode", 0);

            registry.handleTaskSuccess(task, objectMapper.writeValueAsString(output));
        } catch (Exception e) {
            log.error("Failed to run SSH task", e);
            registry.handleTaskFailure(task, node, e.getMessage());
        }
    }

    private String resolvePlaceholders(String template, Map<String, Object> context) {
        if (template == null || template.isEmpty()) return template;
        String result = template;
        for (Map.Entry<String, Object> entry : context.entrySet()) {
            result = result.replace("${" + entry.getKey() + "}", String.valueOf(entry.getValue()));
        }
        return result;
    }
}
