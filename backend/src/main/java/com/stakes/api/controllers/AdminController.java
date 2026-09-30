package com.stakes.api.controllers;

import com.stakes.api.models.User;
import com.stakes.api.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin")
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/users/pending")
    public ResponseEntity<?> getPendingUsers() {
        List<User> pendingUsers = userRepository.findAll().stream()
                .filter(u -> u.getApproved() == null || !u.getApproved())
                .collect(Collectors.toList());
        return ResponseEntity.ok(pendingUsers);
    }

    @PostMapping("/users/{id}/approve")
    public ResponseEntity<?> approveUser(@PathVariable Long id) {
        return userRepository.findById(id).map(user -> {
            user.setApproved(true);
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "Usuario aprobado exitosamente"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/users/{id}/reject")
    public ResponseEntity<?> rejectUser(@PathVariable Long id) {
        return userRepository.findById(id).map(user -> {
            userRepository.delete(user);
            return ResponseEntity.ok(Map.of("message", "Usuario rechazado/eliminado exitosamente"));
        }).orElse(ResponseEntity.notFound().build());
    }
}
