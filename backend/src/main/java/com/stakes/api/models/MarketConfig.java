package com.stakes.api.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Entity
@Table(name = "market_configs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MarketConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name; // e.g. "Goles Totales", "Ganador del Partido"

    @Column(nullable = false)
    private String inputType; // e.g. "NUMERIC", "OPTIONS", "TEXT"

    @ElementCollection
    @CollectionTable(name = "market_options", joinColumns = @JoinColumn(name = "market_id"))
    @Column(name = "option_value")
    private List<String> options; // e.g. ["Local", "Empate", "Visita"] for OPTIONS type
}
