package com.stakes.api.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.math.BigDecimal;
import java.util.List;
import java.util.ArrayList;

@Entity
@Table(name = "bet_builders")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BetBuilder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    @Column(name = "expected_odds", precision = 10, scale = 3)
    private BigDecimal expectedOdds;

    @Column(name = "real_odds", precision = 10, scale = 3)
    private BigDecimal realOdds;

    @OneToMany(mappedBy = "betBuilder", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TicketSelection> selections = new ArrayList<>();
}
