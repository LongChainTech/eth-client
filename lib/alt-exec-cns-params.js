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
    txutils = require('eth-lightwallet').txutils,
    coder = require('web3/lib/solidity/coder'),
    ethUtil = require('ethereumjs-util');

const envTypes = ['address', 'bytes32', 'bytes32'];

const AltExecCnsParams = function(cnsAddress, contractName, functionName, params, abi, sign) {
    this.envParams = [cnsAddress, contractName, functionName];
    this.objectParams = [];
    this.optionalParams = params;
    this.abi = abi;
    if (sign) this.sign = sign;
};

AltExecCnsParams.prototype.getFunctionName = function() {
    return this.envParams[2];
};

AltExecCnsParams.prototype.setSign = function(sign) {
    this.sign = sign;
};

AltExecCnsParams.prototype.setObject = function(objectId, dataHash, fileHash) {
    this.objectParams[0] = ethUtil.addHexPrefix(coder.encodeParam('bytes32', objectId));
    if (dataHash) this.objectParams[1] = dataHash;
    if (fileHash) this.objectParams[2] = fileHash;
};

AltExecCnsParams.prototype.getFunctionInterface = function() {
    return utils.getFunctionInterface(this.abi, this.getFunctionName());
};

AltExecCnsParams.prototype.getValidationErrorOfAbi = function(isGetObjectId) {
    if (!this.types) {
        const funcIF = this.getFunctionInterface();
        if (!funcIF) return 'no such function';
        this.constant = funcIF.constant;
        this.types = txutils._getTypesFromAbi(this.abi, this.getFunctionName());
    }

    const params = this.getParamsForEncode();
    if (params.length !== this.types.length) return 'abi does not match params';

    if (!this.constant) {
        if (this.types[0] !== 'bytes') return 'no sign';
    }

    if (isGetObjectId) {
        if (!this.constant) return 'not constant function';
        const outputs = utils.getOutputTypesFromAbi(this.abi, this.getFunctionName());

        if (outputs.length !== 1) return 'outputs is not one type';
        if (outputs[0].indexOf('bytes32') < 0) return 'outputs is not bytes32';
    }
    return null;
};

AltExecCnsParams.prototype.getParamsForEncode = function() {
    let params = [];
    if (!this.constant) {
        params = params.concat(this.sign);
        this.objectParams.map(function(p) {
            if (p) params.push(p);
        });
    }
    params = params.concat(this.optionalParams);
    return params;
};

AltExecCnsParams.prototype.getEncodedData = function() {
    if (!this.types) {
        const funcIF = this.getFunctionInterface();
        this.constant = funcIF.constant;
        this.types = txutils._getTypesFromAbi(this.abi, this.getFunctionName());
    }

    const types = this.types;
    const params = this.getParamsForEncode();
    if (params.length !== types.length) throw new Error('invalid params');

    return ethUtil.addHexPrefix(txutils._encodeFunctionTxData(this.getFunctionName(), types, params));
};

AltExecCnsParams.prototype.getHashedParams = function() {
    if (!this.types) {
        const funcIF = this.getFunctionInterface();
        this.constant = funcIF.constant;
        this.types = txutils._getTypesFromAbi(this.abi, this.getFunctionName());
    }

    let params = this.envParams;
    this.objectParams.map(function(p) {
        if (p) params.push(p);
    });
    params = params.concat(this.optionalParams);

    let types = envTypes;
    if (this.constant) {
        types = types.concat(this.types);
    } else {
        types = types.concat(this.types.slice(1));
    }
    return utils.hashBySolidityType(types, params);
};

AltExecCnsParams.prototype.recoverAddress = function() {
    return utils.recoverAddress(this.getHashedParams(), this.sign);
};

AltExecCnsParams.prototype.getInput = function() {
    const input = {};
    input.cnsAddress = this.envParams[0];
    input.contractName = this.envParams[1];
    input.functionName = this.envParams[2];

    const convertArrayToJson = function(val) {
        if (!Array.isArray(val)) return val;
        return val.map(function(v, i) {
            const ret = {};
            ret[i] = convertArrayToJson(v);
            return ret;
        });
    };

    if (!this.constant) input.params = this.optionalParams;
    else input.params = convertArrayToJson(this.optionalParams);

    if (this.objectParams[0]) input.objectId = this.objectParams[0];
    if (this.objectParams[1]) input.dataHash = this.objectParams[1];
    if (this.objectParams[2]) input.fileHash = this.objectParams[2];
    return input;
};

module.exports = AltExecCnsParams;
