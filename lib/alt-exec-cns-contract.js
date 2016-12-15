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

var utils = require('./utils'),
    ethUtil = require('ethereumjs-util'),
    AltExecCnsParams = require('./alt-exec-cns-params'),
    request = require('superagent'),
    Account = require('./account');

var AltExecCnsContract = function(account) {
    this.account = account;
};

var requestPostTransaction = function(baseUrl, input, sign) {
    return new Promise(function(resolve, reject) {
        request
            .post(baseUrl + '/alt/cns/transaction')
            .send({ 'input': input, 'sign': sign })
            .end(function(err, res) {
                if (err) {
                    if (res && res.body.code === 1) {
                        reject(res.body.message);
                    } else {
                        reject(err);
                    }
                } else {
                    resolve(res.body.txHash);
                }
            });
    });
};

var requestGetCall = function(baseUrl, input, sign) {
    return new Promise(function(resolve, reject) {
        request
            .get(baseUrl + '/alt/cns/call')
            .query({ 'input': input, 'sign': sign })
            .end(function(err, res) {
                if (err) {
                    if (res && res.body.code === 1) {
                        reject(res.body.message);
                    } else {
                        reject(err);
                    }
                } else {
                    resolve(res.body.result);
                }
            });
    });
};

var requestPostData = function(baseUrl, input, sign, data) {
    return new Promise(function(resolve, reject) {
        request
            .post(baseUrl + '/alt/cns/data')
            .send({ 'input': input, 'data': data, 'sign': sign })
            .end(function(err, res) {
                if (err) {
                    if (res && res.body.code === 1) {
                        reject(res.body.message);
                    } else {
                        reject(err);
                    }
                } else {
                    resolve(res.body.txHash);
                }
            });
    });
};

var requestGetData = function(baseUrl, input, sign) {
    return new Promise(function(resolve, reject) {
        request
            .get(baseUrl + '/alt/cns/data')
            .query({ 'input': input, 'sign': sign })
            .end(function(err, res) {
                if (err) {
                    if (res && res.body.code === 1) {
                        reject(res.body.message);
                    } else {
                        reject(err);
                    }
                } else {
                    resolve(res.body.result);
                }
            });
    });
};

var requestGetTransactionReceipt = function(baseUrl, txHash) {
    return new Promise(function(resolve, reject) {
        request
            .get(baseUrl + '/alt/cns/transactionReceipt/' + txHash)
            .end(function(err, res) {
                if (err) {
                    if (res && res.body.code === 1) {
                        reject(res.body.message);
                    } else {
                        reject(err);
                    }
                } else {
                    resolve(res.body.result);
                }
            });
    });
};

AltExecCnsContract.prototype.call = function(password, cnsAddress, contractName, functionName, params, abi, callback) {
    try {
        const url = this.account.baseUrl;
        const keystore = this.account.keystore;
        const from = this.account.getAddress();

        var altParams = new AltExecCnsParams(cnsAddress, contractName, functionName, params);
        altParams.setTypesFromAbi(abi);
        const hash = altParams.getHashedParams();
        const input = altParams.getInput();

        this.account.keyFromPassword(password).then(function(pwDerivedKey) {
            return utils.sign(keystore, pwDerivedKey, hash, from);
        }).then(function(sign) {
            return requestGetCall(url, input, sign);
        }).then(function(result) {
            callback(null, utils.decodeResult(abi, functionName, result));
        }).catch(function(err) {
            callback(err);
        });
    } catch (err) {
        callback(err);
    }
};

AltExecCnsContract.prototype.sendTransaction = function(password, cnsAddress, contractName, functionName, params, abi, callback) {
    try {
        const url = this.account.baseUrl;
        const keystore = this.account.keystore;
        const from = this.account.getAddress();

        var altParams = new AltExecCnsParams(cnsAddress, contractName, functionName, params);
        altParams.setTypesFromAbi(abi);
        const hash = altParams.getHashedParams();
        const input = altParams.getInput();

        this.account.keyFromPassword(password).then(function(pwDerivedKey) {
            return utils.sign(keystore, pwDerivedKey, hash, from);
        }).then(function(sign) {
            return requestPostTransaction(url, input, sign);
        }).then(function(result) {
            callback(null, result);
        }).catch(function(err) {
            callback(err);
        });
    } catch (err) {
        callback(err);
    }
};

AltExecCnsContract.prototype.getData = function(password, cnsAddress, contractName, functionName, params, abi, callback) {
    try {
        const url = this.account.baseUrl;
        const keystore = this.account.keystore;
        const from = this.account.getAddress();

        var altParams = new AltExecCnsParams(cnsAddress, contractName, functionName, params);
        altParams.setTypesFromAbi(abi);
        const hash = altParams.getHashedParams();
        const input = altParams.getInput();

        this.account.keyFromPassword(password).then(function(pwDerivedKey) {
            return utils.sign(keystore, pwDerivedKey, hash, from);
        }).then(function(sign) {
            return requestGetData(url, input, sign);
        }).then(function(result) {
            callback(null, result);
        }).catch(function(err) {
            callback(err);
        });
    } catch (err) {
        callback(err);
    }
};

AltExecCnsContract.prototype.sendData = function(password, cnsAddress, contractName, functionName, objectId, data, params, abi, callback) {
    try {
        const url = this.account.baseUrl;
        const keystore = this.account.keystore;
        const from = this.account.getAddress();
        const dataHash = ethUtil.addHexPrefix(utils.hash(data));

        var altParams = new AltExecCnsParams(cnsAddress, contractName, functionName, params);
        altParams.setObject(objectId, dataHash);
        altParams.setTypesFromAbi(abi);
        const hash = altParams.getHashedParams();
        const input = altParams.getInput();

        this.account.keyFromPassword(password).then(function(pwDerivedKey) {
            return utils.sign(keystore, pwDerivedKey, hash, from);
        }).then(function(sign) {
            return requestPostData(url, input, sign, data);
        }).then(function(result) {
            callback(null, result);
        }).catch(function(err) {
            callback(err);
        });
    } catch (err) {
        callback(err);
    }
};

AltExecCnsContract.prototype.getTransactionReceipt = function(txHash, callback) {
    try {
        const url = this.account.baseUrl;
        requestGetTransactionReceipt(url, txHash).then(function(result) {
            callback(null, result);
        }).catch(function(err) {
            callback(err);
        });
    } catch (err) {
        callback(err);
    }
};

module.exports = AltExecCnsContract;
