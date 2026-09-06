package com.stakes.api.controllers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.function.Function;

@RestController
@RequestMapping("/api/v1/backup")
@CrossOrigin(origins = "*")
public class BackupController {

    private static final Logger log = LoggerFactory.getLogger(BackupController.class);

    @Autowired private BankrollRepository bankrollRepository;
    @Autowired private BankrollTransactionRepository bankrollTransactionRepository;
    @Autowired private ChannelRepository channelRepository;
    @Autowired private ChannelSubgroupRepository channelSubgroupRepository;
    @Autowired private TipRepository tipRepository;
    @Autowired private TicketRepository ticketRepository;
    @Autowired private TicketSelectionRepository ticketSelectionRepository;
    @Autowired private BetBuilderRepository betBuilderRepository;
    @Autowired private ObjectMapper objectMapper;

    // ─── DTOs for export ───────────────────────────────────────────────────────

    @Data
    public static class BackupSelectionDto {
        private Long tipId;
        private String result;
    }

    @Data
    public static class BackupBetBuilderDto {
        private java.math.BigDecimal expectedOdds;
        private java.math.BigDecimal realOdds;
        private List<BackupSelectionDto> selections = new ArrayList<>();
    }

    @Data
    public static class BackupTicketDto {
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
        private Long subgroupId;
        private List<BackupSelectionDto> selections = new ArrayList<>();
        private List<BackupBetBuilderDto> betBuilders = new ArrayList<>();
    }

    @Data
    public static class ExportData {
        private String exportedAt;
        private String version = "2";
        private List<Bankroll> bankrolls;
        private List<BankrollTransaction> bankrollTransactions;
        private List<Channel> channels;
        private List<ChannelSubgroup> channelSubgroups;
        private List<Tip> tips;
        private List<BackupTicketDto> tickets;
    }

    // ─── Export ───────────────────────────────────────────────────────────────

    @GetMapping("/export")
    public ResponseEntity<ExportData> exportData() {
        ExportData backup = new ExportData();
        backup.setExportedAt(LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
        backup.setBankrolls(bankrollRepository.findAll());
        backup.setBankrollTransactions(bankrollTransactionRepository.findAllByOrderByDateDescIdDesc());
        backup.setChannels(channelRepository.findAll());
        backup.setChannelSubgroups(channelSubgroupRepository.findAll());
        backup.setTips(tipRepository.findAllByOrderByDateDescIdDesc());

        List<BackupTicketDto> ticketDtos = new ArrayList<>();
        for (Ticket t : ticketRepository.findAllByOrderByDateDescIdDesc()) {
            BackupTicketDto dto = new BackupTicketDto();
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
                sdto.setTipId(sel.getTip() != null ? sel.getTip().getId() : null);
                sdto.setResult(sel.getResult());
                selDtos.add(sdto);
            }
            dto.setSelections(selDtos);

            List<BackupBetBuilderDto> bbDtos = new ArrayList<>();
            for (BetBuilder bb : t.getBetBuilders()) {
                BackupBetBuilderDto bbDto = new BackupBetBuilderDto();
                bbDto.setExpectedOdds(bb.getExpectedOdds());
                bbDto.setRealOdds(bb.getRealOdds());
                List<BackupSelectionDto> bbSels = new ArrayList<>();
                for (TicketSelection sel : bb.getSelections()) {
                    BackupSelectionDto sdto = new BackupSelectionDto();
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

    // ─── Import (accepts ANY format: v1 entity-based or v2 DTO-based) ─────────

    /**
     * Generic import that parses tickets from JsonNode to handle both:
     * - Old format: tickets[].subgroup = { id, name, channel: {...} }
     *               tickets[].selections[].tip = { id, channel: {...}, ... }
     * - New format: tickets[].subgroupId = 5
     *               tickets[].selections[].tipId = 3
     */
    @Data
    public static class RawImportData {
        private List<Bankroll> bankrolls;
        private List<BankrollTransaction> bankrollTransactions;
        private List<Channel> channels;
        private List<ChannelSubgroup> channelSubgroups;
        private List<Tip> tips;
        private List<JsonNode> tickets;
    }

    @PostMapping("/import")
    @Transactional
    public ResponseEntity<?> importData(@RequestBody RawImportData backup) {
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

            // 3. Channels → map old ID → saved entity
            Map<Long, Channel> channelMap = new HashMap<>();
            if (backup.getChannels() != null) {
                for (Channel ch : backup.getChannels()) {
                    Long oldId = ch.getId();
                    ch.setId(null);
                    Channel saved;
                    Optional<Channel> existing = channelRepository.findByName(ch.getName());
                    saved = existing.orElseGet(() -> channelRepository.save(ch));
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

            // 3b. ChannelSubgroups → map old ID → saved entity
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

            // 4. Tips → map old ID → saved entity
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
                        } else {
                            // subgroup not in map, try to save it
                            ChannelSubgroup sg = tip.getSubgroup();
                            sg.setId(null);
                            if (sg.getChannel() != null) sg.setChannel(resolveChannel.apply(sg.getChannel()));
                            tip.setSubgroup(channelSubgroupRepository.save(sg));
                        }
                    }
                    Tip savedTip = tipRepository.save(tip);
                    if (oldTipId != null) tipMap.put(oldTipId, savedTip);
                }
            }

            // 5. Tickets — parse JsonNode to handle both old and new formats
            if (backup.getTickets() != null) {
                for (JsonNode ticketNode : backup.getTickets()) {
                    Ticket ticket = new Ticket();
                    ticket.setDate(parseDate(ticketNode, "date"));
                    ticket.setType(getString(ticketNode, "type"));
                    ticket.setBookmaker(getString(ticketNode, "bookmaker"));
                    ticket.setStake(getBigDecimal(ticketNode, "stake"));
                    ticket.setTotalOdds(getBigDecimal(ticketNode, "totalOdds"));
                    ticket.setIsCashout(getBoolean(ticketNode, "isCashout"));
                    ticket.setCashoutAmount(getBigDecimal(ticketNode, "cashoutAmount"));
                    String result = getString(ticketNode, "result");
                    ticket.setResult(result != null ? result : "PENDIENTE");
                    ticket.setProfit(getBigDecimal(ticketNode, "profit"));
                    ticket.setOriginalTipster(getBoolean(ticketNode, "originalTipster"));

                    // Resolve subgroup — supports both v1 (subgroup object) and v2 (subgroupId)
                    ChannelSubgroup resolvedSubgroup = null;
                    if (ticketNode.has("subgroupId") && !ticketNode.get("subgroupId").isNull()) {
                        Long sgId = ticketNode.get("subgroupId").asLong();
                        resolvedSubgroup = subgroupMap.get(sgId);
                    } else if (ticketNode.has("subgroup") && !ticketNode.get("subgroup").isNull()) {
                        JsonNode sgNode = ticketNode.get("subgroup");
                        if (sgNode.has("id") && !sgNode.get("id").isNull()) {
                            Long sgId = sgNode.get("id").asLong();
                            resolvedSubgroup = subgroupMap.get(sgId);
                        }
                    }
                    ticket.setSubgroup(resolvedSubgroup);
                    ticket.setSelections(new ArrayList<>());
                    ticket.setBetBuilders(new ArrayList<>());

                    // Save ticket without children first
                    Ticket savedTicket = ticketRepository.save(ticket);

                    // Parse and save direct selections
                    if (ticketNode.has("selections") && ticketNode.get("selections").isArray()) {
                        for (JsonNode selNode : ticketNode.get("selections")) {
                            TicketSelection sel = new TicketSelection();
                            sel.setTicket(savedTicket);
                            sel.setBetBuilder(null);
                            String selResult = getString(selNode, "result");
                            sel.setResult(selResult != null ? selResult : "PENDIENTE");

                            // Resolve tip — supports v1 (tip object) and v2 (tipId)
                            Tip resolvedTip = null;
                            if (selNode.has("tipId") && !selNode.get("tipId").isNull()) {
                                Long tipId = selNode.get("tipId").asLong();
                                resolvedTip = tipMap.get(tipId);
                            } else if (selNode.has("tip") && !selNode.get("tip").isNull()) {
                                JsonNode tipNode = selNode.get("tip");
                                if (tipNode.has("id") && !tipNode.get("id").isNull()) {
                                    Long tipId = tipNode.get("id").asLong();
                                    resolvedTip = tipMap.get(tipId);
                                }
                            }
                            sel.setTip(resolvedTip);
                            ticketSelectionRepository.save(sel);
                        }
                    }

                    // Parse and save bet builders + their selections
                    if (ticketNode.has("betBuilders") && ticketNode.get("betBuilders").isArray()) {
                        for (JsonNode bbNode : ticketNode.get("betBuilders")) {
                            BetBuilder bb = new BetBuilder();
                            bb.setTicket(savedTicket);
                            bb.setExpectedOdds(getBigDecimal(bbNode, "expectedOdds"));
                            bb.setRealOdds(getBigDecimal(bbNode, "realOdds"));
                            bb.setSelections(new ArrayList<>());
                            BetBuilder savedBb = betBuilderRepository.save(bb);

                            if (bbNode.has("selections") && bbNode.get("selections").isArray()) {
                                for (JsonNode selNode : bbNode.get("selections")) {
                                    TicketSelection sel = new TicketSelection();
                                    sel.setTicket(savedTicket);
                                    sel.setBetBuilder(savedBb);
                                    String selResult = getString(selNode, "result");
                                    sel.setResult(selResult != null ? selResult : "PENDIENTE");

                                    Tip resolvedTip = null;
                                    if (selNode.has("tipId") && !selNode.get("tipId").isNull()) {
                                        Long tipId = selNode.get("tipId").asLong();
                                        resolvedTip = tipMap.get(tipId);
                                    } else if (selNode.has("tip") && !selNode.get("tip").isNull()) {
                                        JsonNode tipNode = selNode.get("tip");
                                        if (tipNode.has("id") && !tipNode.get("id").isNull()) {
                                            Long tipId = tipNode.get("id").asLong();
                                            resolvedTip = tipMap.get(tipId);
                                        }
                                    }
                                    sel.setTip(resolvedTip);
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
            return ResponseEntity.status(500).body(Map.of("message", "Error al importar: " + (detail != null ? detail : ex.toString())));
        }
    }

    // ─── Helpers for JsonNode parsing ─────────────────────────────────────────

    private String getString(JsonNode node, String field) {
        return (node.has(field) && !node.get(field).isNull()) ? node.get(field).asText() : null;
    }

    private Boolean getBoolean(JsonNode node, String field) {
        if (!node.has(field) || node.get(field).isNull()) return null;
        return node.get(field).asBoolean();
    }

    private BigDecimal getBigDecimal(JsonNode node, String field) {
        if (!node.has(field) || node.get(field).isNull()) return null;
        try { return new BigDecimal(node.get(field).asText()); } catch (Exception e) { return null; }
    }

    private LocalDate parseDate(JsonNode node, String field) {
        String val = getString(node, field);
        if (val == null) return null;
        try { return LocalDate.parse(val); } catch (Exception e) { return null; }
    }
}
