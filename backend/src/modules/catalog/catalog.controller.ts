import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessoryDto, PetSpeciesDto } from '../../common/dto/pet.dto';
import { LevelDto } from '../../common/dto/level.dto';
import { CatalogService } from './catalog.service';
import { MasteryRulesDto } from './dto/mastery-rules.dto';

/**
 * Contenido que no depende de ningun alumno. Sin token: son los datos que la
 * pantalla de carga y el onboarding necesitan antes de que exista un alumno.
 */
@ApiTags('Catalogo')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('pets')
  @ApiOperation({ summary: 'Las cuatro mascotas entre las que elige el chico.' })
  @ApiOkResponse({ type: [PetSpeciesDto] })
  async pets(): Promise<PetSpeciesDto[]> {
    return (await this.catalog.listPets()).map(PetSpeciesDto.from);
  }

  @Get('levels')
  @ApiOperation({ summary: 'Los niveles en orden, sin estado de alumno.' })
  @ApiOkResponse({ type: [LevelDto] })
  async levels(): Promise<LevelDto[]> {
    return (await this.catalog.listLevels()).map(LevelDto.from);
  }

  @Get('accessories')
  @ApiOperation({ summary: 'Catalogo de accesorios y en que nivel se gana cada uno.' })
  @ApiOkResponse({ type: [AccessoryDto] })
  async accessories(): Promise<AccessoryDto[]> {
    return (await this.catalog.listAccessories()).map(AccessoryDto.from);
  }

  @Get('mastery-rules')
  @ApiOperation({ summary: 'Parametros con los que se mide el dominio de un nivel.' })
  @ApiOkResponse({ type: MasteryRulesDto })
  masteryRules(): MasteryRulesDto {
    return this.catalog.masteryRules();
  }
}
