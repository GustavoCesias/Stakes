package com.stakes.api.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;
import java.util.ArrayList;

@Entity
@Table(name = "tickets")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private String type; // SIMPLE, COMBINADA, MIXTA, BET_BUILDER_PURO

    @Column(nullable = false)
    private String bookmaker;

    @Column(precision = 10, scale = 2)
    private BigDecimal stake;

    @Column(name = "total_odds", precision = 10, scale = 3)
    private BigDecimal totalOdds;

    @com.fasterxml.jackson.annotation.JsonProperty("isCashout")
    @Column(name = "is_cashout")
    private Boolean isCashout = false;

    @Column(name = "cashout_amount", precision = 10, scale = 2)
    private BigDecimal cashoutAmount;

    @Column(nullable = false)
    private String result = "PENDIENTE"; // PENDIENTE, GANADA, PERDIDA, CASHOUT, NULA

    @Column(precision = 10, scale = 2)
    private BigDecimal profit;

    @Column(name = "is_original")
    private Boolean originalTipster = false; // true si es el ticket original del tipster, false si es rearmado

    @ManyToOne
    @JoinColumn(name = "subgroup_id")
    private ChannelSubgroup subgroup;

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TicketSelection> selections = new ArrayList<>();

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BetBuilder> betBuilders = new ArrayList<>();

}
