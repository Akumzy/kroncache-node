declare type SetConfig = {
    /**number in seconds or string https://github.com/vercel/ms#readme*/
    ttl: number | string | Date;
    /**Set to true if you need to be notified once TTL elapsed
     * and by setting to true you'll need to delete the record manually*/
    ack?: boolean;
    cron?: string;
};
declare type KroncacheConfig = {
    port?: number;
    ttl: number | string;
    ack?: boolean;
    host?: string;
};
declare type ExpiredPayload = {
    data: any;
    key: string;
};
declare class Kroncache {
    #private;
    private config;
    constructor(config: KroncacheConfig);
    connect(): Promise<boolean>;
    disconnect(): void;
    private boot;
    set(key: string, value: any, opt?: SetConfig): Promise<boolean>;
    get<T = any>(opt: string | {
        regex: string;
    }): Promise<T>;
    keys(): Promise<string[]>;
    del(key: string): Promise<boolean>;
    reset(): Promise<void>;
    addListener(event: 'expired' | 'error', listener: (payload: ExpiredPayload) => void): void;
    cron(key: string, expression: string, data?: any): Promise<boolean>;
    /**
     * Schedule a defined job
     */
    schedule(key: string, time: string | number | Date, data?: any): Promise<void>;
    scheduleBatch(key: string, /**time e**/ cronExpression: string): Promise<void>;
    addToBatch(key: string, data: any): Promise<void>;
    define(key: string, listener: (payload: ExpiredPayload) => void): void;
    incr(key: string, value?: number): Promise<number>;
    decr(key: string, value?: number): Promise<number>;
}
export = Kroncache;
