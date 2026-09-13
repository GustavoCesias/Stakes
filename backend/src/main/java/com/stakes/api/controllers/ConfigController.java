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
@RequestMapping("/api/config")
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
    public List<MarketConfig> getAllMarkets() {
        return marketConfigRepository.findAll();
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
