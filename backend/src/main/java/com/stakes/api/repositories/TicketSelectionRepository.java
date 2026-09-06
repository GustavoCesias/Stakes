package com.stakes.api.repositories;

import com.stakes.api.models.TicketSelection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TicketSelectionRepository extends JpaRepository<TicketSelection, Long> {

    @Modifying
    @Query("UPDATE TicketSelection ts SET ts.tip = null WHERE ts.tip.id = :tipId")
    void nullifyTipId(@Param("tipId") Long tipId);

    java.util.List<TicketSelection> findByTipId(Long tipId);
}
