from typing import Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, AliasChoices


class Settings(BaseSettings):
    """
    Centralized app configuration.
    Values are loaded from environment variables / .env file.
    Never hardcode secrets here — this file only defines shape + defaults.
    """
    mongodb_uri: str = Field(
        default="",
        validation_alias=AliasChoices("MONGODB_URI", "mongodb_uri"),
    )
    db_name: str = Field(
        default="mindmap",
        validation_alias=AliasChoices("MONGODB_DATABASE", "DB_NAME", "mongodb_database", "db_name"),
    )

    jwt_secret: str = "mindmap_development_secret_key_change_in_production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = Field(
        default=120,
        validation_alias=AliasChoices("ACCESS_TOKEN_EXPIRE_MINUTES", "access_token_expire_minutes"),
    )
    refresh_token_expire_days: int = 7

    port: int = Field(
        default=8000,
        validation_alias=AliasChoices("PORT", "port"),
    )

    webrtc_stun_server: str = Field(
        default="stun:stun.l.google.com:19302",
        validation_alias=AliasChoices("WEBRTC_STUN_SERVER", "webrtc_stun_server"),
    )
    webrtc_turn_server: str = Field(
        default="",
        validation_alias=AliasChoices("WEBRTC_TURN_SERVER", "webrtc_turn_server"),
    )
    webrtc_turn_username: str = Field(
        default="",
        validation_alias=AliasChoices("WEBRTC_TURN_USERNAME", "webrtc_turn_username"),
    )
    webrtc_turn_credential: str = Field(
        default="",
        validation_alias=AliasChoices("WEBRTC_TURN_CREDENTIAL", "webrtc_turn_credential"),
    )

    frontend_url: str = Field(
        default="https://mind-map-real-time-student-attention.vercel.app",
        validation_alias=AliasChoices("FRONTEND_URL", "frontend_url"),
    )
    cors_origins: Union[list[str], str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "https://mind-map-real-time-student-attention.vercel.app",
            "https://mind-map-real-time-student-attention-confusion-detec-v4190kg8.vercel.app",
            "https://mindmap-real-time-student-attention-confusion-detector-v4lfg.vercel.app",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:4173",
        ],
        validation_alias=AliasChoices("CORS_ORIGINS", "cors_origins"),
    )

    def get_cors_origins(self) -> list[str]:
        origins: list[str] = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "https://mind-map-real-time-student-attention.vercel.app",
            "https://mind-map-real-time-student-attention-confusion-detec-v4190kg8.vercel.app",
            "https://mindmap-real-time-student-attention-confusion-detector-v4lfg.vercel.app",
        ]
        if isinstance(self.cors_origins, str):
            try:
                import json
                parsed = json.loads(self.cors_origins)
                if isinstance(parsed, list):
                    for item in parsed:
                        s = str(item).strip().strip("'\"").rstrip("/")
                        if s and s not in origins:
                            origins.append(s)
                else:
                    s = str(parsed).strip().strip("'\"").rstrip("/")
                    if s and s not in origins:
                        origins.append(s)
            except Exception:
                for o in self.cors_origins.split(","):
                    s = o.strip().strip("'\"").rstrip("/")
                    if s and s not in origins:
                        origins.append(s)
        elif isinstance(self.cors_origins, list):
            for o in self.cors_origins:
                s = str(o).strip().strip("'\"").rstrip("/")
                if s and s not in origins:
                    origins.append(s)

        if self.frontend_url:
            for url in self.frontend_url.split(","):
                clean = url.strip().strip("'\"").rstrip("/")
                if clean and clean not in origins:
                    origins.append(clean)
        return origins

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

