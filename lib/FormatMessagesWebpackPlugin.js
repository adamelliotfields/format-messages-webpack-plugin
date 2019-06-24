const onExit = require('signal-exit');

const FormatMessages = require('./FormatMessages');

class FormatMessagesWebpackPlugin extends FormatMessages {
  /**
   * The plugin class.
   *
   * @constructor
   * @param {object} options - Disable notifications
   */
  constructor (options = { notifications: true }) {
    super(options);
    this.isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined;
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isTTY = process.stdout.isTTY;
    this.isFirstCompile = true;
    this.hasWarnings = false;
    this.hasErrors = false;
    this.hasDevServer = false;
    this.shouldNotify = true;
  }

  /**
   * All Webpack plugins are "installed" via the apply method.
   *
   * @param {object} compiler - The compiler configuration object
   * @returns {*}
   */
  apply (compiler) {
    // Check if the devServer property exists
    // We can assume the options object exists, otherwise this plugin wouldn't even be running
    if (compiler.options.devServer !== undefined) {
      this.hasDevServer = true;
    }

    compiler.hooks.compile.tap('compile', () => {
      this.handleCompile(
        this.isDevelopment,
        this.isProduction,
        this.isTTY,
        this.isFirstCompile,
        this.hasDevServer
      );

      // Set isFirstCompile to false
      // This prevents "Starting the development server" from being displayed on every save
      this.isFirstCompile = false;
    });

    compiler.hooks.invalid.tap('invalid', () => {
      // Reset warnings and errors
      this.hasWarnings = false;
      this.hasErrors = false;

      this.handleInvalid(
        this.isDevelopment,
        this.isTTY,
        this.isFirstCompile
      );
    });

    compiler.hooks.done.tap('done', (stats) => {
      const messages = this.formatWebpackMessages(stats);

      // Set warnings and errors
      this.hasWarnings = messages.warnings.length > 0;
      this.hasErrors = messages.errors.length > 0;

      // Reset shouldNotify if there were warnings or errors
      // This is so the compilation success notification will show again
      // once warnings/errors have been fixed
      if (this.hasWarnings || this.hasErrors) {
        this.shouldNotify = true;
      }

      this.handleDone(
        this.isDevelopment,
        this.isProduction,
        this.isTTY,
        this.hasWarnings,
        this.hasErrors,
        this.hasDevServer,
        this.shouldNotify,
        messages,
        compiler,
        stats
      );

      // Set shouldNotify to false after handleDone has finished executing
      if (!this.hasWarnings && !this.hasErrors) {
        this.shouldNotify = false;
      }
    });

    // Handle exit codes and kill signals
    onExit((code, signal) => {
      this.handleExit(this.isProduction, this.isTTY, code, signal);
    });

    return compiler;
  }
}

module.exports = FormatMessagesWebpackPlugin;
