package com.stakes.api.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "ticket_selections")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TicketSelection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne
    @JoinColumn(name = "bet_builder_id")
    private BetBuilder betBuilder; // Nullable, if not part of BB

    @ManyToOne
    @JoinColumn(name = "tip_id")
    private Tip tip; // Optional reference to the original tip

    @Column(nullable = false)
    private String result = "PENDIENTE"; // PENDIENTE, GANADA, PERDIDA, NULA
}
