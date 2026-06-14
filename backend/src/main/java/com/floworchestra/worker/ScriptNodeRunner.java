package com.floworchestra.worker;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.floworchestra.domain.TaskInstance;
import com.floworchestra.dto.WorkflowNode;
import com.floworchestra.service.NodeRunnerRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
@Slf4j
public class ScriptNodeRunner implements NodeRunner {

    private final NodeRunnerRegistry registry;
    private final ObjectMapper objectMapper;
    private final ExpressionParser parser = new SpelExpressionParser();

    public ScriptNodeRunner(@org.springframework.context.annotation.Lazy NodeRunnerRegistry registry, ObjectMapper objectMapper) {
        this.registry = registry;
        this.objectMapper = objectMapper;
    }

    @Override
    public String getType() {
        return "SCRIPT";
    }

    @Override
    public void execute(TaskInstance task, WorkflowNode node) {
        try {
            Map<String, Object> contextVariables = objectMapper.readValue(task.getInputJson(), new TypeReference<>() {});

            // Properties
            String script = node.getProperties() != null ? String.valueOf(node.getProperties().getOrDefault("script", "")) : "";
            String resultKey = node.getProperties() != null ? String.valueOf(node.getProperties().getOrDefault("resultKey", "scriptResult")) : "scriptResult";

            log.info("Running script task: {}", script);

            StandardEvaluationContext evalContext = new StandardEvaluationContext();
            contextVariables.forEach(evalContext::setVariable);

            Object value = parser.parseExpression(script).getValue(evalContext);

            Map<String, Object> output = new HashMap<>();
            output.put(resultKey, value);

            registry.handleTaskSuccess(task, objectMapper.writeValueAsString(output));
        } catch (Exception e) {
            log.error("Failed to run script task", e);
            registry.handleTaskFailure(task, node, e.getMessage());
        }
    }
}
