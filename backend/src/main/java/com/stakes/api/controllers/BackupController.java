package com.stakes.api.controllers;

import com.stakes.api.models.*;
import com.stakes.api.repositories.*;
import lombok.Data;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.function.Function;

@RestController
@RequestMapping("/api/v1/backup")
@CrossOrigin(origins = "*")
public class BackupController {

    private static final Logger log = LoggerFactory.getLogger(BackupController.class);

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

    // ─── DTOs for backup (avoid @JsonIgnore issues) ────────────────────────────

    @Data
    public static class BackupSelectionDto {
        private Long id;
        private Long tipId;      // reference by ID only
        private String result;
    }

    @Data
    public static class BackupBetBuilderDto {
        private Long id;
        private java.math.BigDecimal expectedOdds;
        private java.math.BigDecimal realOdds;
        private List<BackupSelectionDto> selections = new ArrayList<>();
    }

    @Data
    public static class BackupTicketDto {
        private Long id;
        private java.time.LocalDate date;
        private String type;
        private String bookmaker;
        private java.math.BigDecimal stake;
        private java.math.BigDecimal totalOdds;
        @com.fasterxml.jackson.annotation.JsonProperty("isCashout")
        private Boolean isCashout;
        private java.math.BigDecimal cashoutAmount;
        private String result;
        private java.math.BigDecimal profit;
        private Boolean originalTipster;
        private Long subgroupId;  // reference by ID only
        private List<BackupSelectionDto> selections = new ArrayList<>();
        private List<BackupBetBuilderDto> betBuilders = new ArrayList<>();
    }

    @Data
    public static class BackupData {
        private String exportedAt;
        private List<Bankroll> bankrolls;
        private List<BankrollTransaction> bankrollTransactions;
        private List<Channel> channels;
        private List<ChannelSubgroup> channelSubgroups;
        private List<Tip> tips;
        // Tickets are exported as full entities for backward-compat with old exports
        // and as DTOs for new exports. We accept both.
        private List<com.fasterxml.jackson.databind.JsonNode> tickets;
    }

    // ─── Export ────────────────────────────────────────────────────────────────

    @Data
    public static class ExportData {
        private String exportedAt;
        private List<Bankroll> bankrolls;
        private List<BankrollTransaction> bankrollTransactions;
        private List<Channel> channels;
        private List<ChannelSubgroup> channelSubgroups;
        private List<Tip> tips;
        private List<BackupTicketDto> tickets;
    }

    @GetMapping("/export")
    public ResponseEntity<ExportData> exportData() {
        ExportData backup = new ExportData();
        backup.setExportedAt(LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
        backup.setBankrolls(bankrollRepository.findAll());
        backup.setBankrollTransactions(bankrollTransactionRepository.findAllByOrderByDateDescIdDesc());
        backup.setChannels(channelRepository.findAll());
        backup.setChannelSubgroups(channelSubgroupRepository.findAll());
        backup.setTips(tipRepository.findAllByOrderByDateDescIdDesc());

        // Convert tickets to DTOs to avoid circular refs / @JsonIgnore issues
        List<BackupTicketDto> ticketDtos = new ArrayList<>();
        for (Ticket t : ticketRepository.findAllByOrderByDateDescIdDesc()) {
            BackupTicketDto dto = new BackupTicketDto();
            dto.setId(t.getId());
            dto.setDate(t.getDate());
            dto.setType(t.getType());
            dto.setBookmaker(t.getBookmaker());
            dto.setStake(t.getStake());
            dto.setTotalOdds(t.getTotalOdds());
            dto.setIsCashout(t.getIsCashout());
            dto.setCashoutAmount(t.getCashoutAmount());
            dto.setResult(t.getResult());
            dto.setProfit(t.getProfit());
            dto.setOriginalTipster(t.getOriginalTipster());
            dto.setSubgroupId(t.getSubgroup() != null ? t.getSubgroup().getId() : null);

            List<BackupSelectionDto> selDtos = new ArrayList<>();
            for (TicketSelection sel : t.getSelections()) {
                BackupSelectionDto sdto = new BackupSelectionDto();
                sdto.setId(sel.getId());
                sdto.setTipId(sel.getTip() != null ? sel.getTip().getId() : null);
                sdto.setResult(sel.getResult());
                selDtos.add(sdto);
            }
            dto.setSelections(selDtos);

            List<BackupBetBuilderDto> bbDtos = new ArrayList<>();
            for (BetBuilder bb : t.getBetBuilders()) {
                BackupBetBuilderDto bbDto = new BackupBetBuilderDto();
                bbDto.setId(bb.getId());
                bbDto.setExpectedOdds(bb.getExpectedOdds());
                bbDto.setRealOdds(bb.getRealOdds());
                List<BackupSelectionDto> bbSels = new ArrayList<>();
                for (TicketSelection sel : bb.getSelections()) {
                    BackupSelectionDto sdto = new BackupSelectionDto();
                    sdto.setId(sel.getId());
                    sdto.setTipId(sel.getTip() != null ? sel.getTip().getId() : null);
                    sdto.setResult(sel.getResult());
                    bbSels.add(sdto);
                }
                bbDto.setSelections(bbSels);
                bbDtos.add(bbDto);
            }
            dto.setBetBuilders(bbDtos);

            ticketDtos.add(dto);
        }
        backup.setTickets(ticketDtos);

        String filename = "stakes_backup_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")) + ".json";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_JSON)
                .body(backup);
    }

    // ─── Import ────────────────────────────────────────────────────────────────

    @Data
    public static class ImportData {
        private String exportedAt;
        private List<Bankroll> bankrolls;
        private List<BankrollTransaction> bankrollTransactions;
        private List<Channel> channels;
        private List<ChannelSubgroup> channelSubgroups;
        private List<Tip> tips;
        private List<BackupTicketDto> tickets;
    }

    @PostMapping("/import")
    @Transactional
    public ResponseEntity<?> importData(@RequestBody ImportData backup) {
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

            // 3. Channels — map old ID → saved entity
            Map<Long, Channel> channelMap = new HashMap<>();
            if (backup.getChannels() != null) {
                for (Channel ch : backup.getChannels()) {
                    Long oldId = ch.getId();
                    ch.setId(null);
                    Channel saved;
                    Optional<Channel> existing = channelRepository.findByName(ch.getName());
                    if (existing.isPresent()) {
                        saved = existing.get();
                    } else {
                        saved = channelRepository.save(ch);
                    }
                    if (oldId != null) channelMap.put(oldId, saved);
                }
            }

            Function<Channel, Channel> resolveChannel = (ch) -> {
                if (ch == null) return null;
                if (ch.getId() != null && channelMap.containsKey(ch.getId())) return channelMap.get(ch.getId());
                if (ch.getName() != null) {
                    Optional<Channel> ex = channelRepository.findByName(ch.getName());
                    if (ex.isPresent()) return ex.get();
                }
                ch.setId(null);
                return channelRepository.save(ch);
            };

            // 3b. ChannelSubgroups — map old ID → saved entity
            Map<Long, ChannelSubgroup> subgroupMap = new HashMap<>();
            if (backup.getChannelSubgroups() != null) {
                for (ChannelSubgroup sg : backup.getChannelSubgroups()) {
                    Long oldSgId = sg.getId();
                    sg.setId(null);
                    if (sg.getChannel() != null) sg.setChannel(resolveChannel.apply(sg.getChannel()));
                    ChannelSubgroup savedSg = channelSubgroupRepository.save(sg);
                    if (oldSgId != null) subgroupMap.put(oldSgId, savedSg);
                }
            }

            // 4. Tips — map old ID → saved entity
            Map<Long, Tip> tipMap = new HashMap<>();
            if (backup.getTips() != null) {
                for (Tip tip : backup.getTips()) {
                    Long oldTipId = tip.getId();
                    tip.setId(null);
                    if (tip.getChannel() != null) tip.setChannel(resolveChannel.apply(tip.getChannel()));
                    if (tip.getSubgroup() != null) {
                        Long oldSgId = tip.getSubgroup().getId();
                        if (oldSgId != null && subgroupMap.containsKey(oldSgId)) {
                            tip.setSubgroup(subgroupMap.get(oldSgId));
                        }
                    }
                    Tip savedTip = tipRepository.save(tip);
                    if (oldTipId != null) tipMap.put(oldTipId, savedTip);
                }
            }

            // 5. Tickets — save ticket first, then selections and bet_builders manually
            if (backup.getTickets() != null) {
                for (BackupTicketDto dto : backup.getTickets()) {
                    Ticket ticket = new Ticket();
                    ticket.setDate(dto.getDate());
                    ticket.setType(dto.getType());
                    ticket.setBookmaker(dto.getBookmaker());
                    ticket.setStake(dto.getStake());
                    ticket.setTotalOdds(dto.getTotalOdds());
                    ticket.setIsCashout(dto.getIsCashout());
                    ticket.setCashoutAmount(dto.getCashoutAmount());
                    ticket.setResult(dto.getResult() != null ? dto.getResult() : "PENDIENTE");
                    ticket.setProfit(dto.getProfit());
                    ticket.setOriginalTipster(dto.getOriginalTipster());

                    // Resolve subgroup
                    if (dto.getSubgroupId() != null && subgroupMap.containsKey(dto.getSubgroupId())) {
                        ticket.setSubgroup(subgroupMap.get(dto.getSubgroupId()));
                    }

                    // Save ticket first (without cascaded children)
                    ticket.setSelections(new ArrayList<>());
                    ticket.setBetBuilders(new ArrayList<>());
                    Ticket savedTicket = ticketRepository.save(ticket);

                    // Save direct selections
                    if (dto.getSelections() != null) {
                        for (BackupSelectionDto sdto : dto.getSelections()) {
                            TicketSelection sel = new TicketSelection();
                            sel.setTicket(savedTicket);
                            sel.setBetBuilder(null);
                            sel.setResult(sdto.getResult() != null ? sdto.getResult() : "PENDIENTE");
                            if (sdto.getTipId() != null && tipMap.containsKey(sdto.getTipId())) {
                                sel.setTip(tipMap.get(sdto.getTipId()));
                            }
                            ticketSelectionRepository.save(sel);
                        }
                    }

                    // Save bet builders and their selections
                    if (dto.getBetBuilders() != null) {
                        BetBuilderRepository bbRepo = betBuilderRepository;
                        for (BackupBetBuilderDto bbDto : dto.getBetBuilders()) {
                            BetBuilder bb = new BetBuilder();
                            bb.setTicket(savedTicket);
                            bb.setExpectedOdds(bbDto.getExpectedOdds());
                            bb.setRealOdds(bbDto.getRealOdds());
                            bb.setSelections(new ArrayList<>());
                            BetBuilder savedBb = bbRepo.save(bb);

                            if (bbDto.getSelections() != null) {
                                for (BackupSelectionDto sdto : bbDto.getSelections()) {
                                    TicketSelection sel = new TicketSelection();
                                    sel.setTicket(savedTicket);
                                    sel.setBetBuilder(savedBb);
                                    sel.setResult(sdto.getResult() != null ? sdto.getResult() : "PENDIENTE");
                                    if (sdto.getTipId() != null && tipMap.containsKey(sdto.getTipId())) {
                                        sel.setTip(tipMap.get(sdto.getTipId()));
                                    }
                                    ticketSelectionRepository.save(sel);
                                }
                            }
                        }
                    }
                }
            }

            return ResponseEntity.ok(Map.of("message", "Respaldo importado correctamente con éxito"));

        } catch (Throwable ex) {
            log.error("Error crítico importando respaldo JSON: ", ex);
            String detail = ex.getCause() != null ? ex.getCause().getMessage() : ex.getMessage();
            return ResponseEntity.status(500).body(Map.of("message", "Error al importar respaldo: " + (detail != null ? detail : ex.toString())));
        }
    }

    @Autowired
    private BetBuilderRepository betBuilderRepository;
}
