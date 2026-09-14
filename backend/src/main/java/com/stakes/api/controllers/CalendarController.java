package com.stakes.api.controllers;

import com.stakes.api.models.SportEvent;
import com.stakes.api.models.Tip;
import com.stakes.api.dto.CalendarEventDto;
import com.stakes.api.repositories.SportEventRepository;
import com.stakes.api.repositories.TipRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;
import org.springframework.format.annotation.DateTimeFormat;

@RestController
@RequestMapping("/api/v1/calendar")
@CrossOrigin(origins = "*")
public class CalendarController {

    @Autowired
    private SportEventRepository sportEventRepository;

    @Autowired
    private TipRepository tipRepository;

    @GetMapping("/events")
    public List<CalendarEventDto> getEvents(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @RequestParam(required = false) Long leagueId) {
        
        List<SportEvent> sportEvents;
        if (leagueId != null) {
            sportEvents = sportEventRepository.findByLeagueIdAndEventDateBetweenOrderByEventDateAsc(leagueId, start, end);
        } else {
            sportEvents = sportEventRepository.findByEventDateBetweenOrderByEventDateAsc(start, end);
        }

        List<CalendarEventDto> dtos = new ArrayList<>();
        
        // Add actual SportEvents
        for (SportEvent se : sportEvents) {
            CalendarEventDto dto = new CalendarEventDto();
            dto.setId(se.getId());
            dto.setHomeTeam(se.getHomeTeam());
            dto.setAwayTeam(se.getAwayTeam());
            dto.setEventDate(se.getEventDate().toString());
            
            if (se.getLeague() != null) {
                Map<String, Object> leagueMap = new HashMap<>();
                leagueMap.put("id", se.getLeague().getId());
                leagueMap.put("name", se.getLeague().getName());
                if (se.getLeague().getSport() != null) {
                    Map<String, Object> sportMap = new HashMap<>();
                    sportMap.put("id", se.getLeague().getSport().getId());
                    sportMap.put("name", se.getLeague().getSport().getName());
                    sportMap.put("icon", se.getLeague().getSport().getIcon());
                    leagueMap.put("sport", sportMap);
                }
                dto.setLeague(leagueMap);
            }
            dtos.add(dto);
        }

        // Add events from Tips
        LocalDate startDate = start.toLocalDate();
        LocalDate endDate = end.toLocalDate();
        List<Tip> tips = tipRepository.findByDateBetween(startDate, endDate);
        
        Set<String> processedTipEvents = new HashSet<>();
        
        for (Tip tip : tips) {
            if (tip.getEvent() == null || tip.getEvent().isEmpty()) continue;
            
            String uniqueKey = tip.getEvent() + "_" + tip.getDate().toString();
            if (processedTipEvents.contains(uniqueKey)) continue;
            processedTipEvents.add(uniqueKey);
            
            // Check if it matches league filter (by name)
            if (leagueId != null) {
                // Not perfectly accurate since Tip only has String league, but we can skip filtering for old tips
                // Or try to match if we want to be strict. For simplicity, we show it if league matches or is null
                // We'll skip filtering for old tips to ensure they are visible.
            }
            
            CalendarEventDto dto = new CalendarEventDto();
            dto.setId(null); // No ID for old tips, so they can't be deleted via calendar
            
            String[] teams = tip.getEvent().split(" vs ");
            if (teams.length >= 2) {
                dto.setHomeTeam(teams[0].trim());
                dto.setAwayTeam(teams[1].trim());
            } else {
                dto.setHomeTeam(tip.getEvent());
                dto.setAwayTeam("");
            }
            
            // Set time to 00:00 for old tips since they only have LocalDate
            dto.setEventDate(tip.getDate().atStartOfDay().toString());
            
            Map<String, Object> leagueMap = new HashMap<>();
            leagueMap.put("id", 0L);
            leagueMap.put("name", tip.getLeague() != null ? tip.getLeague() : "N/A");
            Map<String, Object> sportMap = new HashMap<>();
            sportMap.put("id", 0L);
            sportMap.put("name", tip.getSport() != null ? tip.getSport() : "N/A");
            // Basic icon guessing for old tips
            String icon = "⚽";
            if (tip.getSport() != null) {
                String s = tip.getSport().toLowerCase();
                if (s.contains("tenis") || s.contains("tennis")) icon = "🎾";
                else if (s.contains("basket")) icon = "🏀";
                else if (s.contains("mma") || s.contains("ufc")) icon = "🥊";
                else if (s.contains("beisbol") || s.contains("baseball")) icon = "⚾";
                else if (s.contains("americano")) icon = "🏈";
            }
            sportMap.put("icon", icon);
            leagueMap.put("sport", sportMap);
            dto.setLeague(leagueMap);
            
            dtos.add(dto);
        }

        return dtos;
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
