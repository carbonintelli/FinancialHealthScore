from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    carbon_intelligence_api_key: str = ""
    carbon_intelligence_base_url: str = "https://ci.sustainow.in/api"
    credit_bureau_api_key: str = ""
    credit_bureau_base_url: str = "https://api.cibil.com"
    tax_api_key: str = ""
    tax_api_base_url: str = "https://api.gst.gov.in"
    legal_api_key: str = ""
    legal_api_base_url: str = "https://api.ecourts.gov.in"
    document_api_key: str = ""
    document_api_base_url: str = "https://api.document-intel.local"
    use_mock_integrations: bool = True
    host: str = "0.0.0.0"
    port: int = 8080
    debug: bool = False
    use_mock_carbon_data: bool = True
    app_name: str = "Financial Health Score"
    app_version: str = "1.1.0"

    @property
    def has_carbon_api_key(self) -> bool:
        return bool(self.carbon_intelligence_api_key.strip())

    @property
    def has_live_integrations(self) -> bool:
        return bool(
            self.credit_bureau_api_key or self.tax_api_key or self.legal_api_key or self.document_api_key
        )


settings = Settings()
