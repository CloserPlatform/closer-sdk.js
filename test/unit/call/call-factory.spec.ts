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

    callEvent.direct = true;
    callEvent.orgId = undefined;

    const call = callFactory.create(callEvent);

    expect(DirectCall.isDirect(call)).toBeTruthy();
  });

  it('create my group call', () => {
    const callEvent = getBusinessCallEvent();

    callEvent.orgId = undefined;

    const call = callFactory.create(callEvent);

    expect(GroupCall.isGroup(call)).toBeTruthy();
  });

  it('create my business call with existing users', () => {
    const callEvent = getBusinessCallEvent();
    callEvent.users = ['222'];
    callFactory.create(callEvent);
  });

  it('create my business call with existing invitees', () => {
    const callEvent = getBusinessCallEvent();
    callEvent.invitees = ['222'];
    callFactory.create(callEvent);
  });

  it('create my business call with existing invitees and users', () => {
    const callEvent = getBusinessCallEvent();
    callEvent.users = ['333'];
    callEvent.invitees = ['222'];
    callFactory.create(callEvent);
  });
});
