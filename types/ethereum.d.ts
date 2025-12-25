interface EthereumProvider {
  request(args: { method: string; params?: any[] }): Promise<any>
  isMetaMask?: boolean
  selectedAddress?: string
  // Event handling methods for wallet events
  on?(event: string, handler: (...args: any[]) => void): void
  removeListener?(event: string, handler: (...args: any[]) => void): void
}

interface Window {
  ethereum?: EthereumProvider
}
