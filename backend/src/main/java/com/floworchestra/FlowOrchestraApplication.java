package com.floworchestra;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FlowOrchestraApplication {
    public static void main(String[] args) {
        SpringApplication.run(FlowOrchestraApplication.class, args);
    }
}
