import { Body, Controller, DefaultValuePipe, Get, HttpCode, HttpStatus, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { StudentAuth } from '../../common/decorators/auth.decorators';
import { CurrentStudent } from '../../common/decorators/current-student.decorator';
import { CardDto } from '../../common/dto/card.dto';
import { FeedbackDto } from '../../common/dto/feedback.dto';
import { Student } from '../../core/domain';
import { ReviewAttemptDto, ReviewAttemptResultDto, ReviewCardsDto, ReviewSoundDto } from './dto/review.dto';
import { ReviewService } from './review.service';

@ApiTags('Repaso')
@Controller('review')
@StudentAuth()
export class ReviewController {
  constructor(private readonly review: ReviewService) {}

  @Get('sounds')
  @ApiOperation({ summary: 'Los sonidos ya dominados, para la grilla de Repaso.' })
  @ApiOkResponse({ type: [ReviewSoundDto] })
  sounds(@CurrentStudent() student: Student): Promise<ReviewSoundDto[]> {
    return this.review.sounds(student);
  }

  @Get('cards')
  @ApiOperation({
    summary: 'Tarjetas barajadas de niveles ya dominados.',
    description: 'Practica libre. Nada de lo que pase aca afecta la progresion de niveles.',
  })
  @ApiQuery({ name: 'limit', required: false, example: 5 })
  @ApiOkResponse({ type: ReviewCardsDto })
  async cards(
    @CurrentStudent() student: Student,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ): Promise<ReviewCardsDto> {
    const { cards, available } = await this.review.cardsFor(student, Math.min(Math.max(limit, 1), 30));
    return { cards: cards.map(CardDto.from), available };
  }

  @Post('attempts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Valida un armado de repaso y devuelve feedback, sin tocar el progreso.' })
  @ApiOkResponse({ type: ReviewAttemptResultDto })
  @ApiNotFoundResponse({ description: 'La tarjeta no existe o su nivel no esta dominado.' })
  async attempt(@CurrentStudent() student: Student, @Body() body: ReviewAttemptDto): Promise<ReviewAttemptResultDto> {
    const { result, feedback } = await this.review.attempt(student, body.cardId, body.sequence);
    return {
      correct: result.correct,
      firstWrongIndex: result.firstWrongIndex,
      expectedLength: result.expectedLength,
      feedback: FeedbackDto.from(feedback),
      affectsProgress: false,
    };
  }
}
