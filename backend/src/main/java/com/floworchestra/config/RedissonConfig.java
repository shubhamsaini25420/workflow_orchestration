package com.floworchestra.config;

import org.redisson.Redisson;
import org.redisson.api.RedissonClient;
import org.redisson.config.Config;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import lombok.extern.slf4j.Slf4j;

@Configuration
@Slf4j
public class RedissonConfig {

    /**
     * Only create Redisson client in distributed (prod) mode.
     */
    @Bean(destroyMethod = "shutdown")
    @ConditionalOnProperty(name = "floworchestra.engine.mode", havingValue = "distributed")
    public RedissonClient redissonClient(@Value("${spring.data.redis.host:localhost}") String host,
                                         @Value("${spring.data.redis.port:6379}") int port) {
        Config config = new Config();
        config.useSingleServer()
              .setAddress("redis://" + host + ":" + port)
              .setConnectionMinimumIdleSize(1)
              .setConnectionPoolSize(4);
        log.info("Initializing Redisson distributed lock client at {}:{}", host, port);
        return Redisson.create(config);
    }

    /**
     * Dummy bean to prevent Redisson's starter from auto-configuring and trying to connect to localhost:6379.
     */
    @Bean(destroyMethod = "")
    @ConditionalOnProperty(name = "floworchestra.engine.mode", havingValue = "standalone", matchIfMissing = true)
    public RedissonClient dummyRedissonClient() {
        log.info("Using dummy Redisson client for standalone mode to bypass auto-configuration");
        return null;
    }
}
