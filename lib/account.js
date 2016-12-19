/**
 * Copyright 2016 GMO Internet, Inc
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var lightwallet = require('eth-lightwallet'),
    ethutils = require('ethereumjs-util'),
    ethClientUtils = require('./utils');

var Account = function(baseUrl, keystore) {
    if (!baseUrl) throw 'do not set base url';
    if (!keystore) throw 'do not set keystore';

    if (baseUrl.slice(-1) === '/') baseUrl.substr
    this.baseUrl = (baseUrl.slice(-1) === '/') ? baseUrl.slice(0, -1) : baseUrl;
    this.keystore = keystore;
};

Account.create = function(baseUrl, password, callback) {
    lightwallet.keystore.createVault({ password: password, seddPhrase: lightwallet.keystore.generateRandomSeed() }, function(err, ks) {
        ks.keyFromPassword(password, function(err, pwDerivedKey) {
            if (err) callback(err);
            try {
                ks.generateNewAddress(pwDerivedKey, 1);
                var account = new Account(baseUrl, ks);
                callback(null, account);
            } catch (e) {
                console.error(e);
                callback(e);
            }
        });
    });
};

Account.prototype.serialize = function() {
    var jsonAccount = { keystore: this.keystore.serialize(), baseUrl: this.baseUrl };
    return JSON.stringify(jsonAccount);
};

Account.deserialize = function(serializedAccount) {
    var jsonAccount = JSON.parse(serializedAccount);
    var keystore = lightwallet.keystore.deserialize(jsonAccount.keystore);
    var baseUrl = jsonAccount.baseUrl;
    return new Account(baseUrl, keystore);
};

Account.prototype.getAddress = function() {
    if (this.keystore === null) {
        return null;
    }
    return ethutils.addHexPrefix(this.keystore.getAddresses()[0]);
};

Account.prototype.keyFromPassword = function(password) {
    var _this = this;
    return new Promise(function(resolve, reject) {
        _this.keystore.keyFromPassword(password, function(err, pwDerivedKey) {
            if (err) reject(err);
            else resolve(pwDerivedKey);
        });
    });
};

Account.prototype.sign = function(password, hash, callback) {
    try {
        var _this = this;

        var retPromise = _this.keyFromPassword(password).then(function(pwDerivedKey) {
            return ethClientUtils.sign(_this.keystore, pwDerivedKey, hash, _this.getAddress());
        });
        if (typeof callback === 'function') {
            retPromise.then(function(sign) {
                callback(null, sign);
            }).catch(function(err) {
                callback(err);
            });
        } else {
            return retPromise;
        }
    } catch (err) {
        callback(err);
    }

};

module.exports = Account;
