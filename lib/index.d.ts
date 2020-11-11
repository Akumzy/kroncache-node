/// <reference types="node" />
import { EventEmitter } from "events";
declare type SetOption = {
    key: string;
    expire: number | string;
    data: any;
};
declare type GetValue = {
    key: string;
    expire: Date;
    data: any;
};
declare class Kroncache extends EventEmitter {
    #private;
    private config?;
    constructor(config?: {
        port?: number | undefined;
    } | undefined);
    connect(): Promise<unknown>;
    private boot;
    set(opt: SetOption): Promise<unknown>;
    get(key: string): Promise<GetValue>;
    getAll(): Promise<GetValue[]>;
    delete(key: string): Promise<unknown>;
    purgeAll(): Promise<unknown>;
}
export = Kroncache;
