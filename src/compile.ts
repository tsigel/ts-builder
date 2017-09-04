import { IAMDReaderParams, IFunction, IOptions } from './index';
import console from './console';
import { join } from 'path';
import { exec } from 'child_process';
import { pathExists, readFile, remove, writeFile, writeJSON } from 'fs-extra';


function execPromise(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(command, function (error, log1, log2) {
            if (error) {
                console.error(command, log1);
                reject(error);
            } else {
                resolve(log1);
            }
        });
    });
}

class Compiler {


    private _initialize: Promise<ICompilerOptions>;
    private _options: IOptions;
    private _buildPath: string;


    constructor(options: IOptions) {
        this._options = options;
        this._buildPath = join(__dirname, '../tmp', 'build.js');
        this._initialize = this._findCompiler();
    }

    public compileFile(): Promise<IAMDReaderParams> {
        return this._logTscVersion()
            .then((data) => {
                return execPromise(`node ${data.tsc} ${this._options.file} -m amd --outFile ${this._buildPath}`);
            }).then(() => {
                return { ...this._options, amdBundle: this._buildPath };
            });
    }

    public compileProject(): Promise<IAMDReaderParams> {
        const project = this._options.config.replace('/tsconfig.json', '');
        return this._logTscVersion()
            .then((data) => {
                return readFile(this._options.config, 'utf8').then((originConfig) => {
                    const config = { ...(JSON.parse(originConfig)) };
                    config.compilerOptions = { ...config.compilerOptions };

                    config.compilerOptions.module = 'amd';
                    config.compilerOptions.outFile = this._buildPath;
                    config.compilerOptions.moduleResolution = 'node';

                    ['outDir', 'declaration', 'sourceMap'].forEach((name) => {
                        if (config.compilerOptions[name]) {
                            delete config.compilerOptions[name];
                        }
                    });

                    return writeJSON(this._options.config, config).then(() => {

                        return execPromise(`node ${data.tsc} -p ${project}`).catch((e) => {
                            return Promise.all([
                                writeFile(this._options.config, originConfig),
                                this.clear()
                            ]).then(() => {
                                console.error(JSON.stringify(config, null, 4));
                                console.error('Fail compile!');
                                process.exit(1);
                            });
                        });
                    }).then(() => {
                        return writeFile(this._options.config, originConfig);
                    });
                })
            })
            .then(() => {
                return { ...this._options, amdBundle: this._buildPath };
            });
    }

    public clear(): IFunction<void, Promise<void>> {
        return () => remove(this._buildPath);
    }

    private _logTscVersion(): Promise<ICompilerOptions> {
        return this._initialize.then((data) => {
            return execPromise(`node ${data.tsc} -v`)
                .then((version) => {
                    console.info(`Use typescript version: ${version}`);
                    return data;
                });
        })
    }

    private _findCompiler(): Promise<ICompilerOptions> {
        const myRoot = join(__dirname, '..', 'node_modules');
        const myPath = join(myRoot, '.bin', 'tsc');
        const parentRoot = join(__dirname, '..', '..');
        const parentPath = join(parentRoot, '.bin', 'tsc');
        return pathExists(myPath)
            .then((status) => {
                if (status) {
                    return {
                        tsc: this._options.typescriptCompiler ? this._options.typescriptCompiler : myPath,
                        root: myRoot
                    };
                } else {
                    return pathExists(parentPath).then((status) => {
                        if (status) {
                            return {
                                tsc: this._options.typescriptCompiler ? this._options.typescriptCompiler : parentPath,
                                root: parentRoot
                            };
                        } else {
                            throw new Error('Typescript compiler path does not exist!');
                        }
                    });
                }
            });
    }
}

export default function (options: IOptions) {
    return new Compiler(options);
}

export interface ICompilerOptions {
    tsc: string
    root: string;
}