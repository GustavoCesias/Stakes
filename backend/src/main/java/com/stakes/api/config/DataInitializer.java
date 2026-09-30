package com.stakes.api.config;

import com.stakes.api.models.User;
import com.stakes.api.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.Optional;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        User admin;
        Optional<User> adminOpt = userRepository.findByUsername("gustavo");
        if (adminOpt.isEmpty()) {
            admin = new User();
            admin.setUsername("gustavo");
            admin.setPassword(passwordEncoder.encode("gustavo232002"));
            admin.setName("Gustavo Cesias");
            admin.setRole("ROLE_ADMIN");
            admin.setApproved(true);
            admin = userRepository.save(admin);
            System.out.println("Default admin user created: gustavo / gustavo232002");
        } else {
            admin = adminOpt.get();
            if (!admin.isApproved() || !"ROLE_ADMIN".equals(admin.getRole())) {
                admin.setApproved(true);
                admin.setRole("ROLE_ADMIN");
                admin = userRepository.save(admin);
                System.out.println("Existing admin user updated to approved=true and ROLE_ADMIN");
            }
        }

        // Migrate existing data to the admin user
        Long adminId = admin.getId();
        System.out.println("Migrating existing data to user ID: " + adminId);
        
        jdbcTemplate.update("UPDATE tickets SET user_id = ? WHERE user_id IS NULL", adminId);
        jdbcTemplate.update("UPDATE tips SET user_id = ? WHERE user_id IS NULL", adminId);
        jdbcTemplate.update("UPDATE channels SET user_id = ? WHERE user_id IS NULL", adminId);
        jdbcTemplate.update("UPDATE channel_subgroups SET user_id = ? WHERE user_id IS NULL", adminId);
        jdbcTemplate.update("UPDATE bankroll SET user_id = ? WHERE user_id IS NULL", adminId);
        jdbcTemplate.update("UPDATE sport_events SET user_id = ? WHERE user_id IS NULL", adminId);
    }
}
