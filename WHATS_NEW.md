### Changed
- protocol for WebSockets is extracted to `artichoke-protocol` project
- every input message is a `Command` and every output is an `Event` 
- improved semantic of messages names: `Command` names are in present tense, `Event` names in past tense
- normalize/flatten events. Don't nest message inside a message
- change schema of messages
- change the way of filtering messages via REST API (new `customFilter` query parameter)

