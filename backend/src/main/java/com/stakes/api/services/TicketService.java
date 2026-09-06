package com.stakes.api.services;

import com.stakes.api.models.Ticket;
import com.stakes.api.models.TicketSelection;
import com.stakes.api.models.BetBuilder;
import com.stakes.api.models.Tip;
import com.stakes.api.models.Channel;
import com.stakes.api.models.ChannelSubgroup;
import com.stakes.api.dto.TicketCloseRequest;
import com.stakes.api.repositories.TicketRepository;
import com.stakes.api.repositories.TipRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
public class TicketService {

    @Autowired
    private com.stakes.api.repositories.TicketRepository ticketRepository;

    @Autowired
    private com.stakes.api.repositories.TicketSelectionRepository ticketSelectionRepository;

    @Autowired
    private com.stakes.api.repositories.TipRepository tipRepository;

    @Autowired
    private com.stakes.api.repositories.ChannelRepository channelRepository;

    @Autowired
    private com.stakes.api.repositories.ChannelSubgroupRepository channelSubgroupRepository;

    @Transactional
    public List<Ticket> getAllTickets() {
        List<Ticket> tickets = ticketRepository.findAllByOrderByDateDescIdDesc();
        boolean changed = false;

        for (Ticket t : tickets) {
            boolean ticketUpdated = false;

            if (t.getSelections() != null) {
                for (TicketSelection sel : t.getSelections()) {
                    if (sel.getTip() != null && sel.getTip().getResult() != null && !sel.getTip().getResult().equalsIgnoreCase("PENDIENTE")) {
                        if (sel.getResult() == null || sel.getResult().equalsIgnoreCase("PENDIENTE")) {
                            sel.setResult(sel.getTip().getResult());
                            ticketSelectionRepository.save(sel);
                            ticketUpdated = true;
                        }
                    }
                }
            }

            if (t.getBetBuilders() != null) {
                for (BetBuilder bb : t.getBetBuilders()) {
                    if (bb.getSelections() != null) {
                        for (TicketSelection sel : bb.getSelections()) {
                            if (sel.getTip() != null && sel.getTip().getResult() != null && !sel.getTip().getResult().equalsIgnoreCase("PENDIENTE")) {
                                if (sel.getResult() == null || sel.getResult().equalsIgnoreCase("PENDIENTE")) {
                                    sel.setResult(sel.getTip().getResult());
                                    ticketSelectionRepository.save(sel);
                                    ticketUpdated = true;
                                }
                            }
                        }
                    }
                }
            }

            if (ticketUpdated) {
                recalculateTicketStatusAndProfit(t);
                ticketRepository.save(t);
                changed = true;
            }
        }

        if (changed) {
            return ticketRepository.findAllByOrderByDateDescIdDesc();
        }
        return tickets;
    }

    public Optional<Ticket> getTicketById(Long id) {
        return ticketRepository.findById(id);
    }

    @Transactional
    public Ticket saveTicket(Ticket ticket) {
        ChannelSubgroup managedSubgroup = null;
        if (ticket.getSubgroup() != null && ticket.getSubgroup().getId() != null) {
            managedSubgroup = channelSubgroupRepository.findById(ticket.getSubgroup().getId()).orElse(null);
        }
        ticket.setSubgroup(managedSubgroup);

        if (ticket.getId() != null) {
            Optional<Ticket> existingOpt = ticketRepository.findById(ticket.getId());
            if (existingOpt.isPresent()) {
                Ticket existingTicket = existingOpt.get();
                existingTicket.setDate(ticket.getDate());
                existingTicket.setType(ticket.getType());
                existingTicket.setBookmaker(ticket.getBookmaker());
                existingTicket.setStake(ticket.getStake());
                existingTicket.setTotalOdds(ticket.getTotalOdds());
                existingTicket.setIsCashout(ticket.getIsCashout());
                existingTicket.setCashoutAmount(ticket.getCashoutAmount());
                existingTicket.setResult(ticket.getResult() != null ? ticket.getResult() : "PENDIENTE");
                existingTicket.setOriginalTipster(ticket.getOriginalTipster());
                existingTicket.setSubgroup(managedSubgroup);

                existingTicket.getSelections().clear();
                existingTicket.getBetBuilders().clear();
                ticketRepository.saveAndFlush(existingTicket);

                if (ticket.getSelections() != null) {
                    for (com.stakes.api.models.TicketSelection selection : ticket.getSelections()) {
                        selection.setId(null);
                        if (selection.getTip() != null) {
                            com.stakes.api.models.Tip savedTip = prepareAndSaveTip(selection.getTip());
                            selection.setTip(savedTip);
                            if (savedTip != null && savedTip.getResult() != null && !savedTip.getResult().equalsIgnoreCase("PENDIENTE") && (selection.getResult() == null || selection.getResult().equalsIgnoreCase("PENDIENTE"))) {
                                selection.setResult(savedTip.getResult());
                            }
                        }
                        selection.setTicket(existingTicket);
                        existingTicket.getSelections().add(selection);
                    }
                }

                if (ticket.getBetBuilders() != null) {
                    for (com.stakes.api.models.BetBuilder bb : ticket.getBetBuilders()) {
                        bb.setId(null);
                        bb.setTicket(existingTicket);
                        if (bb.getSelections() != null) {
                            for (com.stakes.api.models.TicketSelection selection : bb.getSelections()) {
                                selection.setId(null);
                                if (selection.getTip() != null) {
                                    com.stakes.api.models.Tip savedTip = prepareAndSaveTip(selection.getTip());
                                    selection.setTip(savedTip);
                                    if (savedTip != null && savedTip.getResult() != null && !savedTip.getResult().equalsIgnoreCase("PENDIENTE") && (selection.getResult() == null || selection.getResult().equalsIgnoreCase("PENDIENTE"))) {
                                        selection.setResult(savedTip.getResult());
                                    }
                                }
                                selection.setTicket(existingTicket);
                                selection.setBetBuilder(bb);
                            }
                        }
                        existingTicket.getBetBuilders().add(bb);
                    }
                }

                recalculateTicketStatusAndProfit(existingTicket);
                return ticketRepository.save(existingTicket);
            }
        }

        // Brand New Ticket
        if (ticket.getSelections() != null) {
            for (com.stakes.api.models.TicketSelection selection : ticket.getSelections()) {
                selection.setId(null);
                if (selection.getTip() != null) {
                    com.stakes.api.models.Tip savedTip = prepareAndSaveTip(selection.getTip());
                    selection.setTip(savedTip);
                    if (savedTip != null && savedTip.getResult() != null && !savedTip.getResult().equalsIgnoreCase("PENDIENTE") && (selection.getResult() == null || selection.getResult().equalsIgnoreCase("PENDIENTE"))) {
                        selection.setResult(savedTip.getResult());
                    }
                }
                selection.setTicket(ticket);
            }
        }

        if (ticket.getBetBuilders() != null) {
            for (com.stakes.api.models.BetBuilder bb : ticket.getBetBuilders()) {
                bb.setId(null);
                bb.setTicket(ticket);
                if (bb.getSelections() != null) {
                    for (com.stakes.api.models.TicketSelection selection : bb.getSelections()) {
                        selection.setId(null);
                        if (selection.getTip() != null) {
                            com.stakes.api.models.Tip savedTip = prepareAndSaveTip(selection.getTip());
                            selection.setTip(savedTip);
                            if (savedTip != null && savedTip.getResult() != null && !savedTip.getResult().equalsIgnoreCase("PENDIENTE") && (selection.getResult() == null || selection.getResult().equalsIgnoreCase("PENDIENTE"))) {
                                selection.setResult(savedTip.getResult());
                            }
                        }
                        selection.setTicket(ticket);
                        selection.setBetBuilder(bb);
                    }
                }
            }
        }
        
        recalculateTicketStatusAndProfit(ticket);
        return ticketRepository.save(ticket);
    }

    private Tip prepareAndSaveTip(Tip tip) {
        Channel channelToSet = null;
        if (tip.getChannel() != null && tip.getChannel().getId() != null) {
            channelToSet = channelRepository.findById(tip.getChannel().getId()).orElse(null);
        }

        ChannelSubgroup subgroupToSet = null;
        if (tip.getSubgroup() != null && tip.getSubgroup().getId() != null) {
            subgroupToSet = channelSubgroupRepository.findById(tip.getSubgroup().getId()).orElse(null);
        }

        if (tip.getEvent() == null || tip.getEvent().trim().isEmpty()) {
            tip.setEvent("Evento");
        }
        if (tip.getMarket() == null || tip.getMarket().trim().isEmpty()) {
            tip.setMarket("Mercado");
        }
        if (tip.getPick() == null || tip.getPick().trim().isEmpty()) {
            tip.setPick("Selección");
        }
        if (tip.getDate() == null) {
            tip.setDate(java.time.LocalDate.now());
        }

        if (tip.getId() != null) {
            Optional<Tip> existingOpt = tipRepository.findById(tip.getId());
            if (existingOpt.isPresent()) {
                Tip existingTip = existingOpt.get();
                if (channelToSet != null || tip.getChannel() != null) {
                    existingTip.setChannel(channelToSet);
                }
                if (subgroupToSet != null || tip.getSubgroup() != null) {
                    existingTip.setSubgroup(subgroupToSet);
                }
                existingTip.setDate(tip.getDate());
                existingTip.setEvent(tip.getEvent());
                existingTip.setSport(tip.getSport());
                existingTip.setLeague(tip.getLeague());
                existingTip.setMarket(tip.getMarket());
                existingTip.setPick(tip.getPick());
                existingTip.setOdds(tip.getOdds());
                existingTip.setResult(tip.getResult());
                return tipRepository.save(existingTip);
            }
        }

        // Auto-deduplication check for tips created without explicit ID
        if (channelToSet != null && tip.getEvent() != null && tip.getMarket() != null && tip.getPick() != null) {
            List<Tip> existingList = tipRepository.findByChannelId(channelToSet.getId());
            for (Tip existing : existingList) {
                if (existing.getEvent() != null && existing.getEvent().trim().equalsIgnoreCase(tip.getEvent().trim()) &&
                    existing.getMarket() != null && existing.getMarket().trim().equalsIgnoreCase(tip.getMarket().trim()) &&
                    existing.getPick() != null && existing.getPick().trim().equalsIgnoreCase(tip.getPick().trim())) {
                    if (subgroupToSet != null && existing.getSubgroup() == null) {
                        existing.setSubgroup(subgroupToSet);
                        tipRepository.save(existing);
                    }
                    return existing;
                }
            }
        }

        tip.setChannel(channelToSet);
        tip.setSubgroup(subgroupToSet);
        return tipRepository.save(tip);
    }

    @Transactional
    public Ticket updateTicketResult(Long id, TicketCloseRequest request) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));
        
        ticket.setResult(request.getResult());
        if ("CASHOUT".equalsIgnoreCase(request.getResult())) {
            ticket.setIsCashout(true);
            ticket.setCashoutAmount(request.getCashoutAmount());
        } else {
            ticket.setIsCashout(false);
            ticket.setCashoutAmount(null);
        }
        
        java.util.Set<Tip> updatedTips = new java.util.HashSet<>();

        // Update individual selections if provided
        if (request.getSelectionResults() != null && !request.getSelectionResults().isEmpty()) {
            if (ticket.getSelections() != null) {
                ticket.getSelections().forEach(sel -> {
                    String res = request.getSelectionResults().get(sel.getId());
                    if (res != null) {
                        sel.setResult(res);
                        if (sel.getTip() != null) {
                            sel.getTip().setResult(res);
                            updatedTips.add(sel.getTip());
                        }
                    }
                });
            }
            if (ticket.getBetBuilders() != null) {
                ticket.getBetBuilders().forEach(bb -> {
                    if (bb.getSelections() != null) {
                        bb.getSelections().forEach(sel -> {
                            String res = request.getSelectionResults().get(sel.getId());
                            if (res != null) {
                                sel.setResult(res);
                                if (sel.getTip() != null) {
                                    sel.getTip().setResult(res);
                                    updatedTips.add(sel.getTip());
                                }
                            }
                        });
                    }
                });
            }
        }
        
        recalculateTicketStatusAndProfit(ticket);
        Ticket savedTicket = ticketRepository.save(ticket);

        // Propagate tip result changes to all other selections and tickets
        for (Tip tip : updatedTips) {
            syncTipResultAndRecalculateAffectedTickets(tip);
        }

        return ticketRepository.findById(savedTicket.getId()).orElse(savedTicket);
    }

    @Transactional
    public void syncTipResultAndRecalculateAffectedTickets(Tip tip) {
        if (tip == null || tip.getId() == null || tip.getResult() == null) {
            return;
        }

        tipRepository.save(tip);

        List<TicketSelection> selections = ticketSelectionRepository.findByTipId(tip.getId());
        java.util.Set<Long> affectedTicketIds = new java.util.HashSet<>();

        for (TicketSelection sel : selections) {
            sel.setResult(tip.getResult());
            ticketSelectionRepository.save(sel);
            if (sel.getTicket() != null && sel.getTicket().getId() != null) {
                affectedTicketIds.add(sel.getTicket().getId());
            }
        }

        for (Long ticketId : affectedTicketIds) {
            ticketRepository.findById(ticketId).ifPresent(t -> {
                recalculateTicketStatusAndProfit(t);
                ticketRepository.save(t);
            });
        }
    }

    public void recalculateTicketStatusAndProfit(Ticket ticket) {
        if (ticket == null) return;

        if (!"CASHOUT".equalsIgnoreCase(ticket.getResult())) {
            boolean hasPerdida = false;
            boolean hasPendiente = false;
            boolean hasGanada = false;
            int totalPicks = 0;

            if (ticket.getSelections() != null) {
                for (TicketSelection sel : ticket.getSelections()) {
                    totalPicks++;
                    String res = (sel.getResult() != null) ? sel.getResult().toUpperCase() : "PENDIENTE";
                    if ("PERDIDA".equals(res)) hasPerdida = true;
                    else if ("PENDIENTE".equals(res)) hasPendiente = true;
                    else if ("GANADA".equals(res)) hasGanada = true;
                }
            }

            if (ticket.getBetBuilders() != null) {
                for (BetBuilder bb : ticket.getBetBuilders()) {
                    if (bb.getSelections() != null) {
                        for (TicketSelection sel : bb.getSelections()) {
                            totalPicks++;
                            String res = (sel.getResult() != null) ? sel.getResult().toUpperCase() : "PENDIENTE";
                            if ("PERDIDA".equals(res)) hasPerdida = true;
                            else if ("PENDIENTE".equals(res)) hasPendiente = true;
                            else if ("GANADA".equals(res)) hasGanada = true;
                        }
                    }
                }
            }

            if (totalPicks == 0) {
                ticket.setResult("PENDIENTE");
            } else if (hasPerdida) {
                ticket.setResult("PERDIDA");
            } else if (hasPendiente) {
                ticket.setResult("PENDIENTE");
            } else if (hasGanada) {
                ticket.setResult("GANADA");
            } else {
                ticket.setResult("NULA");
            }
        }

        calculateProfit(ticket);
    }

    private void calculateProfit(Ticket ticket) {
        if (ticket.getStake() == null || ticket.getResult() == null) {
            ticket.setProfit(BigDecimal.ZERO);
            return;
        }

        switch (ticket.getResult().toUpperCase()) {
            case "GANADA":
                if (ticket.getTotalOdds() != null) {
                    BigDecimal profit = ticket.getStake().multiply(ticket.getTotalOdds()).subtract(ticket.getStake());
                    ticket.setProfit(profit);
                } else {
                    ticket.setProfit(BigDecimal.ZERO);
                }
                break;
            case "PERDIDA":
                ticket.setProfit(ticket.getStake().negate());
                break;
            case "CASHOUT":
                if (ticket.getCashoutAmount() != null) {
                    ticket.setProfit(ticket.getCashoutAmount().subtract(ticket.getStake()));
                } else {
                    ticket.setProfit(BigDecimal.ZERO);
                }
                break;
            case "NULA":
            case "PENDIENTE":
            default:
                ticket.setProfit(BigDecimal.ZERO);
                break;
        }
    }

    public void deleteTicket(Long id) {
        ticketRepository.deleteById(id);
    }
}
