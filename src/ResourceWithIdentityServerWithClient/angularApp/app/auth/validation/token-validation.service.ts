﻿import { Injectable } from '@angular/core';
import { hextob64u, KEYUTIL, KJUR } from 'jsrsasign-reduced';
import { LoggerService } from '../logging/logger.service';
import { FlowHelper } from '../utils/flowHelper/flow-helper.service';
import { TokenHelperService } from '../utils/tokenHelper/oidc-token-helper.service';

// http://openid.net/specs/openid-connect-implicit-1_0.html

// id_token
// id_token C1: The Issuer Identifier for the OpenID Provider (which is typically obtained during Discovery)
// MUST exactly match the value of the iss (issuer) Claim.
//
// id_token C2: The Client MUST validate that the aud (audience) Claim contains its client_id value registered at the Issuer identified
// by the iss (issuer) Claim as an audience.The ID Token MUST be rejected if the ID Token does not list the Client as a valid audience,
// or if it contains additional audiences not trusted by the Client.
//
// id_token C3: If the ID Token contains multiple audiences, the Client SHOULD verify that an azp Claim is present.
//
// id_token C4: If an azp (authorized party) Claim is present, the Client SHOULD verify that its client_id is the Claim Value.
//
// id_token C5: The Client MUST validate the signature of the ID Token according to JWS [JWS] using the algorithm specified in the
// alg Header Parameter of the JOSE Header.The Client MUST use the keys provided by the Issuer.
//
// id_token C6: The alg value SHOULD be RS256. Validation of tokens using other signing algorithms is described in the OpenID Connect
// Core 1.0
// [OpenID.Core] specification.
//
// id_token C7: The current time MUST be before the time represented by the exp Claim (possibly allowing for some small leeway to account
// for clock skew).
//
// id_token C8: The iat Claim can be used to reject tokens that were issued too far away from the current time,
// limiting the amount of time that nonces need to be stored to prevent attacks.The acceptable range is Client specific.
//
// id_token C9: The value of the nonce Claim MUST be checked to verify that it is the same value as the one that was sent
// in the Authentication Request.The Client SHOULD check the nonce value for replay attacks.The precise method for detecting replay attacks
// is Client specific.
//
// id_token C10: If the acr Claim was requested, the Client SHOULD check that the asserted Claim Value is appropriate.
// The meaning and processing of acr Claim Values is out of scope for this document.
//
// id_token C11: When a max_age request is made, the Client SHOULD check the auth_time Claim value and request re- authentication
// if it determines too much time has elapsed since the last End- User authentication.

// Access Token Validation
// access_token C1: Hash the octets of the ASCII representation of the access_token with the hash algorithm specified in JWA[JWA]
// for the alg Header Parameter of the ID Token's JOSE Header. For instance, if the alg is RS256, the hash algorithm used is SHA-256.
// access_token C2: Take the left- most half of the hash and base64url- encode it.
// access_token C3: The value of at_hash in the ID Token MUST match the value produced in the previous step if at_hash is present
// in the ID Token.

@Injectable()
export class TokenValidationService {
    static RefreshTokenNoncePlaceholder = '--RefreshToken--';
    keyAlgorithms: string[] = ['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'PS256', 'PS384', 'PS512'];
    constructor(private tokenHelperService: TokenHelperService, private flowHelper: FlowHelper, private loggerService: LoggerService) {}

    // id_token C7: The current time MUST be before the time represented by the exp Claim
    // (possibly allowing for some small leeway to account for clock skew).
    hasIdTokenExpired(token: string, offsetSeconds?: number): boolean {
        let decoded: any;
        decoded = this.tokenHelperService.getPayloadFromToken(token, false);

        return !this.validateIdTokenExpNotExpired(decoded, offsetSeconds);
    }

    // id_token C7: The current time MUST be before the time represented by the exp Claim
    // (possibly allowing for some small leeway to account for clock skew).
    validateIdTokenExpNotExpired(decodedIdToken: string, offsetSeconds?: number): boolean {
        const tokenExpirationDate = this.tokenHelperService.getTokenExpirationDate(decodedIdToken);
        offsetSeconds = offsetSeconds || 0;

        if (!tokenExpirationDate) {
            return false;
        }

        const tokenExpirationValue = tokenExpirationDate.valueOf();
        const nowWithOffset = new Date().valueOf() + offsetSeconds * 1000;
        const tokenNotExpired = tokenExpirationValue > nowWithOffset;

        this.loggerService.logDebug(`Has id_token expired: ${!tokenNotExpired}, ${tokenExpirationValue} > ${nowWithOffset}`);

        // Token not expired?
        return tokenNotExpired;
    }

    validateAccessTokenNotExpired(accessTokenExpiresAt: Date, offsetSeconds?: number): boolean {
        // value is optional, so if it does not exist, then it has not expired
        if (!accessTokenExpiresAt) {
            return true;
        }

        offsetSeconds = offsetSeconds || 0;
        const accessTokenExpirationValue = accessTokenExpiresAt.valueOf();
        const nowWithOffset = new Date().valueOf() + offsetSeconds * 1000;
        const tokenNotExpired = accessTokenExpirationValue > nowWithOffset;

        this.loggerService.logDebug(`Has access_token expired: ${!tokenNotExpired}, ${accessTokenExpirationValue} > ${nowWithOffset}`);

        // access token not expired?
        return tokenNotExpired;
    }

    // iss
    // REQUIRED. Issuer Identifier for the Issuer of the response.The iss value is a case-sensitive URL using the
    // https scheme that contains scheme, host,
    // and optionally, port number and path components and no query or fragment components.
    //
    // sub
    // REQUIRED. Subject Identifier.Locally unique and never reassigned identifier within the Issuer for the End- User,
    // which is intended to be consumed by the Client, e.g., 24400320 or AItOawmwtWwcT0k51BayewNvutrJUqsvl6qs7A4.
    // It MUST NOT exceed 255 ASCII characters in length.The sub value is a case-sensitive string.
    //
    // aud
    // REQUIRED. Audience(s) that this ID Token is intended for. It MUST contain the OAuth 2.0 client_id of the Relying Party as an
    // audience value.
    // It MAY also contain identifiers for other audiences.In the general case, the aud value is an array of case-sensitive strings.
    // In the common special case when there is one audience, the aud value MAY be a single case-sensitive string.
    //
    // exp
    // REQUIRED. Expiration time on or after which the ID Token MUST NOT be accepted for processing.
    // The processing of this parameter requires that the current date/ time MUST be before the expiration date/ time listed in the value.
    // Implementers MAY provide for some small leeway, usually no more than a few minutes, to account for clock skew.
    // Its value is a JSON [RFC7159] number representing the number of seconds from 1970- 01 - 01T00: 00:00Z as measured in UTC until
    // the date/ time.
    // See RFC 3339 [RFC3339] for details regarding date/ times in general and UTC in particular.
    //
    // iat
    // REQUIRED. Time at which the JWT was issued. Its value is a JSON number representing the number of seconds from
    // 1970- 01 - 01T00: 00: 00Z as measured
    // in UTC until the date/ time.
    validateRequiredIdToken(dataIdToken: any): boolean {
        let validated = true;
        if (!dataIdToken.hasOwnProperty('iss')) {
            validated = false;
            this.loggerService.logWarning('iss is missing, this is required in the id_token');
        }

        if (!dataIdToken.hasOwnProperty('sub')) {
            validated = false;
            this.loggerService.logWarning('sub is missing, this is required in the id_token');
        }

        if (!dataIdToken.hasOwnProperty('aud')) {
            validated = false;
            this.loggerService.logWarning('aud is missing, this is required in the id_token');
        }

        if (!dataIdToken.hasOwnProperty('exp')) {
            validated = false;
            this.loggerService.logWarning('exp is missing, this is required in the id_token');
        }

        if (!dataIdToken.hasOwnProperty('iat')) {
            validated = false;
            this.loggerService.logWarning('iat is missing, this is required in the id_token');
        }

        return validated;
    }

    // id_token C8: The iat Claim can be used to reject tokens that were issued too far away from the current time,
    // limiting the amount of time that nonces need to be stored to prevent attacks.The acceptable range is Client specific.
    validateIdTokenIatMaxOffset(dataIdToken: any, maxOffsetAllowedInSeconds: number, disableIatOffsetValidation: boolean): boolean {
        if (disableIatOffsetValidation) {
            return true;
        }

        if (!dataIdToken.hasOwnProperty('iat')) {
            return false;
        }

        const dateTimeIatIdToken = new Date(0); // The 0 here is the key, which sets the date to the epoch
        dateTimeIatIdToken.setUTCSeconds(dataIdToken.iat);

        maxOffsetAllowedInSeconds = maxOffsetAllowedInSeconds || 0;

        if (dateTimeIatIdToken == null) {
            return false;
        }

        this.loggerService.logDebug(
            'validate_id_token_iat_max_offset: ' +
                (new Date().valueOf() - dateTimeIatIdToken.valueOf()) +
                ' < ' +
                maxOffsetAllowedInSeconds * 1000
        );

        const diff = new Date().valueOf() - dateTimeIatIdToken.valueOf();
        if (diff > 0) {
            return diff < maxOffsetAllowedInSeconds * 1000;
        }

        return -diff < maxOffsetAllowedInSeconds * 1000;
    }

    // id_token C9: The value of the nonce Claim MUST be checked to verify that it is the same value as the one
    // that was sent in the Authentication Request.The Client SHOULD check the nonce value for replay attacks.
    // The precise method for detecting replay attacks is Client specific.

    // However the nonce claim SHOULD not be present for the refesh_token grant type
    // https://bitbucket.org/openid/connect/issues/1025/ambiguity-with-how-nonce-is-handled-on
    // The current spec is ambiguous and Keycloak does send it.
    validateIdTokenNonce(dataIdToken: any, localNonce: any, ignoreNonceAfterRefresh: boolean): boolean {
        const isFromRefreshToken =
            (dataIdToken.nonce === undefined || ignoreNonceAfterRefresh) &&
            localNonce === TokenValidationService.RefreshTokenNoncePlaceholder;
        if (!isFromRefreshToken && dataIdToken.nonce !== localNonce) {
            this.loggerService.logDebug(
                'Validate_id_token_nonce failed, dataIdToken.nonce: ' + dataIdToken.nonce + ' local_nonce:' + localNonce
            );
            return false;
        }

        return true;
    }

    // id_token C1: The Issuer Identifier for the OpenID Provider (which is typically obtained during Discovery)
    // MUST exactly match the value of the iss (issuer) Claim.
    validateIdTokenIss(dataIdToken: any, authWellKnownEndpointsIssuer: any): boolean {
        if ((dataIdToken.iss as string) !== (authWellKnownEndpointsIssuer as string)) {
            this.loggerService.logDebug(
                'Validate_id_token_iss failed, dataIdToken.iss: ' +
                    dataIdToken.iss +
                    ' authWellKnownEndpoints issuer:' +
                    authWellKnownEndpointsIssuer
            );
            return false;
        }

        return true;
    }

    // id_token C2: The Client MUST validate that the aud (audience) Claim contains its client_id value registered at the Issuer identified
    // by the iss (issuer) Claim as an audience.
    // The ID Token MUST be rejected if the ID Token does not list the Client as a valid audience, or if it contains additional audiences
    // not trusted by the Client.
    validateIdTokenAud(dataIdToken: any, aud: any): boolean {
        if (Array.isArray(dataIdToken.aud)) {
            // const result = this.arrayHelperService.areEqual(dataIdToken.aud, aud);
            const result = dataIdToken.aud.includes(aud);

            if (!result) {
                this.loggerService.logDebug(
                    'Validate_id_token_aud array failed, dataIdToken.aud: ' + dataIdToken.aud + ' client_id:' + aud
                );
                return false;
            }

            return true;
        } else if (dataIdToken.aud !== aud) {
            this.loggerService.logDebug('Validate_id_token_aud failed, dataIdToken.aud: ' + dataIdToken.aud + ' client_id:' + aud);

            return false;
        }

        return true;
    }

    validateIdTokenAzpExistsIfMoreThanOneAud(dataIdToken: any): boolean {
        if (Array.isArray(dataIdToken.aud) && dataIdToken.aud.length > 1 && !dataIdToken?.azp) {
            return false;
        }

        return true;
    }
    // If an azp (authorized party) Claim is present, the Client SHOULD verify that its client_id is the Claim Value.
    validateIdTokenAzpValid(dataIdToken: any, clientId: string): boolean {
        if (!dataIdToken?.azp) {
            return true;
        }

        if (dataIdToken.azp === clientId) {
            return true;
        }

        return false;
    }

    validateStateFromHashCallback(state: any, localState: any): boolean {
        if ((state as string) !== (localState as string)) {
            this.loggerService.logDebug('ValidateStateFromHashCallback failed, state: ' + state + ' local_state:' + localState);
            return false;
        }

        return true;
    }

    // id_token C5: The Client MUST validate the signature of the ID Token according to JWS [JWS] using the algorithm specified in the alg
    // Header Parameter of the JOSE Header.The Client MUST use the keys provided by the Issuer.
    // id_token C6: The alg value SHOULD be RS256. Validation of tokens using other signing algorithms is described in the
    // OpenID Connect Core 1.0 [OpenID.Core] specification.
    validateSignatureIdToken(idToken: any, jwtkeys: any): boolean {
        if (!jwtkeys || !jwtkeys.keys) {
            return false;
        }

        const headerData = this.tokenHelperService.getHeaderFromToken(idToken, false);

        if (Object.keys(headerData).length === 0 && headerData.constructor === Object) {
            this.loggerService.logWarning('id token has no header data');
            return false;
        }

        const kid = headerData.kid;
        const alg = headerData.alg;

        if (!this.keyAlgorithms.includes(alg as string)) {
            this.loggerService.logWarning('alg not supported', alg);
            return false;
        }

        let jwtKtyToUse = 'RSA';
        if ((alg as string).charAt(0) === 'E') {
            jwtKtyToUse = 'EC';
        }

        let isValid = false;

        if (!headerData.hasOwnProperty('kid')) {
            // exactly 1 key in the jwtkeys and no kid in the Jose header
            // kty	"RSA" or EC use "sig"
            let amountOfMatchingKeys = 0;
            for (const key of jwtkeys.keys) {
                if ((key.kty as string) === jwtKtyToUse && (key.use as string) === 'sig') {
                    amountOfMatchingKeys = amountOfMatchingKeys + 1;
                }
            }

            if (amountOfMatchingKeys === 0) {
                this.loggerService.logWarning('no keys found, incorrect Signature, validation failed for id_token');
                return false;
            }

            if (amountOfMatchingKeys > 1) {
                this.loggerService.logWarning('no ID Token kid claim in JOSE header and multiple supplied in jwks_uri');
                return false;
            }

            for (const key of jwtkeys.keys) {
                if ((key.kty as string) === jwtKtyToUse && (key.use as string) === 'sig') {
                    const publickey = KEYUTIL.getKey(key);
                    isValid = KJUR.jws.JWS.verify(idToken, publickey, [alg]);
                    if (!isValid) {
                        this.loggerService.logWarning('incorrect Signature, validation failed for id_token');
                    }
                    return isValid;
                }
            }
        } else {
            // kid in the Jose header of id_token
            for (const key of jwtkeys.keys) {
                if ((key.kid as string) === (kid as string)) {
                    const publickey = KEYUTIL.getKey(key);
                    isValid = KJUR.jws.JWS.verify(idToken, publickey, [alg]);
                    if (!isValid) {
                        this.loggerService.logWarning('incorrect Signature, validation failed for id_token');
                    }
                    return isValid;
                }
            }
        }

        return isValid;
    }

    configValidateResponseType(responseType: string): boolean {
        if (this.flowHelper.isCurrentFlowAnyImplicitFlow()) {
            return true;
        }

        if (this.flowHelper.isCurrentFlowCodeFlow()) {
            return true;
        }

        this.loggerService.logWarning('module configure incorrect, invalid response_type:' + responseType);
        return false;
    }

    // Accepts ID Token without 'kid' claim in JOSE header if only one JWK supplied in 'jwks_url'
    //// private validate_no_kid_in_header_only_one_allowed_in_jwtkeys(header_data: any, jwtkeys: any): boolean {
    ////    this.oidcSecurityCommon.logDebug('amount of jwtkeys.keys: ' + jwtkeys.keys.length);
    ////    if (!header_data.hasOwnProperty('kid')) {
    ////        // no kid defined in Jose header
    ////        if (jwtkeys.keys.length != 1) {
    ////            this.oidcSecurityCommon.logDebug('jwtkeys.keys.length != 1 and no kid in header');
    ////            return false;
    ////        }
    ////    }

    ////    return true;
    //// }

    // Access Token Validation
    // access_token C1: Hash the octets of the ASCII representation of the access_token with the hash algorithm specified in JWA[JWA]
    // for the alg Header Parameter of the ID Token's JOSE Header. For instance, if the alg is RS256, the hash algorithm used is SHA-256.
    // access_token C2: Take the left- most half of the hash and base64url- encode it.
    // access_token C3: The value of at_hash in the ID Token MUST match the value produced in the previous step if at_hash
    // is present in the ID Token.
    validateIdTokenAtHash(accessToken: any, atHash: any, idTokenAlg: string): boolean {
        this.loggerService.logDebug('at_hash from the server:' + atHash);

        // 'sha256' 'sha384' 'sha512'
        let sha = 'sha256';
        if (idTokenAlg.includes('384')) {
            sha = 'sha384';
        } else if (idTokenAlg.includes('512')) {
            sha = 'sha512';
        }

        const testdata = this.generateAtHash('' + accessToken, sha);
        this.loggerService.logDebug('at_hash client validation not decoded:' + testdata);
        if (testdata === (atHash as string)) {
            return true; // isValid;
        } else {
            const testValue = this.generateAtHash('' + decodeURIComponent(accessToken), sha);
            this.loggerService.logDebug('-gen access--' + testValue);
            if (testValue === (atHash as string)) {
                return true; // isValid
            }
        }

        return false;
    }

    private generateAtHash(accessToken: any, sha: string): string {
        const hash = KJUR.crypto.Util.hashString(accessToken, sha);
        const first128bits = hash.substr(0, hash.length / 2);
        const testdata = hextob64u(first128bits);

        return testdata;
    }

    generateCodeVerifier(codeChallenge: any): string {
        const hash = KJUR.crypto.Util.hashString(codeChallenge, 'sha256');
        const testdata = hextob64u(hash);

        return testdata;
    }
}
