## Demo app structure
`app.module` displays `entry.module` \[A module that displays inputs for servers and provides next actions\]

User can choose path of:
 - existing user:
    - `login.module` *\[A module handling logging to artichoke & spinner\]* ,which after successful login displays `board.module`, than consists of: 
       - `call.module` - *\[A module demonstrating call functionality\]*
       - `chat.module` - *\[A module containing `conversation.module` with chat functionality\]*
  - For guest user:
    - `guest.module` *\[A module allowing to get guest profile for given org and display `conversation.module`\]*

Files called `*.module.ts` are responsible for interaction with user/browser actions, while files `*.service.ts` handle interaction with sdk