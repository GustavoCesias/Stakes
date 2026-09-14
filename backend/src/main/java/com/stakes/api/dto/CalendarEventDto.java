package com.stakes.api.dto;

import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CalendarEventDto {
    private Long id; // Null for old tips
    private String homeTeam;
    private String awayTeam;
    private String eventDate; 
    private Map<String, Object> league;
}
