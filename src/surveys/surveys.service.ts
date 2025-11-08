import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { FirebaseService } from '../shared/firebase/firebase.service';
import { CacheService } from '../shared/cache/cache.service';
import { RealtimeService } from '../shared/realtime/realtime.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';

@Injectable()
export class SurveysService {
  private readonly logger = new Logger(SurveysService.name);
  private readonly collection = 'surveys';

  constructor(
    private firebaseService: FirebaseService,
    private cacheService: CacheService,
    private realtimeService: RealtimeService,
  ) {}

  async create(createSurveyDto: CreateSurveyDto, userId: string) {
    const survey = {
      ...createSurveyDto,
      createdBy: userId,
      createdAt: this.firebaseService.serverTimestamp(),
      isActive: true,
      responseCount: 0,
      settings: {
        allowAnonymous: true,
        allowMultipleResponses: false,
        showResults: false,
        requireLogin: false,
        expiresAt: null,
        ...createSurveyDto.settings,
      },
    };

    const docRef = await this.firebaseService.firestore
      .collection(this.collection)
      .add(survey);

    this.logger.log(`Survey created: ${docRef.id} by user ${userId}`);

    // Invalidate cache
    await this.cacheService.invalidate(`surveys:${userId}*`);

    return {
      id: docRef.id,
      ...survey,
      createdAt: new Date(),
    };
  }

  async findAll(userId: string, filters?: any) {
    const cacheKey = `surveys:${userId}:${JSON.stringify(filters || {})}`;
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      this.logger.log(`Cache hit for surveys list: ${userId}`);
      return cached;
    }

    try {
      let query = this.firebaseService.firestore
        .collection(this.collection)
        .where('createdBy', '==', userId);

      // If isActive filter is provided, apply it
      if (filters?.isActive !== undefined) {
        query = query.where('isActive', '==', filters.isActive);
        // When using multiple where clauses, orderBy must match the last where field or use an index
        // We'll sort in memory after fetching to avoid index requirement
      }

      const snapshot = await query.get();
      let surveys = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
        } as any;
      });

      // Sort by createdAt in memory (descending)
      surveys.sort((a: any, b: any) => {
        const aDate = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
        const bDate = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
        return bDate.getTime() - aDate.getTime();
      });

      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, surveys, 300);

      this.logger.log(`Found ${surveys.length} surveys for user ${userId}`);
      return surveys;
    } catch (error) {
      this.logger.error(`Error fetching surveys for user ${userId}:`, error);
      throw error;
    }
  }

  async findOne(id: string, userId?: string) {
    const cacheKey = `survey:${id}`;
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      this.logger.log(`Cache hit for survey: ${id}`);
      return cached;
    }

    const docRef = this.firebaseService.firestore
      .collection(this.collection)
      .doc(id);

    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }

    const survey = {
      id: doc.id,
      ...doc.data(),
    };

    // Cache for 2 minutes
    await this.cacheService.set(cacheKey, survey, 120);

    return survey;
  }

  async update(id: string, updateSurveyDto: UpdateSurveyDto, userId: string) {
    const docRef = this.firebaseService.firestore
      .collection(this.collection)
      .doc(id);

    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }

    const survey = doc.data();

    if (survey.createdBy !== userId) {
      throw new ForbiddenException('You are not authorized to update this survey');
    }

    const updateData = {
      ...updateSurveyDto,
      updatedAt: this.firebaseService.serverTimestamp(),
    };

    await docRef.update(updateData);

    this.logger.log(`Survey updated: ${id} by user ${userId}`);

    // Invalidate cache
    await this.cacheService.del(`survey:${id}`);
    await this.cacheService.invalidate(`surveys:${userId}*`);

    // Emit real-time update
    await this.realtimeService.emitSurveyUpdate(id, {
      id,
      ...survey,
      ...updateData,
      updatedAt: new Date(),
    });

    return {
      id,
      ...survey,
      ...updateData,
      updatedAt: new Date(),
    };
  }

  async remove(id: string, userId: string) {
    const docRef = this.firebaseService.firestore
      .collection(this.collection)
      .doc(id);

    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }

    const survey = doc.data();

    if (survey.createdBy !== userId) {
      throw new ForbiddenException('You are not authorized to delete this survey');
    }

    // Hard delete - physically remove from Firebase
    await docRef.delete();

    this.logger.log(`Survey deleted: ${id} by user ${userId}`);

    // Invalidate cache
    await this.cacheService.del(`survey:${id}`);
    await this.cacheService.invalidate(`surveys:${userId}*`);

    return { message: 'Survey deleted successfully' };
  }

  async incrementResponseCount(id: string) {
    const docRef = this.firebaseService.firestore
      .collection(this.collection)
      .doc(id);

    await docRef.update({
      responseCount: this.firebaseService.increment(1),
    });

    // Invalidate cache
    await this.cacheService.del(`survey:${id}`);
  }

  async getPublicSurvey(id: string) {
    const survey: any = await this.findOne(id);

    if (!survey.isActive) {
      throw new NotFoundException('This survey is no longer active');
    }

    if (survey.settings?.expiresAt && new Date(survey.settings.expiresAt) < new Date()) {
      throw new NotFoundException('This survey has expired');
    }

    // Return only public information
    return {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      settings: survey.settings,
      isActive: survey.isActive
    };
  }
}
