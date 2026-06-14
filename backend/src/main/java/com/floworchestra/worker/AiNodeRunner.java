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
public class AiNodeRunner implements NodeRunner {

    private final NodeRunnerRegistry registry;
    private final ObjectMapper objectMapper;

    public AiNodeRunner(@org.springframework.context.annotation.Lazy NodeRunnerRegistry registry, ObjectMapper objectMapper) {
        this.registry = registry;
        this.objectMapper = objectMapper;
    }

    @Override
    public String getType() {
        return "AI";
    }

    @Override
    public void execute(TaskInstance task, WorkflowNode node) {
        try {
            Map<String, Object> contextVariables = objectMapper.readValue(task.getInputJson(), new TypeReference<>() {});

            // Properties
            String promptTemplate = node.getProperties() != null ? String.valueOf(node.getProperties().getOrDefault("prompt", "")) : "";
            String resultKey = node.getProperties() != null ? String.valueOf(node.getProperties().getOrDefault("resultKey", "aiResponse")) : "aiResponse";
            String model = node.getProperties() != null ? String.valueOf(node.getProperties().getOrDefault("model", "gpt-4o")) : "gpt-4o";
            double temperature = node.getProperties() != null ? Double.parseDouble(String.valueOf(node.getProperties().getOrDefault("temperature", "0.7"))) : 0.7;

            // Interpolate Prompt
            String prompt = resolvePlaceholders(promptTemplate, contextVariables);

            log.info("Running AI node prompt: '{}' with model: {}", prompt, model);

            // Simulate the AI completion response
            String responseText = generateSimulatedCompletion(prompt, model, temperature);

            Map<String, Object> output = new HashMap<>();
            output.put(resultKey, responseText);
            output.put("model", model);
            output.put("prompt", prompt);

            registry.handleTaskSuccess(task, objectMapper.writeValueAsString(output));
        } catch (Exception e) {
            log.error("Failed to run AI prompt task", e);
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

    private String generateSimulatedCompletion(String prompt, String model, double temperature) {
        String promptLower = prompt.toLowerCase();
        if (promptLower.contains("summarize") || promptLower.contains("summary")) {
            return "[AI Summary (" + model + ")]: Based on the input context, this is a concise automated summary generated with temperature " + temperature + ". The content describes system transactions and billing calculations.";
        } else if (promptLower.contains("classify") || promptLower.contains("sentiment")) {
            return "[AI Classification (" + model + ")]: Sentiment: POSITIVE | Category: Customer Service | Confidence: 94.6%";
        } else if (promptLower.contains("email") || promptLower.contains("write")) {
            return "[AI Draft (" + model + ")]:\nSubject: Action Required: Your pipeline execution completed.\n\nDear User,\n\nWe are pleased to inform you that your automated workflow has completed running.\n\nBest Regards,\nAI Assistant";
        }
        return "[AI Response (" + model + ")]: Generative completion successful. Prompt received: '" + prompt + "' with temperature setting " + temperature + ".";
    }
}
