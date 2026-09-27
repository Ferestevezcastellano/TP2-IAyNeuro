import { MASTERY_CONFIG } from '../config/mastery.config';
import { Accessory, AccessorySlot, LevelProgress, PetSpeciesId, Student } from '../domain';
import { MasteryService } from './mastery.service';
import { RewardService } from './reward.service';

const accessory: Accessory = {
  id: 'acc-bufanda',
  label: 'BUFANDA',
  slot: AccessorySlot.NECK,
  assetKey: 'img/accesorio/bufanda',
  unlockedByLevelOrder: 3,
};

describe('RewardService', () => {
  const rewards = new RewardService();
  const mastery = new MasteryService();

  let student: Student;
  let mastered: LevelProgress;

  beforeEach(() => {
    student = {
      id: 'alumno-1',
      classId: 'class-primero-a',
      pet: { species: PetSpeciesId.LION, accessoriesOwned: [], accessoriesEquipped: [] },
      stars: 0,
      createdAt: new Date(),
      lastSeenAt: new Date(),
    };

    mastered = [0.9, 0.9, 0.9].reduce(
      (progress, accuracy) => mastery.register(progress, accuracy).progress,
      mastery.empty(student.id, 'level-03-m-s', 3),
    );
  });

  it('paga 3 estrellas y el accesorio al dominar el nivel', () => {
    const grant = rewards.grant(student, mastered, accessory);

    expect(grant.starsAwarded).toBe(3);
    expect(grant.student.stars).toBe(3);
    expect(grant.accessoryUnlockedId).toBe('acc-bufanda');
    expect(grant.student.pet.accessoriesOwned).toEqual(['acc-bufanda']);
    expect(grant.progress.starsAwarded).toBe(3);
  });

  it('no paga dos veces el mismo nivel', () => {
    const first = rewards.grant(student, mastered, accessory);
    const second = rewards.grant(first.student, first.progress, accessory);

    expect(second.starsAwarded).toBe(0);
    expect(second.accessoryUnlockedId).toBeNull();
    expect(second.student.stars).toBe(3);
    expect(second.student.pet.accessoriesOwned).toEqual(['acc-bufanda']);
  });

  it('no paga si el nivel todavia no esta dominado', () => {
    const inProgress = mastery.register(mastery.empty(student.id, 'level-03-m-s', 3), 0.5).progress;
    const grant = rewards.grant(student, inProgress, accessory);

    expect(grant.starsAwarded).toBe(0);
    expect(grant.student.stars).toBe(0);
  });

  it('paga las estrellas aunque el accesorio ya lo tenga de antes', () => {
    const withAccessory: Student = {
      ...student,
      pet: { ...student.pet, accessoriesOwned: ['acc-bufanda'] },
    };

    const grant = rewards.grant(withAccessory, mastered, accessory);

    expect(grant.starsAwarded).toBe(3);
    expect(grant.accessoryUnlockedId).toBeNull();
    expect(grant.student.pet.accessoriesOwned).toEqual(['acc-bufanda']);
  });

  it('paga las estrellas que diga la configuración que recibe', () => {
    const conCinco = new RewardService({ ...MASTERY_CONFIG, starsPerMasteredLevel: 5 });
    expect(conCinco.grant(student, mastered, accessory).starsAwarded).toBe(5);
  });

  it('no muta el alumno original', () => {
    rewards.grant(student, mastered, accessory);

    expect(student.stars).toBe(0);
    expect(student.pet.accessoriesOwned).toEqual([]);
  });
});
