package com.stakes.api.services;

import com.stakes.api.models.Tip;
import com.stakes.api.repositories.TicketSelectionRepository;
import com.stakes.api.repositories.TipRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TipService {

    @Autowired
    private TipRepository tipRepository;

    @Autowired
    private TicketSelectionRepository ticketSelectionRepository;

    @Autowired
    private TicketService ticketService;

    public List<Tip> getAllTips() {
        return tipRepository.findAllByOrderByDateDescIdDesc();
    }

    @Transactional
    public Tip createTip(Tip tip) {
        Tip saved = tipRepository.save(tip);
        if (saved.getResult() != null) {
            ticketService.syncTipResultAndRecalculateAffectedTickets(saved);
        }
        return saved;
    }

    @Transactional
    public List<Tip> createTips(List<Tip> tips) {
        List<Tip> saved = tipRepository.saveAll(tips);
        for (Tip t : saved) {
            if (t.getResult() != null) {
                ticketService.syncTipResultAndRecalculateAffectedTickets(t);
            }
        }
        return saved;
    }

    @Transactional
    public void deleteTip(Long id) {
        // Desvincular de selecciones de tickets
        ticketSelectionRepository.nullifyTipId(id);
        // Eliminar el tip
        tipRepository.deleteById(id);
    }
}
