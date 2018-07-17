### Fixed
* Sometimes ice candidate was received before sdp offer - fixed by implementing queue
* Edge on older laptop was causing camera crash which crashed whole connection - now it will continue to work just with audio and error will be logger

### Added
* More debug logging
* Updated webrtc-adapter to 6.3.0 to support screen sharing shims

### Refactored
* Replaced unused rxjs subjects and states with function callbacks to avoid memory leaks
