import console from './console';
import { IModuleData } from './amdReader';
import { readFile } from 'fs-extra';
import { join } from 'path';

const CORE_DEPENDENCY = [
    'require', 'exports', 'module'
];


function getModulesHash(modules: Array<IModuleData>): IHash<IModuleData> {
    return modules.reduce((result, item) => {
        result[item.name] = item;
        return result;
    }, Object.create(null));
}

function filterDefaultDependency(item: string): boolean {
    return CORE_DEPENDENCY.indexOf(item) === -1;
}

function sortDeps(modules, globalDependency) {
    while (true) {

        const hash = {};
        let index = null;

        const hasError = modules.some((item, i) => {
            const deps = item.dependency.slice(2);
            const error = deps.some((name) => {
                return !hash[name] && globalDependency.indexOf(name) === -1;
            });
            if (error) {
                index = i;
            } else {
                hash[item.name] = true;
            }
            return error;
        });

        if (hasError) {
            modules.splice(index + 1, 0, modules.splice(index, 1)[0]);
        } else {
            break;
        }
    }
}

function processTemplate(data: object): (template: string) => string {
    return (template: string) => {
        return template.replace('//# sourceMappingURL=bundleWrap.js.map', '')
            .replace(/\$([A-Z]*)?\$/g, function (fullPattern, variable) {
                return data[variable];
            });
    };
}

export default function (name: string, main: string): (mudules: Array<IModuleData>) => Promise<string> {
    return function (modules: Array<IModuleData>) {
        const hash = getModulesHash(modules);
        const globalDependency = [];
        const defaultModule = modules.filter((item) => item.name === 'CLOSURE')[0];
        modules.splice(modules.indexOf(defaultModule), 1);

        let body = defaultModule.body;

        modules.forEach((module) => {
            module.dependency.filter(filterDefaultDependency).forEach((name) => {
                if (!hash[name] && globalDependency.indexOf(name) === -1) {
                    globalDependency.push(name);
                }
            });
        });

        sortDeps(modules, globalDependency);

        modules.forEach((module) => {
            body += `(function () {${module.body}})();\n`;
        });

        return readFile(join(__dirname, 'templates/bundleWrap.js'), 'utf8')
            .then(processTemplate({
                DEPENDENCY: JSON.stringify(globalDependency),
                NAME: `"${name || ''}"`,
                MAIN: `"${main}"`,
                BODY: body
            })).catch((e) => {
                console.error(e.message);
                return '';
            });
    }
}

export interface IHash<T> {
    [key: string]: T;
}
