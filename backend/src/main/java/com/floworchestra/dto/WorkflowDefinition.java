package com.floworchestra.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowDefinition {
    private List<WorkflowNode> nodes = new ArrayList<>();
    private List<WorkflowConnection> connections = new ArrayList<>();
}
