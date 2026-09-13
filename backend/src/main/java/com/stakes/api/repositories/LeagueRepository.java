package com.stakes.api.repositories;

import com.stakes.api.models.League;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LeagueRepository extends JpaRepository<League, Long> {
    List<League> findBySportId(Long sportId);
}
