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
public class SwitchNodeRunner implements NodeRunner {

    private final NodeRunnerRegistry registry;
    private final ObjectMapper objectMapper;
    private final ExpressionParser parser = new SpelExpressionParser();

    public SwitchNodeRunner(@org.springframework.context.annotation.Lazy NodeRunnerRegistry registry, ObjectMapper objectMapper) {
        this.registry = registry;
        this.objectMapper = objectMapper;
    }

    @Override
    public String getType() {
        return "SWITCH";
    }

    @Override
    public void execute(TaskInstance task, WorkflowNode node) {
        try {
            Map<String, Object> contextVariables = objectMapper.readValue(task.getInputJson(), new TypeReference<>() {});
            
            // Expected property: "condition" (e.g., "#age >= 18" or "#status == 'APPROVED'")
            String condition = "true";
            if (node.getProperties() != null && node.getProperties().containsKey("condition")) {
                condition = String.valueOf(node.getProperties().get("condition"));
            }

            StandardEvaluationContext evalContext = new StandardEvaluationContext();
            contextVariables.forEach(evalContext::setVariable);

            Boolean result = false;
            try {
                result = parser.parseExpression(condition).getValue(evalContext, Boolean.class);
            } catch (Exception e) {
                log.error("Failed to evaluate switch condition: {}", condition, e);
            }

            String chosenPort = (result != null && result) ? "true" : "false";
            
            Map<String, Object> output = new HashMap<>();
            output.put("conditionEvaluated", condition);
            output.put("outcome", result);
            output.put("port", chosenPort);

            registry.handleTaskSuccess(task, objectMapper.writeValueAsString(output));
        } catch (Exception e) {
            log.error("Failed to run switch task", e);
            registry.handleTaskFailure(task, node, e.getMessage());
        }
    }
}
