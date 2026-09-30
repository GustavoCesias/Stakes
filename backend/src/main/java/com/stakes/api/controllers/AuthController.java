package com.stakes.api.controllers;

import com.stakes.api.models.User;
import com.stakes.api.repositories.UserRepository;
import com.stakes.api.security.JwtTokenProvider;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Data
    public static class LoginRequest {
        private String username;
        private String password;
    }

    @Data
    public static class LoginResponse {
        private String token;
        private String username;
        private String name;
        private String role;
    }

    @Data
    public static class RegisterRequest {
        private String username;
        private String password;
        private String name;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        if (request.getUsername() == null || request.getPassword() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Usuario y contraseña requeridos"));
        }

        Optional<User> userOpt = userRepository.findByUsername(request.getUsername().trim().toLowerCase());
        if (userOpt.isEmpty() && "gustavo".equalsIgnoreCase(request.getUsername())) {
            userOpt = userRepository.findByUsername("gustavo");
        }

        if (userOpt.isEmpty() || !passwordEncoder.matches(request.getPassword(), userOpt.get().getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Usuario o contraseña incorrectos"));
        }

        User user = userOpt.get();

        if (user.getApproved() == null || !user.getApproved()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Tu cuenta está pendiente de aprobación por un administrador."));
        }

        String token = tokenProvider.generateToken(user.getUsername());

        LoginResponse response = new LoginResponse();
        response.setToken(token);
        response.setUsername(user.getUsername());
        response.setName(user.getName());
        response.setRole(user.getRole());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (request.getUsername() == null || request.getPassword() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Usuario y contraseña requeridos"));
        }

        String username = request.getUsername().trim().toLowerCase();
        if (userRepository.existsByUsername(username)) {
            return ResponseEntity.badRequest().body(Map.of("message", "El nombre de usuario ya está en uso"));
        }

        User newUser = new User();
        newUser.setUsername(username);
        newUser.setPassword(passwordEncoder.encode(request.getPassword()));
        newUser.setName(request.getName());
        newUser.setRole("ROLE_USER");
        newUser.setApproved(false); // Requiere aprobación

        userRepository.save(newUser);

        return ResponseEntity.ok(Map.of("message", "Cuenta creada exitosamente. Espera la aprobación de un administrador."));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "No autenticado"));
        }
        Optional<User> userOpt = userRepository.findByUsername(principal.getName());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Usuario no encontrado"));
        }
        User user = userOpt.get();
        return ResponseEntity.ok(Map.of(
                "username", user.getUsername(),
                "name", user.getName() != null ? user.getName() : user.getUsername(),
                "role", user.getRole()
        ));
    }
}
