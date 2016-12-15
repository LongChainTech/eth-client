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
    ethutils = require('ethereumjs-util');

var Account = function(baseUrl) {
    this.keystore = getKeystore();
    if (!baseUrl) throw 'do not set base url';
    if (baseUrl.slice(-1) === '/') baseUrl.substr
    this.baseUrl = (baseUrl.slice(-1) === '/')? baseUrl.slice(0, -1) : baseUrl;
};

Account.prototype.register = function(password, callback) {
    var _this = this;

    lightwallet.keystore.createVault({ password: password, seddPhrase: lightwallet.keystore.generateRandomSeed() }, function(err, ks) {
        ks.keyFromPassword(password, function(err, pwDerivedKey) {
            if (err) callback(err);
            try {
                ks.generateNewAddress(pwDerivedKey, 1);
                _this.keystore = ks;
                localStorage.setItem('keystore', ks.serialize());
                var address = ethutils.addHexPrefix(ks.getAddresses()[0]);
                callback(null, address);
            } catch (e) {
                console.error(e);
                callback(e);
            }
        });
    });
};

Account.prototype.login = function(password, callback) {
    var _this = this;
    if (_this.keystore === null) {
        callback('keystore is nothing', null);
        return;
    }

    _this.keystore.keyFromPassword(password, function(err, pwDerivedKey) {
        if (err) callback(err);

        if (!_this.keystore.isDerivedKeyCorrect(pwDerivedKey)) {
            callback('incorrect password', null);
            return;
        }
        var address = _this.getAddress();
        callback(null, address);
    });
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

var getKeystore = function() {
    var serializedKeystore = localStorage.getItem('keystore');
    if (serializedKeystore === null) {
        return null;
    }
    return lightwallet.keystore.deserialize(serializedKeystore);
};

module.exports = Account;
