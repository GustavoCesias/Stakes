package com.stakes.api.repositories;

import com.stakes.api.models.SportEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface SportEventRepository extends JpaRepository<SportEvent, Long> {
    List<SportEvent> findByUserIdAndEventDateBetweenOrderByEventDateAsc(Long userId, LocalDateTime start, LocalDateTime end);
    List<SportEvent> findByUserIdAndLeagueIdAndEventDateBetweenOrderByEventDateAsc(Long userId, Long leagueId, LocalDateTime start, LocalDateTime end);
}
