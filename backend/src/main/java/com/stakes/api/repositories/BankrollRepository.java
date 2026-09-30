package com.stakes.api.repositories;

import com.stakes.api.models.Bankroll;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BankrollRepository extends JpaRepository<Bankroll, Long> {
    Optional<Bankroll> findByUserId(Long userId);
}
