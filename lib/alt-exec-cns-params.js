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
    ethUtil = require('ethereumjs-util');

const envTypes = ['address', 'bytes32', 'bytes32'];

var AltExecCnsParams = function(cnsAddress, contractName, functionName, params) {
    this.envParams = [cnsAddress, contractName, functionName];
    this.objectParams = [];
    this.optionalParams = params;
};

AltExecCnsParams.prototype.getFunctionName = function() {
    return this.envParams[2];
};

AltExecCnsParams.prototype.getFrom = function() {
    return this.from;
}

AltExecCnsParams.prototype.setSign = function(sign) {
    this.sign = sign;
};

AltExecCnsParams.prototype.setObject = function(objectId, dataHash) {
    this.objectParams[0] = objectId;
    this.objectParams[1] = dataHash;
}

AltExecCnsParams.prototype.setTypesFromAbi = function(abi) {
    var functionName = this.getFunctionName();

    function matchesFunctionName(json) {
        return (json.name === functionName && json.type === 'function');
    };
    var funcJson = abi.filter(matchesFunctionName)[0];
    this.constant = funcJson.constant;
    this.types = txutils._getTypesFromAbi(abi, this.getFunctionName());
};

AltExecCnsParams.prototype.getEncodedData = function() {
    var types = this.types;
    var params = this.optionalParams;
    if (!this.constant) {
        params = [this.sign];
        if (this.objectParams.length == 2) params = params.concat(this.objectParams);
        params = params.concat(this.optionalParams);
    }
    if (params.length !== types.length) throw 'invalid params';

    return ethUtil.addHexPrefix(txutils._encodeFunctionTxData(this.getFunctionName(), types, params));
};

AltExecCnsParams.prototype.getHashedParams = function() {
    if (!this.types) throw 'type is not set';

    var params = this.envParams;
    if (this.objectParams.length == 2) {
        params = params.concat(this.objectParams);
    }
    params = params.concat(this.optionalParams);

    var types = envTypes;
    if (this.constant) {
        types = types.concat(this.types);
    } else {
        types = types.concat(this.types.slice(1));
    }

    return utils.hashBySolidityType(types, params);
};

AltExecCnsParams.prototype.recoverAddress = function(req) {
    if (!req) throw 'no req provided';

    var hash = this.getHashedParams();
    var params = this.envParams;
    if (this.objectParams.length == 2) {
        params = params.concat(this.objectParams);
    }
    params = params.concat(this.optionalParams);

    this.from = utils.recoverAddress(hash, this.sign);

    req.log.sign = {
        signature: this.sign,
        signed_parameter_list: params,
        recovered_address: this.from
    };
};

AltExecCnsParams.prototype.getInput = function() {
    var input = {};
    input.cnsAddress = this.envParams[0];
    input.contractName = this.envParams[1];
    input.functionName = this.envParams[2];
    input.params = this.optionalParams;
    if (this.objectParams.length == 2) {
        input.objectId = this.objectParams[0];
        input.dataHash = this.objectParams[1];
    }
    return input;
};

module.exports = AltExecCnsParams;
