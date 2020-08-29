﻿import { Injectable } from '@angular/core';
import { ConfigurationProvider } from '../config/config.provider';
import { AbstractSecurityStorage } from './abstract-security-storage';

export type StorageKeys =
    | 'authnResult'
    | 'authzData'
    | 'access_token_expires_at'
    | 'authWellKnownEndPoints'
    | 'userData'
    | 'authNonce'
    | 'codeVerifier'
    | 'authStateControl'
    | 'session_state'
    | 'storageSilentRenewRunning';

@Injectable()
export class StoragePersistanceService {
    constructor(
        private readonly oidcSecurityStorage: AbstractSecurityStorage,
        private readonly configurationProvider: ConfigurationProvider
    ) {}

    read(key: StorageKeys) {
        const keyToRead = this.createKeyWithPrefix(key);
        return this.oidcSecurityStorage.read(keyToRead);
    }

    write(key: StorageKeys, value: any) {
        const keyToStore = this.createKeyWithPrefix(key);
        this.oidcSecurityStorage.write(keyToStore, value);
    }

    resetStorageFlowData() {
        this.write('session_state', null);
        this.write('storageSilentRenewRunning', null);
        this.write('codeVerifier', null);
        this.write('userData', null);
    }

    resetAuthStateInStorage() {
        this.write('authzData', '');
        this.write('authnResult', '');
    }

    getAccessToken(): any {
        return this.read('authzData');
    }

    getIdToken(): any {
        return this.read('authnResult')?.id_token;
    }

    getRefreshToken(): any {
        return this.read('authnResult')?.refresh_token;
    }

    private createKeyWithPrefix(key: string) {
        const prefix = this.configurationProvider.openIDConfiguration?.clientId || '';
        return `${prefix}_${key}`;
    }
}
