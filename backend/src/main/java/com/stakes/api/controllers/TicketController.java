package com.stakes.api.controllers;

import com.stakes.api.models.Ticket;
import com.stakes.api.services.TicketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/tickets")
@CrossOrigin(origins = "*") // Para Angular en localhost
public class TicketController {

    @Autowired
    private TicketService ticketService;

    @GetMapping
    public List<Ticket> getAllTickets() {
        return ticketService.getAllTickets();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Ticket> getTicketById(@PathVariable Long id) {
        return ticketService.getTicketById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createTicket(@RequestBody Ticket ticket) {
        try {
            // Asignar referencias en listas de TicketSelection y BetBuilder
            if (ticket.getSelections() != null) {
                ticket.getSelections().forEach(s -> s.setTicket(ticket));
            }
            if (ticket.getBetBuilders() != null) {
                ticket.getBetBuilders().forEach(b -> {
                    b.setTicket(ticket);
                    if (b.getSelections() != null) {
                        b.getSelections().forEach(s -> {
                            s.setBetBuilder(b);
                            s.setTicket(ticket); // Para redundancia necesaria
                        });
                    }
                });
            }
            Ticket saved = ticketService.saveTicket(ticket);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("message", e.getMessage() != null ? e.getMessage() : "Error interno al guardar ticket"));
        }
    }

    @PutMapping("/{id}/result")
    public ResponseEntity<Ticket> updateTicketResult(
            @PathVariable Long id, 
            @RequestBody com.stakes.api.dto.TicketCloseRequest request) {
        try {
            Ticket updated = ticketService.updateTicketResult(id, request);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTicket(@PathVariable Long id) {
        ticketService.deleteTicket(id);
        return ResponseEntity.noContent().build();
    }
}
