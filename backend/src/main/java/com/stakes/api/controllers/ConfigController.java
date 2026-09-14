package com.stakes.api.controllers;

import com.stakes.api.models.Sport;
import com.stakes.api.models.League;
import com.stakes.api.models.MarketConfig;
import com.stakes.api.repositories.SportRepository;
import com.stakes.api.repositories.LeagueRepository;
import com.stakes.api.repositories.MarketConfigRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/config")
@CrossOrigin(origins = "*")
public class ConfigController {

    @Autowired
    private SportRepository sportRepository;

    @Autowired
    private LeagueRepository leagueRepository;

    @Autowired
    private MarketConfigRepository marketConfigRepository;

    @Autowired
    private com.stakes.api.repositories.TipRepository tipRepository;

    @PostMapping("/migrate-legacy")
    public String migrateLegacyData() {
        List<com.stakes.api.models.Tip> tips = tipRepository.findAll();
        
        // Migrate Sports
        java.util.Set<String> sportNames = tips.stream()
                .map(com.stakes.api.models.Tip::getSport)
                .filter(s -> s != null && !s.trim().isEmpty())
                .collect(java.util.stream.Collectors.toSet());
                
        java.util.Map<String, Sport> sportMap = new java.util.HashMap<>();
        for (Sport s : sportRepository.findAll()) {
            sportMap.put(s.getName().toLowerCase(), s);
        }
        for (String sName : sportNames) {
            if (!sportMap.containsKey(sName.toLowerCase())) {
                Sport s = new Sport();
                s.setName(sName);
                s.setIcon("🏅");
                s = sportRepository.save(s);
                sportMap.put(sName.toLowerCase(), s);
            }
        }
        
        // Migrate Leagues
        java.util.Set<String> leagueKeys = new java.util.HashSet<>();
        for (League l : leagueRepository.findAll()) {
            if (l.getSport() != null) {
                leagueKeys.add(l.getSport().getName().toLowerCase() + "|" + l.getName().toLowerCase());
            }
        }
        for (com.stakes.api.models.Tip tip : tips) {
            if (tip.getSport() == null || tip.getLeague() == null || tip.getLeague().trim().isEmpty()) continue;
            String key = tip.getSport().toLowerCase() + "|" + tip.getLeague().toLowerCase();
            if (!leagueKeys.contains(key)) {
                Sport sport = sportMap.get(tip.getSport().toLowerCase());
                if (sport != null) {
                    League l = new League();
                    l.setName(tip.getLeague());
                    l.setSport(sport);
                    leagueRepository.save(l);
                    leagueKeys.add(key);
                }
            }
        }
        
        // Migrate Markets
        java.util.Set<String> marketKeys = new java.util.HashSet<>();
        for (MarketConfig m : marketConfigRepository.findAll()) {
            if (m.getSport() != null) {
                marketKeys.add(m.getSport().getName().toLowerCase() + "|" + m.getName().toLowerCase());
            }
        }
        for (com.stakes.api.models.Tip tip : tips) {
            if (tip.getSport() == null || tip.getMarket() == null || tip.getMarket().trim().isEmpty()) continue;
            String key = tip.getSport().toLowerCase() + "|" + tip.getMarket().toLowerCase();
            if (!marketKeys.contains(key)) {
                Sport sport = sportMap.get(tip.getSport().toLowerCase());
                if (sport != null) {
                    MarketConfig m = new MarketConfig();
                    m.setName(tip.getMarket());
                    m.setSport(sport);
                    m.setInputType("text");
                    marketConfigRepository.save(m);
                    marketKeys.add(key);
                }
            }
        }
        
        return "{\"status\":\"success\"}";
    }

    // --- SPORTS ---
    @GetMapping("/sports")
    public List<Sport> getAllSports() {
        return sportRepository.findAll();
    }

    @PostMapping("/sports")
    public Sport createSport(@RequestBody Sport sport) {
        return sportRepository.save(sport);
    }

    @DeleteMapping("/sports/{id}")
    public void deleteSport(@PathVariable Long id) {
        sportRepository.deleteById(id);
    }

    // --- LEAGUES ---
    @GetMapping("/leagues")
    public List<League> getAllLeagues() {
        return leagueRepository.findAll();
    }

    @PostMapping("/leagues")
    public League createLeague(@RequestBody League league) {
        return leagueRepository.save(league);
    }

    @PutMapping("/leagues/{id}")
    public League updateLeague(@PathVariable Long id, @RequestBody League leagueDetails) {
        League league = leagueRepository.findById(id).orElseThrow(() -> new RuntimeException("League not found"));
        
        String oldName = league.getName();
        String newName = leagueDetails.getName();
        
        league.setName(newName);
        league.setCountry(leagueDetails.getCountry());
        league.setSport(leagueDetails.getSport());
        
        League savedLeague = leagueRepository.save(league);
        
        if (oldName != null && newName != null && !oldName.equals(newName)) {
            List<com.stakes.api.models.Tip> tips = tipRepository.findByLeague(oldName);
            for (com.stakes.api.models.Tip t : tips) {
                t.setLeague(newName);
            }
            if (!tips.isEmpty()) {
                tipRepository.saveAll(tips);
            }
        }
        
        return savedLeague;
    }

    @DeleteMapping("/leagues/{id}")
    public void deleteLeague(@PathVariable Long id) {
        leagueRepository.deleteById(id);
    }

    // --- MARKETS ---
    @GetMapping("/markets")
    public List<java.util.Map<String, Object>> getAllMarkets() {
        return marketConfigRepository.findAll().stream().map(market -> {
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", market.getId());
            map.put("name", market.getName());
            map.put("inputType", market.getInputType());
            map.put("options", market.getOptions());
            if (market.getSport() != null) {
                java.util.Map<String, Object> sportMap = new java.util.HashMap<>();
                sportMap.put("id", market.getSport().getId());
                sportMap.put("name", market.getSport().getName());
                sportMap.put("icon", market.getSport().getIcon());
                map.put("sport", sportMap);
            }
            return map;
        }).collect(java.util.stream.Collectors.toList());
    }

    @PostMapping("/markets")
    public MarketConfig createMarket(@RequestBody MarketConfig market) {
        return marketConfigRepository.save(market);
    }

    @DeleteMapping("/markets/{id}")
    public void deleteMarket(@PathVariable Long id) {
        marketConfigRepository.deleteById(id);
    }
}
