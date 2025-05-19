


# Youke Smart Order Router

这是一个基于 Uniswap 的智能路由查询后端服务，使用 `@uniswap/smart-order-router` 构建，支持 ETH、ERC20 等代币之间的多路径报价计算，可部署在 Node.js + Express 环境中。

## 功能特性

- 基于 Uniswap V3、V2、Universal Router 的智能路由报价服务
- 支持多链网络（Ethereum Mainnet、Arbitrum、Optimism、Base 等）
- 支持原生 ETH 和 ERC20 代币
- 支持 EXACT_INPUT 和 EXACT_OUTPUT 两种交易模式
- 支持 Permit2（代币授权签名方案）

## 项目结构

```
.
├── Dockerfile                # Docker 容器构建文件
├── .dockerignore            # Docker 忽略文件
├── .env                     # 环境变量配置
├── src/
│   ├── index.ts             # 服务入口
│   └── api/
│       └── quote.ts         # 报价 API 实现
├── package.json
├── tsconfig.json
└── README.md
```

## 环境变量配置（.env）

```
JSON_RPC_PROVIDER=https://eth-mainnet.g.alchemy.com/v2/你的KEY
JSON_RPC_PROVIDER_ARBITRUM_ONE=https://arb-mainnet.g.alchemy.com/v2/你的KEY
JSON_RPC_PROVIDER_OPTIMISM=https://opt-mainnet.g.alchemy.com/v2/你的KEY
JSON_RPC_PROVIDER_BASE=https://base-mainnet.g.alchemy.com/v2/你的KEY
```

## 本地开发

```bash
pnpm install
pnpm dev
```

或使用 yarn：

```bash
yarn install
yarn dev
```

## 构建生产版本

```bash
pnpm build
pnpm start
```

## Docker 部署

构建镜像：

```bash
docker build -t youke-smart-order-router .
```

运行容器：

```bash
docker run -p 3000:3000 --env-file .env youke-smart-order-router
```

## 请求示例

POST `/api/quote`

```json
{
  "tokenIn": {
    "chainId": 1,
    "address": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    "decimals": 18,
    "symbol": "WETH",
    "name": "Wrapped Ether"
  },
  "tokenOut": {
    "chainId": 1,
    "address": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "decimals": 6,
    "symbol": "USDT",
    "name": "Tether USD"
  },
  "amount": "1000000000000000000",
  "tradeType": "EXACT_INPUT",
  "recipient": "0xYourWalletAddress"
}
```

## 返回示例

```json
{
  "quote": "1583.25",
  "route": [
    {
      "protocol": "V3",
      "percent": 100,
      "pools": [
        {
          "token0": { "symbol": "WETH" },
          "token1": { "symbol": "USDT" },
          "fee": 500
        }
      ]
    }
  ],
  "estimatedGas": "210000",
  "gasUsd": "0.43",
  "calldata": "0x...",
  "value": "0xde0b6b3a7640000"
}
```

---

## License

MIT