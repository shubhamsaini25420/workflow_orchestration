package com.floworchestra.repository;

import com.floworchestra.domain.TaskInstance;
import com.floworchestra.domain.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface TaskInstanceRepository extends JpaRepository<TaskInstance, Long> {
    List<TaskInstance> findByWorkflowInstanceId(Long workflowInstanceId);
    List<TaskInstance> findByWorkflowInstanceIdAndStatus(Long workflowInstanceId, TaskStatus status);
    Optional<TaskInstance> findByWorkflowInstanceIdAndNodeId(Long workflowInstanceId, String nodeId);
}
