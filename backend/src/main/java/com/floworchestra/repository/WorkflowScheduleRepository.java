package com.floworchestra.repository;

import com.floworchestra.domain.WorkflowSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface WorkflowScheduleRepository extends JpaRepository<WorkflowSchedule, Long> {
    List<WorkflowSchedule> findByEnabledTrue();
    Optional<WorkflowSchedule> findByName(String name);
}
