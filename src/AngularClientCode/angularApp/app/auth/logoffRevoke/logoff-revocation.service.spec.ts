import { async, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { DataService } from '../api/data.service';
import { DataServiceMock } from '../api/data.service-mock';
import { ConfigurationProvider } from '../config/config.provider';
import { ConfigurationProviderMock } from '../config/config.provider-mock';
import { FlowsServiceMock } from '../flows/flows.service-mock';
import { CheckSessionService } from '../iframe/check-session.service';
import { CheckSessionServiceMock } from '../iframe/check-session.service-mock';
import { LoggerService } from '../logging/logger.service';
import { LoggerServiceMock } from '../logging/logger.service-mock';
import { StoragePersistanceService } from '../storage/storage-persistance.service';
import { RedirectServiceMock } from '../utils/redirect/redirect.service-mock';
import { UrlService } from '../utils/url/url.service';
import { FlowsService } from './../flows/flows.service';
import { StoragePersistanceServiceMock } from './../storage/storage-persistance.service-mock';
import { RedirectService } from './../utils/redirect/redirect.service';
import { UrlServiceMock } from './../utils/url/url.service-mock';
import { LogoffRevocationService } from './logoff-revocation.service';

describe('Logout and Revoke Service', () => {
    let service: LogoffRevocationService;
    let dataService: DataService;
    let loggerService: LoggerService;
    let storagePersistanceService: StoragePersistanceService;
    let urlService: UrlService;
    let checkSessionService: CheckSessionService;
    let flowsService: FlowsService;
    let redirectService: RedirectService;
    let configurationProvider: ConfigurationProvider;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                LogoffRevocationService,
                { provide: DataService, useClass: DataServiceMock },
                { provide: LoggerService, useClass: LoggerServiceMock },
                { provide: StoragePersistanceService, useClass: StoragePersistanceServiceMock },
                { provide: UrlService, useClass: UrlServiceMock },
                { provide: CheckSessionService, useClass: CheckSessionServiceMock },
                { provide: FlowsService, useClass: FlowsServiceMock },
                { provide: RedirectService, useClass: RedirectServiceMock },
                { provide: ConfigurationProvider, useClass: ConfigurationProviderMock },
            ],
        });
    });

    beforeEach(() => {
        service = TestBed.inject(LogoffRevocationService);
        dataService = TestBed.inject(DataService);
        loggerService = TestBed.inject(LoggerService);
        storagePersistanceService = TestBed.inject(StoragePersistanceService);
        urlService = TestBed.inject(UrlService);
        checkSessionService = TestBed.inject(CheckSessionService);
        flowsService = TestBed.inject(FlowsService);
        redirectService = TestBed.inject(RedirectService);
        configurationProvider = TestBed.inject(ConfigurationProvider);
    });

    it('should create', () => {
        expect(service).toBeTruthy();
    });

    describe('revokeAccessToken', () => {
        it('uses token parameter if token as parameter is passed in the method', () => {
            // Arrange
            const paramToken = 'passedTokenAsParam';
            const revocationSpy = spyOn(urlService, 'createRevocationEndpointBodyAccessToken');
            // Act
            service.revokeAccessToken(paramToken);
            // Assert
            expect(revocationSpy).toHaveBeenCalledWith(paramToken);
        });

        it('uses token parameter from persistance if no param is provided', () => {
            // Arrange
            const paramToken = 'damien';
            spyOn(storagePersistanceService, 'getAccessToken').and.returnValue(paramToken);
            const revocationSpy = spyOn(urlService, 'createRevocationEndpointBodyAccessToken');
            // Act
            service.revokeAccessToken();
            // Assert
            expect(revocationSpy).toHaveBeenCalledWith(paramToken);
        });

        it('returns type observable', () => {
            // Arrange
            const paramToken = 'damien';
            spyOn(storagePersistanceService, 'getAccessToken').and.returnValue(paramToken);
            spyOn(urlService, 'createRevocationEndpointBodyAccessToken');

            // Act
            const result = service.revokeAccessToken();

            // Assert
            expect(result).toEqual(jasmine.any(Observable));
        });

        it('loggs and returns unmodified response if request is positive', async(() => {
            // Arrange
            const paramToken = 'damien';
            spyOn(storagePersistanceService, 'getAccessToken').and.returnValue(paramToken);
            spyOn(urlService, 'createRevocationEndpointBodyAccessToken');
            const loggerSpy = spyOn(loggerService, 'logDebug');
            spyOn(dataService, 'post').and.returnValue(of({ data: 'anything' }));

            // Act
            service.revokeAccessToken().subscribe((result) => {
                // Assert
                expect(result).toEqual({ data: 'anything' });
                expect(loggerSpy).toHaveBeenCalled();
            });
        }));

        it('loggs error when request is negative', async(() => {
            // Arrange
            const paramToken = 'damien';
            spyOn(storagePersistanceService, 'getAccessToken').and.returnValue(paramToken);
            spyOn(urlService, 'createRevocationEndpointBodyAccessToken');
            const loggerSpy = spyOn(loggerService, 'logError');
            spyOn(dataService, 'post').and.returnValue(throwError('FAILUUURE'));

            // Act
            service.revokeAccessToken().subscribe({
                error: (err) => {
                    expect(loggerSpy).toHaveBeenCalled();
                    expect(err).toBeTruthy();
                },
            });
        }));
    });

    describe('revokeRefreshToken', () => {
        it('uses refresh token parameter if token as parameter is passed in the method', () => {
            // Arrange
            const paramToken = 'passedTokenAsParam';
            const revocationSpy = spyOn(urlService, 'createRevocationEndpointBodyRefreshToken');
            // Act
            service.revokeRefreshToken(paramToken);
            // Assert
            expect(revocationSpy).toHaveBeenCalledWith(paramToken);
        });

        it('uses refresh token parameter from persistance if no param is provided', () => {
            // Arrange
            const paramToken = 'damien';
            spyOn(storagePersistanceService, 'getRefreshToken').and.returnValue(paramToken);
            const revocationSpy = spyOn(urlService, 'createRevocationEndpointBodyRefreshToken');
            // Act
            service.revokeRefreshToken();
            // Assert
            expect(revocationSpy).toHaveBeenCalledWith(paramToken);
        });

        it('returns type observable', () => {
            // Arrange
            const paramToken = 'damien';
            spyOn(storagePersistanceService, 'getRefreshToken').and.returnValue(paramToken);
            spyOn(urlService, 'createRevocationEndpointBodyAccessToken');

            // Act
            const result = service.revokeRefreshToken();

            // Assert
            expect(result).toEqual(jasmine.any(Observable));
        });

        it('loggs and returns unmodified response if request is positive', async(() => {
            // Arrange
            const paramToken = 'damien';
            spyOn(storagePersistanceService, 'getRefreshToken').and.returnValue(paramToken);
            spyOn(urlService, 'createRevocationEndpointBodyAccessToken');
            const loggerSpy = spyOn(loggerService, 'logDebug');
            spyOn(dataService, 'post').and.returnValue(of({ data: 'anything' }));

            // Act
            service.revokeRefreshToken().subscribe((result) => {
                // Assert
                expect(result).toEqual({ data: 'anything' });
                expect(loggerSpy).toHaveBeenCalled();
            });
        }));

        it('loggs error when request is negative', async(() => {
            // Arrange
            const paramToken = 'damien';
            spyOn(storagePersistanceService, 'getRefreshToken').and.returnValue(paramToken);
            spyOn(urlService, 'createRevocationEndpointBodyAccessToken');
            const loggerSpy = spyOn(loggerService, 'logError');
            spyOn(dataService, 'post').and.returnValue(throwError('FAILUUURE'));

            // Act
            service.revokeRefreshToken().subscribe({
                error: (err) => {
                    expect(loggerSpy).toHaveBeenCalled();
                    expect(err).toBeTruthy();
                },
            });
        }));
    });

    describe('getEndSessionUrl', () => {
        it('uses id_token parameter from persistance if no param is provided', () => {
            // Arrange
            const paramToken = 'damienId';
            spyOn(storagePersistanceService, 'getIdToken').and.returnValue(paramToken);
            const revocationSpy = spyOn(urlService, 'createEndSessionUrl');
            // Act
            // Act
            service.getEndSessionUrl();
            // Assert
            expect(revocationSpy).toHaveBeenCalledWith(paramToken);
        });
    });

    describe('logoff', () => {
        it('logs and retuns if `endSessionUrl` is false', () => {
            // Arrange
            spyOn(service, 'getEndSessionUrl').and.returnValue('');
            const serverStateChangedSpy = spyOn(checkSessionService, 'serverStateChanged');
            // Act
            service.logoff();
            // Assert
            expect(serverStateChangedSpy).not.toHaveBeenCalled();
        });

        it('logs and retuns if `serverStateChanged` is true', () => {
            // Arrange
            spyOn(service, 'getEndSessionUrl').and.returnValue('someValue');
            const redirectSpy = spyOn(redirectService, 'redirectTo');
            spyOn(checkSessionService, 'serverStateChanged').and.returnValue(true);
            // Act
            service.logoff();
            // Assert
            expect(redirectSpy).not.toHaveBeenCalled();
        });

        it('calls urlHandler if urlhandler is passed', () => {
            // Arrange
            spyOn(service, 'getEndSessionUrl').and.returnValue('someValue');
            const spy = jasmine.createSpy();
            const urlHandler = (url) => {
                spy(url);
            };
            const redirectSpy = spyOn(redirectService, 'redirectTo');
            spyOn(checkSessionService, 'serverStateChanged').and.returnValue(false);
            // Act
            service.logoff(urlHandler);
            // Assert
            expect(redirectSpy).not.toHaveBeenCalled();
            expect(spy).toHaveBeenCalledWith('someValue');
        });

        it('calls reidrect service if no urlhandler is passed', () => {
            // Arrange
            spyOn(service, 'getEndSessionUrl').and.returnValue('someValue');

            const redirectSpy = spyOn(redirectService, 'redirectTo');
            spyOn(checkSessionService, 'serverStateChanged').and.returnValue(false);
            // Act
            service.logoff();
            // Assert
            expect(redirectSpy).toHaveBeenCalledWith('someValue');
        });
    });

    describe('logoffLocal', () => {
        it('calls flowsService.resetAuthorizationData', () => {
            // Arrange
            const resetAuthorizationDataSpy = spyOn(flowsService, 'resetAuthorizationData');
            // Act
            service.logoffLocal();
            // Assert
            expect(resetAuthorizationDataSpy).toHaveBeenCalled();
        });
    });

    describe('logoffAndRevokeTokens', () => {
        it('calls revokeRefreshToken and revokeAccessToken when storage holds a refreshtoken', async(() => {
            // Arrange
            const paramToken = 'damien';
            spyOn(storagePersistanceService, 'getRefreshToken').and.returnValue(paramToken);
            const revokeRefreshTokenSpy = spyOn(service, 'revokeRefreshToken').and.returnValue(of({ any: 'thing' }));
            const revokeAccessTokenSpy = spyOn(service, 'revokeAccessToken').and.returnValue(of({ any: 'thing' }));

            // Act
            service.logoffAndRevokeTokens().subscribe(() => {
                // Assert
                expect(revokeRefreshTokenSpy).toHaveBeenCalled();
                expect(revokeAccessTokenSpy).toHaveBeenCalled();
            });
        }));

        it('loggs error when revokeaccesstoken throws an error', async(() => {
            // Arrange
            const paramToken = 'damien';
            spyOn(storagePersistanceService, 'getRefreshToken').and.returnValue(paramToken);
            spyOn(service, 'revokeRefreshToken').and.returnValue(of({ any: 'thing' }));
            const loggerSpy = spyOn(loggerService, 'logError');
            spyOn(service, 'revokeAccessToken').and.returnValue(throwError('FAILUUURE'));

            // Act
            service.logoffAndRevokeTokens().subscribe({
                error: (err) => {
                    expect(loggerSpy).toHaveBeenCalled();
                    expect(err).toBeTruthy();
                },
            });
        }));

        it('calls logoff in case of success', async(() => {
            // Arrange
            const paramToken = 'damien';
            spyOn(storagePersistanceService, 'getRefreshToken').and.returnValue(paramToken);
            spyOn(service, 'revokeRefreshToken').and.returnValue(of({ any: 'thing' }));
            spyOn(service, 'revokeAccessToken').and.returnValue(of({ any: 'thing' }));
            const logoffSpy = spyOn(service, 'logoff');

            // Act
            service.logoffAndRevokeTokens().subscribe(() => {
                // Assert
                expect(logoffSpy).toHaveBeenCalled();
            });
        }));

        it('calls logoff with urlhandler in case of success', async(() => {
            // Arrange
            const paramToken = 'damien';
            spyOn(storagePersistanceService, 'getRefreshToken').and.returnValue(paramToken);
            spyOn(service, 'revokeRefreshToken').and.returnValue(of({ any: 'thing' }));
            spyOn(service, 'revokeAccessToken').and.returnValue(of({ any: 'thing' }));
            const logoffSpy = spyOn(service, 'logoff');
            const urlHandler = (url) => {};
            // Act
            service.logoffAndRevokeTokens(urlHandler).subscribe(() => {
                // Assert
                expect(logoffSpy).toHaveBeenCalledWith(urlHandler);
            });
        }));

        it('calls revokeAccessToken when storage does not hold a refreshtoken', async(() => {
            // Arrange
            spyOn(storagePersistanceService, 'getRefreshToken').and.returnValue(null);
            const revokeRefreshTokenSpy = spyOn(service, 'revokeRefreshToken');
            const revokeAccessTokenSpy = spyOn(service, 'revokeAccessToken').and.returnValue(of({ any: 'thing' }));

            // Act
            service.logoffAndRevokeTokens().subscribe(() => {
                // Assert
                expect(revokeRefreshTokenSpy).not.toHaveBeenCalled();
                expect(revokeAccessTokenSpy).toHaveBeenCalled();
            });
        }));

        it('loggs error when revokeaccesstoken throws an error', async(() => {
            // Arrange
            spyOn(storagePersistanceService, 'getRefreshToken').and.returnValue(null);
            const loggerSpy = spyOn(loggerService, 'logError');
            spyOn(service, 'revokeAccessToken').and.returnValue(throwError('FAILUUURE'));

            // Act
            service.logoffAndRevokeTokens().subscribe({
                error: (err) => {
                    expect(loggerSpy).toHaveBeenCalled();
                    expect(err).toBeTruthy();
                },
            });
        }));
    });
});
