### Improve

* Simplify events - replace custom `EventHandler` with `rxjs`
* Do not throw error if event was unhandled

### Breaking changes
* Callbacks registering was replaced by `Observables`
  public callback methods were replaced from `onEventName` to `eventName$`

