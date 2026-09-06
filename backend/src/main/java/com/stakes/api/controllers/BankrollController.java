package com.stakes.api.controllers;

import com.stakes.api.models.Bankroll;
import com.stakes.api.models.BankrollTransaction;
import com.stakes.api.services.BankrollService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/bankroll")
@CrossOrigin(origins = "*")
public class BankrollController {

    @Autowired
    private BankrollService bankrollService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getBankrollSummary() {
        return ResponseEntity.ok(bankrollService.getBankrollSummary());
    }

    @PutMapping("/initial")
    public ResponseEntity<Bankroll> updateInitialBalance(@RequestBody Map<String, Object> payload) {
        BigDecimal initialBalance = BigDecimal.ZERO;
        if (payload.get("initialBalance") != null) {
            initialBalance = new BigDecimal(payload.get("initialBalance").toString());
        }
        java.time.LocalDate startDate = null;
        if (payload.get("startDate") != null && !payload.get("startDate").toString().trim().isEmpty()) {
            startDate = java.time.LocalDate.parse(payload.get("startDate").toString());
        }
        return ResponseEntity.ok(bankrollService.updateInitialBalance(initialBalance, startDate));
    }

    @PostMapping("/transactions")
    public ResponseEntity<BankrollTransaction> addTransaction(@RequestBody BankrollTransaction transaction) {
        return ResponseEntity.ok(bankrollService.addTransaction(transaction));
    }

    @DeleteMapping("/transactions/{id}")
    public ResponseEntity<Void> deleteTransaction(@PathVariable Long id) {
        bankrollService.deleteTransaction(id);
        return ResponseEntity.noContent().build();
    }
}
