# EthClient

## Installation
### Node.js
`npm install eth-client`

### HTML
    <html>
      <body>
        <script src="eth-client.min.js"></script>
      </body>
    </html>

### Usage
    var account = new ethClient.Account(BaseUrl);
    var contract = new ethClient.AltExecCnsContract(account);

    contract.call(password, CnsAddress, ContractName, FunctionName, [ Args ], ABI, callback);

## License
    Copyright 2016 GMO Internet, Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
