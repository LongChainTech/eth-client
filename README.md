EthClient
==================================================

License
--------------------------------------
License is [here](./LICENSE.txt).

Apart from forbidding the use of this software for criminal activity, this license is similar to the [MIT License](https://opensource.org/licenses/mit-license.php).

GMO Blockchain Open Source Common License document is [here](https://guide.blockchain.z.com/docs/oss/license/).

Installation
--------------------------------------
### Node.js
`npm install eth-client`

### HTML
    <html>
      <body>
        <script src="eth-client.min.js"></script>
      </body>
    </html>

### Usage
    ethClient.Account.create(baseUrl, password, function(err, _account) {
        account = _account;
        contract = new ethClient.AltExecCnsContract(account, CnsAddress);
    }

    contract.call(password, ContractName, FunctionName, [ Args ], ABI, callback);
