## Demo app structure
- app.module
  - login.module - A module handling logging to artichoke & spinner
  - board.module - A module displayed after successful verification by login.module
    - call.module - A module demonstrating call functionality
    - chat.module - A module demonstrating chat functionality

Files called `*.module.ts` are responsible for interaction with user/browser actions, while files `*.service.ts` handle interaction with sdk