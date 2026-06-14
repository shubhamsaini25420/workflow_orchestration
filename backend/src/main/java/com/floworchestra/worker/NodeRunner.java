package com.floworchestra.worker;

import com.floworchestra.domain.TaskInstance;
import com.floworchestra.dto.WorkflowNode;

public interface NodeRunner {
    String getType();
    void execute(TaskInstance task, WorkflowNode node);
}
