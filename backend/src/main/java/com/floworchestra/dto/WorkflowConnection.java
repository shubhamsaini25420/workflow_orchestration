package com.floworchestra.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowConnection {
    private String fromNodeId;
    private String toNodeId;
    private String fromPort; // default, true, false, or custom output port names
    private String toPort;
}
