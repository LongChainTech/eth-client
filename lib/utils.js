var ethUtil = require('ethereumjs-util'),
    signing = require('eth-lightwallet').signing,
    txutils = require('eth-lightwallet').txutils,
    coder = require('web3/lib/solidity/coder'),
    SHA3 = require('keccakjs'),
    web3Utils = require('web3/lib/utils/utils');


var Utils = function() {}

var concatSign = function(signature) {
    var v = signature.v;
    var r = signature.r;
    var s = signature.s;
    r = ethUtil.fromSigned(r);
    s = ethUtil.fromSigned(s);
    v = ethUtil.bufferToInt(v);
    r = new Buffer(r.toTwos(256).toArray('be', 32)).toString('hex');
    s = new Buffer(s.toTwos(256).toArray('be', 32)).toString('hex');
    v = ethUtil.stripHexPrefix(ethUtil.intToHex(v));
    return ethUtil.addHexPrefix(r.concat(s, v).toString("hex"));
};

var getOutputTypesFromAbi = function(abi, functionName) {
    function matchesFunctionName(json) {
        return (json.name === functionName && json.type === 'function');
    }

    function getTypes(json) {
        return json.type;
    }

    var funcJson = abi.filter(matchesFunctionName)[0];

    return (funcJson.outputs).map(getTypes);
};


Utils.hash = function() {
    const bytes = 256;
    var h = new SHA3(bytes);
    for (var i = 0; i < arguments.length; i++) {
        var a = arguments[i];
        if (a) {
            h.update(ethUtil.toBuffer(a));
        }
    };
    return h.digest('hex');
};

Utils.hashBySolidityType = function(types, params) {
    if (!types || !params || types.length != params.length) throw new Error('invalid parameters');

    var getParam = function(type, param) {
        let p = coder.encodeParam(type, param);
        let m = type.match(/(\[([0-9]*)\])$/);
        if (m) {
            let prefixLength = 0;
            if (m[0] === '[]') prefixLength = 32 * 2 * 2;
            return p.substr(prefixLength);
        }
        let size;
        if (type === 'bytes') {
            let size = param.length;
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

    var convertBuffer = function(param) {
        let buffer = new Buffer(param.length / 2);
        buffer.fill();
        param.match(new RegExp('.{2}', 'g')).map(function(b, index) {
            buffer[index] = parseInt(b, 16);
        });
        return buffer;
    }

    var hash;
    for (var i = 0; i < types.length; i++) {
        let h = new SHA3(256);
        if (hash) {
            h.update(convertBuffer(hash));
        }

        let param = getParam(types[i], params[i]);
        h.update(convertBuffer(param));
        hash = h.digest('hex');
    }
    return hash;
};

Utils.recoverAddress = function(hash, sign) {
    var sig = ethUtil.fromRpcSig(sign);
    var pubAddr = ethUtil.ecrecover(new Buffer(hash, 'hex'), sig.v, sig.r, sig.s);
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
        var blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice,
            chunkSize = 1024 * 1024 * 2, // Read in chunks of 2MB
            chunks = Math.ceil(file.size / chunkSize),
            currentChunk = 0,
            h = new SHA3(256);

        var fileReader = new FileReader();

        fileReader.onload = function(e) {
            h.update(new Buffer(e.target.result, 'hex')); // Append array buffer
            currentChunk++;

            if (currentChunk < chunks) {
                loadNext();
            } else {
                var hash = h.digest('hex');
                res(hash);
            };
        };

        fileReader.onerror = function() {
            rej('hash file error');
        };

        function loadNext() {
            var start = currentChunk * chunkSize,
                end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;

            fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
        };
        loadNext();
    });
};

Utils.getZero = function() {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
}

module.exports = Utils;
