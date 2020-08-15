import { RoomFactory } from '../../../src/rooms/room-factory';
import { getLoggerFactoryMock } from '../../mocks/logger.mock';
import { getArtichokeApiMock } from '../../mocks/artichoke-api.mock';
import { Room as WireRoom } from '../../../src/protocol/wire-entities';
import { BusinessRoom, DirectRoom, GroupRoom } from '../../../src';

export const getRoomFactory = (): RoomFactory =>
  new RoomFactory(
    getLoggerFactoryMock(),
    getArtichokeApiMock()
  );

const groupRoom: WireRoom = {
  id: 'id',
  name: 'name',
  created: 1,
  direct: false,
  orgId: undefined,
  users: [],
  marks: {},
};

describe('Unit: RoomFactory', () => {
  it('create group room', () => {
    const roomFactory = getRoomFactory();
    const room = roomFactory.create(groupRoom);
    expect(GroupRoom.isGroup(room)).toBeTruthy();
  });

  it('create business room', () => {
    const roomFactory = getRoomFactory();
    const businessRoom = {...groupRoom, orgId: 'orgId'};
    const room = roomFactory.create(businessRoom);
    expect(BusinessRoom.isBusiness(room)).toBeTruthy();
  });

  it('create direct room', () => {
    const roomFactory = getRoomFactory();
    const directRoom = {...groupRoom, direct: true};
    const room = roomFactory.create(directRoom);
    expect(DirectRoom.isDirect(room)).toBeTruthy();
  });
});
