const ethUtil = require('ethereumjs-util'),
    signing = require('eth-lightwallet').signing,
    coder = require('web3/lib/solidity/coder'),
    SHA3 = require('keccakjs'),
    web3Utils = require('web3/lib/utils/utils');

const Utils = function() {};

const concatSign = function(signature) {
    let v = signature.v;
    let r = signature.r;
    let s = signature.s;
    r = ethUtil.fromSigned(r);
    s = ethUtil.fromSigned(s);
    v = ethUtil.bufferToInt(v);
    r = new Buffer(r.toTwos(256).toArray('be', 32)).toString('hex');
    s = new Buffer(s.toTwos(256).toArray('be', 32)).toString('hex');
    v = ethUtil.stripHexPrefix(ethUtil.intToHex(v));
    return ethUtil.addHexPrefix(r.concat(s, v).toString('hex'));
};

const getFunctionInterface = function(abi, functionName) {
    function matchesFunctionName(json) {
        return (json.name === functionName && json.type === 'function');
    }
    return abi.filter(matchesFunctionName)[0];
};
Utils.getFunctionInterface = getFunctionInterface;

const getOutputTypesFromAbi = function(abi, functionName) {
    function getTypes(json) {
        return json.type;
    }

    const funcIF = getFunctionInterface(abi, functionName);
    return (funcIF.outputs).map(getTypes);
};
Utils.getOutputTypesFromAbi = getOutputTypesFromAbi;

Utils.hash = function() {
    const bytes = 256;
    const h = new SHA3(bytes);
    for (let i = 0; i < arguments.length; i++) {
        const a = arguments[i];
        if (a) {
            h.update(ethUtil.toBuffer(a));
        }
    }
    return h.digest('hex');
};

Utils.hashBySolidityType = function(types, params) {
    if (!types || !params || types.length !== params.length) throw new Error('Invalid parameters');

    const getParam = function(type, param) {
        const p = coder.encodeParam(type, param);
        const m = type.match(/(\[([0-9]*)\])$/);
        if (m) {
            let prefixLength = 0;
            if (m[0] === '[]') prefixLength = 32 * 2 * 2;
            return p.substr(prefixLength);
        }
        let size;
        if (type === 'bytes') {
            size = param.length;
            return p.substr(128, size - 2);
        } else if (type === 'string') {
            // string はdynamic length のため
            return web3Utils.fromUtf8(param).substr(2);
        } else if (type.indexOf('bytes') !== -1) {
            // bytes はright padding のため
            size = type.match('[0-9]+') ? type.match('[0-9]+')[0] : 32;
            return p.substr(0, size * 2);
        } else if (type === 'address') {
            size = 20;
            return p.substr(size * 2 * -1, size * 2);
        } else if (type === 'bool') {
            size = 1;
            return p.substr(size * 2 * -1, size * 2);
        } else if (type.indexOf('uint') !== -1) {
            size = type.match('[0-9]+') ? type.match('[0-9]+')[0] / 8 : 32;
            return p.substr(size * 2 * -1, size * 2);
        } else if (type.indexOf('int') !== -1) {
            size = type.match('[0-9]+') ? type.match('[0-9]+')[0] / 8 : 32;
            return p.substr(size * 2 * -1, size * 2);
        }
    };

    const convertBuffer = function(param) {
        const buffer = new Buffer(param.length / 2);
        buffer.fill();
        param.match(new RegExp('.{2}', 'g')).map(function(b, index) {
            buffer[index] = parseInt(b, 16);
        });
        return buffer;
    };

    let hash;
    for (let i = 0; i < types.length; i++) {
        const h = new SHA3(256);
        if (hash) {
            h.update(convertBuffer(hash));
        }

        const param = getParam(types[i], params[i]);
        h.update(convertBuffer(param));
        hash = h.digest('hex');
    }
    return hash;
};

Utils.recoverAddress = function(hash, sign) {
    const sig = ethUtil.fromRpcSig(sign);
    const pubAddr = ethUtil.ecrecover(new Buffer(hash, 'hex'), sig.v, sig.r, sig.s);
    return ethUtil.bufferToHex(ethUtil.pubToAddress(pubAddr));
};

Utils.decodeResult = function(abi, functionName, result) {
    return coder.decodeParams(getOutputTypesFromAbi(abi, functionName), ethUtil.stripHexPrefix(result));
};

Utils.sign = function(keystore, pwDerivedKey, hash, from) {
    return concatSign(signing.signMsgHash(keystore, pwDerivedKey, hash, from));
};

Utils.hashFile = function(file) {
    return new Promise(function(res, rej) {
        const blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice,
            chunkSize = 1024 * 1024 * 2, // Read in chunks of 2MB
            chunks = Math.ceil(file.size / chunkSize),
            h = new SHA3(256),
            fileReader = new FileReader();
        let currentChunk = 0;

        fileReader.onload = function(e) {
            h.update(new Buffer(e.target.result, 'hex')); // Append array buffer
            currentChunk++;

            if (currentChunk < chunks) {
                loadNext();
            } else {
                const hash = h.digest('hex');
                res(hash);
            }
        };

        fileReader.onerror = function() {
            rej('hash file error');
        };

        function loadNext() {
            const start = currentChunk * chunkSize;
            const end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;
            fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
        }

        loadNext();
    });
};

module.exports = Utils;
