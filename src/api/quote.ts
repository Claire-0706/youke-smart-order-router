import type { Request, Response } from "express";
import {
  AlphaRouter,
  AlphaRouterConfig,
  SwapType,
} from "@uniswap/smart-order-router";
import { Protocol } from "@uniswap/router-sdk";
import { UniversalRouterVersion } from "@uniswap/universal-router-sdk";
import {
  Token,
  CurrencyAmount,
  TradeType,
  Percent,
  Ether,
} from "@uniswap/sdk-core";
import { ethers } from "ethers";
import dotenv from "dotenv";
import { fromReadableAmount } from "../libs/conversion";
dotenv.config();

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
};

export default async function quoteHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      tokenIn,
      tokenOut,
      amount,
      tradeType,
      recipient,
      slippage,
      protocols,
      minSplits,
    }: {
      tokenIn: {
        chainId: number;
        address: string;
        decimals: number;
        symbol: string;
        name: string;
        isNative?: boolean;
      };
      tokenOut: {
        chainId: number;
        address: string;
        decimals: number;
        symbol: string;
        name: string;
        isNative?: boolean;
      };
      amount: string;
      tradeType: 0 | 1;
      recipient: `0x${string}`;
      slippage: number;
      protocols: string;
      minSplits: number;
    } = req.body;

    if (!tokenIn || !tokenOut || !amount || !recipient) {
      res.status(400).json({ error: "Missing parameters" });
      return;
    }

    const slippageBips = slippage ?? 50;
    const routingConfig: Partial<AlphaRouterConfig> = {};

    if (protocols) {
      const protocolMap: Record<string, Protocol> = {
        V2: Protocol.V2,
        V3: Protocol.V3,
        MIXED: Protocol.MIXED,
      };

      routingConfig.protocols = protocols
        .split(",")
        .map((p) => protocolMap[p.trim()]);
    }

    if (typeof minSplits === "number" && !isNaN(minSplits)) {
      routingConfig.minSplits = minSplits;
    }

    const chainId = tokenIn.chainId;
    const config = CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG];

    if (!config) {
      res.status(400).json({ error: "Unsupported chainId" });
      return;
    }

    const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    const router = new AlphaRouter({ chainId, provider });

    const inputToken = tokenIn.isNative
      ? Ether.onChain(chainId)
      : new Token(
          chainId,
          tokenIn.address,
          tokenIn.decimals,
          tokenIn.symbol,
          tokenIn.name
        );

    const outputToken = tokenOut.isNative
      ? Ether.onChain(chainId)
      : new Token(
          chainId,
          tokenOut.address,
          tokenOut.decimals,
          tokenOut.symbol,
          tokenOut.name
        );

    const rawAmount = (() => {
      const decimals = (tradeType == 1 ? outputToken : inputToken).decimals;
      return fromReadableAmount(Number(amount), decimals);
    })();

    const amountTyped = CurrencyAmount.fromRawAmount(
      tradeType == 1 ? outputToken : inputToken,
      rawAmount
    );

    const route = await router.route(
      amountTyped,
      tradeType == 1 ? inputToken : outputToken,
      tradeType == 1 ? TradeType.EXACT_OUTPUT : TradeType.EXACT_INPUT,
      {
        recipient,
        slippageTolerance: new Percent(slippageBips, 10_000),
        type: SwapType.UNIVERSAL_ROUTER,
        version: UniversalRouterVersion.V2_0,
      },
      routingConfig
    );

    if (!route || !route.methodParameters) {
      res.status(400).json({ error: "No route found" });
      return;
    }

    const priceImpact = route.trade?.priceImpact?.toSignificant(4) ?? null;

    res.json({
      quote: route.quote.toExact(),
      route: route.route.map((r) => ({
        protocol: r.protocol,
        percent: r.percent,
        pools:
          "pools" in r.route
            ? (r.route as any).pools.map((pool: any) => ({
                token0: { symbol: pool.token0.symbol },
                token1: { symbol: pool.token1.symbol },
                fee: pool.fee,
              }))
            : [],
      })),
      // estimatedGas: route.estimatedGasUsed.toString(),
      gasUsd: route.estimatedGasUsedUSD.toExact(),
      calldata: route.methodParameters.calldata,
      value: route.methodParameters.value.toString(),
      to: route.methodParameters.to,
      priceImpact,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: errorMessage });
  }
}
