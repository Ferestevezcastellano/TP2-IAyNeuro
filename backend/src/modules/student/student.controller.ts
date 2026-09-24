import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StudentAuth } from '../../common/decorators/auth.decorators';
import { CurrentStudent } from '../../common/decorators/current-student.decorator';
import { LevelWithStatusDto } from '../../common/dto/level.dto';
import { PetDto } from '../../common/dto/pet.dto';
import { LevelStatus, Student } from '../../core/domain';
import { EquipAccessoriesDto } from './dto/equip-accessories.dto';
import { StudentProfileDto } from './dto/student-profile.dto';
import { StudentService } from './student.service';

@ApiTags('Alumno')
@Controller('me')
@StudentAuth()
export class StudentController {
  constructor(private readonly students: StudentService) {}

  @Get()
  @ApiOperation({ summary: 'Perfil del alumno: mascota, estrellas y nivel actual.' })
  @ApiOkResponse({ type: StudentProfileDto })
  async profile(@CurrentStudent() student: Student): Promise<StudentProfileDto> {
    const [context, species, catalog] = await Promise.all([
      this.students.context(student),
      this.students.species(student),
      this.students.accessoryCatalog(),
    ]);
    await this.students.touch(student);

    return {
      studentId: student.id,
      className: context.schoolClass.name,
      classUnlockedLevelOrder: context.schoolClass.unlockedLevelOrder,
      stars: student.stars,
      pet: PetDto.from(student, species, catalog),
      currentLevel: context.current ? LevelWithStatusDto.fromAccess(context.current) : null,
      masteredLevels: context.accesses.filter((access) => access.status === LevelStatus.MASTERED).length,
    };
  }

  @Get('levels')
  @ApiOperation({
    summary: 'Los niveles con su estado para este alumno.',
    description:
      'LOCKED_BY_TEACHER es un nivel que la docente todavia no libero; LOCKED_BY_PROGRESS, uno que espera que se domine el anterior.',
  })
  @ApiOkResponse({ type: [LevelWithStatusDto] })
  async levels(@CurrentStudent() student: Student): Promise<LevelWithStatusDto[]> {
    const context = await this.students.context(student);
    return context.accesses.map(LevelWithStatusDto.fromAccess);
  }

  @Get('pet')
  @ApiOperation({ summary: 'La mascota con los accesorios ganados y los que faltan.' })
  @ApiOkResponse({ type: PetDto })
  async pet(@CurrentStudent() student: Student): Promise<PetDto> {
    const [species, catalog] = await Promise.all([this.students.species(student), this.students.accessoryCatalog()]);
    return PetDto.from(student, species, catalog);
  }

  @Patch('pet')
  @ApiOperation({ summary: 'Viste a la mascota con los accesorios ya ganados.' })
  @ApiOkResponse({ type: PetDto })
  async equip(@CurrentStudent() student: Student, @Body() body: EquipAccessoriesDto): Promise<PetDto> {
    const updated = await this.students.equipAccessories(student, body.equippedAccessoryIds);
    const [species, catalog] = await Promise.all([this.students.species(updated), this.students.accessoryCatalog()]);
    return PetDto.from(updated, species, catalog);
  }
}
