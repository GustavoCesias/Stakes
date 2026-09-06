package com.stakes.api.repositories;

import com.stakes.api.models.Tip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TipRepository extends JpaRepository<Tip, Long> {

    List<Tip> findAllByOrderByDateDescIdDesc();

    List<Tip> findByChannelId(Long channelId);

    @Modifying
    @Query("UPDATE Tip t SET t.channel = null WHERE t.channel.id = :channelId")
    void nullifyChannelId(@Param("channelId") Long channelId);

    @Modifying
    @Query("UPDATE Tip t SET t.subgroup = null WHERE t.subgroup.id = :subgroupId")
    void nullifySubgroupId(@Param("subgroupId") Long subgroupId);
}
