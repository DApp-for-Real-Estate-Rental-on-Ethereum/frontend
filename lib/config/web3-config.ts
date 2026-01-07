// Get blockchain RPC URL - use CloudFront HTTPS in production
function getBlockchainRpcUrl(): string {
    // If explicitly set via env var, use that
    if (process.env.NEXT_PUBLIC_BLOCKCHAIN_RPC_URL) {
        return process.env.NEXT_PUBLIC_BLOCKCHAIN_RPC_URL;
    }
    
    // In browser: detect CloudFront and use HTTPS blockchain endpoint
    if (typeof window !== "undefined") {
        const hostname = window.location.hostname;
        
        // CloudFront deployment - use HTTPS blockchain CloudFront
        if (hostname.includes("cloudfront.net")) {
            return "https://d1f19dpygrw2di.cloudfront.net";
        }
        
        // AWS ELB - use direct blockchain ELB
        if (hostname.includes("elb.amazonaws.com")) {
            return "http://a5089b15835ad4e3b914af892566da8f-301584365.us-east-1.elb.amazonaws.com:8545";
        }
    }
    
    // Default: localhost for development
    return "http://127.0.0.1:8545";
}

export const WEB3_CONFIG = {
    networks: {
        hardhat: {
            chainId: "0x7a69", // 31337
            chainName: "Hardhat Local",
            rpcUrl: getBlockchainRpcUrl(),
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
