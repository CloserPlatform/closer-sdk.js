## Demo app structure
`app.module` displays `entry.module` \[A module that displays inputs for servers and provides next actions\]

User can choose path of:
 - existing user:
    - `login.module` *\[A module handling logging to artichoke & spinner\]* ,which after successful login displays `agent.module`
    - after successful sign in, user has access to `chat.module`*\[A module allowing to start `conversation.module` for given room\]* and `call.module`
  - For guest user:
    - `guest.module` *\[A module allowing to get guest profile for given org and display `conversation.module`\]*
    - guest user has accesss to `conversation.module` and `call.module`



Files called `*.module.ts` are responsible for interaction with user/browser actions, while files `*.service.ts` handle interaction with sdk