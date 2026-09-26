package com.stakes.api.repositories;

import com.stakes.api.models.League;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface LeagueRepository extends JpaRepository<League, Long> {
    List<League> findBySportId(Long sportId);
    Optional<League> findByName(String name);
}
