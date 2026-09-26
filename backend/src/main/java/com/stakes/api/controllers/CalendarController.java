package com.stakes.api.controllers;

import com.stakes.api.models.SportEvent;
import com.stakes.api.models.Tip;
import com.stakes.api.models.League;
import com.stakes.api.models.Sport;
import com.stakes.api.dto.CalendarEventDto;
import com.stakes.api.repositories.SportEventRepository;
import com.stakes.api.repositories.TipRepository;
import com.stakes.api.repositories.LeagueRepository;
import com.stakes.api.repositories.SportRepository;
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

    @Autowired
    private LeagueRepository leagueRepository;

    @Autowired
    private SportRepository sportRepository;

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

        Set<String> processedTipEvents = new HashSet<>();
        for (SportEvent se : sportEvents) {
            String eventStr = se.getHomeTeam() + " vs " + se.getAwayTeam();
            String cleanEventName = eventStr.replace("\u00A0", " ").replace("\u200B", "").replace("\u200E", "").trim();
            String normalizedEvent = cleanEventName.toLowerCase().replaceAll("\\s+", " ");
            processedTipEvents.add(normalizedEvent + "_" + se.getEventDate().toLocalDate().toString());
        }

        // Add events from Tips
        LocalDate startDate = start.toLocalDate();
        LocalDate endDate = end.toLocalDate();
        List<Tip> tips = tipRepository.findByDateBetween(startDate, endDate);
        
        for (Tip tip : tips) {
            if (tip.getEvent() == null || tip.getEvent().trim().isEmpty()) continue;
            
            // Clean BB tags (e.g. "(BB)", "(BB1)", "(BB2)")
            String cleanEventName = tip.getEvent().replaceAll("(?i)\\s*\\(bb\\d*\\)\\s*", "");
            cleanEventName = cleanEventName.replace("\u00A0", " ").replace("\u200B", "").replace("\u200E", "").trim();
            if (cleanEventName.isEmpty()) continue;

            // Parse teams first
            String homeTeam = "";
            String awayTeam = "";
            String[] teams = cleanEventName.split("(?i)\\s+vs\\s+");
            if (teams.length >= 2) {
                homeTeam = teams[0].trim();
                awayTeam = teams[1].trim();
            } else {
                teams = cleanEventName.split("\\s*-\\s*");
                if (teams.length >= 2) {
                    homeTeam = teams[0].trim();
                    String away = teams[1].trim();
                    if (away.toUpperCase().endsWith(" VS")) {
                        away = away.substring(0, away.length() - 3).trim();
                    } else if (away.toUpperCase().endsWith("VS")) {
                        away = away.substring(0, away.length() - 2).trim();
                    }
                    awayTeam = away;
                } else {
                    String eventStr = cleanEventName;
                    if (eventStr.toUpperCase().endsWith(" VS")) {
                        eventStr = eventStr.substring(0, eventStr.length() - 3).trim();
                    } else if (eventStr.toUpperCase().endsWith("VS")) {
                        eventStr = eventStr.substring(0, eventStr.length() - 2).trim();
                    }
                    homeTeam = eventStr;
                    awayTeam = "";
                }
            }

            // Generate unique key AFTER parsing
            String normalizedEvent = (homeTeam + " vs " + awayTeam).toLowerCase().replaceAll("\\s+", " ");
            String uniqueKey = normalizedEvent + "_" + tip.getDate().toString();
            if (processedTipEvents.contains(uniqueKey)) continue;
            processedTipEvents.add(uniqueKey);

            CalendarEventDto dto = new CalendarEventDto();
            dto.setId(null); // No ID for old tips, so they can't be deleted via calendar
            dto.setHomeTeam(homeTeam);
            dto.setAwayTeam(awayTeam);
            
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

    @GetMapping("/events/tips")
    public List<Tip> getTipsForEvent(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam String homeTeam,
            @RequestParam String awayTeam) {
        
        List<Tip> allTipsOnDate = tipRepository.findByDateBetween(date, date);
        List<Tip> matchingTips = new ArrayList<>();
        
        String queryEventName = homeTeam.trim() + (awayTeam.trim().isEmpty() ? "" : " vs " + awayTeam.trim());
        String normalizedQuery = queryEventName.toLowerCase().replaceAll("\\s+", " ");
        
        // Also support searching just by home team if away team wasn't parsed well
        String normalizedHomeOnly = homeTeam.trim().toLowerCase().replaceAll("\\s+", " ");
        
        for (Tip tip : allTipsOnDate) {
            if (tip.getEvent() == null) continue;
            String cleanEventName = tip.getEvent().replaceAll("(?i)\\s*\\(bb\\d*\\)\\s*", "").trim();
            String normalizedEvent = cleanEventName.toLowerCase().replaceAll("\\s+", " ");
            
            if (normalizedEvent.contains(normalizedQuery) || 
                (awayTeam.trim().isEmpty() && normalizedEvent.contains(normalizedHomeOnly))) {
                matchingTips.add(tip);
            }
        }
        
        return matchingTips;
    }

    @PostMapping("/events")
    public SportEvent createEvent(@RequestBody SportEvent event) {
        if (event.getLeague() != null) {
            String leagueName = event.getLeague().getName();
            League league = leagueRepository.findByName(leagueName).orElseGet(() -> {
                League newLeague = new League();
                newLeague.setName(leagueName);
                if (event.getLeague().getSport() != null) {
                    String sportName = event.getLeague().getSport().getName();
                    Sport sport = sportRepository.findByName(sportName).orElseGet(() -> {
                        Sport newSport = new Sport();
                        newSport.setName(sportName);
                        return sportRepository.save(newSport);
                    });
                    newLeague.setSport(sport);
                }
                return leagueRepository.save(newLeague);
            });
            event.setLeague(league);
        }
        return sportEventRepository.save(event);
    }

    @DeleteMapping("/events/{id}")
    public void deleteEvent(@PathVariable Long id) {
        sportEventRepository.deleteById(id);
    }
}
