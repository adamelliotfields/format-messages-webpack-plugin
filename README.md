# Format Messages Webpack Plugin
> Displays formatted Webpack messages and system notifications like create-react-app and
webpack-notifier.

![demo](https://raw.githubusercontent.com/adamelliotfields/format-messages-webpack-plugin/master/_screenshots/demo.gif)

I love `create-react-app` (CRA), but I also like making my own Webpack configurations. When you
leave CRA-land, you give up many creature comforts like friendly shell logging and error messages
that are readable by human beings.

This plugin attempts to recreate the CRA experience and also provides system notifications via
`node-notifier`. It uses the message formatter from `react-dev-utils` and I've opted to use the same
messages from CRA.

Also, there is nothing React-specific about this plugin. It's meant to be used by anyone who uses
Webpack and Webpack Dev Server.

### Installation

*Note: Please use at least Node `v6.11.3`.*

```sh
npm install -D format-messages-webpack-plugin
```

### Usage

Add the plugin to your `plugins` array:

```javascript
const FormatMessagesWebpackPlugin = require('format-messages-webpack-plugin');

module.exports = {
  plugins: [
    new FormatMessagesWebpackPlugin()
  ]
};
```

If you're using `eslint-loader`, you need to add the custom formatter and set `emitWarning: true`:

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        enforce: 'pre',
        loader: 'eslint-loader',
        exclude: /node_modules/,
        options: {
          formatter: require('format-messages-webpack-plugin/formatter'),
          emitWarning: true,
          parser: 'babel-eslint',
          baseConfig: {
            extends: ['semistandard-react']
          }
        }
      }
    ]
  }
};
```

### Demo
There is a working demo in the `_demo` folder in the repository:

1. `git clone https://github.com/adamelliotfields/format-messages-webpack-plugin.git`
2. `cd format-messages-webpack-plugin`
3. `npm install`
4. `cd _demo`
5. `npm install`
6. `npm run start`

### Options
To disable system notifications, set `notifications: false` in the options object:

```javascript
module.exports = {
  plugins: [
    new FormatMessagesWebpackPlugin({ notifications: false })
  ]
}
```

### Notifications
There are three possible notifications:

1. Compiled successfully
2. Compiled with warnings
3. Failed to compile

While running the dev server, "Compiled successfully" will only be displayed on the first
successful compilation. However, if you make a change that introduces a warning or error, you'll see
the "Compiled successfully" notification again after fixing your code.

### Tips

**Disable Webpack Messages**

You'll first want to disable Webpack's default messages:

```javascript
// production
module.exports = {
  stats: 'none',
  // ...
};

// dev server
module.exports = {
  devServer: {
    quiet: true,
  }
};

```

Read more about the [stats](https://webpack.js.org/configuration/stats/) and
[devServer](https://webpack.js.org/configuration/dev-server/) objects.

**Development (dev server)**

The dev server messaging requires you to have a `devServer` property in your Webpack configuration
with the `host` and `port` defined. If you have `https: true`, it can detect that; otherwise it will
default to `http`. Also, the dev server must be run in either `development` or `undefined` mode.

**Production**

The production build messaging requires you to run your build script in `production` mode (this is
required by React anyways). You also must have a `path` defined in the output object (you need to do
this anyways).

**Bail**

If you set `bail: true` in your Webpack configuration, fatal errors like `ModuleNotFoundError` will
cause Webpack to throw an exception, print the stack trace, and exit with a non-zero code. This will
prevent the `done` event from firing, which in turn will prevent any custom messages or
notifications from being displayed.

**ESLint**

The included formatter is a slightly modified version of the formatter from `react-dev-utils`. It is
required for linter warnings and errors to display properly.

**Display Name**

To get the display name, (i.e., `my-app`), you need to have `"name": "my-app"` in your
`package.json`. Also, your `package.json` must be in the same folder as your Webpack config.
Otherwise, the default name is "bundle".

**Loading Spinners and Console Clearing**

If you're using an interactive shell (`process.stdout.isTTY === true`), you'll see animated `ora`
loading spinners and the console will be cleared in between compilation lifecycle events.

If you're not (e.g., Webstorm's script runner), you'll see regular log messages.

### Issues
Right now I cannot get notifications on any of my Windows 10 machines. There are a couple open
issues in the `node-notifier` repo.

If you hit `CTRL-C` during a production build, sometimes you have to hit it again to get your prompt
back.

### Acknowledgements
 - Facebook for MIT licensing their code.
 - `create-react-app` for setting the standard for React developer experience.
 - `react-dev-utils` for giving us "under the hood" access to CRA.
 - `webpack-messages` for giving me the idea to make this plugin.
 - `webpack-notifier` for giving me the idea to incorporate system notifications.

### Screenshots

**Error (console)**

![console error](https://raw.githubusercontent.com/adamelliotfields/format-messages-webpack-plugin/master/_screenshots/error_console.png)

**Error (notification)**

![notification error](https://raw.githubusercontent.com/adamelliotfields/format-messages-webpack-plugin/master/_screenshots/error_notification.png)

**Warning (console)**

![console warning](https://raw.githubusercontent.com/adamelliotfields/format-messages-webpack-plugin/master/_screenshots/warning_console.png)

**Warning (notification)**

![notification warning](https://raw.githubusercontent.com/adamelliotfields/format-messages-webpack-plugin/master/_screenshots/warning_notification.png)

**Webstorm Console**

![webstorm console](https://raw.githubusercontent.com/adamelliotfields/format-messages-webpack-plugin/master/_screenshots/webstorm_console.png)
