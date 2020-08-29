import { HttpClientModule } from '@angular/common/http';
import { async, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { ConfigurationProvider } from '../config/config.provider';
import { ConfigurationProviderMock } from '../config/config.provider-mock';
import { FlowsDataService } from '../flows/flows-data.service';
import { FlowsDataServiceMock } from '../flows/flows-data.service-mock';
import { FlowsService } from '../flows/flows.service';
import { FlowsServiceMock } from '../flows/flows.service-mock';
import { JwtKeys } from '../validation/jwtkeys';
import { CodeFlowCallbackService } from './code-flow-callback.service';
import { IntervallService } from './intervall.service';

describe('CodeFlowCallbackService ', () => {
    let codeFlowCallbackService: CodeFlowCallbackService;
    let intervallService: IntervallService;
    let flowsService: FlowsService;
    let configurationProvider: ConfigurationProvider;
    let flowsDataService: FlowsDataService;
    let router;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientModule, RouterTestingModule],
            providers: [
                CodeFlowCallbackService,
                { provide: FlowsService, useClass: FlowsServiceMock },
                { provide: FlowsDataService, useClass: FlowsDataServiceMock },
                IntervallService,
                { provide: ConfigurationProvider, useClass: ConfigurationProviderMock },
            ],
        });
    });

    beforeEach(() => {
        codeFlowCallbackService = TestBed.inject(CodeFlowCallbackService);
        configurationProvider = TestBed.inject(ConfigurationProvider);
        intervallService = TestBed.inject(IntervallService);
        flowsDataService = TestBed.inject(FlowsDataService);
        flowsService = TestBed.inject(FlowsService);
        router = TestBed.inject(Router);
    });

    it('should create', () => {
        expect(codeFlowCallbackService).toBeTruthy();
    });

    describe('authorizedCallbackWithCode', () => {
        it('calls flowsService.processCodeFlowCallback with correct url', () => {
            const spy = spyOn(flowsService, 'processCodeFlowCallback').and.returnValue(of(null));
            codeFlowCallbackService.authorizedCallbackWithCode('some-url');
            expect(spy).toHaveBeenCalledWith('some-url');
        });

        it('does nothing if triggerAuthorizationResultEvent is true and isRenewProcess is true', async(() => {
            const callbackContext = {
                code: '',
                refreshToken: '',
                state: '',
                sessionState: null,
                authResult: null,
                isRenewProcess: true,
                jwtKeys: new JwtKeys(),
                validationResult: null,
                existingIdToken: '',
            };
            const spy = spyOn(flowsService, 'processCodeFlowCallback').and.returnValue(of(callbackContext));
            const routerSpy = spyOn(router, 'navigate');
            spyOnProperty(configurationProvider, 'openIDConfiguration').and.returnValue({ triggerAuthorizationResultEvent: true });
            codeFlowCallbackService.authorizedCallbackWithCode('some-url').subscribe(() => {
                expect(spy).toHaveBeenCalledWith('some-url');
                expect(routerSpy).not.toHaveBeenCalled();
            });
        }));

        it('calls router if triggerAuthorizationResultEvent is false and isRenewProcess is false', async(() => {
            const callbackContext = {
                code: '',
                refreshToken: '',
                state: '',
                sessionState: null,
                authResult: null,
                isRenewProcess: false,
                jwtKeys: new JwtKeys(),
                validationResult: null,
                existingIdToken: '',
            };
            const spy = spyOn(flowsService, 'processCodeFlowCallback').and.returnValue(of(callbackContext));
            const routerSpy = spyOn(router, 'navigate');
            spyOnProperty(configurationProvider, 'openIDConfiguration').and.returnValue({
                triggerAuthorizationResultEvent: false,
                postLoginRoute: 'postLoginRoute',
            });
            codeFlowCallbackService.authorizedCallbackWithCode('some-url').subscribe(() => {
                expect(spy).toHaveBeenCalledWith('some-url');
                expect(routerSpy).toHaveBeenCalledWith(['postLoginRoute']);
            });
        }));

        it('resetSilentRenewRunning and stopPeriodicallTokenCheck in case of error', async(() => {
            spyOn(flowsService, 'processCodeFlowCallback').and.returnValue(throwError('error'));
            const resetSilentRenewRunningSpy = spyOn(flowsDataService, 'resetSilentRenewRunning');
            const stopPeriodicallTokenCheckSpy = spyOn(intervallService, 'stopPeriodicallTokenCheck');

            spyOnProperty(configurationProvider, 'openIDConfiguration').and.returnValue({
                triggerAuthorizationResultEvent: false,
                postLoginRoute: 'postLoginRoute',
            });
            codeFlowCallbackService.authorizedCallbackWithCode('some-url').subscribe({
                error: (err) => {
                    expect(resetSilentRenewRunningSpy).toHaveBeenCalled();
                    expect(stopPeriodicallTokenCheckSpy).toHaveBeenCalled();
                    expect(err).toBeTruthy();
                },
            });
        }));

        it(`navigates to unauthorizedRoute in case of error and  in case of error and
            triggerAuthorizationResultEvent is false`, async(() => {
            spyOn(flowsDataService, 'isSilentRenewRunning').and.returnValue(false);
            spyOn(flowsService, 'processCodeFlowCallback').and.returnValue(throwError('error'));
            const resetSilentRenewRunningSpy = spyOn(flowsDataService, 'resetSilentRenewRunning');
            const stopPeriodicallTokenCheckSpy = spyOn(intervallService, 'stopPeriodicallTokenCheck');
            const routerSpy = spyOn(router, 'navigate');

            spyOnProperty(configurationProvider, 'openIDConfiguration').and.returnValue({
                triggerAuthorizationResultEvent: false,
                unauthorizedRoute: 'unauthorizedRoute',
            });
            codeFlowCallbackService.authorizedCallbackWithCode('some-url').subscribe({
                error: (err) => {
                    expect(resetSilentRenewRunningSpy).toHaveBeenCalled();
                    expect(stopPeriodicallTokenCheckSpy).toHaveBeenCalled();
                    expect(err).toBeTruthy();
                    expect(routerSpy).toHaveBeenCalledWith(['unauthorizedRoute']);
                },
            });
        }));
    });
});
