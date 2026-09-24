import { Body, Controller, Get, HttpCode, HttpStatus, Post, Put } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { TeacherAuth } from '../../common/decorators/auth.decorators';
import { CurrentClass } from '../../common/decorators/current-class.decorator';
import { SchoolClass } from '../../core/domain';
import {
  ClassSummaryDto,
  LevelProgressRowDto,
  StudentProgressRowDto,
  TeacherLoginDto,
  TeacherSessionDto,
  UnlockLevelDto,
} from './dto/teacher.dto';
import { TeacherService } from './teacher.service';

@ApiTags('Panel docente')
@Controller('teacher')
export class TeacherController {
  constructor(private readonly teacher: TeacherService) {}

  @Post('session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Canjea el codigo de docente por un token.',
    description: 'No hay usuario ni contrasena: quien tiene el codigo del curso es la docente de ese curso.',
  })
  @ApiOkResponse({ type: TeacherSessionDto })
  @ApiUnauthorizedResponse({ description: 'El codigo no corresponde a ningun curso.' })
  async login(@Body() body: TeacherLoginDto): Promise<TeacherSessionDto> {
    const { token, schoolClass } = await this.teacher.login(body.teacherCode);
    return { teacherToken: token, classId: schoolClass.id, className: schoolClass.name };
  }

  @Get('class')
  @TeacherAuth()
  @ApiOperation({ summary: 'Datos del curso y hasta que nivel esta habilitado.' })
  @ApiOkResponse({ type: ClassSummaryDto })
  async classSummary(@CurrentClass() schoolClass: SchoolClass): Promise<ClassSummaryDto> {
    const summary = await this.teacher.classSummary(schoolClass);
    return {
      id: schoolClass.id,
      code: schoolClass.code,
      name: schoolClass.name,
      schoolName: schoolClass.schoolName,
      unlockedLevelOrder: schoolClass.unlockedLevelOrder,
      lastLevelOrder: summary.lastLevelOrder,
      studentCount: summary.studentCount,
    };
  }

  @Get('class/students')
  @TeacherAuth()
  @ApiOperation({
    summary: 'Progreso de cada alumno del curso.',
    description: 'Los chicos se identifican por su mascota: el sistema no guarda nombres.',
  })
  @ApiOkResponse({ type: [StudentProgressRowDto] })
  async students(@CurrentClass() schoolClass: SchoolClass): Promise<StudentProgressRowDto[]> {
    const rows = await this.teacher.studentRows(schoolClass);
    return rows.map((row) => ({
      studentId: row.student.id,
      pet: row.student.pet.species,
      stars: row.student.stars,
      masteredLevels: row.masteredLevels,
      currentLevelOrder: row.currentLevel?.order ?? null,
      currentLevelTitle: row.currentLevel?.title ?? null,
      currentLevelStatus: row.currentStatus,
      currentMasteryAverage: row.currentMasteryAverage,
      currentLevelSessions: row.currentLevelSessions,
      totalSessions: row.totalSessions,
      lastSeenAt: row.student.lastSeenAt.toISOString(),
    }));
  }

  @Get('class/levels')
  @TeacherAuth()
  @ApiOperation({ summary: 'Como viene el curso nivel por nivel.' })
  @ApiOkResponse({ type: [LevelProgressRowDto] })
  async levels(@CurrentClass() schoolClass: SchoolClass): Promise<LevelProgressRowDto[]> {
    const rows = await this.teacher.levelRows(schoolClass);
    return rows.map((row) => ({
      levelId: row.level.id,
      order: row.level.order,
      title: row.level.title,
      unlocked: row.unlocked,
      masteredCount: row.masteredCount,
      inProgressCount: row.inProgressCount,
      notStartedCount: row.notStartedCount,
      averageMastery: row.averageMastery,
    }));
  }

  @Put('class/unlocked-level')
  @TeacherAuth()
  @ApiOperation({
    summary: 'Habilita niveles hasta el indicado, para todo el curso.',
    description:
      'Es un techo, no un adelanto: un chico que no domino el nivel anterior sigue sin poder entrar al siguiente.',
  })
  @ApiOkResponse({ type: ClassSummaryDto })
  @ApiBadRequestResponse({ description: 'El nivel pedido excede el contenido cargado.' })
  async unlock(@CurrentClass() schoolClass: SchoolClass, @Body() body: UnlockLevelDto): Promise<ClassSummaryDto> {
    const updated = await this.teacher.unlockUpTo(schoolClass, body.levelOrder);
    const summary = await this.teacher.classSummary(updated);
    return {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      schoolName: updated.schoolName,
      unlockedLevelOrder: updated.unlockedLevelOrder,
      lastLevelOrder: summary.lastLevelOrder,
      studentCount: summary.studentCount,
    };
  }
}
