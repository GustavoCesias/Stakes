package com.stakes.api.repositories;

import com.stakes.api.models.MarketConfig;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MarketConfigRepository extends JpaRepository<MarketConfig, Long> {
}
