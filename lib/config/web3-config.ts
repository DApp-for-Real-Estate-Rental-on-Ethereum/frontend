export const WEB3_CONFIG = {
    networks: {
        hardhat: {
            chainId: "0x7a69", // 31337
            chainName: "Hardhat Local",
            rpcUrl: process.env.NEXT_PUBLIC_BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545",
            nativeCurrency: {
                name: "ETH",
                symbol: "ETH",
                decimals: 18,
            },
            blockExplorerUrls: [],
        },
        arbitrumOne: {
            chainId: "0xa4b1", // 42161
            chainName: "Arbitrum One",
            rpcUrl: "https://arb1.arbitrum.io/rpc",
            nativeCurrency: {
                name: "ETH",
                symbol: "ETH",
                decimals: 18,
            },
            blockExplorerUrls: ["https://arbiscan.io"],
        },
        sepolia: {
            chainId: "0xaa36a7", // 11155111
            chainName: "Sepolia Testnet",
            rpcUrl: "https://rpc.sepolia.org",
            nativeCurrency: {
                name: "Sepolia ETH",
                symbol: "ETH",
                decimals: 18,
            },
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
        },
    },
    defaultNetwork: "hardhat",
    constants: {
        // 1 ETH ≈ 29,079 MAD (Updated per user preference)
        MAD_TO_ETH_RATE: 29079,
    },
} as const;

export type SupportedNetwork = keyof typeof WEB3_CONFIG.networks;

export function getNetworkConfig(chainId: string) {
    const networks = Object.values(WEB3_CONFIG.networks);
    return networks.find((n) => n.chainId.toLowerCase() === chainId.toLowerCase());
}

export function isSupportedNetwork(chainId: string) {
    return !!getNetworkConfig(chainId);
}
