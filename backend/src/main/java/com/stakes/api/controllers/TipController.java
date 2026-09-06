package com.stakes.api.controllers;

import com.stakes.api.models.Tip;
import com.stakes.api.services.TipService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tips")
@CrossOrigin(origins = "*")
public class TipController {

    @Autowired
    private TipService tipService;

    @GetMapping
    public List<Tip> getAllTips() {
        return tipService.getAllTips();
    }

    @PostMapping
    public Tip createTip(@RequestBody Tip tip) {
        return tipService.createTip(tip);
    }
    
    @PostMapping("/batch")
    public List<Tip> createTips(@RequestBody List<Tip> tips) {
        return tipService.createTips(tips);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTip(@PathVariable Long id) {
        tipService.deleteTip(id);
        return ResponseEntity.noContent().build();
    }
}
