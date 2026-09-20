import { Body, Controller, HttpCode, HttpStatus, NotFoundException, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PetSpeciesDto } from '../../common/dto/pet.dto';
import { PetRepository } from '../../core/ports';
import { ClassCodeCheckDto, VerifyClassCodeDto } from './dto/verify-class-code.dto';
import { RegisterStudentDto, StudentSessionDto } from './dto/register-student.dto';
import { OnboardingService } from './onboarding.service';

@ApiTags('Onboarding')
@Controller('onboarding')
export class OnboardingController {
  constructor(
    private readonly onboarding: OnboardingService,
    private readonly pets: PetRepository,
  ) {}

  @Post('class-code/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Valida el codigo de clase antes de elegir mascota.',
    description: 'Devuelve 200 con valid=false si el codigo no existe, para que la pantalla avise sin cortar el flujo.',
  })
  @ApiOkResponse({ type: ClassCodeCheckDto })
  async verify(@Body() body: VerifyClassCodeDto): Promise<ClassCodeCheckDto> {
    const schoolClass = await this.onboarding.findClassByCode(body.classCode);
    return {
      valid: Boolean(schoolClass),
      className: schoolClass?.name ?? null,
      schoolName: schoolClass?.schoolName ?? null,
    };
  }

  @Post('students')
  @ApiOperation({
    summary: 'Registra al chico con codigo de clase y mascota, y devuelve su token.',
    description: 'No se guarda ningun dato personal. El token opaco reemplaza al login.',
  })
  @ApiCreatedResponse({ type: StudentSessionDto })
  @ApiNotFoundResponse({ description: 'El codigo de clase o la mascota no existen.' })
  async register(@Body() body: RegisterStudentDto): Promise<StudentSessionDto> {
    const { student, token, schoolClass } = await this.onboarding.register(body.classCode, body.petSpecies);
    const species = await this.pets.findById(student.pet.species);
    if (!species) {
      throw new NotFoundException(`No existe la mascota ${student.pet.species}.`);
    }

    return {
      studentId: student.id,
      studentToken: token,
      classId: schoolClass.id,
      className: schoolClass.name,
      pet: PetSpeciesDto.from(species),
    };
  }
}
