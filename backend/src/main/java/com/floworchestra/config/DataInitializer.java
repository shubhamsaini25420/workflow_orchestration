package com.floworchestra.config;

import com.floworchestra.domain.Role;
import com.floworchestra.domain.User;
import com.floworchestra.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (!userRepository.existsByUsername("admin")) {
            User admin = User.builder()
                    .username("admin")
                    .password(passwordEncoder.encode("password"))
                    .email("admin@floworchestra.com")
                    .roles(Set.of(Role.ROLE_ADMIN, Role.ROLE_DEVELOPER))
                    .build();
            userRepository.save(admin);
            log.info("Seeded administrator account: username=admin, password=password");
        }

        if (!userRepository.existsByUsername("developer")) {
            User dev = User.builder()
                    .username("developer")
                    .password(passwordEncoder.encode("password"))
                    .email("dev@floworchestra.com")
                    .roles(Set.of(Role.ROLE_DEVELOPER, Role.ROLE_OPERATOR))
                    .build();
            userRepository.save(dev);
            log.info("Seeded developer account: username=developer, password=password");
        }
    }
}
