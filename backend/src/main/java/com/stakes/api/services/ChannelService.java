package com.stakes.api.services;

import com.stakes.api.models.Channel;
import com.stakes.api.models.ChannelSubgroup;
import com.stakes.api.repositories.ChannelRepository;
import com.stakes.api.repositories.ChannelSubgroupRepository;
import com.stakes.api.repositories.TicketRepository;
import com.stakes.api.repositories.TipRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ChannelService {

    @Autowired
    private ChannelRepository channelRepository;

    @Autowired
    private ChannelSubgroupRepository channelSubgroupRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private TipRepository tipRepository;

    public List<Channel> getAllChannels() {
        return channelRepository.findAll();
    }

    public Channel createChannel(Channel channel) {
        return channelRepository.save(channel);
    }

    public List<ChannelSubgroup> getSubgroupsByChannel(Long channelId) {
        return channelSubgroupRepository.findByChannelId(channelId);
    }

    public ChannelSubgroup createSubgroup(Long channelId, ChannelSubgroup subgroup) {
        Channel channel = channelRepository.findById(channelId).orElseThrow();
        subgroup.setChannel(channel);
        return channelSubgroupRepository.save(subgroup);
    }

    public Channel updateChannel(Long id, Channel channelDetails) {
        Channel channel = channelRepository.findById(id).orElseThrow();
        channel.setName(channelDetails.getName());
        channel.setType(channelDetails.getType());
        return channelRepository.save(channel);
    }

    public ChannelSubgroup updateSubgroup(Long id, ChannelSubgroup subgroupDetails) {
        ChannelSubgroup subgroup = channelSubgroupRepository.findById(id).orElseThrow();
        subgroup.setName(subgroupDetails.getName());
        return channelSubgroupRepository.save(subgroup);
    }

    @Transactional
    public void deleteSubgroup(Long subgroupId) {
        ticketRepository.nullifySubgroupId(subgroupId);
        tipRepository.nullifySubgroupId(subgroupId);
        channelSubgroupRepository.deleteById(subgroupId);
    }

    @Transactional
    public void deleteChannel(Long channelId) {
        // Desvincular tips asociados directamente al canal
        tipRepository.nullifyChannelId(channelId);

        // Desvincular y eliminar los subgrupos del canal
        List<ChannelSubgroup> subgroups = channelSubgroupRepository.findByChannelId(channelId);
        for (ChannelSubgroup sg : subgroups) {
            ticketRepository.nullifySubgroupId(sg.getId());
            tipRepository.nullifySubgroupId(sg.getId());
        }
        channelSubgroupRepository.deleteAll(subgroups);

        // Eliminar el canal
        channelRepository.deleteById(channelId);
    }
}
