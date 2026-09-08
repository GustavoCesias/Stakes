package com.stakes.api.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class DatabaseSyncRunner implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseSyncRunner.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        try {
            // Only execute if connected to PostgreSQL
            String dbName = jdbcTemplate.queryForObject("SELECT current_database()", String.class);
            if (dbName != null) {
                logger.info("Connected to PostgreSQL database: {}. Synchronizing ID sequences...", dbName);
                syncSequence("tips", "tips_id_seq");
                syncSequence("tickets", "tickets_id_seq");
                syncSequence("ticket_selections", "ticket_selections_id_seq");
                syncSequence("channels", "channels_id_seq");
                syncSequence("channel_subgroups", "channel_subgroups_id_seq");
                syncSequence("bet_builders", "bet_builders_id_seq");
                syncSequence("bankroll", "bankroll_id_seq");
                syncSequence("bankroll_transactions", "bankroll_transactions_id_seq");
            }
        } catch (Exception e) {
            logger.info("Skipping sequence sync. Not a PostgreSQL database or error: {}", e.getMessage());
        }
    }

    private void syncSequence(String tableName, String sequenceName) {
        try {
            // COALESCE with 1 in case the table is empty
            String query = String.format("SELECT setval('%s', COALESCE((SELECT MAX(id) FROM %s), 1), true)", sequenceName, tableName);
            jdbcTemplate.execute(query);
            logger.info("Synchronized sequence {} for table {}", sequenceName, tableName);
        } catch (Exception e) {
            logger.warn("Could not synchronize sequence {} for table {}: {}", sequenceName, tableName, e.getMessage());
        }
    }
}
