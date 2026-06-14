package com.floworchestra.service;

import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;

@Service
@Slf4j
public class LockService {

    private final String mode;
    private final RedissonClient redissonClient;
    private final ConcurrentHashMap<String, ReentrantLock> localLocks = new ConcurrentHashMap<>();

    public LockService(
            @Value("${floworchestra.engine.mode:standalone}") String mode,
            @Autowired(required = false) RedissonClient redissonClient) {
        this.mode = mode;
        this.redissonClient = redissonClient;
        log.info("Initialized LockService in {} mode", mode);
    }

    public boolean acquireLock(String lockKey, long waitTimeSeconds, long leaseTimeSeconds) {
        if ("distributed".equalsIgnoreCase(mode) && redissonClient != null) {
            try {
                RLock lock = redissonClient.getLock(lockKey);
                return lock.tryLock(waitTimeSeconds, leaseTimeSeconds, TimeUnit.SECONDS);
            } catch (Exception e) {
                log.error("Failed to acquire distributed lock for key: {}, falling back to local lock", lockKey, e);
            }
        }
        
        // Standalone fallback
        ReentrantLock localLock = localLocks.computeIfAbsent(lockKey, k -> new ReentrantLock());
        try {
            return localLock.tryLock(waitTimeSeconds, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    public void releaseLock(String lockKey) {
        if ("distributed".equalsIgnoreCase(mode) && redissonClient != null) {
            try {
                RLock lock = redissonClient.getLock(lockKey);
                if (lock.isHeldByCurrentThread()) {
                    lock.unlock();
                    return;
                }
            } catch (Exception e) {
                log.error("Failed to release distributed lock for key: {}", lockKey, e);
            }
        }

        ReentrantLock localLock = localLocks.get(lockKey);
        if (localLock != null && localLock.isHeldByCurrentThread()) {
            localLock.unlock();
        }
    }
}
