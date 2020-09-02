/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */
const path = require('path');

// extraNodeModules & watchFolders necessary because Closer SDK in package.json is 
// linked relatively and react native metro does not support symlinks
const extraNodeModules =
  new Proxy(
    { },
    {
      get: (target, name) => {
        if (target.hasOwnProperty(name)) {
          return target[name]
        }
        // Redirect dependencies referenced from shared folders to mobile package node_modules
        return path.join(process.cwd(), `node_modules/${name}`)
      },
    },
 )

const watchFolders = [
  path.resolve(__dirname, '../'),
  path.resolve(__dirname, '../node_modules/rxjs')
]

module.exports = {
 projectRoot: __dirname,
 transformer: {
   getTransformOptions: async () => ({
     transform: {
       experimentalImportSupport: false,
       inlineRequires: false,
     },
   }),
 },
 resolver: {
   extraNodeModules,
 },
 watchFolders,
}
