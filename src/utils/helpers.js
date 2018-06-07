"use strict";
exports.__esModule = true;
var winston_1 = require("winston");
/**
 * helper functions
 */
var Helpers = /** @class */ (function () {
    function Helpers() {
    }
    /**
     * Winston Logger with default level: debug
     *
     * @static
     * @param {string} name
     * @param {string} [level]
     * @returns {LoggerInstance}
     * @memberof Helpers
     */
    Helpers.getLoggerInstance = function (name, level) {
        return new winston_1.Logger({
            transports: [new winston_1.transports.Console({
                    level: level || 'debug',
                    prettyPrint: true,
                    handleExceptions: true,
                    json: false,
                    label: name,
                    colorize: true
                })],
            exitOnError: false
        });
    };
    ;
    /**
     * Check number of arguments
     * try to cast object using yup
     * validate arguments against predefined types using yup
     * return validated object
     *
     * @static
     * @template T
     * @param {string[]} args
     * @param {*} yupSchema
     * @returns {Promise<T>}
     * @memberof Helpers
     */
    Helpers.checkArgs = function (args, yupSchema) {
        var keys = yupSchema._nodes;
        if (!keys || args.length != keys.length) {
            throw new Error("Incorrect number of arguments. Expecting " + keys.length);
        }
        var objectToValidate = {};
        keys.reverse().forEach(function (key, index) {
            objectToValidate[key] = args[index];
        });
        yupSchema.cast(objectToValidate);
        return yupSchema.validate(objectToValidate).then(function (validatedObject) {
            return validatedObject;
        })["catch"](function (errors) {
            throw new Error(errors);
        });
    };
    return Helpers;
}());
exports.Helpers = Helpers;
