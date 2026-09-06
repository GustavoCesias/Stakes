package com.stakes.api.repositories;

import com.stakes.api.models.BankrollTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BankrollTransactionRepository extends JpaRepository<BankrollTransaction, Long> {
    List<BankrollTransaction> findAllByOrderByDateDescIdDesc();
}
