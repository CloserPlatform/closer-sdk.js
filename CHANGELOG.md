# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).


### Changed
 - udpated InboxEntryType

## 1.4.0
### Changed
 - Reconnect delay is read from hello event

## 1.3.0
### Added
- added observable for custom messages on current domain

## 1.2.1

### Added
 - disconnect$ event

## 1.2.0

### Improved
- Realax sdk init requirements

### Changes
- BrowserUtils to PlatformSupported

## 1.1.0

### Added
 - room event and command typing might have optional field with preview
 - room.sendTyping can receive optional parameter with preview

## 1.0.13 - 2020-08-21

### Changed web-demo-app
 - Added chat scrolling
 - Added agent.module
 - board.module now handles its submodules, and is displayed for both agent & guest
 - changed call initialization in call.module
  
## 1.0.5 - 2020-08-21

### Changed
 - better chat in conversation.module
 - small changes in ui layout

## 1.0.4 - 2020-08-21

### Fixed

* WS heartbeat & reconnect logic
 

## 0.0.3 - 2020-08-21

### Changed

* Uncomment calling module
* Set default orgId for Guest

##  - 2020-08-21

### Changed

* Karma upgrade
* Webpack upgrade
* Separate tests to other directory
* Rename to closer-sdk-js
* createCall now makes http call to get whole call object
* Replace custom jsonWebsocket with RxJS
* Add media track optimizer
  

## 0.9.26 - 2020-08-20

# Added
 - session saving

## 0.9.25 - 2020-08-20

# Changed
 - path for guest user, path for existing user
 - installed @swagger

## 0.9.24 - 2020-08-18

## Changed demo app
- renamed chat.module to call.module
- added board.module which consitsts of
  - call.module
  - chat.module

## 0.9.23 - 2019-11-19

### Changed

- updated config for turn server

## 0.9.22 - 2019-10-29

### Added
 * Call end reason `TimeLimitExceeded`

## 0.9.21 - 2019-10-14

### Added
- `fake_room_message_sent`

## 0.9.20 - 2019-06-18

### Added

- Type definitions for LastAdviserTimestampSet and LastAdviserTimestampRemoved external events

## 0.9.19 - 2019-05-30

### Misc
* Actually run the linter on ci

## 0.9.18 - 2019-05-29

### Added
* `guestId` field to `UpcomingMeeting`

## 0.9.17 - 2019-05-28

### Changed
* patch SDP answer when DTLS role mismatch is detected, which fixes some issues with video calls on Firefox

## 0.9.16 - 2019-05-22

### Fixed
- added missing MessageUpdated event handling and test

## 0.9.15 - 2019-05-17

### Added 

 * room_message_updated

### Removed

*  custom message INTENT_DETECTED

## 0.9.14 - 2019-05-07

## Added
* custom message: INTENT_DETECTED

## 0.9.13 - 2019-04-17

### Added
* optional `requesterId` in the context of `ASSIGNEE_CHANGED`, `FOLLOWER_ADDED` and `FOLLOWER_REMOVED`

## 0.9.12 - 2019-04-15

### Added
* `ConversationSnoozed` and `ConversationUnsnoozed` external events

## 0.9.11 - 2019-04-11

### Changed 

 * Added optional reason to presenceUpdated

## 0.9.10 - 2019-04-04

### Changed

  * Added optional field reqesterId to FollowerAdded, FollowerRemoved, AssigneeChanged

## 0.9.9 - 2019-04-04

### Changed
 * Added threadCreatedAt to LastMessageUpdated.

## 0.9.8 - 2019-04-03

### Added
 * Field `payload` to `LastMessageUpdated`

## 0.9.7 - 2019-04-03

### Added
 * Field `type` to `LastMessageUpdated`

## 0.9.6 - 2019-03-29

### Misc
- changed video content type values

## 0.9.5 - 2019-03-29

### Added
- video content type to VideoStreamToggled event

## 0.9.4 - 2019-02-28

### Fixed
- export customEvents namespace

## 0.9.3 - 2019-02-28

### Added
- Type definitions for known custom message context

## 0.9.2 - 2019-02-08

### Added
* optional parameter `sdpSemantics` in `RTCConfig`

## 0.9.1 - 2019-01-25

### Added
* it's now possible to pass optional app version to callstats

## 0.9.0 - 2019-01-24

### Added
* basic Callstats support, which let us monitor the WebRTC stuff

## 0.8.16 - 2019-01-07

### Fixed

 * Publish url.

## 0.8.15 - 2019-01-07

### Fixed

 * LastMessageUpdated field names.

## 0.8.14 - 2018-12-21

### Added

 * Events moved from spinner websocket:
   * `AllFollowersRemoved`
   * `AssigneeChanged`
   * `AssigneeRemoved`
   * `ConversationStatusChanged`
   * `FollowerAdded`
   * `FollowerRemoved`
   * `MeetingCancelled`
   * `MeetingRescheduled`
   * `MeetingScheduled`

## 0.8.13 - 2018-12-12

### Fixed
* add missing null check on sender.track

## 0.8.12 - 2018-11-21

### Added

 * External events routed from `spinner`:
   * `GuestProfileUpdated`
   * `LastMessageUpdated`
   * `NotificationUpcomingMeeting`
   * `PresenceUpdated`
   * `TypingSent`
   * `UnreadCountUpdated`
   * `UnreadTotalUpdated`

## 0.8.11 - 2018-11-06

### Added

 * `Audio/VideoStreamToggle` commands.
 * `Audio/VideoStreamToggled` events.

## 0.8.10 - 2018-09-20

### Added
* Optional reconnectionDisabled to UserChatConfig

## 0.8.9 - 2018-09-20

### Added
- reconnection to demo-app
- reconnectionDisable flag to ChatConfig

## 0.8.8 - 2018-09-14

### Changed
 * Reverted akka heartbeats

## 0.8.7 - 2018-09-12

### Removed
 * Manual heartbeats handling

## 0.8.6 - 2018-09-12

### Fix
* remove auto hangup on peer connection failed

## 0.8.5 - 2018-09-11

### Fix
* export UserConfig type

## 0.8.4 - 2018-09-11

### Fixed
* Do not broadcast mocked leave event internally after calling leave

## 0.8.3 - 2018-09-10

### Feature
* Leave the call if rtc with any peer failed - emit end event over call

## 0.8.2 - 2018-08-17

### Fixed
- Fix failing add candidate before remote sdp was being set in rtc-peer-connection-facade by moving queue to rtc peer connection facade

## 0.8.1 - 2018-08-16

### Changed
 - accept `RoomEvent` in `roomEvents.MessageSent.isMessageSent` type guard
 - add `context` argument to `Room.send` method

## 0.8.0 - 2018-07-31

### Feature
- CallInvitation now contains optional metadata which can be set by call creator - artichoke 0.3.14 required

## 0.7.20 - 2018-07-24

### Fixed
- Missing PeerStatus type is now exported

## 0.7.19 - 2018-07-23

### Added
* `Call.peerStatus$` which notify with `Connected`/`Failed`/`Disconnected` - status of a media connection

## 0.7.18 - 2018-07-20

### Improve
* isBrowserSupported has an optional paramater of callBroadcastRequired which set to `true` will disable edge support (edge do not support rtcdatachannel)
* Simplify logger to use browser console depending on LogLevel

## 0.7.17 - 2018-07-18

### Improve
* Logging

## 0.7.16 - 2018-07-17

### Refactor
* Update default supported rtc configuration

## 0.7.15 - 2018-07-17

### Fixed
* Sometimes ice candidate was received before sdp offer - fixed by implementing queue
* Edge on older laptop was causing camera crash which crashed whole connection - now it will continue to work just with audio and error will be logger

### Added
* More debug logging
* Updated webrtc-adapter to 6.3.0 to support screen sharing shims

### Refactored
* Replaced unused rxjs subjects and states with function callbacks to avoid memory leaks

## 0.7.14 - 2018-07-09

### Feature
* Call `broadcast` and `message$` which allows to send messages over peer connection (Not supported by Edge)
The motivation of this feature was to provide an event channel to notify peers about video track status (enabled/disabled)
 

## 0.7.13 - 2018-07-06

### Improve
* BrowserUtils.isBrowserSupported now checks browsers versions

## 0.7.12 - 2018-07-05

### Add
* Front/back camera switcher
* optional rtc configuration `negotiationNeededDisabled `
* Readme -> how to support edge
* replaceTrackByKind which does not require renegotiation if the track specs are similar 

## 0.7.11 - 2018-07-04

### Improve
* demo app logging

## 0.7.10 - 2018-07-04

### Improve
* BrowserUtils.isBrowserSupported now checks if RTC and getUserMedia is available to return false in case of webkit webview
* RTCPeerConnection logging

## 0.7.9 - 2018-07-04

### Improve
* Readme - supported browsers
* Demo app to work between firefox61 & chrome67
* RTC peer connection logging

## 0.7.8 - 2018-07-02

### Fix

* Demo-app ice-servers list

## 0.7.7 - 2018-06-28

### Fix
* Logging in RTConnection

## 0.7.6 - 2018-06-27

### Clean
* dependencies

## 0.7.5 - 2018-06-27

### Fix
* Remove all internal dependencies

## 0.7.4 - 2018-06-27

### Fixed
* Move rxjs into peer dependencies

## 0.7.3 - 2018-06-26

### Fixed

* Fix audio in mobile safari demo app

## 0.7.2 - 2018-06-26

### Fixed

* Mobile safari video

## 0.7.1 - 2018-06-26

### Fixed
* Demo-app on safari

## 0.7.0 - 2018-06-26

### Improved
* RTC works between Chrome & Firefox & Safari

### Breaking changes
* We now accept only MediaStreamTrack instead of MediaStream

## 0.6.6 - 2018-06-25

### Improve

* Simplify events - replace custom `EventHandler` with `rxjs`
* Do not throw error if event was unhandled

### Breaking changes
* Callbacks registering was replaced by `Observables`
  public callback methods were replaced from `onEventName` to `eventName$`

## 0.6.5 - 2018-06-21

### Improve

* Cleanup class members
* Refactor rtc variables names

## 0.6.4 - 2018-06-20

### Fixed

 * Fix demo app calling

## 0.6.3 - 2018-06-20

### Fixed

 * Fix versioning after a mess made by AnyMind guys ;)

## 0.6.2 - 2018-06-20

### Changed

 * Change type of `context` from `Object` to `any`
 * Improve linter
 * Enable strict null checks
 * Make linter more strict & refactor code style
 * Fix demo app
 * Refactored calls without logic
 * Changes project files structure & small linter improvements
 * Project files structure & small linter improvements

## 0.6.1 - 2018-05-22

### Added

 * `context` field to `send_message` command and `message_sent` event.

## 0.6.0 - 2018-05-14

### Changed
- protocol for WebSockets is extracted to `artichoke-protocol` project
- every input message is a `Command` and every output is an `Event` 
- improved semantic of messages names: `Command` names are in present tense, `Event` names in past tense
- normalize/flatten events. Don't nest message inside a message
- change schema of messages
- change the way of filtering messages via REST API (new `customFilter` query parameter)

## 0.5.27 - 2018-05-10

### Added
* gitlab-ci configuration

## 0.5.26
### Changed
- Setup only one callback for RTC stuff per call

## 0.5.25
### Added
- Add metadata field to CallInvitation event

## 0.5.24
### Added
- Busy call rejection reason

## 0.5.23
### Change
- Handle json.parse errors in Api.ts file

## 0.5.22
### Change
- Change internal logging from error to warn in webscoket error

## 0.5.21
### Added
- chat & ratel configs now accept pathname


## 0.5.20
### Added
- Allow registering many callbacks on event with concrete id

## 0.5.19
### Added
- Fix headers apiKey id

## 0.5.18
### Added
- Add ApiHeaders class instead of keeping array of headers inside api class

## 0.5.17
### Added
- Handle endpoints for registering and unregistering from push notifications

## 0.5.16
### Added
- Export CallReason used by leave & reject
### Changed
- Update TypeScript to 2.7.1, we can use String enums now
- call reject and leave now require CallReason enum as reason

## 0.5.15
### Added
- Export Call type

## 0.5.14
### Added
- Handle endpoint for fetching calls with pending invitations

## 0.5.13
### Fixed
- Reconnection do not break websocket

## 0.5.12
### Fixed
- Fix onServerUnreachable events after reconnecting
### Changed
- onDisconnect is not fired on browser offline event anymore.
Use onServerUnreachable instead which is more reliable.

## 0.5.11
### Changed
- Upgraded webrtc-adapter

## 0.5.10
### Added
- \"onServerUnreachable\" callback which is fired when no heartbeat is received from Artichoke within double timeout given in \"Hello\" event

## 0.5.9
### Changed
- Rooms now contain marks of all users in form of a map (userId -> timestamp)
- There's a new, separate RoomMarked event, specific for mark updates from server for all users

## 0.5.8
### Fixed
- Fix DEBUG logging level

## 0.5.7
### Added
- Endpoint for fetching active calls

## 0.5.6
### Changed
- Allow passing multiple chat history filters

## 0.5.5
### Changed
- Renamed `CallOffline`/`CallOnline` to `Offline`/`Online` and updated type tags
- Field `user` changed to `userId` in messages.

## 0.5.4
### Added
- Method for fetchin call users in `ArtichokeAPI`
### Fixed
- Call creator sends WebRTC offer to other users on call object creation

## 0.5.3
### Changed
- `Call` has `creator` field

## 0.5.2
### Added
- Optional context parameter that is passed to the invitee in `createDirect` room methods

## 0.5.1
### Changed
- `Call` no longer has `externalId` field

## 0.5.0
### Added
- `Message` class now has `tag` and optional `context` fields (plain text messages have `tag` set to `TEXT_MESSAGE` and no context).
- `Room` now has `onCustom(tag, callback)`, `sendCustom(body, tag, context)` methods used to send/receive custom messages.

### Changed
- `Room`/`Call` actions are now instances of `Message` class with appropriate `tag` value (`ROOM_JOINED`, `CALL_TRANSFERRED`, etc).
- Actions store context data in `context` field (`message.context.invitee` for invitations and `message.context.reason` for leaves).
- Old `Room`/`Call` callbacks (`onJoined()`, `onLeft()`, etc) still work correctly althoug they now pass a `Message` instance to the callback.

### Removed
- There are no `Media` nor `Metadata` clasess any longer.
- There are no `CallAction`, `RoomAction` events any longer.
- `Room` now doesn't have `onMedia()`, `onMetadata()`, `sendMedia()` nor `sendMetadata()`.

## 0.4.12
### Changed
- `RoomCreated` event has now rich Room object
