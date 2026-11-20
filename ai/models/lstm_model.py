import os
import json
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from typing import Dict, Any, List, Optional, Tuple

class AdditiveAttention(nn.Module):
    """
    Additive Self-Attention mechanism (Bahdanau-style) for LSTM hidden states.
    Computes temporal attention weights across longitudinal patient visits:
        e_t = v^T * tanh(W_h * h_t + b)
        alpha_t = softmax(e_t)
        context = sum(alpha_t * h_t)
    """
    def __init__(self, hidden_dim: int):
        super().__init__()
        self.W = nn.Linear(hidden_dim, hidden_dim)
        self.v = nn.Linear(hidden_dim, 1, bias=False)

    def forward(self, hidden_states: torch.Tensor, mask: Optional[torch.Tensor] = None) -> Tuple[torch.Tensor, torch.Tensor]:
        # hidden_states: (batch_size, seq_len, hidden_dim)
        scores = self.v(torch.tanh(self.W(hidden_states))) # (batch_size, seq_len, 1)
        if mask is not None:
            # Mask padded time-steps with large negative value
            scores = scores.masked_fill(mask.unsqueeze(-1) == 0, -1e9)

        weights = F.softmax(scores, dim=1) # (batch_size, seq_len, 1)
        context = torch.sum(weights * hidden_states, dim=1) # (batch_size, hidden_dim)
        return context, weights.squeeze(-1) # (batch_size, hidden_dim), (batch_size, seq_len)

class LongitudinalHeartLSTM(nn.Module):
    """
    Longitudinal LSTM Neural Network with Additive Attention and Monte Carlo Dropout
    for tracking cardiovascular patient trajectories over sequential clinic visits.

    Features per time-step (6 temporal biomarkers):
        [systolicBP, diastolicBP, cholesterol, bloodSugar, heartRate, bmi]
    """
    def __init__(self, input_dim: int = 6, hidden_dim: int = 32, num_layers: int = 1, dropout: float = 0.2):
        super().__init__()
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.dropout_p = dropout

        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0
        )
        self.attention = AdditiveAttention(hidden_dim)
        self.dropout_layer = nn.Dropout(p=dropout)
        self.fc = nn.Linear(hidden_dim, 1)

    def forward(self, x: torch.Tensor, mask: Optional[torch.Tensor] = None) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Standard forward pass.
        x: (batch_size, seq_len, input_dim)
        Returns:
            logits: (batch_size, 1)
            attention_weights: (batch_size, seq_len)
        """
        out, _ = self.lstm(x) # (batch_size, seq_len, hidden_dim)
        context, attn_weights = self.attention(out, mask=mask)
        dropped = self.dropout_layer(context)
        logits = self.fc(dropped)
        return logits, attn_weights

    def predict_monte_carlo(self, x: torch.Tensor, mask: Optional[torch.Tensor] = None, n_passes: int = 30) -> Dict[str, Any]:
        """
        Executes Monte Carlo Dropout forward passes by keeping dropout enabled during inference.
        Returns empirical probability distribution, mean, std error, and 95% predictive interval.
        """
        self.train() # Enable dropout during evaluation for MC Dropout
        probabilities = []
        all_attentions = []

        with torch.no_grad():
            for _ in range(n_passes):
                logits, attn = self.forward(x, mask=mask)
                prob = torch.sigmoid(logits).item()
                probabilities.append(prob)
                all_attentions.append(attn.squeeze(0).cpu().numpy())

        self.eval() # Reset to eval mode
        probs = np.array(probabilities)
        mean_prob = float(np.mean(probs))
        std_error = float(np.std(probs, ddof=1)) if len(probs) > 1 else 0.0

        # Empirical 95% predictive interval (2.5th and 97.5th percentiles)
        ci_lower = float(np.percentile(probs, 2.5))
        ci_upper = float(np.percentile(probs, 97.5))

        mean_attention = np.mean(all_attentions, axis=0)

        return {
            "mean_probability": round(mean_prob, 4),
            "std_error": round(std_error, 4),
            "confidence_interval_95": [round(ci_lower, 4), round(ci_upper, 4)],
            "n_monte_carlo_passes": n_passes,
            "uncertainty_method": "Monte Carlo Dropout (Stochastic Test-Time Dropout)",
            "attention_weights": [round(float(w), 4) for w in mean_attention]
        }
