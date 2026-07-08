from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    carbon_intelligence_api_key: str = ""
    carbon_intelligence_base_url: str = "https://ci.sustainow.in/api"
    host: str = "0.0.0.0"
    port: int = 8080
    debug: bool = False
    use_mock_carbon_data: bool = True
    app_name: str = "Financial Health Score"
    app_version: str = "1.0.0"

    @property
    def has_carbon_api_key(self) -> bool:
        return bool(self.carbon_intelligence_api_key.strip())


settings = Settings()
