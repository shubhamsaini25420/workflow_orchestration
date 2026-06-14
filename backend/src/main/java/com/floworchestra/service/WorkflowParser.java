package com.floworchestra.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.floworchestra.dto.WorkflowConnection;
import com.floworchestra.dto.WorkflowDefinition;
import com.floworchestra.dto.WorkflowNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.io.IOException;
import java.util.*;

@Service
@Slf4j
public class WorkflowParser {

    private final ObjectMapper objectMapper;

    public WorkflowParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public WorkflowDefinition parseAndValidate(String jsonDefinition) throws IOException {
        WorkflowDefinition def = objectMapper.readValue(jsonDefinition, WorkflowDefinition.class);
        validateGraph(def);
        return def;
    }

    private void validateGraph(WorkflowDefinition def) {
        if (def.getNodes() == null || def.getNodes().isEmpty()) {
            throw new IllegalArgumentException("Workflow must have at least one node");
        }

        long startNodesCount = def.getNodes().stream()
                .filter(node -> "START".equalsIgnoreCase(node.getType()))
                .count();

        if (startNodesCount != 1) {
            throw new IllegalArgumentException("Workflow must have exactly one START node. Found: " + startNodesCount);
        }

        long endNodesCount = def.getNodes().stream()
                .filter(node -> "END".equalsIgnoreCase(node.getType()))
                .count();

        if (endNodesCount < 1) {
            throw new IllegalArgumentException("Workflow must have at least one END node");
        }

        // Validate connections
        Set<String> nodeIds = new HashSet<>();
        for (WorkflowNode node : def.getNodes()) {
            if (node.getId() == null || node.getId().trim().isEmpty()) {
                throw new IllegalArgumentException("Node ID cannot be null or empty");
            }
            if (!nodeIds.add(node.getId())) {
                throw new IllegalArgumentException("Duplicate node ID found: " + node.getId());
            }
        }

        if (def.getConnections() != null) {
            for (WorkflowConnection conn : def.getConnections()) {
                if (!nodeIds.contains(conn.getFromNodeId())) {
                    throw new IllegalArgumentException("Connection source node ID does not exist: " + conn.getFromNodeId());
                }
                if (!nodeIds.contains(conn.getToNodeId())) {
                    throw new IllegalArgumentException("Connection target node ID does not exist: " + conn.getToNodeId());
                }
            }
        }
    }

    public List<WorkflowConnection> getOutgoingConnections(WorkflowDefinition def, String nodeId) {
        List<WorkflowConnection> outgoing = new ArrayList<>();
        if (def.getConnections() != null) {
            for (WorkflowConnection conn : def.getConnections()) {
                if (conn.getFromNodeId().equals(nodeId)) {
                    outgoing.add(conn);
                }
            }
        }
        return outgoing;
    }

    public Optional<WorkflowNode> getNodeById(WorkflowDefinition def, String nodeId) {
        return def.getNodes().stream()
                .filter(n -> n.getId().equals(nodeId))
                .findFirst();
    }

    public WorkflowNode getStartNode(WorkflowDefinition def) {
        return def.getNodes().stream()
                .filter(node -> "START".equalsIgnoreCase(node.getType()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No START node found"));
    }
}
