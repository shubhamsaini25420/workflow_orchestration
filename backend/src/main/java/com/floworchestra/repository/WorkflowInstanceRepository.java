package com.floworchestra.repository;

import com.floworchestra.domain.WorkflowInstance;
import com.floworchestra.domain.WorkflowStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface WorkflowInstanceRepository extends JpaRepository<WorkflowInstance, Long> {
    List<WorkflowInstance> findByWorkflowId(Long workflowId);
    List<WorkflowInstance> findByStatus(WorkflowStatus status);
}
