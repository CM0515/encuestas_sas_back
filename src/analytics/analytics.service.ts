import {
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { FirebaseService } from '../shared/firebase/firebase.service';
import { CacheService } from '../shared/cache/cache.service';
import { StorageService } from '../shared/storage/storage.service';
import { EmailService } from '../shared/email/email.service';
import { SurveysService } from '../surveys/surveys.service';
import { QuestionsService } from '../questions/questions.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private firebaseService: FirebaseService,
    private cacheService: CacheService,
    private storageService: StorageService,
    private emailService: EmailService,
    private surveysService: SurveysService,
    private questionsService: QuestionsService,
  ) {}

  async getResults(surveyId: string, userId: string) {
    // Verify user owns the survey
    const survey: any = await this.surveysService.findOne(surveyId);
    if (survey.createdBy !== userId) {
      throw new ForbiddenException('You do not own this survey');
    }

    const cacheKey = `analytics:${surveyId}`;
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      this.logger.log(`Cache hit for analytics: ${surveyId}`);
      return cached;
    }

    const [questions, responses] = await Promise.all([
      this.questionsService.findBySurvey(surveyId),
      this.getResponses(surveyId),
    ]);

    const results = this.calculateStats(questions as any[], responses as any[]);

    // Cache for 1 minute
    await this.cacheService.set(cacheKey, results, 60);

    return results;
  }

  async exportToCSV(surveyId: string, userId: string, userEmail: string) {
    // Verify user owns the survey
    const survey: any = await this.surveysService.findOne(surveyId);
    if (survey.createdBy !== userId) {
      throw new ForbiddenException('You do not own this survey');
    }

    const results = await this.getResults(surveyId, userId);
    const csv = this.convertToCSV(results);

    // Upload to Firebase Storage
    const filename = `exports/${surveyId}-${Date.now()}.csv`;
    await this.storageService.uploadFile(filename, csv, 'text/csv');

    // Get signed URL
    const url = await this.storageService.getSignedUrl(filename, 1);

    // Send email
    await this.emailService.sendResultsReport(userEmail, survey.title, url);

    this.logger.log(`CSV export created for survey ${surveyId}`);

    return { url, filename };
  }

  private async getResponses(surveyId: string) {
    const snapshot = await this.firebaseService.firestore
      .collection('responses')
      .where('surveyId', '==', surveyId)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  private calculateStats(questions: any[], responses: any[]) {
    const stats = {};

    for (const question of questions) {
      stats[question.id] = {
        question: question.text,
        type: question.type,
        totalResponses: 0,
        data: {},
      };

      switch (question.type) {
        case 'multiple_choice':
          stats[question.id].data = this.calculateMultipleChoice(
            question,
            responses,
          );
          break;
        case 'scale':
          stats[question.id].data = this.calculateScale(question, responses);
          break;
        case 'text':
          stats[question.id].data = this.getTextResponses(question, responses);
          break;
        case 'date':
          stats[question.id].data = this.getDateResponses(question, responses);
          break;
      }

      stats[question.id].totalResponses = responses.length;
    }

    return {
      totalResponses: responses.length,
      questions: stats,
    };
  }

  private calculateMultipleChoice(question: any, responses: any[]) {
    const counts = {};
    question.options.forEach((opt) => (counts[opt] = 0));

    responses.forEach((resp) => {
      const answer = resp.answers[question.id];
      if (answer && counts.hasOwnProperty(answer)) {
        counts[answer]++;
      }
    });

    const total = Object.values(counts).reduce((a: number, b: number) => a + b, 0);

    return {
      counts,
      percentages: Object.entries(counts).reduce((acc, [key, val]) => {
        acc[key] = (total as number) > 0 ? (((val as number) / (total as number)) * 100).toFixed(2) : 0;
        return acc;
      }, {}),
      total,
    };
  }

  private calculateScale(question: any, responses: any[]) {
    const values = [];

    responses.forEach((resp) => {
      const answer = resp.answers[question.id];
      if (answer !== undefined && answer !== null) {
        values.push(Number(answer));
      }
    });

    if (values.length === 0) {
      return { average: 0, min: 0, max: 0, count: 0 };
    }

    const sum = values.reduce((a, b) => a + b, 0);
    const average = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Distribution
    const distribution = {};
    for (let i = question.validation.min; i <= question.validation.max; i++) {
      distribution[i] = values.filter((v) => v === i).length;
    }

    return {
      average: average.toFixed(2),
      min,
      max,
      count: values.length,
      distribution,
    };
  }

  private getTextResponses(question: any, responses: any[]) {
    const answers = [];

    responses.forEach((resp) => {
      const answer = resp.answers[question.id];
      if (answer) {
        answers.push({
          text: answer,
          submittedAt: resp.submittedAt,
        });
      }
    });

    return { answers, count: answers.length };
  }

  private getDateResponses(question: any, responses: any[]) {
    const dates = [];

    responses.forEach((resp) => {
      const answer = resp.answers[question.id];
      if (answer) {
        dates.push(answer);
      }
    });

    return { dates, count: dates.length };
  }

  private convertToCSV(results: any): string {
    const lines = [];
    
    // Header
    const headers = ['Response ID', 'Submitted At'];
    Object.values(results.questions).forEach((q: any) => {
      headers.push(q.question);
    });
    lines.push(headers.join(','));

    // TODO: Implement full CSV conversion
    // This is a simplified version
    
    return lines.join('\n');
  }
}
