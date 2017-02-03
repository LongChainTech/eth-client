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

const utils = require('./utils'),
    ethUtil = require('ethereumjs-util'),
    AltExecCnsParams = require('./alt-exec-cns-params'),
    request = require('superagent');
const MAX_FILE_SIZE = 20 * 1000 * 1000;

const AltExecCnsContract = function(account, cnsAddress) {
    this.account = account;
    this.cnsAddress = cnsAddress;
};

const requestPostTransaction = function(baseUrl, input, sign) {
    return new Promise(function(resolve, reject) {
        request
            .post(baseUrl + '/alt/cns/transaction')
            .send({ input: input, sign: sign })
            .end(function(err, res) {
                if (err) {
                    if (res && res.body && res.body.code === 1) {
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

const requestGetCall = function(baseUrl, input, sign) {
    return new Promise(function(resolve, reject) {
        request
            .get(baseUrl + '/alt/cns/call')
            .query({ input: input, sign: sign })
            .end(function(err, res) {
                if (err) {
                    if (res && res.body && res.body.code === 1) {
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

const requestPostData = function(baseUrl, input, sign, data) {
    return new Promise(function(resolve, reject) {
        request
            .post(baseUrl + '/alt/cns/data')
            .send({ input: input, data: data, sign: sign })
            .end(function(err, res) {
                if (err) {
                    if (res && res.body && res.body.code === 1) {
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

const requestPutData = function(baseUrl, input, sign, data) {
    return new Promise(function(resolve, reject) {
        request
            .put(baseUrl + '/alt/cns/data')
            .send({ input: input, data: data, sign: sign })
            .end(function(err, res) {
                if (err) {
                    if (res && res.body && res.body.code === 1) {
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

const requestGetData = function(baseUrl, input, sign) {
    return new Promise(function(resolve, reject) {
        request
            .get(baseUrl + '/alt/cns/data')
            .query({ input: input, sign: sign })
            .end(function(err, res) {
                if (err) {
                    if (res && res.body && res.body.code === 1) {
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

const requestPostFile = function(baseUrl, input, sign, data, file) {
    return new Promise(function(resolve, reject) {
        request
            .post(baseUrl + '/alt/cns/file')
            .attach(file.name, file)
            .field('input', JSON.stringify(input))
            .field('sign', sign)
            .field('data', data)
            .end(function(err, res) {
                if (err) {
                    if (res && res.body && res.body.code === 1) {
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

const requestPutFile = function(baseUrl, input, sign, file) {
    return new Promise(function(resolve, reject) {
        request
            .put(baseUrl + '/alt/cns/file')
            .attach(file.name, file)
            .field('input', JSON.stringify(input))
            .field('sign', sign)
            .end(function(err, res) {
                if (err) {
                    if (res && res.body && res.body.code === 1) {
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

const requestGetFile = function(baseUrl, input, sign) {
    return new Promise(function(resolve, reject) {
        request
            .get(baseUrl + '/alt/cns/file')
            .query({ input: input, sign: sign })
            .responseType('blob')
            .end(function(err, res) {
                if (err) {
                    const reader = new FileReader();
                    reader.addEventListener('loadend', function() {
                        const resBody = JSON.parse(reader.result);
                        if (resBody && resBody.code === 1) {
                            reject(resBody.message);
                        } else {
                            reject(err);
                        }
                    });
                    reader.readAsText(res.xhr.response);
                } else {
                    const fileName = res.header['content-disposition'].match(new RegExp('filename=\"(.+)\"'))[1];
                    const type = res.header['content-type'];
                    const file = new File([res.xhr.response], fileName, { type: type });
                    resolve(file);
                }
            });
    });
};

const requestGetTransactionReceipt = function(baseUrl, txHash) {
    return new Promise(function(resolve, reject) {
        request
            .get(baseUrl + '/alt/cns/transactionReceipt/' + txHash)
            .end(function(err, res) {
                if (err) {
                    if (res && res.body && res.body.code === 1) {
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

AltExecCnsContract.prototype.call = function(password, contractName, functionName, params, abi, callback) {
    try {
        const url = this.account.baseUrl;
        const cnsAddress = this.cnsAddress;
        const altParams = new AltExecCnsParams(cnsAddress, contractName, functionName, params, abi);
        const hash = altParams.getHashedParams();
        const input = altParams.getInput();

        this.account.sign(password, hash).then(function(sign) {
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

AltExecCnsContract.prototype.sendTransaction = function(password, contractName, functionName, params, abi, callback) {
    try {
        const url = this.account.baseUrl;
        const cnsAddress = this.cnsAddress;
        const altParams = new AltExecCnsParams(cnsAddress, contractName, functionName, params, abi);
        const hash = altParams.getHashedParams();
        const input = altParams.getInput();

        this.account.sign(password, hash).then(function(sign) {
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

AltExecCnsContract.prototype.getData = function(password, contractName, functionName, params, abi, callback) {
    try {
        const url = this.account.baseUrl;
        const cnsAddress = this.cnsAddress;
        const altParams = new AltExecCnsParams(cnsAddress, contractName, functionName, params, abi);
        const hash = altParams.getHashedParams();
        const input = altParams.getInput();

        this.account.sign(password, hash).then(function(sign) {
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

AltExecCnsContract.prototype.sendData = function(password, contractName, functionName, objectId, data, params, abi, callback) {
    try {
        const url = this.account.baseUrl;
        const cnsAddress = this.cnsAddress;
        const dataHash = ethUtil.addHexPrefix(utils.hash(data));
        const altParams = new AltExecCnsParams(cnsAddress, contractName, functionName, params, abi);
        altParams.setObject(objectId, dataHash);
        const hash = altParams.getHashedParams();
        const input = altParams.getInput();

        this.account.sign(password, hash).then(function(sign) {
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

AltExecCnsContract.prototype.updateData = function(password, contractName, functionName, objectId, data, params, abi, callback) {
    try {
        const url = this.account.baseUrl;
        const cnsAddress = this.cnsAddress;
        const dataHash = ethUtil.addHexPrefix(utils.hash(data));
        const altParams = new AltExecCnsParams(cnsAddress, contractName, functionName, params, abi);
        altParams.setObject(objectId, dataHash);
        const hash = altParams.getHashedParams();
        const input = altParams.getInput();

        this.account.sign(password, hash).then(function(sign) {
            return requestPutData(url, input, sign, data);
        }).then(function(result) {
            callback(null, result);
        }).catch(function(err) {
            callback(err);
        });
    } catch (err) {
        callback(err);
    }
};

AltExecCnsContract.prototype.getFile = function(password, contractName, functionName, params, abi, callback) {
    try {
        const url = this.account.baseUrl;
        const cnsAddress = this.cnsAddress;
        const altParams = new AltExecCnsParams(cnsAddress, contractName, functionName, params, abi);
        const hash = altParams.getHashedParams();
        const input = altParams.getInput();

        this.account.sign(password, hash).then(function(sign) {
            return requestGetFile(url, input, sign);
        }).then(function(file) {
            callback(null, file);
        }).catch(function(err) {
            callback(err);
        });
    } catch (err) {
        callback(err);
    }
};

AltExecCnsContract.prototype.sendFile = function(password, contractName, functionName, objectId, data, file, params, abi, callback) {
    try {
        if (file.size > MAX_FILE_SIZE) throw 'File too large';
        const _this = this;
        const url = this.account.baseUrl;
        const cnsAddress = this.cnsAddress;
        const dataHash = ethUtil.addHexPrefix(utils.hash(data));
        const altParams = new AltExecCnsParams(cnsAddress, contractName, functionName, params, abi);

        utils.hashFile(file).then(function(fileHash) {
            altParams.setObject(objectId, dataHash, ethUtil.addHexPrefix(fileHash));
            return Promise.resolve(altParams.getHashedParams());
        }).then(function(hash) {
            return _this.account.sign(password, hash);
        }).then(function(sign) {
            return requestPostFile(url, altParams.getInput(), sign, data, file);
        }).then(function(result) {
            callback(null, result);
        }).catch(function(err) {
            callback(err);
        });
    } catch (err) {
        callback(err);
    }
};

AltExecCnsContract.prototype.updateFile = function(password, contractName, functionName, objectId, file, params, abi, callback) {
    try {
        if (file.size > MAX_FILE_SIZE) throw 'file is too large';
        const _this = this;
        const url = this.account.baseUrl;
        const cnsAddress = this.cnsAddress;
        const altParams = new AltExecCnsParams(cnsAddress, contractName, functionName, params, abi);

        utils.hashFile(file).then(function(fileHash) {
            altParams.setObject(objectId, null, ethUtil.addHexPrefix(fileHash));
            return Promise.resolve(altParams.getHashedParams());
        }).then(function(hash) {
            return _this.account.sign(password, hash);
        }).then(function(sign) {
            return requestPutFile(url, altParams.getInput(), sign, file);
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
