/// <reference types="node" />
import { EventEmitter } from "events";
declare type SetConfig = {
    /**number in seconds or string https://github.com/vercel/ms#readme*/
    ttl?: number | string;
    ack?: boolean;
};
declare type KroncacheConfig = {
    port?: number;
    ttl: number | string;
    ack?: boolean;
};
declare class Kroncache extends EventEmitter {
    #private;
    private config;
    constructor(config: KroncacheConfig);
    connect(): Promise<unknown>;
    private boot;
    set(key: string, value: any, opt?: SetConfig): Promise<void>;
    get<T = any>(key: string): Promise<T>;
    keys(): Promise<string[]>;
    del(key: string): Promise<void>;
    reset(): Promise<void>;
}
export = Kroncache;
