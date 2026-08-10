from __future__ import annotations

from collections import deque


PROFILE_PRESETS = {
    "conservative": {
        "off_video_weight": 0.62,
        "off_ratio_weight": 0.23,
        "head_drift_weight": 0.15,
        "return_penalty_weight": 0.18,
        "off_video_norm_ms": 2300.0,
        "head_drift_norm": 0.22,
        "return_penalty_norm": 5.0,
        "min_confidence": 0.4,
    },
    "balanced": {
        "off_video_weight": 0.55,
        "off_ratio_weight": 0.25,
        "head_drift_weight": 0.2,
        "return_penalty_weight": 0.12,
        "off_video_norm_ms": 1800.0,
        "head_drift_norm": 0.2,
        "return_penalty_norm": 5.0,
        "min_confidence": 0.35,
    },
    "aggressive": {
        "off_video_weight": 0.48,
        "off_ratio_weight": 0.3,
        "head_drift_weight": 0.22,
        "return_penalty_weight": 0.08,
        "off_video_norm_ms": 1300.0,
        "head_drift_norm": 0.18,
        "return_penalty_norm": 5.0,
        "min_confidence": 0.3,
    },
}


def clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, value))


class AttentionModel:
    """A transparent heuristic attention model used for debug and fallback."""

    def __init__(self, history_size: int = 45, profile: str = "balanced") -> None:
        self.history = deque(maxlen=history_size)
        self.off_video_started_at: float | None = None
        self.last_on_video = False
        self.return_count = 0
        self.profile = "balanced"
        self.preset = PROFILE_PRESETS["balanced"]
        self.set_profile(profile)

    def set_profile(self, profile: str) -> None:
        if profile not in PROFILE_PRESETS:
            profile = "balanced"
        self.profile = profile
        self.preset = PROFILE_PRESETS[profile]

    def update(
        self,
        timestamp_s: float,
        on_video: bool,
        tracking_confidence: float,
        head_drift: float,
    ) -> dict:
        if on_video:
            self.off_video_started_at = None
            if not self.last_on_video:
                self.return_count += 1
        else:
            if self.off_video_started_at is None:
                self.off_video_started_at = timestamp_s

        self.last_on_video = on_video
        self.history.append(1.0 if on_video else 0.0)

        off_video_ms = 0
        if self.off_video_started_at is not None:
            off_video_ms = int((timestamp_s - self.off_video_started_at) * 1000)

        if self.history:
            off_ratio = 1.0 - (sum(self.history) / len(self.history))
        else:
            off_ratio = 0.0

        off_video_norm_ms = self.preset["off_video_norm_ms"]
        head_drift_norm = self.preset["head_drift_norm"]
        return_penalty_norm = self.preset["return_penalty_norm"]
        min_confidence = self.preset["min_confidence"]
        score = (
            self.preset["off_video_weight"] * clamp(off_video_ms / off_video_norm_ms)
            + self.preset["off_ratio_weight"] * clamp(off_ratio)
            + self.preset["head_drift_weight"] * clamp(head_drift / head_drift_norm)
            - self.preset["return_penalty_weight"] * clamp(self.return_count / return_penalty_norm)
        )
        score = clamp(score)

        confidence_ok = tracking_confidence >= min_confidence
        if not confidence_ok:
            score = 0.0

        return {
            "onVideo": on_video,
            "offVideoMs": off_video_ms,
            "recentOffVideoRatio": round(off_ratio, 3),
            "returnCount": self.return_count,
            "disengagementScore": round(score, 3),
            "profile": self.profile,
            "gates": {
                "confidenceOk": confidence_ok,
                "minConfidence": min_confidence,
            },
        }
