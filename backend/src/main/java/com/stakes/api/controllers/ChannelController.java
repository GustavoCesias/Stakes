package com.stakes.api.controllers;

import com.stakes.api.models.Channel;
import com.stakes.api.models.ChannelSubgroup;
import com.stakes.api.services.ChannelService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/channels")
@CrossOrigin(origins = "*")
public class ChannelController {

    @Autowired
    private ChannelService channelService;

    @GetMapping
    public List<Channel> getAllChannels() {
        return channelService.getAllChannels();
    }

    @PostMapping
    public Channel createChannel(@RequestBody Channel channel) {
        return channelService.createChannel(channel);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteChannel(@PathVariable Long id) {
        channelService.deleteChannel(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{channelId}/subgroups")
    public List<ChannelSubgroup> getSubgroupsByChannel(@PathVariable Long channelId) {
        return channelService.getSubgroupsByChannel(channelId);
    }

    @PostMapping("/{channelId}/subgroups")
    public ChannelSubgroup createSubgroup(@PathVariable Long channelId, @RequestBody ChannelSubgroup subgroup) {
        return channelService.createSubgroup(channelId, subgroup);
    }

    @PutMapping("/{id}")
    public Channel updateChannel(@PathVariable Long id, @RequestBody Channel channel) {
        return channelService.updateChannel(id, channel);
    }

    @PutMapping("/subgroups/{id}")
    public ChannelSubgroup updateSubgroup(@PathVariable Long id, @RequestBody ChannelSubgroup subgroup) {
        return channelService.updateSubgroup(id, subgroup);
    }

    @DeleteMapping("/subgroups/{subgroupId}")
    public ResponseEntity<Void> deleteSubgroup(@PathVariable Long subgroupId) {
        channelService.deleteSubgroup(subgroupId);
        return ResponseEntity.noContent().build();
    }
}
