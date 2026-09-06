package com.stakes.api.controllers;

import com.stakes.api.models.*;
import com.stakes.api.repositories.*;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/backup")
@CrossOrigin(origins = "*")
public class BackupController {

    @Autowired
    private BankrollRepository bankrollRepository;

    @Autowired
    private BankrollTransactionRepository bankrollTransactionRepository;

    @Autowired
    private ChannelRepository channelRepository;

    @Autowired
    private ChannelSubgroupRepository channelSubgroupRepository;

    @Autowired
    private TipRepository tipRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private TicketSelectionRepository ticketSelectionRepository;

    @Data
    public static class BackupData {
        private String exportedAt;
        private List<Bankroll> bankrolls;
        private List<BankrollTransaction> bankrollTransactions;
        private List<Channel> channels;
        private List<ChannelSubgroup> channelSubgroups;
        private List<Tip> tips;
        private List<Ticket> tickets;
    }

    @GetMapping("/export")
    public ResponseEntity<BackupData> exportData() {
        BackupData backup = new BackupData();
        backup.setExportedAt(LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
        backup.setBankrolls(bankrollRepository.findAll());
        backup.setBankrollTransactions(bankrollTransactionRepository.findAllByOrderByDateDescIdDesc());
        backup.setChannels(channelRepository.findAll());
        backup.setChannelSubgroups(channelSubgroupRepository.findAll());
        backup.setTips(tipRepository.findAllByOrderByDateDescIdDesc());
        backup.setTickets(ticketRepository.findAllByOrderByDateDescIdDesc());

        String filename = "stakes_backup_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")) + ".json";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_JSON)
                .body(backup);
    }

    @PostMapping("/import")
    @Transactional
    public ResponseEntity<?> importData(@RequestBody BackupData backup) {
        if (backup == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Datos de respaldo inválidos"));
        }

        try {
            // 1. Bankrolls
            if (backup.getBankrolls() != null) {
                for (Bankroll b : backup.getBankrolls()) {
                    b.setId(null);
                    bankrollRepository.save(b);
                }
            }

            // 2. Bankroll Transactions
            if (backup.getBankrollTransactions() != null) {
                for (BankrollTransaction tx : backup.getBankrollTransactions()) {
                    tx.setId(null);
                    bankrollTransactionRepository.save(tx);
                }
            }

            // 3. Channels mapping
            Map<Long, Channel> channelMap = new java.util.HashMap<>();
            if (backup.getChannels() != null) {
                for (Channel ch : backup.getChannels()) {
                    Long oldId = ch.getId();
                    ch.setId(null);
                    Channel saved = channelRepository.save(ch);
                    if (oldId != null) {
                        channelMap.put(oldId, saved);
                    }
                }
            }

            // 4. Tips mapping
            Map<Long, Tip> tipMap = new java.util.HashMap<>();
            if (backup.getTips() != null) {
                for (Tip tip : backup.getTips()) {
                    Long oldTipId = tip.getId();
                    tip.setId(null);
                    if (tip.getChannel() != null && tip.getChannel().getId() != null) {
                        Channel matched = channelMap.get(tip.getChannel().getId());
                        if (matched != null) {
                            tip.setChannel(matched);
                        } else {
                            tip.getChannel().setId(null);
                            Channel savedCh = channelRepository.save(tip.getChannel());
                            tip.setChannel(savedCh);
                        }
                    }
                    Tip savedTip = tipRepository.save(tip);
                    if (oldTipId != null) {
                        tipMap.put(oldTipId, savedTip);
                    }
                }
            }

            // 5. Tickets mapping
            if (backup.getTickets() != null) {
                for (Ticket ticket : backup.getTickets()) {
                    ticket.setId(null);
                    if (ticket.getSelections() != null) {
                        for (TicketSelection sel : ticket.getSelections()) {
                            sel.setId(null);
                            sel.setTicket(ticket);
                            if (sel.getTip() != null) {
                                Tip t = sel.getTip();
                                Long oldTipId = t.getId();
                                if (oldTipId != null && tipMap.containsKey(oldTipId)) {
                                    sel.setTip(tipMap.get(oldTipId));
                                } else {
                                    t.setId(null);
                                    if (t.getChannel() != null && t.getChannel().getId() != null) {
                                        Channel matched = channelMap.get(t.getChannel().getId());
                                        if (matched != null) {
                                            t.setChannel(matched);
                                        } else {
                                            t.getChannel().setId(null);
                                            Channel savedCh = channelRepository.save(t.getChannel());
                                            t.setChannel(savedCh);
                                        }
                                    }
                                    Tip savedTip = tipRepository.save(t);
                                    sel.setTip(savedTip);
                                }
                            }
                        }
                    }
                    ticketRepository.save(ticket);
                }
            }

            return ResponseEntity.ok(Map.of("message", "Respaldo importado correctamente con éxito"));
        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("message", "Error al importar respaldo: " + ex.getMessage()));
        }
    }
}
