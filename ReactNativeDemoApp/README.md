## Prerequisites and setting up development environment on macOS with Xcode & iOS simulator
You are likely to have some of the tools listed below already installed
1. Installing Node and Watchman, easiest way via `Homebrew`
  - `brew install node`
  - `brew install watchman`
2. Installing Xcode - easiest way via Mac App Store
 - Set or install Xcode Command Line Tools, in Xcode: `Preferences/Locations/Command Line Tools`
3. Installing iOS Simulator with Xcode
 - `XCode/Preferences/Components` - select version of iOS you want to use and install
4. Installing CocoaPods
 - `sudo gem install cocoapods`
5. Installing React Native Demo App dependencies: 
 - Navigate to `ReactNativeDemoApp` directory, create `.npmrc` (necessary for @swagger/spinner) file and run `npm install`
6. Installing Pods
 - Navigate to `ReactNativeDemoApp/ios` directory, and run `pod install`
7. You can now run the application

## Running application
### Run instructions for iOS:
  - Navigate to directory: `closer-sdk.js/ReactNativeDemoApp` && `npm run ios`
  - or Open ReactNativeDemoApp/ios/ReactNativeDemoApp.xcworkspace in Xcode or run "xed -b ios"
    - Hit the Run button

### Run instructions for Android:
    • Have an Android emulator running (quickest way to get started), or a device connected.
    • cd "closer-sdk.js/ReactNativeDemoApp" && npx react-native run-android

### Run instructions for Windows and macOS:
    • See https://aka.ms/ReactNative for the latest up-to-date instructions.
