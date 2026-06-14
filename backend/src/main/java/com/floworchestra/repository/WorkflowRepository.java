package com.floworchestra.repository;

import com.floworchestra.domain.Workflow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface WorkflowRepository extends JpaRepository<Workflow, Long> {
    List<Workflow> findByActiveTrue();
    Optional<Workflow> findByNameAndVersion(String name, Integer version);
    
    @Query("SELECT MAX(w.version) FROM Workflow w WHERE w.name = :name")
    Optional<Integer> findMaxVersionByName(@Param("name") String name);

    List<Workflow> findByName(String name);
}
