import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private fromEmail: string;

  constructor(private configService: ConfigService) {
    const apiKey = process.env.RESEND_API_KEY;

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.fromEmail = process.env.FROM_EMAIL || 'noreply@surveys.com';
      this.logger.log('Email service initialized');
    } else {
      this.logger.warn('Resend API key not configured, email sending disabled');
    }
  }

  async sendSurveyInvitation(
    to: string,
    surveyId: string,
    surveyTitle: string,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.warn('Email service not configured');
      return;
    }

    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    const surveyUrl = `${frontendUrl}/survey/${surveyId}`;

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: `Invitación: ${surveyTitle}`,
        html: this.getSurveyInvitationTemplate(surveyTitle, surveyUrl),
      });

      this.logger.log(`Survey invitation sent to ${to}`);
    } catch (error) {
      this.logger.error(`Error sending survey invitation to ${to}:`, error);
      throw error;
    }
  }

  async sendResultsReport(
    to: string,
    surveyTitle: string,
    csvUrl: string,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.warn('Email service not configured');
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: `Reporte de Resultados: ${surveyTitle}`,
        html: this.getResultsReportTemplate(surveyTitle, csvUrl),
      });

      this.logger.log(`Results report sent to ${to}`);
    } catch (error) {
      this.logger.error(`Error sending results report to ${to}:`, error);
      throw error;
    }
  }

  async sendResponseNotification(
    to: string,
    surveyTitle: string,
    responseCount: number,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.warn('Email service not configured');
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: `Nueva respuesta en: ${surveyTitle}`,
        html: this.getResponseNotificationTemplate(surveyTitle, responseCount),
      });

      this.logger.log(`Response notification sent to ${to}`);
    } catch (error) {
      this.logger.error(`Error sending response notification to ${to}:`, error);
    }
  }

  private getSurveyInvitationTemplate(
    surveyTitle: string,
    surveyUrl: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background: #4F46E5; 
              color: white; 
              text-decoration: none; 
              border-radius: 6px; 
              margin-top: 20px;
            }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Has sido invitado a responder una encuesta</h1>
            </div>
            <div class="content">
              <h2>${surveyTitle}</h2>
              <p>Tu opinión es importante para nosotros. Por favor, tómate unos minutos para responder esta encuesta.</p>
              <a href="${surveyUrl}" class="button">Responder Encuesta</a>
            </div>
            <div class="footer">
              <p>Este es un correo automático, por favor no respondas.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getResultsReportTemplate(
    surveyTitle: string,
    csvUrl: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background: #10B981; 
              color: white; 
              text-decoration: none; 
              border-radius: 6px; 
              margin-top: 20px;
            }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reporte de Resultados</h1>
            </div>
            <div class="content">
              <h2>${surveyTitle}</h2>
              <p>El reporte de resultados de tu encuesta está listo para descargar.</p>
              <a href="${csvUrl}" class="button">Descargar CSV</a>
              <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                El enlace de descarga expirará en 1 hora por razones de seguridad.
              </p>
            </div>
            <div class="footer">
              <p>Este es un correo automático, por favor no respondas.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getResponseNotificationTemplate(
    surveyTitle: string,
    responseCount: number,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .stats { 
              background: white; 
              padding: 20px; 
              border-radius: 8px; 
              text-align: center; 
              margin: 20px 0;
            }
            .number { font-size: 48px; color: #4F46E5; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Nueva Respuesta Recibida</h1>
            </div>
            <div class="content">
              <h2>${surveyTitle}</h2>
              <p>¡Genial! Has recibido una nueva respuesta en tu encuesta.</p>
              <div class="stats">
                <div class="number">${responseCount}</div>
                <p>Respuestas totales</p>
              </div>
            </div>
            <div class="footer">
              <p>Este es un correo automático, por favor no respondas.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
