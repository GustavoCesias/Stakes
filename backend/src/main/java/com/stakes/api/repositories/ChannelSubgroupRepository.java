package com.stakes.api.repositories;

import com.stakes.api.models.ChannelSubgroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChannelSubgroupRepository extends JpaRepository<ChannelSubgroup, Long> {
    List<ChannelSubgroup> findByChannelId(Long channelId);
}
