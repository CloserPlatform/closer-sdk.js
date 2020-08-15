import { UUIDGenerator } from '../../../src/utils/uuid-generator';

const uuidLength = 36;
const uuidSectionsCount = 5;

export const getUUIDGenerator = (): UUIDGenerator =>
  new UUIDGenerator();

const uuidGenerator = getUUIDGenerator();

describe('UUIDGenerator', () => {
  it('return different UUIDs', () => {
    const uuid1 = uuidGenerator.next();
    const uuid2 = uuidGenerator.next();

    expect(uuid1).not.toEqual(uuid2);
  });

  it('return UUID format string', () => {
    const uuid = uuidGenerator.next();

    expect(uuid.length).toEqual(uuidLength);
    expect(uuid.split('-').length).toEqual(uuidSectionsCount);
  });
});
