package com.stakes.api.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.Map;

@Data
public class TicketCloseRequest {
    private String result;
    private BigDecimal cashoutAmount;
    // Mapa de ID de TicketSelection -> "GANADA", "PERDIDA", "NULA"
    private Map<Long, String> selectionResults;
}
