"use client"

import { useState, useEffect, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ethers } from "ethers"
import { apiClient } from "@/lib/services/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Wallet, Loader2, Calendar, User, AlertCircle } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { toast } from "sonner"

const HARDHAT_CHAIN_ID = "0x7a69"
const ARBITRUM_ONE_CHAIN_ID = "0xa4b1"

// MAD to ETH conversion rate (1 ETH ≈ 35,000 MAD)
const MAD_TO_ETH_RATE = 35000

// Helper function to convert MAD to ETH
function madToEth(madAmount: number): number {
  return madAmount / MAD_TO_ETH_RATE
}

// Helper function to format MAD amount
function formatMad(amount: number): string {
  return `${amount.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`
}

// Helper function to format ETH amount
function formatEth(amount: number): string {
  return `${amount.toFixed(6)} ETH`
}

declare global {
  interface Window {
    ethereum?: EthereumProvider | undefined
  }
}

interface BookingDetails {
  bookingId: number
  totalPrice: number
  propertyPrice: number
  checkInDate: string
  checkOutDate: string
  userWalletAddress: string
  ownerWalletAddress: string
  currentUserId: number
  userId: number
  propertyTitle: string
  status: string
  userFirstName: string
  userLastName: string
  userEmail: string
}

interface PaymentIntentData {
  to: string
  value: string | number | bigint
  data?: string
  chainId?: string | number
}

export default function PaymentPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()

  const [bookingId, setBookingId] = useState<number | null>(null)
  const [walletAddress, setWalletAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [gasEstimate] = useState(0.0001)
  const [networkName, setNetworkName] = useState("Not connected")
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false)

  useEffect(() => {
    const id = searchParams.get("bookingId") || searchParams.get("id")
    if (id) {
      const bookingIdNum = parseInt(id, 10)
      if (!isNaN(bookingIdNum) && bookingIdNum > 0) {
        setBookingId(bookingIdNum)
        fetchBookingDetails(bookingIdNum)
      } else {
        setError("Invalid booking ID in URL. Please use a valid number.")
      }
    } else {
      setError("Booking ID is required in URL. Please add ?bookingId=1 to the URL.")
    }
  }, [searchParams])

  useEffect(() => {
    const addressToCheck = walletAddress || bookingDetails?.userWalletAddress
    if (addressToCheck && typeof window !== "undefined" && window.ethereum) {
      const timeoutId = setTimeout(() => {
        checkWalletInfo(addressToCheck)
      }, 500)
      return () => clearTimeout(timeoutId)
    }
  }, [bookingDetails?.userWalletAddress, walletAddress])

  useEffect(() => {
    if (typeof window === "undefined") return
    const ethereum = window.ethereum
    if (ethereum && typeof ethereum.on === "function") {
      const handleChainChanged = async (chainId: string) => {
        if (chainId === HARDHAT_CHAIN_ID || chainId === ARBITRUM_ONE_CHAIN_ID) {
          setIsCorrectNetwork(true)
          setNetworkName(chainId === HARDHAT_CHAIN_ID ? "Hardhat Local" : "Arbitrum One")
        } else {
          setIsCorrectNetwork(false)
          setNetworkName("Wrong Network")
        }
        const addressToCheck = walletAddress || bookingDetails?.userWalletAddress || ""
        if (addressToCheck) {
          await checkWalletInfo(addressToCheck)
        }
      }
      ethereum.on("chainChanged", handleChainChanged)
      return () => {
        if (typeof ethereum.removeListener === "function") {
          ethereum.removeListener("chainChanged", handleChainChanged)
        }
      }
    }
  }, [walletAddress, bookingDetails])

  async function fetchBookingDetails(id: number) {
    try {
      setLoadingDetails(true)
      setError(null)
      const data = await apiClient.payments.getBookingDetails(id)
      if (!data.ownerWalletAddress || data.ownerWalletAddress === "null" || data.ownerWalletAddress === "N/A" || data.ownerWalletAddress === "") {
        throw new Error("Owner wallet address is missing")
      }
      if (!data.totalPrice || data.totalPrice <= 0) {
        throw new Error("Booking total price is missing or invalid")
      }
      setBookingDetails(data)
      setError(null)
    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred"
      setError(`Failed to load booking details: ${errorMessage}`)
    } finally {
      setLoadingDetails(false)
    }
  }

  async function switchToNetwork(chainId: string, chainName: string, rpcUrl: string) {
    if (typeof window === "undefined" || !window.ethereum) return
    const ethereum = window.ethereum
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId }],
      })
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId,
              chainName,
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: [rpcUrl],
              blockExplorerUrls: chainId === ARBITRUM_ONE_CHAIN_ID ? ["https://arbiscan.io"] : [],
            },
          ],
        })
      } else {
        throw switchError
      }
    }
  }

  async function connectWallet() {
    try {
      if (typeof window === "undefined" || !window.ethereum) {
        toast.error("MetaMask is not available. Please install it first.")
        return
      }
      const ethereum = window.ethereum
      const currentChainId = await ethereum.request({ method: "eth_chainId" })
      if (currentChainId !== HARDHAT_CHAIN_ID && currentChainId !== ARBITRUM_ONE_CHAIN_ID) {
        try {
          await switchToNetwork(HARDHAT_CHAIN_ID, "Hardhat Local", "http://127.0.0.1:8545")
        } catch {
          await switchToNetwork(ARBITRUM_ONE_CHAIN_ID, "Arbitrum One", "https://arb1.arbitrum.io/rpc")
        }
      }
      const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[]
      const addr = accounts?.[0] || ""
      if (!addr) {
        toast.error("No account selected. Please select an account in MetaMask.")
        return
      }
      if (!ethers.isAddress(addr)) {
        toast.error("Invalid wallet address format")
        return
      }
      const normalizedAddr = ethers.getAddress(addr)
      setWalletAddress(normalizedAddr)
      if (bookingDetails?.currentUserId && addr) {
        await saveWalletAddressToDatabase(bookingDetails.currentUserId, addr)
      }
      await checkWalletInfo(addr)
      toast.success("Wallet connected successfully")
    } catch (e: any) {
      toast.error(`Failed to connect wallet: ${e.message}`)
    }
  }

  async function checkWalletInfo(address: string) {
    try {
      if (typeof window === "undefined" || !window.ethereum || !address) return
      const ethereum = window.ethereum
      const chainId = await ethereum.request({ method: "eth_chainId" })
      // Normalize chainId to lowercase for comparison
      const normalizedChainId = typeof chainId === 'string' ? chainId.toLowerCase() : chainId;

      if (normalizedChainId === HARDHAT_CHAIN_ID.toLowerCase()) {
        setNetworkName("Hardhat Local")
        setIsCorrectNetwork(true)
      } else if (normalizedChainId === ARBITRUM_ONE_CHAIN_ID.toLowerCase()) {
        setNetworkName("Arbitrum One")
        setIsCorrectNetwork(true)
      } else {
        setNetworkName("Wrong Network")
        setIsCorrectNetwork(false)
      }
      const provider = new ethers.BrowserProvider(ethereum)
      if (!ethers.isAddress(address)) {
        throw new Error(`Invalid Ethereum address: ${address}`)
      }
      const checksumAddress = ethers.getAddress(address)
      const balance = await provider.getBalance(checksumAddress)

      // Fix: Check for null/undefined explicitly, as 0n is falsy but valid
      if (balance === null || balance === undefined) {
        throw new Error("Balance is null or undefined")
      }

      const balanceInEth = parseFloat(ethers.formatEther(balance))
      if (isNaN(balanceInEth) || !isFinite(balanceInEth)) {
        throw new Error(`Invalid balance conversion result: ${balanceInEth}`)
      }
      setWalletBalance(balanceInEth)
    } catch (e: any) {
      console.error("Wallet Check Error:", e)
      setNetworkName("Error: " + (e.message || "Unknown error"))
      setIsCorrectNetwork(false)
      setWalletBalance(null)
      toast.error(`Failed to check wallet balance: ${e.message || "Unknown error"}`)
    }
  }

  async function saveWalletAddressToDatabase(userId: number, address: string) {
    try {
      await apiClient.payments.updateWalletAddress(userId, address)
      if (bookingId) {
        await fetchBookingDetails(bookingId)
      }
    } catch {
      return
    }
  }

  async function saveTransactionHash(id: number, txHash: string) {
    try {
      await apiClient.payments.updateTransactionHash(id, txHash)
      toast.success("Transaction hash saved successfully")
    } catch {
      return
    }
  }

  function validateForm(): boolean {
    if (!bookingDetails || !bookingId) return false
    const hasWallet = walletAddress || bookingDetails.userWalletAddress
    if (!hasWallet) return false
    if (!bookingDetails.ownerWalletAddress || bookingDetails.ownerWalletAddress === "N/A") return false
    if (!networkName || networkName === "Not connected") return false
    if (!isCorrectNetwork) return false
    const totalPriceMadVal = bookingDetails.totalPrice || 0
    if (!totalPriceMadVal || totalPriceMadVal <= 0) return false
    if (gasEstimate === null || gasEstimate === undefined) return false
    if (walletBalance === null || walletBalance === undefined) return false
    const totalNeededEth = madToEth(totalPriceMadVal) + gasEstimate
    if (walletBalance < totalNeededEth) return false
    if (typeof window === "undefined" || !window.ethereum) return false
    return true
  }

  const formValid = useMemo(
    () => validateForm(),
    [bookingDetails, bookingId, walletAddress, networkName, isCorrectNetwork, walletBalance, gasEstimate]
  )

  async function createPaymentIntent() {
    if (!bookingId) {
      toast.error("Booking ID is required")
      return
    }
    if (!walletAddress && !bookingDetails?.userWalletAddress) {
      toast.error("Please connect MetaMask first")
      return
    }
    try {
      setLoading(true)
      const data = await apiClient.payments.createIntent(bookingId)
      await sendMetaMaskTransaction(data)
    } catch (e: any) {
      const errorMessage = e?.message || e?.toString() || "Unknown error"
      toast.error(`Failed to create payment intent: ${errorMessage}`)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  async function sendMetaMaskTransaction(intentData: PaymentIntentData) {
    try {
      if (typeof window === "undefined" || !window.ethereum) {
        toast.error("MetaMask is not installed. Please install MetaMask extension.")
        return
      }
      if (!intentData.to) {
        toast.error("Contract address not found in payment intent.")
        return
      }
      if (!intentData.value) {
        toast.error("Payment amount not found in payment intent.")
        return
      }
      let accounts: string[] = []
      try {
        accounts = (await window.ethereum.request({
          method: "eth_requestAccounts",
        })) as string[]
      } catch (requestError: any) {
        if (requestError.code === 4001) {
          toast.error("Please approve the connection request in MetaMask to continue.")
          throw new Error("User rejected MetaMask connection request")
        } else {
          toast.error(`Failed to connect to MetaMask: ${requestError.message || "Unknown error"}`)
          throw new Error(`MetaMask connection failed: ${requestError.message || "Unknown error"}`)
        }
      }
      if (!accounts || accounts.length === 0) {
        toast.error("No accounts found. Please connect MetaMask.")
        throw new Error("No accounts found in MetaMask")
      }
      const selectedWallet = accounts[0]
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const metaMaskAddress = await signer.getAddress()
      const normalizedSelected = ethers.getAddress(selectedWallet)
      const normalizedSigner = ethers.getAddress(metaMaskAddress)
      if (!bookingDetails) {
        toast.error("Booking details are missing")
        throw new Error("Booking details are missing")
      }
      if (bookingDetails.userWalletAddress) {
        const normalizedTenant = ethers.getAddress(bookingDetails.userWalletAddress)
        if (normalizedSigner.toLowerCase() !== normalizedTenant.toLowerCase()) {
          const errorMsg = `Wallet mismatch. Please select the correct wallet in MetaMask. Expected: ${bookingDetails.userWalletAddress}, Selected: ${metaMaskAddress}`
          toast.error(errorMsg)
          throw new Error(errorMsg)
        }
      }
      if (user?.id && bookingDetails.userId) {
        const currentUserId = parseInt(user.id)
        const bookingUserId = bookingDetails.userId
        if (currentUserId !== bookingUserId) {
          const errorMsg = `You are not authorized to pay for this booking. This booking belongs to user ${bookingUserId}, but you are logged in as user ${currentUserId}.`
          toast.error(errorMsg)
          throw new Error(errorMsg)
        }
      }
      let valueBigNumber: ethers.BigNumberish
      try {
        if (typeof intentData.value === "string") {
          if (intentData.value.startsWith("0x")) {
            valueBigNumber = intentData.value
          } else {
            const weiValue = BigInt(intentData.value)
            valueBigNumber = weiValue
          }
        } else {
          valueBigNumber = BigInt(intentData.value.toString())
        }
      } catch {
        toast.error(`Invalid payment amount format: ${intentData.value}`)
        return
      }
      if (!ethers.isAddress(intentData.to)) {
        toast.error(`Invalid contract address: ${intentData.to}`)
        return
      }
      const txData = intentData.data && intentData.data !== "0x" ? intentData.data : intentData.data || "0x"
      const network = await provider.getNetwork()
      if (intentData.chainId && network.chainId.toString() !== intentData.chainId.toString()) {
        toast.error(`Network mismatch. Expected chain ID: ${intentData.chainId}, but current is: ${network.chainId}`)
        return
      }
      const balance = await provider.getBalance(metaMaskAddress)
      const balanceInEth = parseFloat(ethers.formatEther(balance))
      const valueInEth = parseFloat(ethers.formatEther(valueBigNumber))
      if (balanceInEth < valueInEth) {
        toast.error(`Insufficient balance. You have ${balanceInEth.toFixed(4)} ETH but need ${valueInEth.toFixed(4)} ETH`)
        return
      }
      // Estimate gas before sending transaction
      let gasEstimate: bigint
      try {
        const estimatedGas = await provider.estimateGas({
          to: intentData.to,
          value: valueBigNumber,
          data: txData,
          from: metaMaskAddress,
        })
        gasEstimate = estimatedGas
        console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`)
      } catch (gasError: any) {
        console.error(`❌ Gas estimation failed: ${gasError.message}`)
        // Use a safe default gas limit (300,000) if estimation fails
        gasEstimate = BigInt(300000)
        console.warn(`⚠️ Using default gas limit: ${gasEstimate.toString()}`)
      }

      const txRequest = {
        to: intentData.to,
        value: valueBigNumber,
        data: txData,
        gasLimit: gasEstimate + (gasEstimate / BigInt(10)), // Add 10% buffer
      }

      console.log(`📤 Sending transaction: to=${intentData.to}, value=${valueBigNumber.toString()}, gasLimit=${txRequest.gasLimit.toString()}`)
      toast.info("Sending transaction... Please confirm in MetaMask.")
      const tx = await signer.sendTransaction(txRequest)
      toast.info("Transaction sent, waiting for confirmation...")
      const receipt = await tx.wait()
      if (!receipt) {
        throw new Error("Transaction receipt is null")
      }
      if (bookingId && receipt.hash) {
        try {
          await saveTransactionHash(bookingId, receipt.hash)
        } catch {
        }
      }
      if (receipt && receipt.hash) {
        toast.success(`Payment deposited successfully! Transaction Hash: ${receipt.hash.substring(0, 10)}...`)
      } else {
        toast.success("Payment transaction sent successfully!")
      }
      setTimeout(() => {
        router.push("/my-bookings?tab=current")
      }, 2000)
    } catch (e: any) {
      let errorMessage = e.message || "Failed to send transaction"
      if (e.code === 4001) {
        errorMessage = "Transaction rejected by user. Please approve the transaction in MetaMask."
      } else if (e.code === -32603) {
        // Internal JSON-RPC error - provide more specific error message
        const errorDetails = e.data || e.error || {}
        const rpcError = errorDetails.message || errorDetails.error || e.message || "Unknown error"

        if (rpcError.includes("execution reverted") || rpcError.includes("revert")) {
          errorMessage = `Transaction reverted by contract. Possible reasons:\n- Booking already exists\n- Incorrect payment amount\n- Invalid wallet address\n- Contract validation failed\n\nDetails: ${rpcError}`
        } else if (rpcError.includes("gas") || rpcError.includes("out of gas")) {
          errorMessage = `Gas estimation failed. This might be due to:\n- Contract execution would fail\n- Insufficient gas limit\n- Contract validation error\n\nDetails: ${rpcError}`
        } else if (rpcError.includes("insufficient funds") || rpcError.includes("balance")) {
          errorMessage = `Insufficient balance. Please add more ETH to your wallet.\n\nDetails: ${rpcError}`
        } else {
          errorMessage = `Internal JSON-RPC error. This might be due to:\n- Insufficient balance\n- Invalid contract address\n- Network mismatch\n- Invalid transaction data\n- Contract execution error\n\nDetails: ${rpcError}`
        }

        console.error("❌ JSON-RPC Error Details:", {
          code: e.code,
          message: e.message,
          data: e.data,
          error: e.error,
          rpcError: rpcError
        })
      } else if (e.code === "CALL_EXCEPTION" || e.reason) {
        errorMessage = `Transaction failed: ${e.reason || e.message}`
      } else if (e.message?.includes("insufficient funds") || e.message?.includes("insufficient balance")) {
        errorMessage = "Insufficient balance. Please add more ETH to your wallet."
      } else if (e.message?.includes("network") || e.message?.includes("chain")) {
        errorMessage = "Network mismatch. Please switch to the correct network in MetaMask."
      } else if (
        e.message?.includes("user rejected") ||
        e.message?.includes("User denied") ||
        e.message?.includes("rejected")
      ) {
        errorMessage = "Transaction rejected by user. Please approve the transaction in MetaMask."
      } else if (e.message?.includes("connection") || e.message?.includes("connect")) {
        errorMessage = "Failed to connect to MetaMask. Please make sure MetaMask is unlocked and try again."
      }
      toast.error(errorMessage)
      throw e
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center shadow-xl">
          <div className="flex justify-center mb-4">
            <AlertCircle className="w-16 h-16 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Failed to Load Booking Details</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500 mb-6">
            Please make sure the booking ID in the URL is correct and the booking exists in the database.
          </p>
          <Button onClick={() => router.push("/my-bookings")} variant="outline" className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Bookings
          </Button>
        </Card>
      </div>
    )
  }

  if (bookingId === null || loadingDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading booking details...</p>
        </div>
      </div>
    )
  }

  const totalPriceMad = bookingDetails?.totalPrice || 0
  const propertyPriceMad = bookingDetails?.propertyPrice || 0
  const totalPriceEth = madToEth(totalPriceMad)
  const propertyPriceEth = madToEth(propertyPriceMad)
  const nights =
    bookingDetails?.checkInDate && bookingDetails?.checkOutDate
      ? Math.ceil(
        (new Date(bookingDetails.checkOutDate).getTime() - new Date(bookingDetails.checkInDate).getTime()) /
        (1000 * 60 * 60 * 24)
      )
      : 0

  const currentWalletAddress = walletAddress || bookingDetails?.userWalletAddress
  const hasWalletAddress =
    currentWalletAddress && currentWalletAddress.trim() !== "" && currentWalletAddress !== "null"

  const hasEthereum = typeof window !== "undefined" && window.ethereum

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="p-8 shadow-xl">
              <Button variant="ghost" onClick={() => router.push("/my-bookings")} className="mb-6 -ml-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              <h1 className="text-3xl font-bold text-gray-900 mb-8">Confirm and pay</h1>

              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Payment method</h2>
                  <Card className="p-6 border-2 border-teal-600 bg-teal-50">
                    <div className="flex items-center gap-3 mb-4">
                      <Wallet className="w-6 h-6 text-teal-600" />
                      <span className="font-semibold text-gray-900">Ethereum (MetaMask)</span>
                    </div>

                    {!hasWalletAddress ? (
                      <Button
                        onClick={connectWallet}
                        className="w-full bg-teal-600 hover:bg-teal-700"
                      >
                        <Wallet className="w-4 h-4 mr-2" />
                        Connect MetaMask
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">
                            Currently Connected Wallet
                          </Label>
                          <Input
                            value={currentWalletAddress}
                            readOnly
                            className={`mt-1 font-mono text-sm ${bookingDetails?.userWalletAddress &&
                              currentWalletAddress?.toLowerCase() !==
                              bookingDetails.userWalletAddress.toLowerCase()
                              ? bookingDetails.ownerWalletAddress &&
                                currentWalletAddress?.toLowerCase() ===
                                bookingDetails.ownerWalletAddress.toLowerCase()
                                ? "border-red-500 bg-red-50"
                                : "border-yellow-500 bg-yellow-50"
                              : "border-green-500 bg-green-50"
                              }`}
                          />
                          {bookingDetails?.userWalletAddress &&
                            currentWalletAddress?.toLowerCase() ===
                            bookingDetails.userWalletAddress.toLowerCase() && (
                              <p className="text-xs text-green-700 mt-1">
                                ✅ Correct tenant wallet connected
                              </p>
                            )}
                          {bookingDetails?.ownerWalletAddress &&
                            currentWalletAddress?.toLowerCase() ===
                            bookingDetails.ownerWalletAddress.toLowerCase() && (
                              <p className="text-xs text-red-700 mt-1 font-semibold">
                                ❌ ERROR: You are connected with the HOST&apos;s wallet! Please
                                switch to the tenant wallet above.
                              </p>
                            )}
                          {bookingDetails?.userWalletAddress &&
                            bookingDetails?.ownerWalletAddress &&
                            currentWalletAddress?.toLowerCase() !==
                            bookingDetails.userWalletAddress.toLowerCase() &&
                            currentWalletAddress?.toLowerCase() !==
                            bookingDetails.ownerWalletAddress.toLowerCase() && (
                              <p className="text-xs text-yellow-700 mt-1">
                                ⚠️ WARNING: This wallet doesn&apos;t match the required tenant
                                wallet. Payment will be deducted from this wallet.
                              </p>
                            )}
                          <Button
                            onClick={async () => {
                              if (currentWalletAddress) {
                                setWalletBalance(null)
                                try {
                                  await checkWalletInfo(currentWalletAddress)
                                  toast.success("Wallet balance refreshed")
                                } catch (e: any) {
                                  toast.error(`Failed to refresh: ${e.message}`)
                                }
                              } else {
                                toast.error(
                                  "No wallet address available. Please connect MetaMask first."
                                )
                              }
                            }}
                            variant="ghost"
                            size="sm"
                            className="mt-2 text-xs"
                            disabled={!currentWalletAddress}
                          >
                            Refresh Balance
                          </Button>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-gray-700">Network</Label>
                          <Input value={networkName} readOnly className="mt-1" />
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-gray-700">Amount</Label>
                          <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                            <p className="text-lg font-semibold text-gray-900">
                              {formatMad(totalPriceMad)}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              ≈ {formatEth(totalPriceEth)}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Rate: 1 ETH = {MAD_TO_ETH_RATE.toLocaleString()} MAD
                            </p>
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-gray-700">
                            Your Wallet Balance
                          </Label>
                          <Input
                            value={
                              walletBalance !== null
                                ? `${walletBalance.toFixed(6)} ETH`
                                : "Checking..."
                            }
                            readOnly
                            className={`mt-1 ${walletBalance !== null &&
                              totalPriceEth > 0 &&
                              walletBalance < totalPriceEth + gasEstimate
                              ? "border-red-500"
                              : ""
                              }`}
                          />
                          {walletBalance === null && (
                            <p className="text-xs text-gray-500 mt-1">
                              ⏳ Loading balance...
                            </p>
                          )}
                          {walletBalance !== null && totalPriceEth > 0 && (
                            <p
                              className={`text-xs mt-1 ${walletBalance >= totalPriceEth + gasEstimate
                                ? "text-green-600"
                                : "text-red-600"
                                }`}
                            >
                              {walletBalance >= totalPriceEth + gasEstimate
                                ? "✓ Sufficient balance"
                                : `✗ Insufficient balance. You need ${(totalPriceEth + gasEstimate).toFixed(
                                  6
                                )} ETH`}
                            </p>
                          )}
                        </div>

                        {(!hasEthereum || !isCorrectNetwork) && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-sm font-medium text-yellow-800 mb-2">
                              MetaMask Status:
                            </p>
                            <p className="text-sm text-yellow-700">
                              {!hasEthereum
                                ? "✗ MetaMask not installed"
                                : "✗ Wrong Network - Please switch to Hardhat Local or Arbitrum One"}
                            </p>
                            {hasEthereum && !isCorrectNetwork && (
                              <div className="flex gap-2 mt-3">
                                <Button
                                  onClick={async () => {
                                    try {
                                      await switchToNetwork(
                                        HARDHAT_CHAIN_ID,
                                        "Hardhat Local",
                                        "http://127.0.0.1:8545"
                                      )
                                      await checkWalletInfo(
                                        walletAddress || bookingDetails?.userWalletAddress || ""
                                      )
                                      toast.success("Switched to Hardhat Local")
                                    } catch (e: any) {
                                      toast.error(`Failed to switch: ${e.message}`)
                                    }
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                >
                                  Switch to Hardhat Local
                                </Button>
                                <Button
                                  onClick={async () => {
                                    try {
                                      await switchToNetwork(
                                        ARBITRUM_ONE_CHAIN_ID,
                                        "Arbitrum One",
                                        "https://arb1.arbitrum.io/rpc"
                                      )
                                      await checkWalletInfo(
                                        walletAddress || bookingDetails?.userWalletAddress || ""
                                      )
                                      toast.success("Switched to Arbitrum One")
                                    } catch (e: any) {
                                      toast.error(`Failed to switch: ${e.message}`)
                                    }
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                >
                                  Switch to Arbitrum One
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                </div>

                {!formValid && !loading && (
                  <Card className="p-6 bg-amber-50 border-amber-200">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-amber-900 mb-2">
                          Please complete the following:
                        </h3>
                        <ul className="space-y-1 text-sm text-amber-800">
                          {(!bookingDetails || !bookingId) && (
                            <li>• Booking details are missing</li>
                          )}
                          {!walletAddress && !bookingDetails?.userWalletAddress && (
                            <li>• Connect your MetaMask wallet</li>
                          )}
                          {(!bookingDetails?.ownerWalletAddress ||
                            bookingDetails?.ownerWalletAddress === "N/A") && (
                              <li>• Property owner wallet address is missing</li>
                            )}
                          {(!networkName || networkName === "Not connected") && (
                            <li>• Connect to a supported network</li>
                          )}
                          {!isCorrectNetwork && (
                            <li>• Switch to Hardhat Local or Arbitrum One network</li>
                          )}
                          {(!bookingDetails?.totalPrice ||
                            bookingDetails.totalPrice <= 0) && (
                              <li>• Booking price is invalid</li>
                            )}
                          {(gasEstimate === null || gasEstimate === undefined) && (
                            <li>• Gas estimate is being calculated</li>
                          )}
                          {(walletBalance === null ||
                            walletBalance === undefined) && (
                              <li>• Wallet balance is being checked</li>
                            )}
                          {walletBalance !== null &&
                            walletBalance !== undefined &&
                            bookingDetails &&
                            bookingDetails.totalPrice > 0 &&
                            walletBalance < madToEth(bookingDetails.totalPrice) + gasEstimate && (
                              <li>
                                • Insufficient balance. You need{" "}
                                {(madToEth(bookingDetails.totalPrice) + gasEstimate).toFixed(6)} ETH (≈ {formatMad(bookingDetails.totalPrice)})
                              </li>
                            )}
                          {!hasEthereum && (
                            <li>• MetaMask extension is not installed</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </Card>
                )}

                <Button
                  onClick={async (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (!loading && formValid) {
                      try {
                        await createPaymentIntent()
                      } catch (err: any) {
                        toast.error(
                          `Error: ${err?.message || err?.toString() || "Unknown error"}`
                        )
                      }
                    } else {
                      if (loading) {
                        toast.info("Please wait, processing...")
                      } else {
                        const reasons: string[] = []
                        if (!bookingDetails || !bookingId) reasons.push("Booking details missing")
                        if (!walletAddress && !bookingDetails?.userWalletAddress)
                          reasons.push("Wallet not connected")
                        if (!bookingDetails?.ownerWalletAddress || bookingDetails.ownerWalletAddress === "N/A")
                          reasons.push("Owner wallet missing")
                        if (!networkName || networkName === "Not connected")
                          reasons.push("Network not connected")
                        if (!isCorrectNetwork) reasons.push("Wrong network")
                        if (!bookingDetails?.totalPrice || bookingDetails.totalPrice <= 0)
                          reasons.push("Invalid price")
                        if (walletBalance === null || walletBalance === undefined)
                          reasons.push("Balance not loaded")
                        if (
                          walletBalance !== null &&
                          bookingDetails &&
                          walletBalance < madToEth(bookingDetails.totalPrice) + gasEstimate
                        )
                          reasons.push("Insufficient balance")
                        if (!hasEthereum) reasons.push("MetaMask not installed")
                        toast.error(
                          `Please complete all required fields: ${reasons.join(", ")}`
                        )
                      }
                    }
                  }}
                  disabled={loading || !formValid}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  size="lg"
                  type="button"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Confirm reservation"
                  )}
                </Button>
              </div>
            </Card>
          </div>

          {bookingDetails && (
            <div className="lg:col-span-1">
              <Card className="p-6 shadow-xl sticky top-8">
                <div className="mb-6">
                  <div className="w-full h-48 bg-gradient-to-br from-teal-400 to-blue-500 rounded-lg mb-4 flex items-center justify-center">
                    <span className="text-white text-xl font-semibold">
                      {bookingDetails.propertyTitle || "Property"}
                    </span>
                  </div>
                  <span className="inline-block px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-medium">
                    {bookingDetails.status || "PENDING"}
                  </span>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Check-in</p>
                      <p className="text-base text-gray-900">
                        {bookingDetails.checkInDate
                          ? new Date(bookingDetails.checkInDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Check-out</p>
                      <p className="text-base text-gray-900">
                        {bookingDetails.checkOutDate
                          ? new Date(bookingDetails.checkOutDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Guest</p>
                      <p className="text-base text-gray-900">
                        {bookingDetails.userFirstName && bookingDetails.userLastName
                          ? `${bookingDetails.userFirstName} ${bookingDetails.userLastName}`
                          : bookingDetails.userEmail || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Price details</h3>
                  <div className="space-y-3">
                    {nights > 0 && propertyPriceMad > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {nights} {nights === 1 ? "night" : "nights"} × {formatMad(propertyPriceMad)}
                          </span>
                          <span className="text-gray-900">
                            {formatMad(propertyPriceMad * nights)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>≈ {formatEth(propertyPriceEth)} per night</span>
                          <span>≈ {formatEth(propertyPriceEth * nights)}</span>
                        </div>
                      </div>
                    )}
                    <div className="pt-3 border-t space-y-1">
                      <div className="flex justify-between text-base font-semibold">
                        <span className="text-gray-900">Total</span>
                        <span className="text-gray-900">{formatMad(totalPriceMad)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-teal-600">
                        <span>ETH equivalent</span>
                        <span className="font-medium">≈ {formatEth(totalPriceEth)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
