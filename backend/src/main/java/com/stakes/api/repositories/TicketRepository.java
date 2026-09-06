package com.stakes.api.repositories;

import com.stakes.api.models.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {

    List<Ticket> findAllByOrderByDateDescIdDesc();

    @Modifying
    @Query("UPDATE Ticket t SET t.subgroup = null WHERE t.subgroup.id = :subgroupId")
    void nullifySubgroupId(@Param("subgroupId") Long subgroupId);
}
