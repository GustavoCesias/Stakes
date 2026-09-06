package com.stakes.api.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;
import java.math.BigDecimal;

@Entity
@Table(name = "tips")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Tip {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "channel_id")
    private Channel channel;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private String event;

    @Column
    private String sport; // e.g. Football

    @Column
    private String league; // e.g. La Liga

    @Column(nullable = false)
    private String market;

    @Column(nullable = false)
    private String pick;

    @Column(precision = 10, scale = 3)
    private BigDecimal odds;

    @Column(nullable = false)
    private String result = "PENDIENTE"; // PENDIENTE, GANADA, PERDIDA, NULA

    @ManyToOne
    @JoinColumn(name = "subgroup_id")
    private ChannelSubgroup subgroup;
}
