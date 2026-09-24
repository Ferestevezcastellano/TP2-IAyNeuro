import { ApiProperty } from '@nestjs/swagger';
import { Accessory, AccessorySlot, PetSpecies, PetSpeciesId, Student } from '../../core/domain';

export class PetSpeciesDto {
  @ApiProperty({ enum: PetSpeciesId })
  id!: PetSpeciesId;

  @ApiProperty({ example: 'LEÓN' })
  label!: string;

  @ApiProperty({ example: 'img/mascota/lion' })
  assetKey!: string;

  static from(species: PetSpecies): PetSpeciesDto {
    return { id: species.id, label: species.label, assetKey: species.assetKey };
  }
}

export class AccessoryDto {
  @ApiProperty({ example: 'acc-bufanda' })
  id!: string;

  @ApiProperty({ example: 'BUFANDA' })
  label!: string;

  @ApiProperty({ enum: AccessorySlot })
  slot!: AccessorySlot;

  @ApiProperty({ example: 'img/accesorio/bufanda' })
  assetKey!: string;

  @ApiProperty({ description: 'Nivel que hay que dominar para ganarlo.', example: 3 })
  unlockedByLevelOrder!: number;

  static from(accessory: Accessory): AccessoryDto {
    return {
      id: accessory.id,
      label: accessory.label,
      slot: accessory.slot,
      assetKey: accessory.assetKey,
      unlockedByLevelOrder: accessory.unlockedByLevelOrder,
    };
  }
}

/** Accesorio del catalogo con el estado que tiene para este alumno. */
export class OwnedAccessoryDto extends AccessoryDto {
  @ApiProperty({ description: 'Si el alumno ya lo gano.' })
  owned!: boolean;

  @ApiProperty({ description: 'Si lo tiene puesto ahora.' })
  equipped!: boolean;
}

/** La mascota tal como la dibuja la pantalla de personalizacion. */
export class PetDto {
  @ApiProperty({ enum: PetSpeciesId })
  species!: PetSpeciesId;

  @ApiProperty({ example: 'LEÓN' })
  label!: string;

  @ApiProperty({ example: 'img/mascota/lion' })
  assetKey!: string;

  @ApiProperty({ type: [OwnedAccessoryDto], description: 'Catalogo completo, con owned y equipped por accesorio.' })
  accessories!: OwnedAccessoryDto[];

  static from(student: Student, species: PetSpecies, catalog: Accessory[]): PetDto {
    return {
      species: species.id,
      label: species.label,
      assetKey: species.assetKey,
      accessories: catalog.map((accessory) => ({
        ...AccessoryDto.from(accessory),
        owned: student.pet.accessoriesOwned.includes(accessory.id),
        equipped: student.pet.accessoriesEquipped.includes(accessory.id),
      })),
    };
  }
}
