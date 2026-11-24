"""Configuration for CloudPulse."""

import os
from functools import lru_cache


class Settings:
    """Application settings loaded from environment variables."""

    # Data source: "simulated" or "gcp"
    DATA_SOURCE: str = os.getenv("DATA_SOURCE", "simulated")

    # Collection interval in seconds
    COLLECTION_INTERVAL_SECONDS: int = int(os.getenv("COLLECTION_INTERVAL_SECONDS", "60"))

    # GCP project ID (optional; set only when GCP mode is active)
    GCP_PROJECT_ID: str = os.getenv("GCP_PROJECT_ID", "")

    # Notification cooldown in minutes (default demo value)
    NOTIFICATION_COOLDOWN_MINUTES: int = int(
        os.getenv("NOTIFICATION_COOLDOWN_MINUTES", "10")
    )

    # Recovery readings count (default demo value)
    RECOVERY_READINGS_COUNT: int = int(
        os.getenv("RECOVERY_READINGS_COUNT", "3")
    )

    # Allowed frontend origins for CORS
    FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

    # Demo defaults for threshold rules
    DEMO_CPU_WARNING: int = int(os.getenv("DEMO_CPU_WARNING", "80"))
    DEMO_CRITICAL: int = int(os.getenv("DEMO_CRITICAL", "90"))
    DEMO_MEMORY_WARNING: int = int(os.getenv("DEMO_MEMORY_WARNING", "80"))
    DEMO_MEMORY_CRITICAL: int = int(os.getenv("DEMO_MEMORY_CRITICAL", "90"))

    # Scheduler configuration
    SCHEDULER_ENABLED: bool = os.getenv("SCHEDULER_ENABLED", "false").lower() == "true"

    class Config:
        """Pydantic-style config."""
        arbitrary_types_allowed = True


@lru_cache()
def get_settings():
    """Return a Settings instance, cached per process."""
    return Settings()