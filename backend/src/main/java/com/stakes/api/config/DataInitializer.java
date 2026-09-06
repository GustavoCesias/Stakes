package com.stakes.api.config;

import com.stakes.api.models.User;
import com.stakes.api.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        if (!userRepository.existsByUsername("gustavo")) {
            User admin = new User();
            admin.setUsername("gustavo");
            admin.setPassword(passwordEncoder.encode("gustavo232002"));
            admin.setName("Gustavo Cesias");
            admin.setRole("ROLE_ADMIN");
            userRepository.save(admin);
            System.out.println("Default admin user created: gustavo / gustavo232002");
        }
    }
}
