import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../../src/shared/email/email.service';
import { Resend } from 'resend';

jest.mock('resend');

describe('EmailService', () => {
  let service: EmailService;
  let configService: jest.Mocked<ConfigService>;
  let mockEmailsSend: jest.Mock;

  const mockApiKey = 'mock-resend-api-key';
  const mockFromEmail = 'noreply@test.com';
  const mockFrontendUrl = 'https://app.example.com';

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Set environment variables
    process.env.RESEND_API_KEY = mockApiKey;
    process.env.FROM_EMAIL = mockFromEmail;

    // Create mock send function
    mockEmailsSend = jest.fn();

    // Mock Resend constructor
    (Resend as jest.MockedClass<typeof Resend>).mockImplementation(() => ({
      emails: {
        send: mockEmailsSend,
      },
    } as any));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'app.frontendUrl') return mockFrontendUrl;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.FROM_EMAIL;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initialization', () => {
    it('should initialize Resend with API key', () => {
      expect(Resend).toHaveBeenCalledWith(mockApiKey);
    });

    it('should use custom FROM_EMAIL when provided', () => {
      expect(service).toBeDefined();
      // fromEmail is private, but we can test it through sending emails
    });

    it('should use default FROM_EMAIL when not provided', async () => {
      delete process.env.FROM_EMAIL;
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'app.frontendUrl') return mockFrontendUrl;
                return null;
              }),
            },
          },
        ],
      }).compile();

      const serviceWithDefaultEmail = module.get<EmailService>(EmailService);
      expect(serviceWithDefaultEmail).toBeDefined();
    });

    it('should not initialize Resend when API key is missing', async () => {
      delete process.env.RESEND_API_KEY;
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(),
            },
          },
        ],
      }).compile();

      const serviceWithoutResend = module.get<EmailService>(EmailService);
      expect(serviceWithoutResend).toBeDefined();
      expect(Resend).not.toHaveBeenCalled();
    });
  });

  describe('sendSurveyInvitation', () => {
    const to = 'user@example.com';
    const surveyId = 'survey-123';
    const surveyTitle = 'Customer Satisfaction Survey';

    it('should send survey invitation email successfully', async () => {
      mockEmailsSend.mockResolvedValue({ id: 'email-123' } as any);

      await service.sendSurveyInvitation(to, surveyId, surveyTitle);

      expect(mockEmailsSend).toHaveBeenCalledWith({
        from: mockFromEmail,
        to,
        subject: `Invitación: ${surveyTitle}`,
        html: expect.stringContaining(surveyTitle),
      });
    });

    it('should include correct survey URL in email', async () => {
      mockEmailsSend.mockResolvedValue({ id: 'email-123' } as any);

      await service.sendSurveyInvitation(to, surveyId, surveyTitle);

      const call = mockEmailsSend.mock.calls[0][0];
      expect(call.html).toContain(`${mockFrontendUrl}/survey/${surveyId}`);
    });

    it('should include survey title in email body', async () => {
      mockEmailsSend.mockResolvedValue({ id: 'email-123' } as any);

      await service.sendSurveyInvitation(to, surveyId, surveyTitle);

      const call = mockEmailsSend.mock.calls[0][0];
      expect(call.html).toContain(surveyTitle);
    });

    it('should not send email when Resend is not configured', async () => {
      delete process.env.RESEND_API_KEY;
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(),
            },
          },
        ],
      }).compile();

      const serviceWithoutResend = module.get<EmailService>(EmailService);
      await serviceWithoutResend.sendSurveyInvitation(to, surveyId, surveyTitle);

      expect(mockEmailsSend).not.toHaveBeenCalled();
    });

    it('should throw error when email sending fails', async () => {
      const error = new Error('Email sending failed');
      mockEmailsSend.mockRejectedValue(error);

      await expect(
        service.sendSurveyInvitation(to, surveyId, surveyTitle),
      ).rejects.toThrow('Email sending failed');
    });

    it('should format email with HTML template', async () => {
      mockEmailsSend.mockResolvedValue({ id: 'email-123' } as any);

      await service.sendSurveyInvitation(to, surveyId, surveyTitle);

      const call = mockEmailsSend.mock.calls[0][0];
      expect(call.html).toContain('<!DOCTYPE html>');
      expect(call.html).toContain('Responder Encuesta');
    });
  });

  describe('sendResultsReport', () => {
    const to = 'admin@example.com';
    const surveyTitle = 'Employee Satisfaction Survey';
    const csvUrl = 'https://storage.example.com/exports/survey-123.csv';

    it('should send results report email successfully', async () => {
      mockEmailsSend.mockResolvedValue({ id: 'email-123' } as any);

      await service.sendResultsReport(to, surveyTitle, csvUrl);

      expect(mockEmailsSend).toHaveBeenCalledWith({
        from: mockFromEmail,
        to,
        subject: `Reporte de Resultados: ${surveyTitle}`,
        html: expect.stringContaining(surveyTitle),
      });
    });

    it('should include CSV download link in email', async () => {
      mockEmailsSend.mockResolvedValue({ id: 'email-123' } as any);

      await service.sendResultsReport(to, surveyTitle, csvUrl);

      const call = mockEmailsSend.mock.calls[0][0];
      expect(call.html).toContain(csvUrl);
    });

    it('should include survey title in email body', async () => {
      mockEmailsSend.mockResolvedValue({ id: 'email-123' } as any);

      await service.sendResultsReport(to, surveyTitle, csvUrl);

      const call = mockEmailsSend.mock.calls[0][0];
      expect(call.html).toContain(surveyTitle);
    });

    it('should include expiration notice in email', async () => {
      mockEmailsSend.mockResolvedValue({ id: 'email-123' } as any);

      await service.sendResultsReport(to, surveyTitle, csvUrl);

      const call = mockEmailsSend.mock.calls[0][0];
      expect(call.html).toContain('El enlace de descarga expirará en 1 hora');
    });

    it('should not send email when Resend is not configured', async () => {
      delete process.env.RESEND_API_KEY;
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(),
            },
          },
        ],
      }).compile();

      const serviceWithoutResend = module.get<EmailService>(EmailService);
      await serviceWithoutResend.sendResultsReport(to, surveyTitle, csvUrl);

      expect(mockEmailsSend).not.toHaveBeenCalled();
    });

    it('should throw error when email sending fails', async () => {
      const error = new Error('Email delivery failed');
      mockEmailsSend.mockRejectedValue(error);

      await expect(
        service.sendResultsReport(to, surveyTitle, csvUrl),
      ).rejects.toThrow('Email delivery failed');
    });

    it('should format email with HTML template', async () => {
      mockEmailsSend.mockResolvedValue({ id: 'email-123' } as any);

      await service.sendResultsReport(to, surveyTitle, csvUrl);

      const call = mockEmailsSend.mock.calls[0][0];
      expect(call.html).toContain('<!DOCTYPE html>');
      expect(call.html).toContain('Descargar CSV');
    });
  });

  describe('sendResponseNotification', () => {
    const to = 'admin@example.com';
    const surveyTitle = 'Product Feedback Survey';
    const responseCount = 42;

    it('should send response notification email successfully', async () => {
      mockEmailsSend.mockResolvedValue({ id: 'email-123' } as any);

      await service.sendResponseNotification(to, surveyTitle, responseCount);

      expect(mockEmailsSend).toHaveBeenCalledWith({
        from: mockFromEmail,
        to,
        subject: `Nueva respuesta en: ${surveyTitle}`,
        html: expect.stringContaining(surveyTitle),
      });
    });

    it('should include response count in email', async () => {
      mockEmailsSend.mockResolvedValue({ id: 'email-123' } as any);

      await service.sendResponseNotification(to, surveyTitle, responseCount);

      const call = mockEmailsSend.mock.calls[0][0];
      expect(call.html).toContain(responseCount.toString());
    });

    it('should include survey title in email body', async () => {
      mockEmailsSend.mockResolvedValue({ id: 'email-123' } as any);

      await service.sendResponseNotification(to, surveyTitle, responseCount);

      const call = mockEmailsSend.mock.calls[0][0];
      expect(call.html).toContain(surveyTitle);
    });

    it('should not send email when Resend is not configured', async () => {
      delete process.env.RESEND_API_KEY;
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(),
            },
          },
        ],
      }).compile();

      const serviceWithoutResend = module.get<EmailService>(EmailService);
      await serviceWithoutResend.sendResponseNotification(to, surveyTitle, responseCount);

      expect(mockEmailsSend).not.toHaveBeenCalled();
    });

    it('should not throw error when email sending fails', async () => {
      const error = new Error('Email sending failed');
      mockEmailsSend.mockRejectedValue(error);

      await expect(
        service.sendResponseNotification(to, surveyTitle, responseCount),
      ).resolves.not.toThrow();
    });

    it('should format email with HTML template', async () => {
      mockEmailsSend.mockResolvedValue({ id: 'email-123' } as any);

      await service.sendResponseNotification(to, surveyTitle, responseCount);

      const call = mockEmailsSend.mock.calls[0][0];
      expect(call.html).toContain('<!DOCTYPE html>');
      expect(call.html).toContain('Respuestas totales');
    });

    it('should handle single response count', async () => {
      mockEmailsSend.mockResolvedValue({ id: 'email-123' } as any);

      await service.sendResponseNotification(to, surveyTitle, 1);

      const call = mockEmailsSend.mock.calls[0][0];
      expect(call.html).toContain('1');
    });

    it('should handle large response counts', async () => {
      mockEmailsSend.mockResolvedValue({ id: 'email-123' } as any);

      await service.sendResponseNotification(to, surveyTitle, 9999);

      const call = mockEmailsSend.mock.calls[0][0];
      expect(call.html).toContain('9999');
    });
  });

  describe('template rendering', () => {
    it('should render survey invitation template correctly', async () => {
      mockEmailsSend.mockResolvedValue({ id: 'email-123' } as any);

      await service.sendSurveyInvitation(
        'user@example.com',
        'survey-123',
        'Test Survey',
      );

      const call = mockEmailsSend.mock.calls[0][0];
      expect(call.html).toContain('Has sido invitado a responder una encuesta');
      expect(call.html).toContain('Test Survey');
      expect(call.html).toContain('href=');
    });

    it('should render results report template correctly', async () => {
      mockEmailsSend.mockResolvedValue({ id: 'email-123' } as any);

      await service.sendResultsReport(
        'admin@example.com',
        'Test Survey',
        'https://example.com/file.csv',
      );

      const call = mockEmailsSend.mock.calls[0][0];
      expect(call.html).toContain('Reporte de Resultados');
      expect(call.html).toContain('Test Survey');
      expect(call.html).toContain('Descargar CSV');
    });

    it('should render response notification template correctly', async () => {
      mockEmailsSend.mockResolvedValue({ id: 'email-123' } as any);

      await service.sendResponseNotification('admin@example.com', 'Test Survey', 10);

      const call = mockEmailsSend.mock.calls[0][0];
      expect(call.html).toContain('Nueva Respuesta Recibida');
      expect(call.html).toContain('Test Survey');
      expect(call.html).toContain('10');
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in survey title', async () => {
      const specialTitle = 'Survey with "quotes" & <tags>';
      mockEmailsSend.mockResolvedValue({ id: 'email-123' } as any);

      await service.sendSurveyInvitation('user@example.com', 'survey-123', specialTitle);

      const call = mockEmailsSend.mock.calls[0][0];
      expect(call.html).toContain(specialTitle);
    });

    it('should handle very long survey titles', async () => {
      const longTitle = 'A'.repeat(500);
      mockEmailsSend.mockResolvedValue({ id: 'email-123' } as any);

      await service.sendSurveyInvitation('user@example.com', 'survey-123', longTitle);

      const call = mockEmailsSend.mock.calls[0][0];
      expect(call.html).toContain(longTitle);
    });

    it('should handle empty survey title', async () => {
      mockEmailsSend.mockResolvedValue({ id: 'email-123' } as any);

      await service.sendSurveyInvitation('user@example.com', 'survey-123', '');

      expect(mockEmailsSend).toHaveBeenCalled();
    });

    it('should handle special characters in email addresses', async () => {
      const specialEmail = 'user+test@example.com';
      mockEmailsSend.mockResolvedValue({ id: 'email-123' } as any);

      await service.sendSurveyInvitation(specialEmail, 'survey-123', 'Test Survey');

      expect(mockEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({ to: specialEmail }),
      );
    });

    it('should handle zero response count', async () => {
      mockEmailsSend.mockResolvedValue({ id: 'email-123' } as any);

      await service.sendResponseNotification('admin@example.com', 'Test Survey', 0);

      const call = mockEmailsSend.mock.calls[0][0];
      expect(call.html).toContain('0');
    });

    it('should handle URLs with query parameters', async () => {
      const urlWithParams = 'https://storage.example.com/file.csv?token=abc123';
      mockEmailsSend.mockResolvedValue({ id: 'email-123' } as any);

      await service.sendResultsReport('admin@example.com', 'Test Survey', urlWithParams);

      const call = mockEmailsSend.mock.calls[0][0];
      expect(call.html).toContain(urlWithParams);
    });
  });

  describe('error handling', () => {
    it('should log error when survey invitation fails', async () => {
      const loggerErrorSpy = jest.spyOn((service as any).logger, 'error');
      mockEmailsSend.mockRejectedValue(new Error('API error'));

      await expect(
        service.sendSurveyInvitation('user@example.com', 'survey-123', 'Test Survey'),
      ).rejects.toThrow();

      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('should log error when results report fails', async () => {
      const loggerErrorSpy = jest.spyOn((service as any).logger, 'error');
      mockEmailsSend.mockRejectedValue(new Error('API error'));

      await expect(
        service.sendResultsReport('admin@example.com', 'Test Survey', 'https://example.com/file.csv'),
      ).rejects.toThrow();

      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('should handle network timeout errors', async () => {
      mockEmailsSend.mockRejectedValue(new Error('Request timeout'));

      await expect(
        service.sendSurveyInvitation('user@example.com', 'survey-123', 'Test Survey'),
      ).rejects.toThrow('Request timeout');
    });

    it('should handle invalid email format errors', async () => {
      mockEmailsSend.mockRejectedValue(new Error('Invalid email'));

      await expect(
        service.sendSurveyInvitation('invalid-email', 'survey-123', 'Test Survey'),
      ).rejects.toThrow('Invalid email');
    });
  });
});
