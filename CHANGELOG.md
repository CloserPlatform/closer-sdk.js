# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

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
