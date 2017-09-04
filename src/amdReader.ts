import console from './console';
import { readFile } from 'fs-extra';

function getAllModulesClosure(file: string, modules: IModuleData[]): IModuleData {
    modules.forEach((module) => {
        file = file.replace(module.body, '').replace(/\n\n/g, '\n');
    });
    return {
        name: 'CLOSURE',
        dependency: [],
        body: file
    }
}

function getModules(file: string): Array<IModuleData> {
    const modules = [];

    function define(name, dependency, callback) {
        modules.push({
            name,
            dependency,
            body: `define("${name}", [${dependency.map(item => `"${item}"`).join(', ')}], ${callback.toString()});`
        });
    }

    try {
        eval(file);
        modules.push(getAllModulesClosure(file, modules));
    } catch (e) {
        console.error('Parser error: ', e.message);
        return [];
    }

    return modules;
}

export default function (amdBundlePath: string): Promise<Array<IModuleData>> {
    return readFile(amdBundlePath, 'utf8')
        .then(getModules)
        .catch((e) => {
            console.error(e.message);
            return [];
        });
}

export interface IModuleData {
    name: string;
    dependency: Array<string>;
    body: string;
}
