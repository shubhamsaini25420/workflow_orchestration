package com.floworchestra.controller;

import com.floworchestra.domain.WorkflowSchedule;
import com.floworchestra.repository.WorkflowScheduleRepository;
import com.floworchestra.service.WorkflowSchedulerService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/schedules")
@PreAuthorize("hasAnyRole('ADMIN', 'DEVELOPER')")
public class WorkflowScheduleController {

    private final WorkflowScheduleRepository scheduleRepository;
    private final WorkflowSchedulerService schedulerService;

    public WorkflowScheduleController(
            WorkflowScheduleRepository scheduleRepository,
            WorkflowSchedulerService schedulerService) {
        this.scheduleRepository = scheduleRepository;
        this.schedulerService = schedulerService;
    }

    @GetMapping
    public List<WorkflowSchedule> getAllSchedules() {
        return scheduleRepository.findAll();
    }

    @PostMapping
    public WorkflowSchedule createSchedule(@RequestBody WorkflowSchedule schedule) {
        WorkflowSchedule saved = scheduleRepository.save(schedule);
        if (saved.getEnabled()) {
            schedulerService.scheduleTask(saved);
        }
        return saved;
    }

    @PutMapping("/{id}")
    public ResponseEntity<WorkflowSchedule> updateSchedule(@PathVariable Long id, @RequestBody WorkflowSchedule details) {
        return scheduleRepository.findById(id)
                .map(s -> {
                    s.setName(details.getName());
                    s.setCronExpression(details.getCronExpression());
                    s.setTimezone(details.getTimezone());
                    s.setEnabled(details.getEnabled());
                    WorkflowSchedule updated = scheduleRepository.save(s);
                    
                    if (updated.getEnabled()) {
                        schedulerService.scheduleTask(updated);
                    } else {
                        schedulerService.unscheduleTask(updated.getId());
                    }
                    return ResponseEntity.ok(updated);
                }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSchedule(@PathVariable Long id) {
        return scheduleRepository.findById(id)
                .map(s -> {
                    schedulerService.unscheduleTask(id);
                    scheduleRepository.delete(s);
                    return ResponseEntity.ok().build();
                }).orElse(ResponseEntity.notFound().build());
    }
}
