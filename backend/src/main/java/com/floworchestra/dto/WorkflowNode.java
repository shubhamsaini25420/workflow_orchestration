package com.floworchestra.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowNode {
    private String id;
    private String name;
    private String type; // START, END, HTTP, SSH, SCRIPT, SWITCH
    private Map<String, Object> properties;
    private Position position;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Position {
        private double x;
        private double y;
    }
}
