import { CallFactory } from '../../../src/calls/call-factory';
import { getLoggerFactoryMock } from '../../mocks/logger.mock';
import * as wireEntities from '../../../src/protocol/wire-entities';
import { BusinessCall, DirectCall, GroupCall } from '../../../src';
import { getArtichokeApiMock } from '../../mocks/artichoke-api.mock';
import { getRTCPoolRepository } from '../rtc/rtc-pool-repository.spec';
import { getMediaTrackOptimizerMock } from '../rtc/media-track-optimizer.spec';

export const getCallFactoryMock = (): CallFactory =>
  new CallFactory(
    getLoggerFactoryMock(),
    getArtichokeApiMock(),
    getRTCPoolRepository(),
    getMediaTrackOptimizerMock()
  );

const callFactory = getCallFactoryMock();

const mySessionId = '123';

const getBusinessCallEvent = (): wireEntities.Call => ({
  id: '1',
  created: 1,
  creator: mySessionId,
  direct: false,
  users: [],
  invitees: [],
  orgId: '2'
});

describe('CallFactory', () => {
  it('create my business call', () => {
    const businessCall = callFactory.create(getBusinessCallEvent());

    expect(BusinessCall.isBusiness(businessCall)).toBeTruthy();
  });

  it('create my direct call', () => {
    const callEvent = getBusinessCallEvent();

    const modifiedCallEvent = {
      ...callEvent,
      direct: true,
      orgId: undefined
    };

    const call = callFactory.create(modifiedCallEvent);

    expect(DirectCall.isDirect(call)).toBeTruthy();
  });

  it('create my group call', () => {
    const callEvent = getBusinessCallEvent();

    const modifiedCallEvent = {
      ...callEvent,
      orgId: undefined
    };

    const call = callFactory.create(modifiedCallEvent);

    expect(GroupCall.isGroup(call)).toBeTruthy();
  });

  it('create my business call with existing users', () => {
    const callEvent = getBusinessCallEvent();
    const modifiedCallEvent = {
      ...callEvent,
      users: ['222']
    };
    const call = callFactory.create(modifiedCallEvent);
    expect(call.users).toBe(modifiedCallEvent.users);
  });

  it('create my business call with existing invitees', () => {
    const callEvent = getBusinessCallEvent();
    const modifiedCallEvent = {
      ...callEvent,
      invitees: ['222']
    };
    const call = callFactory.create(modifiedCallEvent);
    expect(call.invitees).toBe(modifiedCallEvent.invitees);
  });

  it('create my business call with existing invitees and users', () => {
    const callEvent = getBusinessCallEvent();
    const modifiedCallEvent = {
      ...callEvent,
      users: ['333'],
      invitees: ['222']
    };
    const call = callFactory.create(modifiedCallEvent);
    expect(call.users).toBe(modifiedCallEvent.users);
    expect(call.invitees).toBe(modifiedCallEvent.invitees);
  });
});
