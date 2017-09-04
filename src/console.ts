import * as colors from 'colors';

export default {
    info:  (...args) => {
        console.info(...args.map(item => colors.blue(item)));
    },
    log: (...args) => {
        console.log(...args.map(item => colors.gray(item)));
    },
    warn: (...args) => {
        console.warn(...args.map(item => colors.yellow(item)));
    },
    error: (...args) => {
        console.error(...args.map(item => colors.red(item)));
    }
}
