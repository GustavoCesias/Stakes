package com.stakes.api.repositories;

import com.stakes.api.models.Bankroll;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BankrollRepository extends JpaRepository<Bankroll, Long> {
}
