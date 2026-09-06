package com.stakes.api.repositories;

import com.stakes.api.models.BetBuilder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BetBuilderRepository extends JpaRepository<BetBuilder, Long> {
}
