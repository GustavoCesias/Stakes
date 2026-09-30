package com.stakes.api.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.math.BigDecimal;

import java.time.LocalDate;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "bankroll")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Bankroll {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "initial_balance", precision = 10, scale = 2, nullable = false)
    private BigDecimal initialBalance = BigDecimal.ZERO;

    @Column(name = "start_date")
    private LocalDate startDate;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnore
    private User user;
}
