package com.floworchestra.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "task_instances")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskInstance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long workflowInstanceId;

    @Column(nullable = false)
    private String nodeId; // Id of node in workflow canvas definition

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type; // Node type: e.g. START, END, HTTP, SSH, SCRIPT, SWITCH

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status;

    @Column(columnDefinition = "TEXT")
    private String inputJson;

    @Column(columnDefinition = "TEXT")
    private String outputJson;

    @Column(length = 2000)
    private String errorMessage;

    @Column(nullable = false)
    @Builder.Default
    private Integer retryCount = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer maxRetries = 3;

    @Column(nullable = false)
    @Builder.Default
    private Integer priority = 0;

    private LocalDateTime scheduledAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;

    @PrePersist
    protected void onCreate() {
        scheduledAt = LocalDateTime.now();
    }
}
