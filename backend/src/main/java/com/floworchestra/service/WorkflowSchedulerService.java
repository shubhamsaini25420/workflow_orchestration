package com.floworchestra.service;

import com.floworchestra.domain.WorkflowSchedule;
import com.floworchestra.repository.WorkflowScheduleRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.scheduling.support.CronTrigger;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.TimeZone;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

@Service
@Slf4j
public class WorkflowSchedulerService implements CommandLineRunner {

    private final WorkflowScheduleRepository scheduleRepository;
    private final WorkflowEngine workflowEngine;
    private final ThreadPoolTaskScheduler taskScheduler;
    private final Map<Long, ScheduledFuture<?>> scheduledFutures = new ConcurrentHashMap<>();

    public WorkflowSchedulerService(WorkflowScheduleRepository scheduleRepository, WorkflowEngine workflowEngine) {
        this.scheduleRepository = scheduleRepository;
        this.workflowEngine = workflowEngine;
        
        this.taskScheduler = new ThreadPoolTaskScheduler();
        this.taskScheduler.setPoolSize(4);
        this.taskScheduler.setThreadNamePrefix("WorkflowScheduler-");
        this.taskScheduler.initialize();
    }

    @Override
    public void run(String... args) {
        log.info("Starting workflow scheduling triggers...");
        refreshSchedules();
    }

    public synchronized void refreshSchedules() {
        // Cancel all existing scheduled futures
        scheduledFutures.values().forEach(future -> future.cancel(true));
        scheduledFutures.clear();

        List<WorkflowSchedule> activeSchedules = scheduleRepository.findByEnabledTrue();
        log.info("Found {} active workflow schedules to load", activeSchedules.size());

        for (WorkflowSchedule schedule : activeSchedules) {
            scheduleTask(schedule);
        }
    }

    public synchronized void scheduleTask(WorkflowSchedule schedule) {
        // Cancel if already scheduled
        ScheduledFuture<?> existing = scheduledFutures.get(schedule.getId());
        if (existing != null) {
            existing.cancel(true);
        }

        try {
            CronTrigger trigger = new CronTrigger(schedule.getCronExpression(), TimeZone.getTimeZone(schedule.getTimezone()));
            
            ScheduledFuture<?> future = taskScheduler.schedule(() -> {
                log.info("Scheduled trigger firing for workflow ID: {} (Schedule: {})", 
                        schedule.getWorkflowId(), schedule.getName());
                try {
                    workflowEngine.triggerWorkflow(schedule.getWorkflowId(), null, "SCHEDULER: " + schedule.getName());
                } catch (Exception e) {
                    log.error("Failed to run scheduled workflow {}", schedule.getWorkflowId(), e);
                }
            }, trigger);

            scheduledFutures.put(schedule.getId(), future);
            log.info("Successfully scheduled workflow schedule: {} with cron: {}", schedule.getName(), schedule.getCronExpression());
        } catch (Exception e) {
            log.error("Failed to schedule task {}: {}", schedule.getName(), e.getMessage());
        }
    }

    public synchronized void unscheduleTask(Long scheduleId) {
        ScheduledFuture<?> future = scheduledFutures.remove(scheduleId);
        if (future != null) {
            future.cancel(true);
            log.info("Unscheduled workflow schedule ID: {}", scheduleId);
        }
    }
}
