declare let define: any;
declare let $DEPENDENCY$: Array<string>;
declare let $NAME$: string;
declare let $MAIN$: string;
declare let $BODY$: any;

const enum TYPE {
    NODE,
    AMD,
    NONE
}

(function (f) {
    const dependency = $DEPENDENCY$;
    const main = $MAIN$;
    const name = $NAME$;

    if (typeof exports === 'object' && typeof module !== 'undefined') {
        module.exports = f(TYPE.NODE, main, dependency)
    } else if (typeof define === 'function' && define.amd) {
        if (name) {
            define(name, dependency, f.bind(null, TYPE.AMD, main, dependency));
        } else {
            define(dependency, f.bind(null, TYPE.AMD, main, dependency));
        }
    } else {
        let g;
        if (typeof window !== 'undefined') {
            g = window
        } else if (typeof global !== 'undefined') {
            g = global
        } else if (typeof self !== 'undefined') {
            g = self
        } else {
            g = this
        }
        f.call(g, TYPE.NONE, main, dependency);
    }
})(function (type: TYPE, main: string, dependencyString: Array<string>, dependency?: Array<any>) {
    const body = function (define) {
        $BODY$
    };
    const global = this;

    const camelCase = function (str: string): string {
        return str.split(/\W|_/)
            .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.substr(1)))
            .join('');
    };

    const exports = Object.create(null);

    let myRequire;

    switch (type) {
        case TYPE.NODE:
            myRequire = function (name) {
                if (dependencyString.indexOf(name) !== -1) {
                    return require(name);
                } else {
                    if (name in exports) {
                        return exports[name];
                    }
                    throw new Error(`Can\'t find module "${name}"`);
                }
            };
            break;
        default:
            myRequire = function (name: string) {
                const index = dependencyString.indexOf(name);
                if (index === -1) {
                    if (name in exports) {
                        return exports[name];
                    }
                    throw new Error(`Can\'t find module "${name}"`);
                } else {
                    return dependency && dependency[index] || global[name] || global[camelCase(name)];
                }
            }
    }

    const define = function (moduleName, moduleDependency, callback) {
        exports[moduleName] = {};
        const args = moduleDependency.map((dependencyName) => {
            switch (dependencyName) {
                case 'require':
                    return myRequire;
                case 'exports':
                    return exports[moduleName];
                default:
                    return myRequire(dependencyName);
            }
        });
        const result = callback.apply(global, args);
        if (result != null && Object.keys(exports[moduleName]).length === 0) {
            exports[moduleName] = result;
        }
    };

    body(define);

    if ($NAME$ && type === TYPE.NONE) {
        global[camelCase($NAME$)] = exports[main];
    }

    return exports[main];
});