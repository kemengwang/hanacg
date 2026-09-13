export interface EmailConfig {
  PUBLIC_KEY: string
  SERVICE_ID: string
  TEMPLATE_ID: string
  fromName: string
  fromEmail: string
}

export const emailConfig: EmailConfig
