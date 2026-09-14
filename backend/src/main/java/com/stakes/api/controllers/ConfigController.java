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
