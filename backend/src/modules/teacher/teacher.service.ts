import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  AccessSubjectType,
  Level,
  LevelProgress,
  LevelStatus,
  SchoolClass,
  SessionStatus,
  Student,
} from '../../core/domain';
import {
  AccessTokenRepository,
  ClassRepository,
  LevelRepository,
  ProgressRepository,
  SessionRepository,
  StudentRepository,
} from '../../core/ports';
import { LevelAccessService } from '../../core/services';

export interface StudentProgressRow {
  student: Student;
  masteredLevels: number;
  currentLevel: Level | null;
  currentStatus: LevelStatus | null;
  currentMasteryAverage: number;
  currentLevelSessions: number;
  totalSessions: number;
}

export interface LevelProgressRow {
  level: Level;
  unlocked: boolean;
  masteredCount: number;
  inProgressCount: number;
  notStartedCount: number;
  averageMastery: number;
}

/**
 * Panel de la docente.
 *
 * El acceso no es un usuario con contrasena sino el codigo propio de su curso,
 * y todo lo que ve esta acotado a ese curso. Los alumnos aparecen por mascota,
 * porque el sistema no guarda nombres.
 */
@Injectable()
export class TeacherService {
  constructor(
    private readonly classes: ClassRepository,
    private readonly students: StudentRepository,
    private readonly levels: LevelRepository,
    private readonly progress: ProgressRepository,
    private readonly sessions: SessionRepository,
    private readonly tokens: AccessTokenRepository,
    private readonly levelAccess: LevelAccessService,
  ) {}

  async login(teacherCode: string): Promise<{ token: string; schoolClass: SchoolClass }> {
    const schoolClass = await this.classes.findByTeacherCode(teacherCode);
    if (!schoolClass) {
      throw new UnauthorizedException('Ese codigo de docente no corresponde a ningun curso.');
    }

    const token = await this.tokens.issue(AccessSubjectType.TEACHER, schoolClass.id);
    return { token: token.token, schoolClass };
  }

  async classSummary(schoolClass: SchoolClass) {
    const [students, levels] = await Promise.all([this.students.findByClassId(schoolClass.id), this.levels.findAll()]);
    return {
      schoolClass,
      studentCount: students.length,
      lastLevelOrder: levels.length > 0 ? levels[levels.length - 1].order : 0,
    };
  }

  /** Una fila por alumno del curso, con el nivel en el que esta y cuanto le falta. */
  async studentRows(schoolClass: SchoolClass): Promise<StudentProgressRow[]> {
    const [students, levels] = await Promise.all([this.students.findByClassId(schoolClass.id), this.levels.findAll()]);
    const progresses = await this.progress.findByStudents(students.map((student) => student.id));

    const rows: StudentProgressRow[] = [];

    for (const student of students) {
      const own = progresses.filter((item) => item.studentId === student.id);
      const accesses = this.levelAccess.resolve(levels, schoolClass, own);
      const current = this.levelAccess.currentLevel(accesses);
      const sessions = await this.sessions.findByStudent(student.id);

      rows.push({
        student,
        masteredLevels: own.filter((item) => item.mastered).length,
        currentLevel: current?.level ?? null,
        currentStatus: current?.status ?? null,
        currentMasteryAverage: current?.progress?.masteryAverage ?? 0,
        currentLevelSessions: current?.progress?.sessionsCompleted ?? 0,
        totalSessions: sessions.filter((session) => session.status === SessionStatus.COMPLETED).length,
      });
    }

    return rows;
  }

  /** Una fila por nivel, con como viene el curso entero. */
  async levelRows(schoolClass: SchoolClass): Promise<LevelProgressRow[]> {
    const [students, levels] = await Promise.all([this.students.findByClassId(schoolClass.id), this.levels.findAll()]);
    const progresses = await this.progress.findByStudents(students.map((student) => student.id));

    return levels.map((level) => {
      const forLevel = progresses.filter((item: LevelProgress) => item.levelId === level.id);
      const masteredCount = forLevel.filter((item) => item.mastered).length;
      const inProgressCount = forLevel.filter((item) => !item.mastered && item.sessionsCompleted > 0).length;
      const averageMastery =
        forLevel.length === 0
          ? 0
          : Number((forLevel.reduce((acc, item) => acc + item.masteryAverage, 0) / forLevel.length).toFixed(4));

      return {
        level,
        unlocked: level.order <= schoolClass.unlockedLevelOrder,
        masteredCount,
        inProgressCount,
        notStartedCount: students.length - masteredCount - inProgressCount,
        averageMastery,
      };
    });
  }

  /**
   * Habilita niveles hasta el que indique la docente.
   *
   * Es solo un techo: no adelanta a nadie. Un chico que no domino el nivel
   * anterior sigue sin poder entrar, aunque la docente ya haya liberado los que
   * vienen.
   */
  async unlockUpTo(schoolClass: SchoolClass, levelOrder: number): Promise<SchoolClass> {
    const levels = await this.levels.findAll();
    const lastOrder = levels.length > 0 ? levels[levels.length - 1].order : 0;

    if (levelOrder > lastOrder) {
      throw new BadRequestException(`El contenido cargado llega hasta el nivel ${lastOrder}.`);
    }

    return this.classes.save({ ...schoolClass, unlockedLevelOrder: levelOrder });
  }
}
