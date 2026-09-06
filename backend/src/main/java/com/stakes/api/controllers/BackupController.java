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

    private static final org.slf.Logger log = org.slf.LoggerFactory.getLogger(BackupController.class);

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
                    Channel saved;
                    java.util.Optional<Channel> existing = channelRepository.findByName(ch.getName());
                    if (existing.isPresent()) {
                        saved = existing.get();
                    } else {
                        saved = channelRepository.save(ch);
                    }
                    if (oldId != null) {
                        channelMap.put(oldId, saved);
                    }
                }
            }

            // Helper to get or save channel
            java.util.function.Function<Channel, Channel> resolveChannel = (ch) -> {
                if (ch == null) return null;
                if (ch.getId() != null && channelMap.containsKey(ch.getId())) {
                    return channelMap.get(ch.getId());
                }
                if (ch.getName() != null) {
                    java.util.Optional<Channel> existing = channelRepository.findByName(ch.getName());
                    if (existing.isPresent()) return existing.get();
                }
                ch.setId(null);
                return channelRepository.save(ch);
            };

            // 3b. ChannelSubgroups mapping
            Map<Long, ChannelSubgroup> subgroupMap = new java.util.HashMap<>();
            if (backup.getChannelSubgroups() != null) {
                for (ChannelSubgroup sg : backup.getChannelSubgroups()) {
                    Long oldSgId = sg.getId();
                    sg.setId(null);
                    if (sg.getChannel() != null) {
                        sg.setChannel(resolveChannel.apply(sg.getChannel()));
                    }
                    ChannelSubgroup savedSg = channelSubgroupRepository.save(sg);
                    if (oldSgId != null) {
                        subgroupMap.put(oldSgId, savedSg);
                    }
                }
            }

            // 4. Tips mapping
            Map<Long, Tip> tipMap = new java.util.HashMap<>();
            if (backup.getTips() != null) {
                for (Tip tip : backup.getTips()) {
                    Long oldTipId = tip.getId();
                    tip.setId(null);
                    if (tip.getChannel() != null) {
                        tip.setChannel(resolveChannel.apply(tip.getChannel()));
                    }
                    Tip savedTip = tipRepository.save(tip);
                    if (oldTipId != null) {
                        tipMap.put(oldTipId, savedTip);
                    }
                }
            }

            // Helper to resolve Tip for selection
            java.util.function.Function<Tip, Tip> resolveTip = (t) -> {
                if (t == null) return null;
                if (t.getId() != null && tipMap.containsKey(t.getId())) {
                    return tipMap.get(t.getId());
                }
                t.setId(null);
                if (t.getChannel() != null) {
                    t.setChannel(resolveChannel.apply(t.getChannel()));
                }
                return tipRepository.save(t);
            };

            // 5. Tickets mapping
            if (backup.getTickets() != null) {
                for (Ticket ticket : backup.getTickets()) {
                    ticket.setId(null);

                    if (ticket.getSubgroup() != null) {
                        Long oldSgId = ticket.getSubgroup().getId();
                        if (oldSgId != null && subgroupMap.containsKey(oldSgId)) {
                            ticket.setSubgroup(subgroupMap.get(oldSgId));
                        } else {
                            ChannelSubgroup sg = ticket.getSubgroup();
                            sg.setId(null);
                            if (sg.getChannel() != null) {
                                sg.setChannel(resolveChannel.apply(sg.getChannel()));
                            }
                            ticket.setSubgroup(channelSubgroupRepository.save(sg));
                        }
                    }

                    if (ticket.getSelections() != null) {
                        for (TicketSelection sel : ticket.getSelections()) {
                            sel.setId(null);
                            sel.setTicket(ticket);
                            if (sel.getTip() != null) {
                                sel.setTip(resolveTip.apply(sel.getTip()));
                            }
                        }
                    }

                    if (ticket.getBetBuilders() != null) {
                        for (BetBuilder bb : ticket.getBetBuilders()) {
                            bb.setId(null);
                            bb.setTicket(ticket);
                            if (bb.getSelections() != null) {
                                for (TicketSelection sel : bb.getSelections()) {
                                    sel.setId(null);
                                    sel.setTicket(ticket);
                                    sel.setBetBuilder(bb);
                                    if (sel.getTip() != null) {
                                        sel.setTip(resolveTip.apply(sel.getTip()));
                                    }
                                }
                            }
                        }
                    }

                    ticketRepository.save(ticket);
                }
            }

            return ResponseEntity.ok(Map.of("message", "Respaldo importado correctamente con éxito"));
        } catch (Throwable ex) {
            log.error("Error crítico importando respaldo JSON: ", ex);
            String detail = ex.getCause() != null ? ex.getCause().getMessage() : ex.getMessage();
            return ResponseEntity.status(500).body(Map.of("message", "Error al importar respaldo: " + (detail != null ? detail : ex.toString())));
        }
    }
}
