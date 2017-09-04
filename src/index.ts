#!/usr/bin/env node

import * as minimist from 'minimist';
import amdReader from './amdReader';
import boundler from './bundler';
import createCompiler from './compile';
import console from './console';
import { outputFile } from 'fs-extra';


const options = minimist<Partial<IOptions>>(process.argv.slice(2));

function out(path: string): (file: string) => Promise<void> {
    return (file) => {
        return outputFile(path, file);
    };
}

function applyAMDBundle(params: IAMDReaderParams) {
    return amdReader(params.amdBundle)
        .then(boundler(params.standalone, params.main))
        .then(out(params.out))
        .catch((e) => {
            console.log(e.message);
        });
}

function error(message) {
    console.error(message);
    process.exit(1);
}

function run(options: Partial<IOptions>): void {

    if (!options.out) {
        error('No "out" option!');
    }

    if (!options.main) {
        error('Has no main module!');
    }

    if (options.amdBundle) {
        if (!options.main) {
            error('Can\'t use "amdBundle" without "main"');
        }
        applyAMDBundle({
            amdBundle: options.amdBundle,
            main: options.main,
            out: options.out,
            standalone: options.standalone
        }).then(() => {
            process.exit(0);
        });
        return null;
    }

    if (options.file) {
        const compiler = createCompiler(options as IOptions);

        compiler.compileFile()
            .then(applyAMDBundle)
            .then(compiler.clear())
            .then(() => {
                process.exit(0);
            });
        return null;
    }

    if (options.config) {
        const compiler = createCompiler(options as IOptions);

        compiler.compileProject()
            .then(applyAMDBundle)
            .then(compiler.clear())
            .then(() => {
                process.exit(0);
            });

        return null;
    }
}

run(options);


export interface IOptions {

    /**
     * main compiled file
     */
    file?: string;
    /**
     * config for compile typescript code
     * conflict with "file"
     */
    config?: string;
    /**
     * amdBundle to js amd bundle
     * conflict with "file" and "config"
     * "main" required
     */
    amdBundle?: string;
    /**
     * amdBundle to target file
     */
    out: string;
    /**
     * global standalone for bundle
     */
    standalone?: string;
    /**
     * main module from bundle
     */
    main: string;
    /**
     * custom compiler path
     */
    typescriptCompiler?: string;
}

export interface IAMDReaderParams {
    amdBundle: string,
    main: string,
    out: string,
    standalone?: string
}

export interface IFunction<P, R> {
    (param: P): R;
}
