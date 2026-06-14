package com.floworchestra.domain;

public enum TaskStatus {
    PENDING,
    RUNNING,
    COMPLETED,
    FAILED,
    RETRIED,
    CANCELLED,
    DLQ
}
