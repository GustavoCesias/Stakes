package com.stakes.api.controllers;

import com.stakes.api.models.SportEvent;
import com.stakes.api.repositories.SportEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;

@RestController
@RequestMapping("/api/calendar")
@CrossOrigin(origins = "*")
public class CalendarController {

    @Autowired
    private SportEventRepository sportEventRepository;

    @GetMapping("/events")
    public List<SportEvent> getEvents(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @RequestParam(required = false) Long leagueId) {
        
        if (leagueId != null) {
            return sportEventRepository.findByLeagueIdAndEventDateBetweenOrderByEventDateAsc(leagueId, start, end);
        }
        return sportEventRepository.findByEventDateBetweenOrderByEventDateAsc(start, end);
    }

    @PostMapping("/events")
    public SportEvent createEvent(@RequestBody SportEvent event) {
        return sportEventRepository.save(event);
    }

    @DeleteMapping("/events/{id}")
    public void deleteEvent(@PathVariable Long id) {
        sportEventRepository.deleteById(id);
    }
}
