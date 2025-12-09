// DirectPayment Contract ABI
export const DirectPaymentABI = [
  {
    inputs: [
      { internalType: "uint256", name: "bookingId", type: "uint256" },
      { internalType: "address", name: "recipient", type: "address" }
    ],
    name: "sendPayment",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "bookingId", type: "uint256" }],
    name: "getPayment",
    outputs: [
      { internalType: "address", name: "payer", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint256", name: "timestamp", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getTotalPayments",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "payments",
    outputs: [
      { internalType: "uint256", name: "bookingId", type: "uint256" },
      { internalType: "address", name: "payer", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint256", name: "timestamp", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "bookingId", type: "uint256" },
      { indexed: true, internalType: "address", name: "payer", type: "address" },
      { indexed: true, internalType: "address", name: "recipient", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" }
    ],
    name: "PaymentSent",
    type: "event"
  }
] as const

