import { Module } from '@nestjs/common';
import { StudentModule } from '../student/student.module';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';

@Module({
  imports: [StudentModule],
  controllers: [ReviewController],
  providers: [ReviewService],
})
export class ReviewModule {}
