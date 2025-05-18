import type { Request, Response } from 'express'
import { AlphaRouter, SwapType } from '@uniswap/smart-order-router'
import { UniversalRouterVersion } from '@uniswap/universal-router-sdk'
import { Token, CurrencyAmount, TradeType, Percent, Ether } from '@uniswap/sdk-core'
import JSBI from 'jsbi'
import { ethers } from 'ethers'
import dotenv from 'dotenv'
dotenv.config()

const CHAIN_CONFIG = {
    1: {
        rpcUrl: process.env.JSON_RPC_PROVIDER!,
    },
    42161: {
        rpcUrl: process.env.JSON_RPC_PROVIDER_ARBITRUM_ONE!,
    },
    10: {
        rpcUrl: process.env.JSON_RPC_PROVIDER_OPTIMISM!,
    },
    8453: {
        rpcUrl: process.env.JSON_RPC_PROVIDER_BASE!,
    },
}

export default async function quoteHandler(req: Request, res: Response): Promise<void> {
    try {
        const {
            tokenIn,
            tokenOut,
            amount,
            tradeType,
            recipient,
        }: {
            tokenIn: {
                chainId: number
                address: string
                decimals: number
                symbol: string
                name: string
                isNative?: boolean
            }
            tokenOut: {
                chainId: number
                address: string
                decimals: number
                symbol: string
                name: string
                isNative?: boolean
            }
            amount: string
            tradeType: 'EXACT_INPUT' | 'EXACT_OUTPUT'
            recipient: `0x${string}`
        } = req.body

        if (!tokenIn || !tokenOut || !amount || !recipient) {
            res.status(400).json({ error: 'Missing parameters' })
            return
        }

        const chainId = tokenIn.chainId
        const config = CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG]

        if (!config) {
            res.status(400).json({ error: 'Unsupported chainId' })
            return
        }

        const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl)
        const router = new AlphaRouter({ chainId, provider })

        const inputToken = tokenIn.isNative
            ? Ether.onChain(chainId)
            : new Token(chainId, tokenIn.address, tokenIn.decimals, tokenIn.symbol, tokenIn.name)

        const outputToken = tokenOut.isNative
            ? Ether.onChain(chainId)
            : new Token(chainId, tokenOut.address, tokenOut.decimals, tokenOut.symbol, tokenOut.name)

        const amountTyped = CurrencyAmount.fromRawAmount(
            tradeType === 'EXACT_OUTPUT' ? outputToken : inputToken,
            JSBI.BigInt(amount)
        )

        const route = await router.route(
            amountTyped,
            tradeType === 'EXACT_OUTPUT' ? inputToken : outputToken,
            tradeType === 'EXACT_OUTPUT' ? TradeType.EXACT_OUTPUT : TradeType.EXACT_INPUT,
            {
                recipient,
                slippageTolerance: new Percent(50, 10_000),
                type: SwapType.UNIVERSAL_ROUTER,
                version: UniversalRouterVersion.V2_0,
            }
        )

        if (!route || !route.methodParameters) {
            res.status(400).json({ error: 'No route found' })
            return
        }

        res.json({
            quote: route.quote.toExact(),
            route: route.route.map((r) => r.tokenPath.map((t) => t.symbol)),
            estimatedGas: route.estimatedGasUsed.toString(),
            gasUsd: route.estimatedGasUsedUSD.toExact(),
            calldata: route.methodParameters.calldata,
            value: route.methodParameters.value.toString(),
        })
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        res.status(500).json({ error: errorMessage })
    }
}