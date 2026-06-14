package com.floworchestra.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowTransitionEvent implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private Long workflowInstanceId;
    private String nodeId;
    private String status; // COMPLETED, FAILED, RETRIED
    private String payloadJson; // holds incremental variables to merge into the instance context
}
