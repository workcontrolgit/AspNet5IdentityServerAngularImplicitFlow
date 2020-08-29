import { Injectable } from '@angular/core';
import { ConfigurationProvider } from '../config/config.provider';
import { LoggerService } from '../logging/logger.service';
import { AbstractSecurityStorage } from './abstract-security-storage';

@Injectable()
export class BrowserStorageService implements AbstractSecurityStorage {
    constructor(private configProvider: ConfigurationProvider, private loggerService: LoggerService) {}

    read(key: string): any {
        if (!this.hasStorage()) {
            this.loggerService.logDebug(`Wanted to read '${key}' but Storage was undefined`);
            return false;
        }

        const item = this.getStorage()?.getItem(key);

        if (!item) {
            this.loggerService.logDebug(`Wanted to read '${key}' but nothing was found`);
            return null;
        }

        return JSON.parse(item);
    }

    write(key: string, value: any): boolean {
        if (!this.hasStorage()) {
            this.loggerService.logDebug(`Wanted to write '${key}/${value}' but Storage was falsy`);
            return false;
        }

        const storage = this.getStorage();
        if (!storage) {
            this.loggerService.logDebug(`Wanted to write '${key}/${value}' but Storage was falsy`);
            return false;
        }

        value = value || null;

        storage.setItem(`${key}`, JSON.stringify(value));
        return true;
    }

    private getStorage() {
        return this.configProvider.openIDConfiguration?.storage;
    }

    private hasStorage() {
        return typeof Storage !== 'undefined';
    }
}
