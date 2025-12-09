interface EthereumProvider {
  request(args: { method: string; params?: any[] }): Promise<any>
  isMetaMask?: boolean
  selectedAddress?: string
}

interface Window {
  ethereum?: EthereumProvider
}

