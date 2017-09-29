const onExit = require('signal-exit');

const FormatMessages = require('./FormatMessages');

// TODO: Add option to disable notifications
class FormatMessagesWebpackPlugin extends FormatMessages {
  constructor () {
    super();
    this.isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined;
    this.isProduction = process.env.NODE_ENV === 'production';
    this.hasWarnings = false;
    this.hasErrors = false;
    this.isFirstCompile = true;
    this.hasDevServer = false;
  }

  apply (compiler) {
    // Check if the devServer property exists
    // We can assume the options object exists, otherwise this plugin wouldn't even be running
    if (compiler.options.devServer !== undefined) {
      this.hasDevServer = true;
    }

    compiler.plugin('compile', () => {
      this.handleCompile(this.isDevelopment, this.isProduction, this.hasDevServer, this.isFirstCompile);
    });

    compiler.plugin('invalid', () => {
      // Reset isFirstCompile if there were warnings or errors
      // This is so the system notification will show again once warnings/errors have been fixed
      if (this.hasWarnings || this.hasErrors) {
        this.isFirstCompile = true;
      }

      // Reset warnings and errors
      this.hasWarnings = false;
      this.hasErrors = false;

      this.handleInvalid(this.isDevelopment, this.isFirstCompile);
    });

    compiler.plugin('done', (stats) => {
      const messages = this.formatWebpackMessages(stats);

      // Set warnings and errors
      this.hasWarnings = messages.warnings.length > 0;
      this.hasErrors = messages.errors.length > 0;

      this.handleDone(
        this.isDevelopment,
        this.isProduction,
        this.isFirstCompile,
        this.hasWarnings,
        this.hasErrors,
        this.hasDevServer,
        messages,
        compiler,
        stats
      );

      // Set isFirstCompile to false if successful
      if (!this.hasWarnings || !this.hasErrors) {
        this.isFirstCompile = false;
      }
    });

    // Handle exit codes and kill signals
    onExit((code, signal) => {
      this.handleExit(code, signal);
    });

    return compiler;
  }
}

module.exports = FormatMessagesWebpackPlugin;
