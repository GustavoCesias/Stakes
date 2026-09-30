package com.stakes.api.services;

import com.stakes.api.models.Bankroll;
import com.stakes.api.models.BankrollTransaction;
import com.stakes.api.repositories.BankrollRepository;
import com.stakes.api.repositories.BankrollTransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import com.stakes.api.models.User;

@Service
public class BankrollService {

    @Autowired
    private BankrollRepository bankrollRepository;

    @Autowired
    private BankrollTransactionRepository transactionRepository;

    @Autowired
    private UserService userService;

    public Bankroll getBankroll() {
        User user = userService.getCurrentUser();
        Optional<Bankroll> opt = bankrollRepository.findByUserId(user.getId());
        if (opt.isEmpty()) {
            Bankroll defaultBankroll = new Bankroll();
            defaultBankroll.setInitialBalance(BigDecimal.ZERO);
            defaultBankroll.setStartDate(LocalDate.now().withDayOfMonth(1));
            defaultBankroll.setUser(user);
            return bankrollRepository.save(defaultBankroll);
        }
        Bankroll b = opt.get();
        if (b.getStartDate() == null) {
            b.setStartDate(LocalDate.now().withDayOfMonth(1));
            b = bankrollRepository.save(b);
        }
        return b;
    }

    public Bankroll updateInitialBalance(BigDecimal initialBalance, LocalDate startDate) {
        Bankroll b = getBankroll();
        b.setInitialBalance(initialBalance != null ? initialBalance : BigDecimal.ZERO);
        if (startDate != null) {
            b.setStartDate(startDate);
        } else if (b.getStartDate() == null) {
            b.setStartDate(LocalDate.now().withDayOfMonth(1));
        }
        return bankrollRepository.save(b);
    }

    public List<BankrollTransaction> getAllTransactions() {
        return transactionRepository.findAllByUserIdOrderByDateDescIdDesc(userService.getCurrentUser().getId());
    }

    public BankrollTransaction addTransaction(BankrollTransaction tx) {
        if (tx.getDate() == null) {
            tx.setDate(LocalDate.now());
        }
        if (tx.getAmount() == null) {
            tx.setAmount(BigDecimal.ZERO);
        }
        if (tx.getType() == null || tx.getType().trim().isEmpty()) {
            tx.setType("DEPOSIT");
        }
        tx.setUser(userService.getCurrentUser());
        return transactionRepository.save(tx);
    }

    public void deleteTransaction(Long id) {
        transactionRepository.deleteById(id);
    }

    public Map<String, Object> getBankrollSummary() {
        Bankroll bankroll = getBankroll();
        List<BankrollTransaction> transactions = getAllTransactions();

        BigDecimal totalDeposits = BigDecimal.ZERO;
        BigDecimal totalWithdrawals = BigDecimal.ZERO;

        for (BankrollTransaction tx : transactions) {
            if ("DEPOSIT".equalsIgnoreCase(tx.getType())) {
                totalDeposits = totalDeposits.add(tx.getAmount() != null ? tx.getAmount() : BigDecimal.ZERO);
            } else if ("WITHDRAWAL".equalsIgnoreCase(tx.getType())) {
                totalWithdrawals = totalWithdrawals.add(tx.getAmount() != null ? tx.getAmount() : BigDecimal.ZERO);
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("initialBalance", bankroll.getInitialBalance());
        response.put("startDate", bankroll.getStartDate());
        response.put("totalDeposits", totalDeposits);
        response.put("totalWithdrawals", totalWithdrawals);
        response.put("transactions", transactions);
        return response;
    }
}
